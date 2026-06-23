'use server';
/**
 * Server Action — genera un caso de simulación a partir de una historia real.
 *
 * Llama al flujo Genkit y MAPEA la salida al modelo `ClinicalCase` del
 * simulador existente (rellenando ids de las entidades anidadas). Devuelve el
 * caso listo para que el cliente lo guarde con su propio authorUid (las reglas
 * exigen authorUid == uid).
 */
import {
  generateSimulationFromHistory,
  type GenerateSimulationInput,
} from '@/ai/flows/generate-simulation-from-history';
import type { ClinicalCase } from '@/lib/types';

export interface GenerateSimulationResponse {
  ok: boolean;
  case?: Omit<ClinicalCase, 'id' | 'authorUid' | 'status'>;
  error?: string;
}

export async function generateSimulationAction(
  input: GenerateSimulationInput & { sourceDocumentId?: string; sourcePetId?: string }
): Promise<GenerateSimulationResponse> {
  try {
    const g = await generateSimulationFromHistory({ clinicalText: input.clinicalText, level: input.level });

    const mapped: Omit<ClinicalCase, 'id' | 'authorUid' | 'status'> = {
      name: g.name,
      description: g.description,
      difficulty: g.difficulty,
      generatedByAI: true,
      sourceDocumentId: input.sourceDocumentId,
      sourcePetId: input.sourcePetId,
      patient: {
        id: `P${Date.now()}`,
        name: g.patient.name,
        species: g.patient.species,
        breed: g.patient.breed,
        age: g.patient.age,
        weightKg: g.patient.weightKg,
        sex: g.patient.sex as ClinicalCase['patient']['sex'],
        chiefComplaint: g.patient.chiefComplaint,
        triage: g.patient.triage,
      },
      initialVitals: {
        heartRate: g.initialVitals.heartRate,
        respiratoryRate: g.initialVitals.respiratoryRate,
        temperature: g.initialVitals.temperature,
        perfusionStatus: g.initialVitals.perfusionStatus,
        consciousnessLevel: g.initialVitals.consciousnessLevel,
      },
      anamnesis: g.anamnesis.map((a, i) => ({
        id: `AN${i}`,
        text: a.text,
        ownerResponse: a.ownerResponse,
        relevance: a.relevance,
      })),
      physicalExam: g.physicalExam.map((p, i) => ({
        id: `EX${i}`,
        system: 'general' as const,
        technique: p.technique,
        finding: p.finding,
        isAbnormal: p.isAbnormal,
        relevance: 'media' as const,
      })),
      differentials: g.differentials.map((d, i) => ({
        id: `DX${i}`,
        diagnosis: d.diagnosis,
        probabilityInitial: d.isCorrect ? 70 : 20,
        isCorrect: d.isCorrect,
      })),
      finalDiagnosis: g.finalDiagnosis,
      treatmentPlan: g.treatmentPlan.map((t, i) => ({
        id: `TR${i}`,
        name: t.name,
        category: 'soporte' as const,
        isRecommended: t.isRecommended,
      })),
      studentQuestions: g.studentQuestions.map((q, i) => ({
        id: `Q${i}`,
        prompt: q.prompt,
        kind: q.kind,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      })),
    };

    return { ok: true, case: mapped };
  } catch (err) {
    console.error('[generate-simulation] Error:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Error generando la simulación.' };
  }
}
