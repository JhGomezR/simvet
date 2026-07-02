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
    }
  | {
      ok: false;
      error: string;
    };

function generateTemporaryPassword() {
  const chunk = Math.random().toString(36).slice(-6);
  return `SimVet!${chunk}9`;
}

export async function createManagedUserAction(
  input: CreateManagedUserInput
): Promise<CreateManagedUserResult> {
  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();

  if (!adminAuth || !adminDb) {
    return {
      ok: false,
      error: `Firebase Admin no esta configurado en el servidor. ${getAdminSetupHint()} En Vercel agrega esas variables en Project Settings -> Environment Variables y redepliega.`,
    };
  }

  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  const role = input.role;
  const roles = Array.from(new Set([...(input.roles ?? []), role]));
  const temporaryPassword = input.password?.trim() || generateTemporaryPassword();

  if (!email || !displayName) {
    return { ok: false, error: 'El nombre y el correo son obligatorios.' };
  }

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
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo crear el usuario.';
    return { ok: false, error: message };
  }
}
