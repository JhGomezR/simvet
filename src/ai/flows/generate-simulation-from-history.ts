'use server';
/**
 * @fileOverview Flujo Genkit: genera un caso de simulacion a partir de una
 * historia clinica real y una base de conocimiento anonima de la clinica.
 *
 * El contexto agregado sirve para reconocer patrones clinicos frecuentes sin
 * reutilizar datos sensibles ni copiar casos reales literalmente.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const LevelEnum = z.enum(['Básico', 'Intermedio', 'Avanzado']);

const GeneratedCaseSchema = z.object({
  name: z.string().describe('Nombre del caso clinico simulado.'),
  description: z.string().describe('Descripcion breve del escenario.'),
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
    .describe('Hallazgos del examen fisico.'),
  differentials: z
    .array(z.object({ diagnosis: z.string(), isCorrect: z.boolean() }))
    .describe('Diagnosticos diferenciales; marca cual es el correcto.'),
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
  knowledgeBaseContext?: string;
};
export type GeneratedCase = z.infer<typeof GeneratedCaseSchema>;

const prompt = ai.definePrompt({
  name: 'generateSimulationFromHistoryPrompt',
  input: {
    schema: z.object({
      clinicalText: z.string(),
      level: LevelEnum,
      knowledgeBaseContext: z.string().optional(),
    }),
  },
  output: { schema: GeneratedCaseSchema },
  prompt: `Eres un docente de medicina veterinaria. A partir de la historia clinica real
de abajo, diseña un caso de simulacion para estudiantes de nivel {{level}}.

Pautas segun el nivel:
- Básico: signos claros, pocas distracciones, diagnostico relativamente directo.
- Intermedio: incluye diferenciales plausibles y algun dato confuso.
- Avanzado: caso complejo, comorbilidades, requiere razonamiento fino.

ANONIMIZA:
- No uses nombres reales de propietarios, pacientes, telefonos, correos, direcciones ni identificadores.
- No copies textos literalmente de historias previas.
- Usa la base de conocimiento solo para reconocer patrones clinicos y enriquecer el razonamiento.

Las preguntas para el estudiante deben evaluar diagnostico, justificacion y tratamiento.

{{#if knowledgeBaseContext}}
BASE DE CONOCIMIENTO CLINICA ANONIMIZADA:
---
{{knowledgeBaseContext}}
---
{{/if}}

HISTORIA CLINICA FUENTE:
---
{{clinicalText}}
---`,
});

export async function generateSimulationFromHistory(
  input: GenerateSimulationInput
): Promise<GeneratedCase> {
  const { output } = await prompt({
    clinicalText: input.clinicalText.slice(0, 30000),
    level: input.level,
    knowledgeBaseContext: input.knowledgeBaseContext?.slice(0, 20000),
  });
  return output!;
}

ai.defineFlow(
  {
    name: 'generateSimulationFromHistoryFlow',
    inputSchema: z.object({
      clinicalText: z.string(),
      level: LevelEnum,
      knowledgeBaseContext: z.string().optional(),
    }),
    outputSchema: GeneratedCaseSchema,
  },
  async (input) => generateSimulationFromHistory(input)
);
