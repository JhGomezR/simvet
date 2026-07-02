/**
 * Firebase Admin SDK (sólo servidor).
 *
 * Se usa para operaciones que requieren privilegios o capacidades no
 * disponibles en el SDK cliente, en particular **Firestore Vector Search**
 * (findNearest) para la búsqueda semántica de historias clínicas.
 *
 * Requiere credenciales de cuenta de servicio:
 *   - GOOGLE_APPLICATION_CREDENTIALS=./service-account.json   (recomendado)
 *   - o FIREBASE_SERVICE_ACCOUNT con el JSON inline.
 *
 * Si no hay credenciales, `getAdminDb()` devuelve null y las features que
 * dependen de él degradan con gracia (no rompen la app).
 */
import { getApps, initializeApp, cert, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let cachedDb: Firestore | null | undefined;
let cachedAuth: Auth | null | undefined;

function initAdmin(): App | null {
  if (getApps().length > 0) return getApps()[0];

  try {
    const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (inlineJson) {
      const parsed = JSON.parse(inlineJson);
      return initializeApp({ credential: cert(parsed) });
    }
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return initializeApp({ credential: applicationDefault() });
    }
    console.warn('[firebase-admin] Sin credenciales: Vector Search deshabilitado.');
    return null;
  } catch (err) {
    console.error('[firebase-admin] Error inicializando Admin SDK:', err);
    return null;
  }
}

/** Devuelve la instancia de Firestore admin, o null si no hay credenciales. */
export function getAdminDb(): Firestore | null {
  if (cachedDb !== undefined) return cachedDb;
  const app = initAdmin();
  cachedDb = app ? getFirestore(app) : null;
  return cachedDb;
}

/** Devuelve la instancia de Auth admin, o null si no hay credenciales. */
export function getAdminAuth(): Auth | null {
  if (cachedAuth !== undefined) return cachedAuth;
  const app = initAdmin();
  cachedAuth = app ? getAuth(app) : null;
  return cachedAuth;
}
