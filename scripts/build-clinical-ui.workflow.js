export const meta = {
  name: 'build-clinical-ui',
  description: 'Construye las UIs de los módulos de SimVet Clinical en paralelo contra el contrato existente',
  phases: [
    { title: 'Módulos UI', detail: 'un agente por módulo, archivos aislados' },
  ],
};

// ── Contrato compartido que TODOS los agentes deben respetar ──────────────
const CONTRACT = `
Trabajas en SimVet Clinical: Next.js 15 (App Router) + React 19 + TypeScript +
Firebase (cliente, ya configurado) + shadcn/ui + Tailwind. UI 100% en español.

REGLAS ESTRICTAS:
- Crea SOLO los archivos que se te indican. NO edites archivos compartidos
  (types.ts, repositories*, main-nav, layouts, components/ui/*, hooks existentes).
- Cada page/componente con interactividad lleva "use client" en la primera línea.
- Usa el patrón de formularios de src/components/profesor/create-case-form.tsx
  (react-hook-form + zodResolver + componentes de @/components/ui/{form,input,select,textarea,button,card}).
  LÉELO antes de empezar para copiar el estilo exacto.
- Auth: import { useAuth } from '@/contexts/auth-context'; const { user, profile } = useAuth();
  clinicId disponible como: const clinicId = profile?.clinicId ?? 'default';
- Toasts: import { useToast } from '@/hooks/use-toast'.
- Para cualquier salida generada por IA, renderiza <AiDisclaimer/> de
  '@/components/clinica/ai-disclaimer'.
- Maneja estados loading / vacío / error. Usa lucide-react para iconos.
- date: usa date-fns (ya instalado) para formatear epochs (new Date(ms)).

TIPOS (en '@/lib/types'): Owner, Pet, Consultation, Vaccination, Deworming,
Prescription, PrescriptionItem, LabExam, ClinicalDocument, Clinic, SystemSettings,
ClinicalExtraction, SemanticSearchResult, Species, PetSex. Helper ownerFullName(o).
ROLE_LABELS, CLINICAL_ROLES, DEFAULT_AI_DISCLAIMER también exportados.

REPOS (en '@/lib/repositories.clinical'): cada uno con
getById(id), listByClinic(clinicId, max?), create(dataSinId), update(id, partial), remove(id).
Específicos:
- ownersRepo.searchByName(clinicId, term)
- petsRepo.listByOwner(ownerId)
- consultationsRepo.listByPet(petId), .listByVet(vetUid)
- vaccinationsRepo.listByPet(petId), dewormingsRepo.listByPet(petId)
- prescriptionsRepo.listByPet(petId), labExamsRepo.listByPet(petId)
- clinicalDocumentsRepo.listByPet(petId)
- clinicsRepo.listActive()
- settingsRepo.get()  // singleton; settingsRepo.set('global', data)
Al crear, incluye clinicId, createdAt: Date.now(), updatedAt: Date.now(), createdBy: user.uid
y los campos requeridos del tipo. NO incluyas 'id' (lo asigna Firestore).

Devuelve como salida la lista de rutas de archivos que creaste y una nota de 1 línea.
`;

const MODULES = [
  {
    key: 'propietarios',
    label: 'Propietarios',
    task: `Módulo PROPIETARIOS. Crea:
- src/app/(app)/clinica/propietarios/page.tsx: lista de propietarios de la clínica
  (ownersRepo.listByClinic) con buscador (ownersRepo.searchByName), tabla y botón
  "Nuevo propietario" que abre un diálogo (@/components/ui/dialog) con formulario
  (firstName, lastName, idDocument, phone, email, address, city, notes) → ownersRepo.create.
- src/app/(app)/clinica/propietarios/[ownerId]/page.tsx: detalle del propietario,
  sus datos, y la lista de sus mascotas (petsRepo.listByOwner) con enlaces a
  /clinica/mascotas/[petId] y botón "Agregar mascota" (link a /clinica/mascotas?ownerId=...).`,
  },
  {
    key: 'mascotas',
    label: 'Mascotas',
    task: `Módulo MASCOTAS/PACIENTES. Crea:
- src/app/(app)/clinica/mascotas/page.tsx: lista de mascotas (petsRepo.listByClinic)
  con filtro por especie y botón "Nueva mascota" (diálogo con: name, species [select
  Canino/Felino/Equino/Bovino/Aviar/Otro], breed, sex [PetSex], birthDate, weightKg,
  color, microchip, sterilized, allergies, chronicConditions, ownerId [select cargando
  ownersRepo.listByClinic]). Soporta query param ?ownerId= para preseleccionar dueño.
- src/app/(app)/clinica/mascotas/[petId]/page.tsx: FICHA CLÍNICA completa con pestañas
  (@/components/ui/tabs): Datos, Consultas (consultationsRepo.listByPet), Vacunas
  (vaccinationsRepo.listByPet), Desparasitación (dewormingsRepo.listByPet), Fórmulas
  (prescriptionsRepo.listByPet), Laboratorio (labExamsRepo.listByPet), Documentos
  (clinicalDocumentsRepo.listByPet). Cada pestaña muestra una tabla/lista de solo
  lectura con enlaces a crear en el módulo respectivo. Muestra edad derivada de birthDate.`,
  },
  {
    key: 'consultas',
    label: 'Consultas',
    task: `Módulo CONSULTAS. Crea:
- src/app/(app)/clinica/consultas/page.tsx: lista de consultas recientes del veterinario
  (consultationsRepo.listByVet(user.uid)) con estado y enlace al detalle.
- src/app/(app)/clinica/consultas/nueva/page.tsx: formulario de consulta (select de mascota
  cargando petsRepo.listByClinic; reason, anamnesis, physicalExam, weightKg, diagnosis,
  differentialDiagnosis, treatmentPlan, notes, status). DICTADO POR VOZ: integra
  useSpeechToText de '@/hooks/use-speech' con un botón de micrófono que rellena el campo
  enfocado (al menos anamnesis y diagnosis). Guarda con consultationsRepo.create
  (date: Date.now(), vetUid: user.uid, ownerId del pet seleccionado).
- src/app/(app)/clinica/consultas/[consultationId]/page.tsx: detalle de la consulta.`,
  },
  {
    key: 'prevencion',
    label: 'Prevención',
    task: `Módulo PREVENCIÓN (vacunación + desparasitación). Crea:
- src/app/(app)/clinica/prevencion/page.tsx: dos secciones con pestañas (Vacunación /
  Desparasitación). Cada una: select de mascota (petsRepo.listByClinic), formulario y la
  lista de registros de esa mascota.
  Vacuna: vaccineName, manufacturer, batch, appliedDate (date), nextDueDate, notes →
  vaccinationsRepo.create (petId, vetUid: user.uid).
  Desparasitación: product, type [interna/externa/mixta], appliedDate, weightKg, nextDueDate,
  notes → dewormingsRepo.create.`,
  },
  {
    key: 'formulas',
    label: 'Fórmulas',
    task: `Módulo FÓRMULAS / RECETAS. Crea:
- src/app/(app)/clinica/formulas/page.tsx: lista + botón nueva.
- src/app/(app)/clinica/formulas/nueva/page.tsx: formulario con select de mascota y una
  LISTA DINÁMICA de items (useFieldArray de react-hook-form): drug, presentation, dose,
  route [select], frequency, durationDays, instructions. Más diagnosis y notes.
  Guarda con prescriptionsRepo.create (petId, vetUid: user.uid, date: Date.now(), items).
- src/app/(app)/clinica/formulas/[prescriptionId]/page.tsx: vista imprimible de la receta.`,
  },
  {
    key: 'laboratorio',
    label: 'Laboratorio',
    task: `Módulo LABORATORIO. Crea:
- src/app/(app)/clinica/laboratorio/page.tsx: lista de exámenes + botón nuevo.
- src/app/(app)/clinica/laboratorio/nueva/page.tsx: formulario (select mascota; type,
  category, requestedDate, status [solicitado/en_proceso/completado/cancelado],
  interpretation, notes). Permite agregar resultados (parameter, value, unit, referenceRange,
  flag) como lista dinámica. Guarda con labExamsRepo.create (petId, vetUid: user.uid).`,
  },
  {
    key: 'historias',
    label: 'Historias IA',
    task: `Módulo HISTORIAS CLÍNICAS CON IA (núcleo del producto). Crea:
- src/app/(app)/clinica/historias/page.tsx: ("use client")
  1) Selección opcional de mascota (petsRepo.listByClinic).
  2) Subida de archivo (PDF/imagen/DOCX/TXT) con <input type=file>. Sube a Firebase Storage:
     import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; import { storage } from '@/lib/firebase';
     ruta: \`clinical/\${clinicId}/\${Date.now()}_\${file.name}\`. Valida tamaño < 20MB y tipo.
  3) Crea el doc con clinicalDocumentsRepo.create (fileName, fileType derivado del mime,
     storageUrl, storagePath, sizeBytes, uploadedBy: user.uid, uploadedAt: Date.now(),
     processingStatus: 'pending', source: 'upload', clinicId, petId?).
  4) Convierte el archivo a dataURI (FileReader) y llama processDocumentAction de
     '@/app/actions/process-document' con { documentId, clinicId, petId, fileType, dataUri, contentType }.
  5) Muestra la EXTRACCIÓN resultante (especie, síntomas, antecedentes, diagnóstico,
     tratamiento, medicamentos, evolución, resumen) y resalta extraction.missingFields como
     "campos faltantes por completar". Renderiza <AiDisclaimer/>.
  6) Botón "Generar simulación" que llama generateSimulationAction de
     '@/app/actions/generate-simulation' con { clinicalText: extraction/summary o rawText,
     level } (select de nivel Básico/Intermedio/Avanzado) y al recibir case llama
     casesRepo.create({ ...case, authorUid: user.uid, status: 'draft' }) (import casesRepo de
     '@/lib/repositories') y enlaza a /simulacion/[id].
  También ofrece pestaña "Dictar por voz" con useSpeechToText para crear una historia a partir
  de dictado (source: 'dictation', llama processDocumentAction con { rawText }).`,
  },
  {
    key: 'busqueda',
    label: 'Búsqueda IA',
    task: `Módulo BÚSQUEDA SEMÁNTICA. Crea:
- src/app/(app)/clinica/busqueda/page.tsx: ("use client") un buscador con textarea
  (ej. "perro con vómito, fiebre y diarrea") que llama semanticSearchAction de
  '@/app/actions/semantic-search' con { query, clinicId }. Muestra los resultados
  (SemanticSearchResult[]): resumen/extracción, distancia (como % de similitud aprox.),
  enlace a la mascota si petId existe. Renderiza <AiDisclaimer/> y maneja el caso
  ok:false (credenciales faltantes) con un aviso claro.`,
  },
  {
    key: 'dashboard-clinico',
    label: 'Dashboard clínico',
    task: `Crea el panel de inicio del módulo clínico:
- src/app/(app)/clinica/page.tsx: tarjetas con totales (mascotas, propietarios, consultas,
  documentos) leyendo *Repo.listByClinic(clinicId) y mostrando .length, además de accesos
  rápidos (links) a cada submódulo. Muestra las últimas 5 consultas y documentos recientes.`,
  },
  {
    key: 'admin-config',
    label: 'Configuración admin',
    task: `Módulo ADMINISTRACIÓN / CONFIGURACIÓN (seguridad y privacidad). Crea:
- src/app/(app)/admin/configuracion/page.tsx: ("use client") editor de SystemSettings
  (settingsRepo.get / settingsRepo.set('global', data)): maxUploadMb, allowedFileTypes
  (checkboxes pdf/image/docx/txt), aiEnabled, semanticSearchEnabled, ttsEnabled, sttEnabled,
  aiDisclaimer (textarea, default DEFAULT_AI_DISCLAIMER). Y gestión de VETERINARIAS:
  clinicsRepo.listActive + formulario para crear (name, legalId, address, phone, email, city,
  active) → clinicsRepo.create. Protege solo admin (ya hay layout admin con requiredRole).
  NOTA: este archivo va bajo /admin que ya tiene su propio layout de rol admin.`,
  },
];

phase('Módulos UI');

const FILES_SCHEMA = {
  type: 'object',
  properties: {
    module: { type: 'string' },
    filesCreated: { type: 'array', items: { type: 'string' } },
    note: { type: 'string' },
  },
  required: ['module', 'filesCreated', 'note'],
  additionalProperties: false,
};

const results = await parallel(
  MODULES.map((m) => () =>
    agent(
      `${CONTRACT}\n\n=== TU MÓDULO: ${m.label} ===\n${m.task}\n\n` +
        `Lee primero src/components/profesor/create-case-form.tsx y src/lib/types.ts (secciones nuevas) ` +
        `y src/lib/repositories.clinical.ts para confirmar firmas. Luego crea los archivos. ` +
        `Asegúrate de que TypeScript compile (imports correctos, "use client" donde haya hooks/eventos).`,
      { label: `ui:${m.key}`, phase: 'Módulos UI', schema: FILES_SCHEMA }
    )
  )
);

const ok = results.filter(Boolean);
log(`Módulos completados: ${ok.length}/${MODULES.length}`);
return { modules: ok };
