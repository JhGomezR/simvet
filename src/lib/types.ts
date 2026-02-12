export type Student = {
  name: string;
  level: 'Básico' | 'Intermedio' | 'Avanzado';
  academicProgress: number;
  averageScore: number;
  triagePerformance: number;
  avatarUrl: string;
};

export type Case = {
  id: string;
  name: string;
  date: string;
  score: number;
  status: 'Completado' | 'En progreso';
};

export type Patient = {
  id: string;
  name: string;
  species: string;
  age: string;
  weight: string;
  chiefComplaint: string;
  imageUrl?: string;
  triage: 'Nivel I - Resucitación' | 'Nivel II - Emergencia' | 'Nivel III - Urgente';
};

export type Vitals = {
  heartRate: number;
  respiratoryRate: number;
  temperature: number;
  perfusionStatus: 'Normal' | 'Poor' | 'Adequate';
  consciousnessLevel: 'Alert' | 'Dull' | 'Comatose' | 'Estuporoso';
};

export type ClinicalCase = {
  id: string;
  name: string;
  description: string;
  difficulty: 'Básico' | 'Intermedio' | 'Avanzado';
  patient: Patient;
  initialVitals: Vitals;
};

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
    logicalReasoning: number; // A score from 0 to 100
};

// Professor types
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
