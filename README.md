# SimVet Urgencias

Simulador clínico veterinario para estudiantes de pregrado. Genera casos de emergencia con razonamiento clínico paso a paso (ABCDE → anamnesis → examen físico → pruebas diagnósticas → diagnóstico diferencial → tratamiento) y feedback personalizado por IA al finalizar cada intento.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Firebase** (Authentication + Firestore + Storage + App Hosting)
- **Genkit + Gemini 2.5 Flash** para feedback automatizado
- **shadcn/ui** + **Tailwind CSS** + **recharts**
- **Zod** para validación de esquemas

## Roles del sistema

- **`student`** — estudiantes de pregrado. Acceden a casos publicados y su historial.
- **`professor`** — crean y publican casos clínicos, ven el desempeño de su cohorte.
- **`admin`** — gestión global del sistema, promueve usuarios entre roles.

## Setup inicial

### 1. Instalar dependencias

```bash
npm install
npm install -D firebase-admin tsx
npm install -g firebase-tools
```

### 2. Configurar Firebase

Crea `.env.local` con la configuración de tu proyecto Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
GEMINI_API_KEY=...
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

Para despliegues en Vercel, además de las variables `NEXT_PUBLIC_FIREBASE_*`, configura una de estas opciones de servidor:

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"..."}
```

o bien:

```env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Después de agregar estas variables en Vercel: `Project Settings -> Environment Variables`, haz un redeploy.

Habilita en la consola de Firebase:
- **Firestore Database** (modo producción)
- **Authentication** → Email/Password (y opcionalmente Google)
- **Storage**

Descarga la **service account key** desde Configuración del proyecto → Cuentas de servicio → Generar clave privada, y guárdala como `service-account.json` en la raíz (ya está en `.gitignore`).

### 3. Login en Firebase CLI

```bash
firebase login
firebase use <tu-project-id>
```

### 4. Desplegar reglas e índices

```bash
npm run firebase:deploy:rules
```

### 5. Crear el usuario admin inicial

```bash
npm run seed:admin
```

Crea la cuenta `jhgomez89@gmail.com` con contraseña temporal `SimVet@Urgencias2026#Admin` y la marca con `mustChangePassword: true`. Al iniciar sesión por primera vez, la app forzará el cambio de contraseña.

### 6. Sembrar casos clínicos de referencia

```bash
npm run seed:data
```

Crea dos casos de referencia: "Shock Hipovolémico Canino" (modelo ampliado completo con anamnesis, examen, pruebas, DDx y tratamiento) y "Obstrucción Uretral en Felino".

### 7. Arrancar el dev server

```bash
npm run dev
```

Abre `http://localhost:9002`.

## Estructura del proyecto

```
src/
├── app/
│   ├── (app)/                       # Rutas autenticadas
│   │   ├── dashboard/               # Dashboard estudiante
│   │   ├── simulacion/[caseId]/     # Vista de simulación
│   │   ├── profesor/                # Panel profesor (crear/listar casos)
│   │   └── admin/                   # Panel administrador
│   ├── login/                       # Inicio de sesión
│   ├── account/change-password/     # Cambio forzado en primer login
│   └── actions/                     # Server Actions (llamadas a Gemini)
├── components/
│   ├── auth-guard.tsx               # Protección de rutas por rol
│   ├── simulacion/                  # Componentes de la simulación
│   ├── profesor/                    # Componentes del profesor
│   └── ui/                          # shadcn/ui
├── contexts/
│   └── auth-context.tsx             # Provider de autenticación
├── lib/
│   ├── firebase.ts                  # Singleton del SDK
│   ├── types.ts                     # Tipos TypeScript del dominio
│   ├── repositories.ts              # Queries tipadas a Firestore
│   └── data.ts                      # Datos legacy (deprecados)
└── ai/
    └── flows/                       # Flujos Genkit (Gemini)
scripts/
├── seed-admin.ts                    # Crea el usuario admin inicial
└── seed-data.ts                     # Siembra casos clínicos de referencia
firestore.rules                      # Reglas de seguridad de Firestore
storage.rules                        # Reglas de Firebase Storage
firestore.indexes.json               # Índices compuestos
```

## Modelo de datos (Firestore)

- **`users/{uid}`** — perfil con `role`, `email`, `displayName`, `mustChangePassword`.
- **`cases/{caseId}`** — caso clínico (paciente, vitales, anamnesis, examen, pruebas, DDx, tratamiento, rúbrica).
- **`attempts/{attemptId}`** — intento de un estudiante sobre un caso (eventos cronológicos + feedback generado).
- **`classes/{classId}`** — clase/curso del profesor con estudiantes y casos asignados.

## Despliegue en Firebase App Hosting

```bash
firebase deploy --only apphosting
```

La configuración vive en `apphosting.yaml`.

## Scripts útiles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el dev server en el puerto 9002 |
| `npm run build` | Build de producción |
| `npm run typecheck` | Verifica tipos sin compilar |
| `npm run seed:admin` | Crea el admin inicial en Firebase Auth + Firestore |
| `npm run seed:data` | Siembra casos clínicos de referencia |
| `npm run seed:all` | Ambos seeds en secuencia |
| `npm run firebase:deploy:rules` | Despliega reglas e índices a Firestore/Storage |
| `npm run genkit:dev` | Modo desarrollo de Genkit (flujos de IA) |

## Licencia

Proyecto académico — SimVet Urgencias © 2026
