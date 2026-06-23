'use server';
/**
 * @fileOverview Flujo Genkit: extracción estructurada de una historia clínica.
 *
 * Recibe el texto crudo de un documento (PDF/DOCX/TXT/imagen ya OCR-eado) y
 * devuelve los campos clínicos detectados: especie, síntomas, antecedentes,
 * diagnóstico, tratamiento, medicamentos, evolución — además de un resumen y
 * la lista de campos que FALTAN y deberían completarse a mano (flujo D).
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractionSchema = z.object({
  species: z.string().optional().describe('Especie del paciente (Canino, Felino, etc.)'),
  breed: z.string().optional().describe('Raza'),
  patientName: z.string().optional().describe('Nombre del paciente'),
  ownerName: z.string().optional().describe('Nombre del propietario'),
  age: z.string().optional().describe('Edad'),
  sex: z.string().optional().describe('Sexo'),
  weight: z.string().optional().describe('Peso'),
  symptoms: z.array(z.string()).describe('Síntomas / signos clínicos referidos'),
  antecedents: z.array(z.string()).describe('Antecedentes médicos relevantes'),
  diagnosis: z.array(z.string()).describe('Diagnósticos (definitivos o presuntivos)'),
  treatment: z.array(z.string()).describe('Tratamientos aplicados o indicados'),
  medications: z.array(z.string()).describe('Medicamentos mencionados con dosis si aparece'),
  evolution: z.string().optional().describe('Evolución del paciente'),
  summary: z.string().describe('Resumen clínico breve (2-4 frases)'),
  missingFields: z
    .array(z.string())
    .describe('Campos clínicos importantes que NO aparecen en el documento y deberían completarse manualmente'),
});

export type ExtractClinicalDataInput = { rawText: string };
export type ExtractClinicalDataOutput = z.infer<typeof ExtractionSchema>;

const prompt = ai.definePrompt({
  name: 'extractClinicalDataPrompt',
  input: { schema: z.object({ rawText: z.string() }) },
  output: { schema: ExtractionSchema },
  prompt: `Eres un asistente clínico veterinario. Extrae de la siguiente historia clínica
los datos estructurados solicitados. Sé fiel al texto: NO inventes datos que no estén.
Si un dato no aparece, déjalo vacío e inclúyelo en "missingFields".

Devuelve los arreglos vacíos cuando no haya información, nunca null.

HISTORIA CLÍNICA:
---
{{rawText}}
---`,
});

export async function extractClinicalData(
  input: ExtractClinicalDataInput
): Promise<ExtractClinicalDataOutput> {
  const { output } = await prompt({ rawText: input.rawText.slice(0, 30000) });
  return output!;
}

// Registro del flujo (efecto secundario al importar el módulo en dev.ts).
ai.defineFlow(
  {
    name: 'extractClinicalDataFlow',
    inputSchema: z.object({ rawText: z.string() }),
    outputSchema: ExtractionSchema,
  },
  async (input) => extractClinicalData(input)
);
