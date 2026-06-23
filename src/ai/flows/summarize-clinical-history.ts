'use server';
/**
 * @fileOverview Flujo Genkit: resumen clínico + hipótesis diagnósticas responsables.
 *
 * IA CLÍNICA RESPONSABLE: nunca da un diagnóstico definitivo. Devuelve
 * hipótesis con probabilidad estimada, justificación y pruebas de verificación
 * recomendadas. Siempre incluye un disclaimer.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { DEFAULT_AI_DISCLAIMER } from '@/lib/types';

const OutputSchema = z.object({
  summary: z.string().describe('Resumen clínico estructurado del caso.'),
  probableDiagnoses: z
    .array(
      z.object({
        diagnosis: z.string(),
        probability: z.number().min(0).max(100).describe('Probabilidad estimada (0-100).'),
        rationale: z.string().describe('Razonamiento clínico que la sustenta.'),
      })
    )
    .describe('Hipótesis diagnósticas ordenadas por probabilidad. NUNCA definitivas.'),
  recommendedVerifications: z
    .array(z.string())
    .describe('Pruebas o pasos para confirmar/descartar las hipótesis.'),
  suggestedTreatments: z
    .array(z.string())
    .describe('Conductas terapéuticas orientativas a validar por el veterinario.'),
});

export type SummarizeClinicalHistoryInput = {
  clinicalText: string;
  similarCasesContext?: string;
};
export type SummarizeClinicalHistoryOutput = z.infer<typeof OutputSchema> & {
  disclaimer: string;
};

const prompt = ai.definePrompt({
  name: 'summarizeClinicalHistoryPrompt',
  input: { schema: z.object({ clinicalText: z.string(), similarCasesContext: z.string().optional() }) },
  output: { schema: OutputSchema },
  prompt: `Eres un asistente veterinario que apoya (NO reemplaza) al médico.
Analiza la historia clínica y produce un resumen y un razonamiento diagnóstico.

REGLAS DE IA RESPONSABLE (obligatorias):
- NO emitas diagnósticos definitivos. Habla de hipótesis y probabilidades.
- Cuando falte contexto, dilo explícitamente y pide la verificación adecuada.
- Sé prudente: prioriza la seguridad del paciente.

{{#if similarCasesContext}}
CASOS SIMILARES ENCONTRADOS (para contexto, no copies a ciegas):
{{similarCasesContext}}
{{/if}}

HISTORIA CLÍNICA:
---
{{clinicalText}}
---`,
});

export async function summarizeClinicalHistory(
  input: SummarizeClinicalHistoryInput
): Promise<SummarizeClinicalHistoryOutput> {
  const { output } = await prompt({
    clinicalText: input.clinicalText.slice(0, 30000),
    similarCasesContext: input.similarCasesContext,
  });
  return { ...output!, disclaimer: DEFAULT_AI_DISCLAIMER };
}

const summarizeClinicalHistoryFlow = ai.defineFlow(
  {
    name: 'summarizeClinicalHistoryFlow',
    inputSchema: z.object({ clinicalText: z.string(), similarCasesContext: z.string().optional() }),
    outputSchema: OutputSchema,
  },
  async (input) => {
    const { output } = await prompt({ clinicalText: input.clinicalText.slice(0, 30000), similarCasesContext: input.similarCasesContext });
    return output!;
  }
);

export { summarizeClinicalHistoryFlow };
