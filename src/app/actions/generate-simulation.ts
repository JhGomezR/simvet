'use server';
/**
 * Server Action: genera un caso de simulacion a partir de una historia real.
 *
 * Intenta usar el flujo Genkit y mapear la salida al modelo `ClinicalCase`.
 * Si la IA falla, devuelve un caso base construido desde el texto clinico para
 * no bloquear el trabajo del profesor.
 */
import {
  generateSimulationFromHistory,
  type GenerateSimulationInput,
} from '@/ai/flows/generate-simulation-from-history';
import { getAdminDb } from '@/lib/firebase-admin';
import type { ClinicalDocument, ClinicalExtraction } from '@/lib/types';
import type { ClinicalCase } from '@/lib/types';

export interface GenerateSimulationResponse {
  ok: boolean;
  case?: Omit<ClinicalCase, 'id' | 'authorUid' | 'status'>;
  error?: string;
}

type GenerateSimulationActionInput = GenerateSimulationInput & {
  sourceDocumentId?: string;
  sourcePetId?: string;
  clinicId?: string;
};

function isQuotaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /RESOURCE_EXHAUSTED|429|Too Many Requests|prepayment credits are depleted/i.test(message);
}

function buildFallbackCase(
  input: GenerateSimulationActionInput
): Omit<ClinicalCase, 'id' | 'authorUid' | 'status'> {
  const preview = input.clinicalText.replace(/\s+/g, ' ').trim();
  const description =
    preview.slice(0, 240) || 'Caso clinico generado a partir de una historia cargada.';

  return {
    name: 'Caso generado desde historia clinica',
    description,
    difficulty: input.level,
    generatedByAI: true,
    sourceDocumentId: input.sourceDocumentId,
    sourcePetId: input.sourcePetId,
    patient: {
      id: `P${Date.now()}`,
      name: 'Paciente a validar',
      species: 'Canino',
      age: 'No especificada',
      weightKg: 10,
      chiefComplaint: description,
      triage: 'Nivel II - Emergencia',
    },
    initialVitals: {
      heartRate: 130,
      respiratoryRate: 32,
      temperature: 38.6,
      perfusionStatus: 'Pobre',
      consciousnessLevel: 'Apagado',
    },
    anamnesis: [
      {
        id: 'AN0',
        text: '¿Que datos adicionales del historial son clave para orientar el caso?',
        ownerResponse: preview,
        relevance: 'alta',
      },
    ],
    physicalExam: [
      {
        id: 'EX0',
        system: 'general',
        technique: 'Evaluacion inicial dirigida',
        finding: 'Correlacionar el texto base con signos clinicos reales del paciente.',
        isAbnormal: true,
        relevance: 'alta',
      },
    ],
    differentials: [
      {
        id: 'DX0',
        diagnosis: 'Diagnostico principal por confirmar con la historia clinica cargada',
        probabilityInitial: 60,
        isCorrect: true,
      },
    ],
    finalDiagnosis: 'Pendiente de validacion clinica a partir de la historia cargada',
    treatmentPlan: [
      {
        id: 'TR0',
        name: 'Estabilizacion inicial segun hallazgos del caso',
        category: 'soporte',
        isRecommended: true,
      },
    ],
    idealPathway: ['Via Aerea', 'Respiracion', 'Circulacion', 'AN0', 'EX0', 'DX0', 'TR0'],
    studentQuestions: [
      {
        id: 'Q0',
        prompt: '¿Cual es tu diagnostico principal basado en la historia cargada?',
        kind: 'diagnostico',
      },
      {
        id: 'Q1',
        prompt: '¿Que hallazgos sustentan tu decision clinica?',
        kind: 'justificacion',
      },
      {
        id: 'Q2',
        prompt: '¿Cual seria tu tratamiento inicial y por que?',
        kind: 'tratamiento',
      },
    ],
  };
}

function sanitizeSensitiveText(text: string): string {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[correo-redactado]')
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, '[telefono-redactado]')
    .replace(/\b\d{6,}\b/g, '[identificador-redactado]')
    .replace(/\b(calle|cra|carrera|av|avenida|direccion|dir)\b[^\n,.]*/gi, '[direccion-redactada]')
    .replace(/\b(microchip|chip|cedula|cc|documento|nit)\b\s*[:#-]?\s*[a-z0-9-]+/gi, '[identificador-redactado]')
    .trim();
}

function extractionToKnowledgeBlock(docId: string, extraction?: ClinicalExtraction, extractedText?: string): string {
  const parts = [
    extraction?.species ? `Especie: ${extraction.species}` : '',
    extraction?.breed ? `Raza: ${extraction.breed}` : '',
    extraction?.age ? `Edad: ${extraction.age}` : '',
    extraction?.sex ? `Sexo: ${extraction.sex}` : '',
    extraction?.weight ? `Peso: ${extraction.weight}` : '',
    extraction?.symptoms?.length ? `Sintomas: ${extraction.symptoms.join(', ')}` : '',
    extraction?.antecedents?.length ? `Antecedentes: ${extraction.antecedents.join(', ')}` : '',
    extraction?.diagnosis?.length ? `Diagnosticos: ${extraction.diagnosis.join(', ')}` : '',
    extraction?.treatment?.length ? `Tratamientos: ${extraction.treatment.join(', ')}` : '',
    extraction?.medications?.length ? `Medicamentos: ${extraction.medications.join(', ')}` : '',
    extraction?.evolution ? `Evolucion: ${extraction.evolution}` : '',
    extraction?.summary ? `Resumen: ${extraction.summary}` : extractedText?.slice(0, 700) ?? '',
  ]
    .filter(Boolean)
    .join('. ');

  if (!parts.trim()) return '';
  return `Historia ${docId}: ${sanitizeSensitiveText(parts)}`;
}

function isUsableKnowledgeDoc(doc: Partial<ClinicalDocument>): boolean {
  const summary = doc.extraction?.summary?.toLowerCase() ?? '';
  const hasQuotaPlaceholder =
    summary.includes('cuota de gemini esta agotada') ||
    summary.includes('extraccion automatica no pudo completarse');
  const hasClinicalContent = Boolean(
    doc.extractedText?.trim() ||
      doc.extraction?.symptoms?.length ||
      doc.extraction?.diagnosis?.length ||
      doc.extraction?.treatment?.length ||
      (doc.extraction?.summary && !hasQuotaPlaceholder)
  );

  return hasClinicalContent && (doc.processingStatus === 'completed' || doc.processingStatus === 'queued_ai');
}

async function buildClinicKnowledgeBaseContext(input: GenerateSimulationActionInput): Promise<string | undefined> {
  if (!input.clinicId) return undefined;
  const adminDb = getAdminDb();
  if (!adminDb) return undefined;

  const snap = await adminDb.collection('clinicalDocuments').where('clinicId', '==', input.clinicId).limit(30).get();

  const docs = snap.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Partial<ClinicalDocument>),
    }))
    .filter((doc) => doc.id !== input.sourceDocumentId)
    .filter((doc) => isUsableKnowledgeDoc(doc))
    .sort((a, b) => (b.uploadedAt ?? 0) - (a.uploadedAt ?? 0))
    .slice(0, 12);

  const blocks = docs
    .map((doc) => extractionToKnowledgeBlock(doc.id, doc.extraction, doc.extractedText))
    .filter(Boolean);

  if (blocks.length === 0) return undefined;

  return [
    'Patrones clinicos anonimizados obtenidos de historias previas de la clinica.',
    ...blocks,
  ].join('\n');
}

export async function generateSimulationAction(
  input: GenerateSimulationActionInput
): Promise<GenerateSimulationResponse> {
  try {
    const knowledgeBaseContext = await buildClinicKnowledgeBaseContext(input);
    const g = await generateSimulationFromHistory({
      clinicalText: input.clinicalText,
      level: input.level,
      knowledgeBaseContext,
    });

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
    return {
      ok: true,
      case: buildFallbackCase(input),
      error: isQuotaError(err)
        ? 'La simulacion se genero con una plantilla de respaldo porque la cuota de Gemini esta agotada.'
        : err instanceof Error
          ? err.message
          : 'Error generando la simulacion.',
    };
  }
}
