'use server';
/**
 * @fileOverview This file implements a Genkit flow to generate dynamic, realistic responses
 * from a patient's owner based on a student's interrogation and the current clinical scenario.
 *
 * - generateDynamicOwnerResponses - A function that handles generating the owner's response.
 * - GenerateDynamicOwnerResponsesInput - The input type for the generateDynamicOwnerResponses function.
 * - GenerateDynamicOwnerResponsesOutput - The return type for the generateDynamicOwnerResponses function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDynamicOwnerResponsesInputSchema = z.object({
  studentQuestion: z
    .string()
    .describe("The question the student asks the patient's owner."),
  clinicalScenario: z
    .string()
    .describe(
      'A summary of the current clinical scenario, including patient\u2019s condition and history.'
    ),
  patientInformation: z
    .object({
      species: z.string().describe('The species of the animal.'),
      age: z.string().describe('The age of the animal.'),
      weight: z.string().describe('The weight of the animal.'),
      chiefComplaint: z
        .string()
        .describe('The primary reason for the animal\u2019s visit.'),
    })
    .describe('Detailed information about the patient.'),
  dynamicVitalSigns: z
    .object({
      heartRate: z.string().describe('Current heart rate.'),
      respiratoryRate: z.string().describe('Current respiratory rate.'),
      temperature: z.string().describe('Current temperature.'),
      perfusionStatus: z
        .string()
        .describe('Current perfusion status (e.g., normal, poor).'),
      consciousnessLevel: z
        .string()
        .describe('Current level of consciousness (e.g., alert, dull, comatose).'),
    })
    .describe('Current dynamic vital signs of the patient.'),
});
export type GenerateDynamicOwnerResponsesInput = z.infer<
  typeof GenerateDynamicOwnerResponsesInputSchema
>;

const GenerateDynamicOwnerResponsesOutputSchema = z.object({
  ownerResponse: z
    .string()
    .describe(
      "The realistic response from the patient's owner based on the student's question and clinical context."
    ),
});
export type GenerateDynamicOwnerResponsesOutput = z.infer<
  typeof GenerateDynamicOwnerResponsesOutputSchema
>;

export async function generateDynamicOwnerResponses(
  input: GenerateDynamicOwnerResponsesInput
): Promise<GenerateDynamicOwnerResponsesOutput> {
  return generateDynamicOwnerResponsesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDynamicOwnerResponsesPrompt',
  input: {schema: GenerateDynamicOwnerResponsesInputSchema},
  output: {schema: GenerateDynamicOwnerResponsesOutputSchema},
  prompt: `You are role-playing as the distressed owner of a pet in a veterinary emergency. Your pet's current situation is as follows:
Clinical Scenario: {{{clinicalScenario}}}
Patient Information:
Species: {{{patientInformation.species}}}
Age: {{{patientInformation.age}}}
Weight: {{{patientInformation.weight}}}
Chief Complaint: {{{patientInformation.chiefComplaint}}}
Dynamic Vital Signs:
Heart Rate: {{{dynamicVitalSigns.heartRate}}}
Respiratory Rate: {{{dynamicVitalSigns.respiratoryRate}}}
Temperature: {{{dynamicVitalSigns.temperature}}}
Perfusion Status: {{{dynamicVitalSigns.perfusionStatus}}}
Consciousness Level: {{{dynamicVitalSigns.consciousnessLevel}}}

The student veterinarian has just asked you: "{{{studentQuestion}}}".
Respond realistically, reflecting your emotional state (distress, worry, etc.) given the situation, and provide information relevant to your pet's history as a concerned owner would, but do not invent new medical facts. Your response should be concise and directly address the student's question while reflecting the context.`,
});

const generateDynamicOwnerResponsesFlow = ai.defineFlow(
  {
    name: 'generateDynamicOwnerResponsesFlow',
    inputSchema: GenerateDynamicOwnerResponsesInputSchema,
    outputSchema: GenerateDynamicOwnerResponsesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
