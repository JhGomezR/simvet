/**
 * scripts/seed-admin.ts
 *
 * Crea el usuario administrador inicial usando Firebase Admin SDK.
 *
 * REQUISITOS:
 * 1. Descargar service account key desde Firebase Console:
 *    Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada
 *    Guardarla como ./service-account.json (ya está en .gitignore)
 *
 * 2. Tener Firebase Authentication habilitado con Email/Password.
 *
 * USO:
 *    npm install -D firebase-admin tsx
 *    npx tsx scripts/seed-admin.ts
 *
 * RESULTADO:
 * - Crea (o actualiza) el usuario jhgomez89@gmail.com en Firebase Auth
 *   con la contraseña temporal: SimVet@Urgencias2026#Admin
 * - Crea el doc users/{uid} en Firestore con role: 'admin'
 *   y mustChangePassword: true
 * - Al iniciar sesión por primera vez, la app fuerza el cambio de contraseña.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ADMIN_EMAIL = 'jhgomez89@gmail.com';
const ADMIN_PASSWORD_TEMP = 'SimVet@Urgencias2026#Admin';
const ADMIN_DISPLAY_NAME = 'Jhon Gómez';

async function main() {
  // 1) Inicializar Admin SDK con la service account
  const serviceAccountPath = resolve(process.cwd(), 'service-account.json');
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
  } catch (e) {
    console.error(
      '\n❌ No encontré service-account.json en la raíz del proyecto.\n' +
        'Descárgalo de: Firebase Console → ⚙ Configuración → Cuentas de servicio → Generar clave privada.\n' +
        'Guárdalo como service-account.json en la raíz.\n'
    );
    process.exit(1);
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }

  const auth = getAuth();
  const db = getFirestore();

  // 2) Crear o recuperar el usuario en Firebase Auth
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(ADMIN_EMAIL);
    uid = existing.uid;
    console.log(`ℹ Usuario ${ADMIN_EMAIL} ya existía (uid: ${uid}). Reseteando contraseña...`);
    await auth.updateUser(uid, {
      password: ADMIN_PASSWORD_TEMP,
      displayName: ADMIN_DISPLAY_NAME,
      emailVerified: true,
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'auth/user-not-found') {
      const created = await auth.createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD_TEMP,
        displayName: ADMIN_DISPLAY_NAME,
        emailVerified: true,
      });
      uid = created.uid;
      console.log(`✅ Usuario creado en Firebase Auth (uid: ${uid})`);
    } else {
      throw err;
    }
  }

  // 3) Crear/actualizar perfil en Firestore con role: 'admin'
  const now = Date.now();
  await db
    .collection('users')
    .doc(uid)
    .set(
      {
        uid,
        email: ADMIN_EMAIL,
        displayName: ADMIN_DISPLAY_NAME,
        role: 'admin',
        mustChangePassword: true,
        avatarUrl: null,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true }
    );

  console.log('\n✅ Admin inicializado correctamente.\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Email:      ${ADMIN_EMAIL}`);
  console.log(`  Password:   ${ADMIN_PASSWORD_TEMP}`);
  console.log(`  Rol:        admin`);
  console.log(`  UID:        ${uid}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠  Al iniciar sesión por primera vez, la app te pedirá');
  console.log('   cambiar la contraseña antes de continuar.\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Error fatal:', err);
  process.exit(1);
});
