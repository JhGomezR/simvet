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
};

export type Vitals = {
  heartRate: number;
  respiratoryRate: number;
  temperature: number;
  perfusionStatus: 'Normal' | 'Poor' | 'Adequate';
  consciousnessLevel: 'Alert' | 'Dull' | 'Comatose';
};

export type ClinicalCase = {
  id: string;
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
