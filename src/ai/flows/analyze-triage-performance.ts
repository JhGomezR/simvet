'use server';
/**
 * @fileOverview This file implements a Genkit flow to analyze a student's triage performance.
 *
 * - analyzeTriagePerformance - A function that handles the analysis of student triage decisions.
 * - AnalyzeTriagePerformanceInput - The input type for the analyzeTriagePerformance function.
 * - AnalyzeTriagePerformanceOutput - The return type for the analyzeTriagePerformance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeTriagePerformanceInputSchema = z.object({
  initialPatientState: z.string().describe('Detailed description of the patient\'s condition at the beginning of the triage process, including chief complaint, vital signs, and any observable symptoms.'),
  studentActions: z.array(z.string()).describe('A list of actions taken by the student during the triage, such as "checked airway", "administered oxygen", "asked about medical history".'),
  patientEvolution: z.string().describe('Detailed description of how the patient\'s condition evolved after the student\'s actions, indicating improvement, worsening, or stability.'),
});
export type AnalyzeTriagePerformanceInput = z.infer<typeof AnalyzeTriagePerformanceInputSchema>;

const AnalyzeTriagePerformanceOutputSchema = z.object({
  overallAssessment: z.string().describe('A comprehensive AI-generated assessment of the student\'s triage performance, summarizing strengths and weaknesses.'),
  correctActions: z.array(z.string()).describe('A list of specific, correct actions performed by the student during triage.'),
  areasForImprovement: z.array(z.string()).describe('A list of specific areas or actions where the student could have performed better or needs to improve.'),
  triageScore: z.number().int().min(0).max(100).describe('A numerical score (0-100) representing the student\'s triage performance.'),
});
export type AnalyzeTriagePerformanceOutput = z.infer<typeof AnalyzeTriagePerformanceOutputSchema>;

export async function analyzeTriagePerformance(input: AnalyzeTriagePerformanceInput): Promise<AnalyzeTriagePerformanceOutput> {
  return analyzeTriagePerformanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeTriagePerformancePrompt',
  input: {schema: AnalyzeTriagePerformanceInputSchema},
  output: {schema: AnalyzeTriagePerformanceOutputSchema},
  prompt: `You are an expert veterinary emergency specialist. Your task is to analyze a student's triage performance based on the initial patient state, the actions they took, and how the patient's condition evolved. Provide a comprehensive assessment, highlight correct actions, identify areas for improvement, and assign a triage score from 0 to 100.\n\nInitial Patient State:\n{{{initialPatientState}}}\n\nStudent Actions Taken:\n{{#each studentActions}}- {{{this}}}\n{{/each}}\n\nPatient Evolution After Actions:\n{{{patientEvolution}}}\n\nBased on this information, provide your detailed analysis.`,
});

const analyzeTriagePerformanceFlow = ai.defineFlow(
  {
    name: 'analyzeTriagePerformanceFlow',
    inputSchema: AnalyzeTriagePerformanceInputSchema,
    outputSchema: AnalyzeTriagePerformanceOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
