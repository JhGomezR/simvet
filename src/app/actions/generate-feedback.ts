'use server';

/**
 * Server Action - invoca el flujo Genkit de feedback personalizado.
 *
 * IMPORTANTE: esta funcion corre solo en el servidor.
 * La GEMINI_API_KEY nunca se expone al cliente.
 */
import { generatePersonalizedCaseFeedback } from '@/ai/flows/generate-personalized-case-feedback';
import type { Feedback } from '@/lib/types';

export interface GenerateFeedbackParams {
  caseSummary: string;
  studentActions: string[];
  criticalErrors: string[];
  correctDecisions: string[];
  idealClinicalPathway: string;
  finalScore: number;
  correctDiagnosis?: string;
  studentDiagnosis?: string;
  studentAnswers?: { question: string; answer: string }[];
  activitySummary?: string;
}

function isQuotaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /RESOURCE_EXHAUSTED|429|Too Many Requests|prepayment credits are depleted/i.test(message);
}

export async function generateFeedbackAction(
  params: GenerateFeedbackParams
): Promise<Feedback> {
  try {
    const result = await generatePersonalizedCaseFeedback({
      caseSummary: params.caseSummary,
      studentActions: params.studentActions,
      criticalErrors: params.criticalErrors,
      correctDecisions: params.correctDecisions,
      idealClinicalPathway: params.idealClinicalPathway,
      finalScore: params.finalScore,
      correctDiagnosis: params.correctDiagnosis,
      studentDiagnosis: params.studentDiagnosis,
      studentAnswers: params.studentAnswers,
      activitySummary: params.activitySummary,
    });

    return {
      narrativeSummary: result.narrativeSummary,
      criticalErrors: result.criticalErrorsFeedback,
      correctDecisions: result.correctDecisionsExplanation,
      academicRecommendations: result.academicRecommendations,
      comparisonWithIdealPathway: result.comparisonWithIdealPathway,
      finalScore: params.finalScore,
      diagnosisCorrect: result.diagnosisCorrect,
      justificationScore: result.justificationScore,
      treatmentScore: result.treatmentScore,
      rubricBreakdown: result.rubricBreakdown,
    };
  } catch (err) {
    console.error('Error generando feedback con Gemini:', err);
    return {
      narrativeSummary: isQuotaError(err)
        ? 'El feedback IA no estuvo disponible porque la cuota de Gemini esta agotada. Tu intento quedo guardado.'
        : 'No fue posible generar el feedback personalizado en este momento. Revisa tu desempeno con tu profesor.',
      criticalErrors: [],
      correctDecisions: [],
      academicRecommendations: [
        isQuotaError(err)
          ? 'Recarga saldo en Gemini o vuelve a intentar mas tarde para obtener feedback automatizado.'
          : 'Vuelve a intentar el caso para recibir feedback automatizado.',
        'Si el problema persiste, contacta al administrador del sistema.',
      ],
      comparisonWithIdealPathway: isQuotaError(err)
        ? 'La evaluacion automatica no pudo completarse por cuota agotada de Gemini. Tu intento fue guardado.'
        : 'El servicio de retroalimentacion no respondio. Tu intento fue guardado.',
      finalScore: params.finalScore,
    };
  }
}
