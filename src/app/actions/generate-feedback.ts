'use server';

/**
 * Server Action — invoca el flujo Genkit de feedback personalizado.
 *
 * IMPORTANTE: esta función corre SOLO en el servidor.
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
    });

    // Mapeo del output del flow al tipo Feedback de la app
    return {
      narrativeSummary: result.narrativeSummary,
      criticalErrors: result.criticalErrorsFeedback,
      correctDecisions: result.correctDecisionsExplanation,
      academicRecommendations: result.academicRecommendations,
      comparisonWithIdealPathway: result.comparisonWithIdealPathway,
      finalScore: params.finalScore,
    };
  } catch (err) {
    console.error('Error generando feedback con Gemini:', err);
    // Fallback: devolvemos un feedback genérico para no romper la UX
    return {
      narrativeSummary:
        'No fue posible generar el feedback personalizado en este momento. ' +
        'Revisa tu desempeño con tu profesor.',
      criticalErrors: [],
      correctDecisions: [],
      academicRecommendations: [
        'Vuelve a intentar el caso para recibir feedback automatizado.',
        'Si el problema persiste, contacta al administrador del sistema.',
      ],
      comparisonWithIdealPathway:
        'El servicio de retroalimentación no respondió. Tu intento fue guardado.',
      finalScore: params.finalScore,
    };
  }
}
