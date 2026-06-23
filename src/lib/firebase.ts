/**
 * Firebase client SDK initialization (singleton).
 *
 * Patrón: inicialización eager pero condicional. Si las variables de entorno
 * NEXT_PUBLIC_FIREBASE_* están presentes, inicializa Firebase normalmente.
 * Si NO están (build sin env vars, ej. /_not-found prerender), los exports
 * quedan como undefined — los componentes que no usan Firebase no se rompen.
 *
 * Variables requeridas en runtime:
 *   - Local: .env.local
 *   - Producción (Vercel): Project Settings -> Environment Variables
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const hasValidConfig = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

if (!hasValidConfig && typeof window !== 'undefined') {
  console.error(
    '[Firebase] Configuración faltante. Las variables NEXT_PUBLIC_FIREBASE_* no están definidas. ' +
      'Verifica .env.local (local) o Project Settings -> Environment Variables (Vercel).'
  );
}

const _app: FirebaseApp | undefined = hasValidConfig
  ? (getApps().length === 0 ? initializeApp(firebaseConfig as Record<string, string>) : getApp())
  : undefined;

// Exports — son objetos reales del SDK (no proxies). En el caso edge de build
// sin env vars, serán undefined; las páginas que no los usan no se rompen.
export const app = _app as FirebaseApp;
export const auth = (_app ? getAuth(_app) : undefined) as Auth;
export const db = (_app ? getFirestore(_app) : undefined) as Firestore;
export const storage = (_app ? getStorage(_app) : undefined) as FirebaseStorage;
