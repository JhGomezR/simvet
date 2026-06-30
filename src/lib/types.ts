// ============================================================
// USER & AUTH
// ============================================================

// Roles ampliados (SimVet Clinical).
// Retrocompatibles: 'student' | 'professor' | 'admin' siguen existiendo.
// Nuevos roles clínicos: 'veterinarian' (veterinario) | 'assistant' (auxiliar).
export type UserRole = 'student' | 'professor' | 'admin' | 'veterinarian' | 'assistant';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  professor: 'Docente',
  veterinarian: 'Veterinario',
  assistant: 'Auxiliar',
  student: 'Estudiante',
};

// Roles con acceso al módulo de gestión clínica (datos reales de pacientes).
export const CLINICAL_ROLES: UserRole[] = ['admin', 'veterinarian', 'assistant', 'professor'];

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  mustChangePassword?: boolean;
  // Vínculo a la veterinaria a la que pertenece (clínico)
  clinicId?: string;
  // Estudiante
  level?: 'Básico' | 'Intermedio' | 'Avanzado';
  academicProgress?: number;
  averageScore?: number;
  triagePerformance?: number;
  // Profesor
  classIds?: string[];
  createdAt: number; // epoch ms
  updatedAt: number;
};

// Alias retro-compatible para componentes existentes
export type Student = {
  name: string;
  level: 'Básico' | 'Intermedio' | 'Avanzado';
  academicProgress: number;
  averageScore: number;
  triagePerformance: number;
  avatarUrl: string;
};

// ============================================================
// HISTORIAL DE CASOS (Dashboard)
// ============================================================

export type Case = {
  id: string;
  name: string;
  date: string;
  score: number;
  status: 'Completado' | 'En progreso';
};

// ============================================================
// PACIENTE
// ============================================================

export type Species = 'Canino' | 'Felino' | 'Equino' | 'Bovino' | 'Aviar' | 'Otro';
export type Sex = 'Macho' | 'Hembra' | 'Macho castrado' | 'Hembra esterilizada';
export type TriageLevel = 'Nivel I - Resucitación' | 'Nivel II - Emergencia' | 'Nivel III - Urgente';

export type Patient = {
  id: string;
  name: string;
  species: Species | string;
  breed?: string;
  age: string;
  weightKg: number;
  sex?: Sex;
  chiefComplaint: string;
  imageUrl?: string;
  triage: TriageLevel;
};

// ============================================================
// SIGNOS VITALES (extendidos)
// ============================================================

export type PerfusionStatus = 'Normal' | 'Adecuada' | 'Pobre' | 'Crítica';
export type ConsciousnessLevel = 'Alerta' | 'Apagado' | 'Estuporoso' | 'Comatoso';
export type MucousColor = 'Rosadas' | 'Pálidas' | 'Cianóticas' | 'Ictéricas' | 'Congestivas';

export type Vitals = {
  heartRate: number;          // lpm
  respiratoryRate: number;    // rpm
  temperature: number;        // °C
  systolicBP?: number;        // mmHg
  diastolicBP?: number;       // mmHg
  spO2?: number;              // %
  capillaryRefillTime?: number; // segundos
  mucousColor?: MucousColor;
  lactate?: number;           // mmol/L
  perfusionStatus: PerfusionStatus;
  consciousnessLevel: ConsciousnessLevel;
};

// ============================================================
// MODELO AMPLIADO DE CASO CLÍNICO (Fase 3)
// ============================================================

export type AnamnesisQuestion = {
  id: string;
  text: string;              // Lo que el estudiante pregunta
  ownerResponse: string;     // Lo que responde el dueño
  relevance: 'alta' | 'media' | 'baja';
  category?: 'historial' | 'ambiente' | 'alimentacion' | 'vacunas' | 'sintomas' | 'otro';
};

export type PhysicalExamFinding = {
  id: string;
  system: 'cardiovascular' | 'respiratorio' | 'digestivo' | 'neurologico' | 'musculoesqueletico' | 'tegumentario' | 'genitourinario' | 'linfatico' | 'general';
  technique: string;         // Ej: "Auscultación cardíaca", "Palpación abdominal"
  finding: string;           // Lo que el estudiante descubre
  isAbnormal: boolean;
  relevance: 'alta' | 'media' | 'baja';
};

export type DiagnosticTest = {
  id: string;
  name: string;              // Ej: "Hemograma completo"
  category: 'hematologia' | 'bioquimica' | 'imagen' | 'orina' | 'gasometria' | 'microbiologia' | 'citologia' | 'otro';
  costPoints?: number;       // "costo" pedagógico de pedir esta prueba
  timeMinutes?: number;      // tiempo simulado
  results: TestResult[];
  interpretation?: string;   // Para el feedback
};

export type TestResult = {
  parameter: string;         // Ej: "Hematocrito"
  value: number | string;
  unit?: string;
  referenceRange?: string;   // Ej: "37-55%"
  flag?: 'normal' | 'bajo' | 'alto' | 'crítico';
};

export type DifferentialDiagnosis = {
  id: string;
  diagnosis: string;
  probabilityInitial: number; // 0-100, probabilidad a priori del caso
  isCorrect: boolean;         // ¿es el dx final?
  ruleOutBy?: string[];       // qué pruebas/hallazgos descartan este dx
  confirmBy?: string[];       // qué confirma este dx
};

export type TreatmentAction = {
  id: string;
  name: string;              // Ej: "Fluidoterapia con LRS"
  category: 'fluidos' | 'oxigeno' | 'farmaco' | 'procedimiento' | 'monitoreo' | 'cirugia' | 'soporte';
  drug?: string;             // Si aplica
  doseMgPerKg?: number;
  route?: 'IV' | 'IM' | 'SC' | 'PO' | 'IO' | 'IN' | 'tópica' | 'rectal';
  frequency?: string;        // Ej: "Bolo único", "cada 8h"
  expectedEffect?: {
    vitals?: Partial<Vitals>;
    description?: string;
  };
  isRecommended: boolean;    // ¿está en la ruta ideal?
};

export type CaseRubric = {
  triageWeight: number;
  anamnesisWeight: number;
  examWeight: number;
  diagnosisWeight: number;
  treatmentWeight: number;
  communicationWeight: number; // suma = 100
};

export type ClinicalCase = {
  id: string;
  name: string;
  description: string;
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  status?: 'draft' | 'published';
  authorUid?: string;
  patient: Patient;
  initialVitals: Vitals;

  // Campos ampliados (Fase 3) - opcionales para retrocompatibilidad
  anamnesis?: AnamnesisQuestion[];
  physicalExam?: PhysicalExamFinding[];
  diagnosticTests?: DiagnosticTest[];
  differentials?: DifferentialDiagnosis[];
  finalDiagnosis?: string;
  treatmentPlan?: TreatmentAction[];
  idealPathway?: string[];   // orden esperado de acciones (ids)
  rubric?: CaseRubric;

  // Factores narrativos opcionales
  environmentalFactors?: string;
  medicalFactors?: string;
  otherFactors?: string;

  // Vínculo con una historia clínica REAL que originó el caso simulado.
  // Permite "Generar simulación a partir de este caso" (flujo G).
  sourceDocumentId?: string;
  sourcePetId?: string;
  generatedByAI?: boolean;

  // Preguntas dirigidas al estudiante (evaluación guiada).
  studentQuestions?: SimulationQuestion[];

  createdAt?: number;
  updatedAt?: number;
};

export type SimulationQuestion = {
  id: string;
  prompt: string;                 // Pregunta al estudiante
  kind: 'diagnostico' | 'justificacion' | 'tratamiento' | 'abierta';
  options?: string[];             // Para opción múltiple
  correctAnswer?: string;         // Respuesta esperada / clave
  explanation?: string;           // Por qué
};

// ============================================================
// INTENTO DE ESTUDIANTE (Attempt)
// ============================================================

export type AttemptEvent = {
  id: string;
  timestamp: number;
  type: 'evaluation' | 'anamnesis' | 'exam' | 'test' | 'differential' | 'treatment' | 'note';
  actionId: string;          // referencia al id dentro del caso
  actionLabel: string;
  payload?: Record<string, unknown>;
};

export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned';

export type Attempt = {
  id: string;
  studentUid: string;
  caseId: string;
  classId?: string;
  status: AttemptStatus;
  startedAt: number;
  finishedAt?: number;
  finalScore?: number;
  vitalsTimeline?: Vitals[];
  events?: AttemptEvent[];   // también puede estar como subcolección
  feedback?: Feedback;
  activityTimings?: ActivityTiming[];
  studentAnswers?: { questionId: string; answer: string }[];
  totalDurationMs?: number;
};

// ============================================================
// FEEDBACK Y MÉTRICAS
// ============================================================

export type Feedback = {
  narrativeSummary: string;
  criticalErrors: { error: string; explanation: string; recommendation: string }[];
  correctDecisions: { decision: string; explanation: string }[];
  academicRecommendations: string[];
  comparisonWithIdealPathway: string;
  finalScore: number;
  // Evaluación detallada (SimVet Clinical)
  diagnosisCorrect?: boolean;
  justificationScore?: number;   // 0-100 — calidad del razonamiento clínico
  treatmentScore?: number;       // 0-100 — adecuación del tratamiento propuesto
  rubricBreakdown?: { criterion: string; score: number; max: number }[];
};

// Tiempos de ejecución por actividad (flujo: "Tiempos de ejecución de cada actividad")
export type ActivityTiming = {
  activity: string;              // p.ej. "Anamnesis", "Examen físico", "Diagnóstico"
  startedAt: number;
  finishedAt?: number;
  durationMs?: number;
};

export type AcademicMetrics = {
  score: number;
  criticalErrors: string[];
  omissions: string[];
  logicalReasoning: number; // 0-100
};

// ============================================================
// PROFESOR / COHORTE
// ============================================================

export type CohortPerformanceData = {
  month: string;
  "Puntaje Promedio": number;
};

export type CommonErrorData = {
  error: string;
  Frecuencia: number;
  knowledgeGap: string;
};

export type StudentComparisonData = {
  id: string;
  name: string;
  averageScore: number;
  casesCompleted: number;
  triagePerformance: number;
};

// ============================================================
// CLASE / CURSO
// ============================================================

export type ClassRoom = {
  id: string;
  name: string;
  professorUid: string;
  studentUids: string[];
  assignedCaseIds: string[];
  createdAt: number;
  updatedAt: number;
};

// ════════════════════════════════════════════════════════════
// SIMVET CLINICAL — GESTIÓN VETERINARIA (datos REALES)
// Separados del dominio de simulación. `isSimulated` nunca aplica
// aquí: estas colecciones contienen pacientes reales.
// ════════════════════════════════════════════════════════════

/** Campos comunes de auditoría para entidades clínicas. */
export type Auditable = {
  createdAt: number;
  updatedAt: number;
  createdBy?: string; // uid
};

// ── Veterinaria ─────────────────────────────────────────────
export type Clinic = {
  id: string;
  name: string;
  legalId?: string;        // NIT / RUT
  address?: string;
  phone?: string;
  email?: string;
  city?: string;
  logoUrl?: string;
  active: boolean;
} & Auditable;

// ── Propietario ─────────────────────────────────────────────
export type Owner = {
  id: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  idDocument?: string;     // cédula / documento
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
} & Auditable;

export const ownerFullName = (o: Pick<Owner, 'firstName' | 'lastName'>) =>
  `${o.firstName} ${o.lastName}`.trim();

// ── Mascota / Paciente real ─────────────────────────────────
export type PetSex = 'Macho' | 'Hembra' | 'Macho castrado' | 'Hembra esterilizada' | 'Desconocido';

export type Pet = {
  id: string;
  clinicId: string;
  ownerId: string;
  name: string;
  species: Species | string;
  breed?: string;
  sex?: PetSex;
  birthDate?: string;       // ISO date — la edad se deriva
  approxAge?: string;       // si no hay fecha exacta
  weightKg?: number;
  color?: string;
  microchip?: string;
  sterilized?: boolean;
  allergies?: string;
  chronicConditions?: string;
  bloodType?: string;
  photoUrl?: string;
  deceased?: boolean;
  notes?: string;
} & Auditable;

// ── Consulta médica ─────────────────────────────────────────
export type ConsultationStatus = 'abierta' | 'cerrada' | 'cancelada';

export type Consultation = {
  id: string;
  clinicId: string;
  petId: string;
  ownerId: string;
  vetUid: string;           // veterinario responsable
  date: number;             // epoch ms
  reason: string;           // motivo de consulta
  anamnesis?: string;
  physicalExam?: string;
  weightKg?: number;
  vitals?: Partial<Vitals>;
  diagnosis?: string;
  differentialDiagnosis?: string;
  treatmentPlan?: string;
  notes?: string;
  status: ConsultationStatus;
  // Transcripciones dictadas por voz (STT)
  dictation?: string;
} & Auditable;

// ── Vacunación ──────────────────────────────────────────────
export type Vaccination = {
  id: string;
  clinicId: string;
  petId: string;
  vetUid: string;
  vaccineName: string;
  manufacturer?: string;
  batch?: string;
  appliedDate: number;      // epoch ms
  nextDueDate?: number;     // refuerzo
  notes?: string;
} & Auditable;

// ── Desparasitación ─────────────────────────────────────────
export type DewormingType = 'interna' | 'externa' | 'mixta';

export type Deworming = {
  id: string;
  clinicId: string;
  petId: string;
  vetUid: string;
  product: string;
  type: DewormingType;
  appliedDate: number;
  weightKg?: number;
  nextDueDate?: number;
  notes?: string;
} & Auditable;

// ── Fórmula / receta médica ─────────────────────────────────
export type PrescriptionItem = {
  drug: string;
  presentation?: string;    // p.ej. "Tableta 50 mg"
  dose?: string;            // p.ej. "5 mg/kg"
  route?: 'IV' | 'IM' | 'SC' | 'PO' | 'IO' | 'IN' | 'tópica' | 'rectal' | 'oftálmica' | 'ótica';
  frequency?: string;       // p.ej. "cada 12h"
  durationDays?: number;
  instructions?: string;
};

export type Prescription = {
  id: string;
  clinicId: string;
  petId: string;
  consultationId?: string;
  vetUid: string;
  date: number;
  items: PrescriptionItem[];
  diagnosis?: string;
  notes?: string;
} & Auditable;

// ── Examen de laboratorio ───────────────────────────────────
export type LabExamStatus = 'solicitado' | 'en_proceso' | 'completado' | 'cancelado';

export type LabExam = {
  id: string;
  clinicId: string;
  petId: string;
  consultationId?: string;
  vetUid: string;
  type: string;             // p.ej. "Hemograma", "Química sanguínea"
  category?: DiagnosticTest['category'];
  requestedDate: number;
  resultDate?: number;
  status: LabExamStatus;
  results?: TestResult[];   // reutiliza el tipo del simulador
  interpretation?: string;
  fileUrl?: string;         // PDF/imagen del resultado
  notes?: string;
} & Auditable;

// ── Documento clínico adjunto / historia subida (con IA) ────
export type ClinicalFileType = 'pdf' | 'image' | 'docx' | 'txt' | 'other';
export type DocProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'queued_ai';

/** Extracción estructurada producida por la IA a partir del documento. */
export type ClinicalExtraction = {
  species?: string;
  breed?: string;
  patientName?: string;
  ownerName?: string;
  age?: string;
  sex?: string;
  weight?: string;
  symptoms?: string[];
  antecedents?: string[];
  diagnosis?: string[];
  treatment?: string[];
  medications?: string[];
  evolution?: string;
  summary?: string;
  // Campos que la IA detectó como FALTANTES y deberían completarse a mano (flujo D)
  missingFields?: string[];
};

export type ClinicalDocument = {
  id: string;
  clinicId: string;
  petId?: string;            // puede subirse antes de asociar a una mascota
  consultationId?: string;
  fileName: string;
  fileType: ClinicalFileType;
  storageUrl: string;
  storagePath: string;
  sizeBytes: number;
  uploadedBy: string;        // uid
  uploadedAt: number;
  extractedText?: string;
  extraction?: ClinicalExtraction;
  processingStatus: DocProcessingStatus;
  processingError?: string;
  source: 'upload' | 'dictation';
} & Auditable;

// ── Fragmento + embedding para búsqueda semántica (pgvector → Firestore Vector) ──
export type DocumentChunk = {
  id: string;
  documentId: string;
  clinicId: string;
  petId?: string;
  text: string;
  // Vector de embedding (Gemini text-embedding-004 → 768 dims).
  // En Firestore se guarda con FieldValue.vector(...).
  embedding?: number[];
  index: number;
  createdAt: number;
};

/** Resultado de una búsqueda semántica de casos similares. */
export type SemanticSearchResult = {
  documentId: string;
  petId?: string;
  chunkText: string;
  distance: number;          // menor = más similar
  extraction?: ClinicalExtraction;
};

// ── Configuración del sistema (seguridad/privacidad administrable) ──
export type SystemSettings = {
  id: string;                // singleton: 'global'
  maxUploadMb: number;
  allowedFileTypes: ClinicalFileType[];
  aiEnabled: boolean;
  semanticSearchEnabled: boolean;
  ttsEnabled: boolean;
  sttEnabled: boolean;
  // Disclaimer de IA responsable
  aiDisclaimer: string;
  // Permisos por rol (módulo → roles permitidos)
  modulePermissions?: Record<string, UserRole[]>;
  updatedAt: number;
  updatedBy?: string;
};

export const DEFAULT_AI_DISCLAIMER =
  'Este análisis es orientativo y generado por inteligencia artificial. ' +
  'Debe ser validado por un médico veterinario. No constituye un diagnóstico ' +
  'definitivo ni reemplaza el criterio profesional.';

// ── Voz: STT / TTS ──────────────────────────────────────────
export type TranscriptionResult = {
  text: string;
  language?: string;
  durationSec?: number;
};

export type SpeechResult = {
  audioBase64: string;       // data URI o base64 del audio generado
  mimeType: string;          // p.ej. "audio/wav"
};
