'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating personalized academic feedback for students
 * after completing a clinical case in the SimVet Urgencias simulator.
 *
 * - generatePersonalizedCaseFeedback - A function that generates the personalized feedback.
 * - GeneratePersonalizedCaseFeedbackInput - The input type for the feedback generation.
 * - GeneratePersonalizedCaseFeedbackOutput - The return type for the feedback generation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GeneratePersonalizedCaseFeedbackInputSchema = z.object({
  caseSummary: z.string().describe('A summary of the clinical case the student completed.'),
  studentActions: z.array(z.string()).describe('A list of actions and decisions made by the student during the case.'),
  criticalErrors: z.array(z.string()).describe('A list of critical errors identified in the student\u0027s performance.'),
  correctDecisions: z.array(z.string()).describe('A list of correct decisions made by the student.'),
  idealClinicalPathway: z.string().describe('A description of the ideal clinical pathway for the completed case.'),
  correctDiagnosis: z.string().optional().describe('El diagnostico final correcto del caso.'),
  studentDiagnosis: z.string().optional().describe('El diagnostico que propuso el estudiante.'),
  studentAnswers: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional()
    .describe('Respuestas del estudiante a las preguntas dirigidas del caso.'),
  activitySummary: z
    .string()
    .optional()
    .describe('Resumen de los tiempos de ejecucion por actividad.'),
  finalScore: z.number().describe('The student\u0027s final score for the case.'),
});

export type GeneratePersonalizedCaseFeedbackInput = z.infer<typeof GeneratePersonalizedCaseFeedbackInputSchema>;

const GeneratePersonalizedCaseFeedbackOutputSchema = z.object({
  narrativeSummary: z.string().describe('A narrative summary of the student\u0027s overall performance.'),
  criticalErrorsFeedback: z.array(z.object({
    error: z.string().describe('Description of the critical error.'),
    explanation: z.string().describe('Explanation of why it was an error and its consequences.'),
    recommendation: z.string().describe('Specific recommendation to avoid this error in the future.'),
  })).describe('Detailed feedback on critical errors, including explanations and recommendations.'),
  correctDecisionsExplanation: z.array(z.object({
    decision: z.string().describe('Description of the correct decision.'),
    explanation: z.string().describe('Explanation of why this decision was correct and its positive impact.'),
  })).describe('Explanation of correct decisions made by the student.'),
  academicRecommendations: z.array(z.string()).describe('General academic recommendations for improvement.'),
  diagnosisCorrect: z.boolean().describe('Si el diagnostico del estudiante coincide con el correcto.'),
  justificationScore: z.number().min(0).max(100).describe('Calidad del razonamiento/justificacion clinica (0-100).'),
  treatmentScore: z.number().min(0).max(100).describe('Adecuacion del tratamiento propuesto (0-100).'),
  rubricBreakdown: z
    .array(z.object({ criterion: z.string(), score: z.number(), max: z.number() }))
    .describe('Desglose por criterios de la rubrica de evaluacion.'),
  comparisonWithIdealPathway: z.string().describe('A comparison of the student\u0027s pathway with the ideal clinical pathway.'),
});

export type GeneratePersonalizedCaseFeedbackOutput = z.infer<typeof GeneratePersonalizedCaseFeedbackOutputSchema>;

const generatePersonalizedCaseFeedbackPrompt = ai.definePrompt({
  name: 'generatePersonalizedCaseFeedbackPrompt',
  input: { schema: GeneratePersonalizedCaseFeedbackInputSchema },
  output: { schema: GeneratePersonalizedCaseFeedbackOutputSchema },
  prompt: `You are an expert veterinary instructor providing personalized academic feedback to a student who has completed a clinical case simulation in SimVet Urgencias.

Your goal is to help the student learn effectively from their performance, reinforcing correct decisions and providing clear guidance on areas needing improvement. Be professional, academic, and constructive.

Here is the information about the completed case and the student's performance:

Case Summary: {{{caseSummary}}}
Student's Actions: {{{studentActions}}}
Critical Errors Made: {{{criticalErrors}}}
Correct Decisions Made: {{{correctDecisions}}}
Ideal Clinical Pathway: {{{idealClinicalPathway}}}
Correct Diagnosis: {{{correctDiagnosis}}}
Student's Proposed Diagnosis: {{{studentDiagnosis}}}
{{#if studentAnswers}}Student's Answers to Case Questions:
{{#each studentAnswers}}- Q: {{this.question}} — A: {{this.answer}}
{{/each}}{{/if}}
{{#if activitySummary}}Activity Timings: {{{activitySummary}}}{{/if}}

EVALUACIÓN ESTRUCTURADA (responsable, formativa):
- diagnosisCorrect: compara el diagnóstico del estudiante con el correcto (true/false).
- justificationScore (0-100): qué tan sólido fue el razonamiento clínico y la justificación.
- treatmentScore (0-100): qué tan adecuado fue el tratamiento propuesto vs. la ruta ideal.
- rubricBreakdown: desglosa la nota por criterios (p.ej. Triage, Anamnesis, Examen,
  Diagnóstico, Tratamiento), cada uno con score y max. Sé justo y explica en el resumen.
Student's Final Score: {{{finalScore}}}

Based on the above information, generate a comprehensive feedback report following the structured output format. Ensure the feedback is specific, actionable, and aligns with the expected academic rigor of a university setting.

When identifying critical errors, explain the gravity and potential consequences of each error and provide clear recommendations for how to avoid them. For correct decisions, explain why they were effective and what positive impact they had on the patient's outcome. Provide overall academic recommendations for further study or practice.

Be thorough and detailed in your feedback.`,
});

const generatePersonalizedCaseFeedbackFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedCaseFeedbackFlow',
    inputSchema: GeneratePersonalizedCaseFeedbackInputSchema,
    outputSchema: GeneratePersonalizedCaseFeedbackOutputSchema,
  },
  async (input) => {
    const { output } = await generatePersonalizedCaseFeedbackPrompt(input);
    return output!;
  }
);

export async function generatePersonalizedCaseFeedback(
  input: GeneratePersonalizedCaseFeedbackInput
): Promise<GeneratePersonalizedCaseFeedbackOutput> {
  return generatePersonalizedCaseFeedbackFlow(input);
}
