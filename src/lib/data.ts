import type { Student, Case, ClinicalCase, Feedback, CohortPerformanceData, CommonErrorData, StudentComparisonData } from './types';

export const studentData: Student = {
  name: 'Ana García',
  level: 'Intermedio',
  academicProgress: 75,
  averageScore: 88,
  triagePerformance: 92,
  avatarUrl: 'https://picsum.photos/seed/101/100/100',
};

export const caseHistory: Case[] = [
  { id: 'C001', name: 'Shock Hipovolémico en Canino', date: '2023-10-15', score: 92, status: 'Completado' },
  { id: 'C002', name: 'Obstrucción Uretral en Felino', date: '2023-10-22', score: 85, status: 'Completado' },
  { id: 'C003', name: 'Intoxicación por Chocolate en Canino', date: '2023-11-01', score: 90, status: 'Completado' },
  { id: 'C004', name: 'Golpe de Calor en Bulldog', date: '2023-11-05', score: 82, status: 'Completado' },
  { id: 'C005', name: 'Trauma por Caída en Felino', date: '2023-11-12', score: 95, status: 'Completado' },
];

export const clinicalCases: Record<string, ClinicalCase> = {
  '1': {
    id: '1',
    patient: {
      id: 'P001',
      name: 'Rocky',
      species: 'Canino',
      age: '5 años',
      weight: '25 kg',
      chiefComplaint: 'Dificultad respiratoria severa',
    },
    initialVitals: {
      heartRate: 160,
      respiratoryRate: 80,
      temperature: 39.5,
      perfusionStatus: 'Poor',
      consciousnessLevel: 'Dull',
    },
  },
};

export const mockFeedback: Feedback = {
  narrativeSummary: "El estudiante demostró una buena capacidad para estabilizar al paciente inicialmente, pero tardó en identificar la causa subyacente de la disnea. Las decisiones de tratamiento fueron adecuadas una vez establecido el diagnóstico.",
  criticalErrors: [
    { error: "Retraso en la administración de oxígeno", explanation: "En un paciente con disnea severa, la oxigenoterapia es prioritaria y debe iniciarse de inmediato para prevenir hipoxia.", recommendation: "Priorizar el ABC de la reanimación. Ante cualquier signo de dificultad respiratoria, asegurar la vía aérea y suplementar con oxígeno es el primer paso." },
    { error: "No se realizó una toracocentesis diagnóstica a tiempo", explanation: "Los signos clínicos eran sugestivos de un posible neumotórax o efusión pleural. La toracocentesis hubiera sido clave para un diagnóstico rápido.", recommendation: "Considerar procedimientos diagnósticos mínimamente invasivos y rápidos en situaciones de emergencia para descartar causas potencialmente mortales." },
  ],
  correctDecisions: [
    { decision: "Canalización de vía intravenosa y fluidoterapia inicial", explanation: "Asegurar un acceso venoso temprano fue crucial para la administración de fármacos y la estabilización hemodinámica del paciente." },
    { decision: "Solicitud de radiografía de tórax", explanation: "Fue la prueba de imagen correcta que permitió confirmar el diagnóstico final de edema pulmonar cardiogénico." },
  ],
  academicRecommendations: [
    "Revisar el protocolo de manejo del paciente disneico.",
    "Estudiar los diagnósticos diferenciales de dificultad respiratoria aguda en caninos.",
    "Practicar la técnica de toracocentesis en el laboratorio de habilidades.",
  ],
  comparisonWithIdealPathway: "La ruta clínica ideal implicaba oxigenoterapia inmediata, seguida de una ecografía FAST de tórax para identificar líquido libre, y una administración más temprana de diuréticos. El estudiante llegó al mismo tratamiento pero con un retraso diagnóstico.",
  finalScore: 85,
};

// Professor Data
export const cohortPerformanceData: CohortPerformanceData[] = [
    { month: 'Ene', "Puntaje Promedio": 78 },
    { month: 'Feb', "Puntaje Promedio": 81 },
    { month: 'Mar', "Puntaje Promedio": 80 },
    { month: 'Abr', "Puntaje Promedio": 85 },
    { month: 'May', "Puntaje Promedio": 88 },
    { month: 'Jun', "Puntaje Promedio": 90 },
];

export const commonErrorsData: CommonErrorData[] = [
    { error: 'Retraso en oxigenoterapia', Frecuencia: 28, knowledgeGap: 'Manejo inicial ABC' },
    { error: 'Dosis incorrecta de fármaco', Frecuencia: 22, knowledgeGap: 'Farmacología' },
    { error: 'Mala interpretación de ECG', Frecuencia: 18, knowledgeGap: 'Cardiología' },
    { error: 'Fallo en reconocer shock', Frecuencia: 15, knowledgeGap: 'Fisiopatología' },
    { error: 'No realizar examen neurológico', Frecuencia: 10, knowledgeGap: 'Neurología' },
];

export const studentComparisonData: StudentComparisonData[] = [
    { id: 'S001', name: 'Ana García', averageScore: 88, casesCompleted: 12, triagePerformance: 92 },
    { id: 'S002', name: 'Luis Pérez', averageScore: 82, casesCompleted: 11, triagePerformance: 85 },
    { id: 'S003', name: 'Carla Rojas', averageScore: 91, casesCompleted: 14, triagePerformance: 95 },
    { id: 'S004', name: 'Jorge Díaz', averageScore: 79, casesCompleted: 10, triagePerformance: 81 },
    { id: 'S005', name: 'Sofía Méndez', averageScore: 85, casesCompleted: 12, triagePerformance: 88 },
];
