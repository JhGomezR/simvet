/**
 * Firebase client SDK initialization (singleton).
 *
 * IMPORTANTE: Este archivo se ejecuta tanto en el servidor (RSC, Server Actions)
 * como en el cliente. Usamos `getApps()` para evitar reinicializar la app en
 * cada hot reload de Next.js durante desarrollo.
 *
 * Las variables NEXT_PUBLIC_* se exponen al bundle del cliente (es seguro,
 * la apiKey de Firebase Web está diseñada para ser pública — la seguridad
 * vive en las Firestore Rules y Firebase Auth).
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

// Validación temprana: si falta una variable, el error es claro
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    'Firebase configuration is missing. Verifica que .env.local contenga ' +
      'las variables NEXT_PUBLIC_FIREBASE_* requeridas.'
  );
}

// Singleton: si ya existe una app inicializada, la reutilizamos
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export { app };
