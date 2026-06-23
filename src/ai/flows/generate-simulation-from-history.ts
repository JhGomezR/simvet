'use server';
/**
 * @fileOverview Flujo Genkit: genera un CASO DE SIMULACIÓN a partir de una
 * historia clínica REAL (flujo G de SimVet Clinical).
 *
 * Produce un escenario pedagógico con motivo de consulta, paciente, vitales,
 * anamnesis, examen físico, preguntas para el estudiante, diagnósticos
 * diferenciales y recomendaciones de tratamiento, calibrado al nivel pedido.
 *
 * El paciente se ANONIMIZA: no se copian nombres reales del propietario.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LevelEnum = z.enum(['Básico', 'Intermedio', 'Avanzado']);

const GeneratedCaseSchema = z.object({
  name: z.string().describe('Nombre del caso clínico simulado.'),
  description: z.string().describe('Descripción breve del escenario.'),
  difficulty: LevelEnum,
  patient: z.object({
    name: z.string(),
    species: z.string(),
    breed: z.string().optional(),
    age: z.string(),
    weightKg: z.number(),
    sex: z.string().optional(),
    chiefComplaint: z.string().describe('Motivo de consulta'),
    triage: z.enum(['Nivel I - Resucitación', 'Nivel II - Emergencia', 'Nivel III - Urgente']),
  }),
  initialVitals: z.object({
    heartRate: z.number(),
    respiratoryRate: z.number(),
    temperature: z.number(),
    perfusionStatus: z.enum(['Normal', 'Adecuada', 'Pobre', 'Crítica']),
    consciousnessLevel: z.enum(['Alerta', 'Apagado', 'Estuporoso', 'Comatoso']),
  }),
  anamnesis: z
    .array(z.object({ text: z.string(), ownerResponse: z.string(), relevance: z.enum(['alta', 'media', 'baja']) }))
    .describe('Preguntas de anamnesis con la respuesta del dueño.'),
  physicalExam: z
    .array(z.object({ technique: z.string(), finding: z.string(), isAbnormal: z.boolean() }))
    .describe('Hallazgos del examen físico.'),
  differentials: z
    .array(z.object({ diagnosis: z.string(), isCorrect: z.boolean() }))
    .describe('Diagnósticos diferenciales; marca cuál es el correcto.'),
  finalDiagnosis: z.string(),
  treatmentPlan: z.array(z.object({ name: z.string(), isRecommended: z.boolean() })),
  studentQuestions: z
    .array(
      z.object({
        prompt: z.string(),
        kind: z.enum(['diagnostico', 'justificacion', 'tratamiento', 'abierta']),
        correctAnswer: z.string().optional(),
        explanation: z.string().optional(),
      })
    )
    .describe('Preguntas dirigidas al estudiante para evaluar su razonamiento.'),
});

export type GenerateSimulationInput = {
  clinicalText: string;
  level: z.infer<typeof LevelEnum>;
};
export type GeneratedCase = z.infer<typeof GeneratedCaseSchema>;

const prompt = ai.definePrompt({
  name: 'generateSimulationFromHistoryPrompt',
  input: { schema: z.object({ clinicalText: z.string(), level: LevelEnum }) },
  output: { schema: GeneratedCaseSchema },
  prompt: `Eres un docente de medicina veterinaria. A partir de la historia clínica REAL
de abajo, diseña un CASO DE SIMULACIÓN para estudiantes de nivel {{level}}.

Pautas según el nivel:
- Básico: signos claros, pocas distracciones, diagnóstico relativamente directo.
- Intermedio: incluye diferenciales plausibles y algún dato confuso.
- Avanzado: caso complejo, comorbilidades, requiere razonamiento fino.

ANONIMIZA: no uses el nombre real del propietario. Inventa coherentemente los
valores que falten (vitales, peso) de forma clínicamente verosímil para la especie.
Las preguntas para el estudiante deben evaluar diagnóstico, justificación y tratamiento.

HISTORIA CLÍNICA REAL:
---
{{clinicalText}}
---`,
});

export async function generateSimulationFromHistory(
  input: GenerateSimulationInput
): Promise<GeneratedCase> {
  const { output } = await prompt({ clinicalText: input.clinicalText.slice(0, 30000), level: input.level });
  return output!;
}

const generateSimulationFromHistoryFlow = ai.defineFlow(
  {
    name: 'generateSimulationFromHistoryFlow',
    inputSchema: z.object({ clinicalText: z.string(), level: LevelEnum }),
    outputSchema: GeneratedCaseSchema,
  },
  async (input) => generateSimulationFromHistory(input)
);

export { generateSimulationFromHistoryFlow };
