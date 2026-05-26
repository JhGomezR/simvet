// ============================================================
// USER & AUTH
// ============================================================

export type UserRole = 'student' | 'professor' | 'admin';

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  mustChangePassword?: boolean;
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

  createdAt?: number;
  updatedAt?: number;
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
