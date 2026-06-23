'use server';
/**
 * @fileOverview This file implements a Genkit flow for analyzing student cohort errors.
 *
 * - analyzeCohortErrors - A function that handles the analysis of common student errors and knowledge gaps.
 * - AnalyzeCohortErrorsInput - The input type for the analyzeCohortErrors function.
 * - AnalyzeCohortErrorsOutput - The return type for the analyzeCohortErrors function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AnalyzeCohortErrorsInputSchema = z.object({
  cohortResults: z.array(
    z.object({
      studentId: z.string().describe('Unique identifier for the student.'),
      caseName: z.string().describe('Name of the clinical case.'),
      errors: z.array(z.string()).describe('List of specific errors made by the student in this case.'),
    })
  ).describe('A list of academic results for the student cohort, detailing errors made in clinical cases.'),
});
export type AnalyzeCohortErrorsInput = z.infer<typeof AnalyzeCohortErrorsInputSchema>;

const AnalyzeCohortErrorsOutputSchema = z.object({
  overallSummary: z.string().describe('An overall summary of the cohort performance and identified trends.'),
  commonErrorsMap: z.array(
    z.object({
      error: z.string().describe('Description of the common error.'),
      frequency: z.number().describe('Number of times this error occurred across the cohort.'),
      exampleStudents: z.array(z.string()).describe('List of student IDs who frequently made this error.'),
      associatedKnowledgeGap: z.string().describe('The knowledge gap associated with this error.'),
    })
  ).describe('A map highlighting frequent errors, their occurrences, and associated knowledge gaps.'),
  curriculumAdaptationSuggestions: z.array(z.string()).describe('Specific suggestions for adapting the curriculum based on identified knowledge gaps.'),
});
export type AnalyzeCohortErrorsOutput = z.infer<typeof AnalyzeCohortErrorsOutputSchema>;

export async function analyzeCohortErrors(input: AnalyzeCohortErrorsInput): Promise<AnalyzeCohortErrorsOutput> {
  return analyzeCohortErrorsFlow(input);
}

const analyzeCohortErrorsPrompt = ai.definePrompt({
  name: 'analyzeCohortErrorsPrompt',
  input: { schema: AnalyzeCohortErrorsInputSchema },
  output: { schema: AnalyzeCohortErrorsOutputSchema },
  prompt: `You are an expert academic analyst for "SimVet Urgencias", a veterinary clinical case simulator platform. Your task is to analyze the provided student cohort data, specifically focusing on the errors they made, to identify common patterns, underlying knowledge gaps, and provide actionable suggestions for curriculum adaptation.

Analyze the following student cohort results, which detail errors made in various clinical cases:

{{json cohortResults}}

Based on this data, provide:
1. An overall summary of the cohort's performance and the most significant trends in errors.
2. A detailed map of frequent errors. For each common error, identify its description, how many times it occurred, provide example student IDs who frequently made this error, and infer the associated knowledge gap.
3. Concrete suggestions for adapting the curriculum or teaching strategies to address these identified knowledge gaps.

Return a structured JSON object that strictly conforms to the requested output schema.`,
});

const analyzeCohortErrorsFlow = ai.defineFlow(
  {
    name: 'analyzeCohortErrorsFlow',
    inputSchema: AnalyzeCohortErrorsInputSchema,
    outputSchema: AnalyzeCohortErrorsOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeCohortErrorsPrompt(input);
    return output!;
  }
);
