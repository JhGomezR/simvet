'use client';

/**
 * AuthContext - provee el usuario logueado y su perfil a toda la app.
 *
 * Comportamiento:
 * 1. Espera a Firebase Auth.
 * 2. Intenta leer users/{uid} para conocer rol y metadatos.
 * 3. Si falla Firestore o el perfil no existe, levanta un perfil minimo
 *    en memoria para no dejar la app en blanco.
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserProfile, UserRole } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  roles: UserRole[];
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function mapAuthErrorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? '');

  if (/auth\/invalid-credential/i.test(message)) {
    return 'Correo o contraseña incorrectos, o el acceso Email/Password no está habilitado en Firebase Authentication.';
  }
  if (/auth\/user-disabled/i.test(message)) {
    return 'Esta cuenta fue deshabilitada.';
  }
  if (/auth\/too-many-requests/i.test(message)) {
    return 'Demasiados intentos. Espera un momento y vuelve a intentarlo.';
  }

  return message || 'No se pudo iniciar sesión.';
}

function buildFallbackProfile(fbUser: User): UserProfile {
  return {
    uid: fbUser.uid,
    email: fbUser.email ?? '',
    displayName: fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'Usuario',
    role: 'student',
    roles: ['student'],
    avatarUrl: fbUser.photoURL ?? undefined,
    mustChangePassword: false,
    level: 'Básico',
    academicProgress: 0,
    averageScore: 0,
    triagePerformance: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);

      if (!fbUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const fallbackProfile = buildFallbackProfile(fbUser);

      try {
        const ref = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const profileData = snap.data() as UserProfile;
          setProfile({
            ...fallbackProfile,
            ...profileData,
            roles: Array.from(new Set(profileData.roles ?? [profileData.role])),
          });
        } else {
          try {
            await setDoc(ref, fallbackProfile);
          } catch (writeErr) {
            console.error('[auth] No se pudo crear el perfil inicial en Firestore:', writeErr);
          }
          setProfile(fallbackProfile);
        }
      } catch (err) {
        console.error('[auth] No se pudo resolver el perfil del usuario:', err);
        setProfile(fallbackProfile);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      throw new Error(mapAuthErrorMessage(err));
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const signOut = async () => {
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        roles: profile?.roles ?? (profile?.role ? [profile.role] : []),
        loading,
        signInWithEmail,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}

