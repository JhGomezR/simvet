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
