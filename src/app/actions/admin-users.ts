'use server';

import { getAdminAuth, getAdminDb, getAdminSetupHint } from '@/lib/firebase-admin';
import type { UserRole } from '@/lib/types';

type CreateManagedUserInput = {
  email: string;
  displayName: string;
  role: UserRole;
  roles: UserRole[];
  password?: string;
  clinicId?: string;
};

type CreateManagedUserResult =
  | {
      ok: true;
      uid: string;
      email: string;
      temporaryPassword: string;
      profileCreatedOnServer: boolean;
      warning?: string;
    }
  | {
      ok: false;
      error: string;
    };

function generateTemporaryPassword() {
  const chunk = Math.random().toString(36).slice(-6);
  return `SimVet!${chunk}9`;
}

function getWebApiKey() {
  return process.env.FIREBASE_WEB_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
}

function mapIdentityError(message: string) {
  if (/EMAIL_EXISTS/i.test(message)) return 'Ese correo ya está registrado en Firebase Authentication.';
  if (/WEAK_PASSWORD/i.test(message)) return 'La contraseña temporal es demasiado débil.';
  if (/OPERATION_NOT_ALLOWED/i.test(message)) {
    return 'Email/Password no está habilitado en Firebase Authentication.';
  }
  return message || 'No se pudo crear el usuario en Firebase Authentication.';
}

export async function createManagedUserAction(
  input: CreateManagedUserInput
): Promise<CreateManagedUserResult> {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const role = input.role;
  const roles = Array.from(new Set([...(input.roles ?? []), role]));
  const temporaryPassword = input.password?.trim() || generateTemporaryPassword();

  if (!email || !displayName) {
    return { ok: false, error: 'El nombre y el correo son obligatorios.' };
  }

  if (adminAuth && adminDb) {
    try {
      const userRecord = await adminAuth.createUser({
        email,
        displayName,
        password: temporaryPassword,
        emailVerified: false,
        disabled: false,
      });

      const now = Date.now();
      try {
        await adminDb.collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          email,
          displayName,
          role,
          roles,
          ...(input.clinicId?.trim() ? { clinicId: input.clinicId.trim() } : {}),
          mustChangePassword: true,
          level: 'Básico',
          academicProgress: 0,
          averageScore: 0,
          triagePerformance: 0,
          createdAt: now,
          updatedAt: now,
        });
      } catch (profileErr) {
        await adminAuth.deleteUser(userRecord.uid).catch(() => undefined);
        throw profileErr;
      }

      return {
        ok: true,
        uid: userRecord.uid,
        email,
        temporaryPassword,
        profileCreatedOnServer: true,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear el usuario.';
      return { ok: false, error: message };
    }
  }

  const apiKey = getWebApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error: `Firebase Admin no esta configurado en el servidor y tampoco hay API key disponible para el modo alterno. ${getAdminSetupHint()} En Vercel agrega esas variables en Project Settings -> Environment Variables y redepliega.`,
    };
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: temporaryPassword,
          returnSecureToken: false,
        }),
      }
    );

    const payload = (await response.json()) as {
      localId?: string;
      error?: { message?: string };
    };

    if (!response.ok || !payload.localId) {
      return {
        ok: false,
        error: mapIdentityError(payload.error?.message ?? 'No se pudo crear el usuario en Authentication.'),
      };
    }

    return {
      ok: true,
      uid: payload.localId,
      email,
      temporaryPassword,
      profileCreatedOnServer: false,
      warning:
        'La cuenta se creó usando Firebase Authentication. El perfil y RBAC deben guardarse ahora desde Firestore con tu sesión admin.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo crear el usuario.';
    return { ok: false, error: message };
  }
}

