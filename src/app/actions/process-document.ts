'use server';
/**
 * Server Action — procesamiento de una historia clínica subida.
 *
 * Pipeline (flujos D, E):
 *   1. OCR / extracción de texto del archivo (Gemini multimodal para PDF/imagen).
 *   2. Estructuración con IA (extractClinicalData) → campos detectados + faltantes.
 *   3. Chunking + embeddings (Gemini) → Firestore Vector Search.
 *   4. Actualiza el documento clínico con el resultado (vía Admin SDK).
 *
 * Degrada con gracia: si no hay Admin SDK (sin credenciales), igual devuelve la
 * extracción para que el cliente la muestre/guarde; sólo se omite el indexado vectorial.
 */
import { ai } from '@/ai/genkit';
import { extractClinicalData } from '@/ai/flows/extract-clinical-data';
import { embedText } from '@/ai/embeddings';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { ClinicalExtraction, ClinicalFileType } from '@/lib/types';

export interface ProcessDocumentParams {
  documentId: string;
  clinicId: string;
  petId?: string;
  fileType: ClinicalFileType;
  /** data URI del archivo (data:<mime>;base64,...). Requerido salvo que se pase rawText. */
  dataUri?: string;
  contentType?: string;
  /** Texto ya extraído (p.ej. dictado por voz). Si viene, se salta el OCR. */
  rawText?: string;
}

export interface ProcessDocumentResult {
  ok: boolean;
  rawText: string;
  extraction?: ClinicalExtraction;
  chunkCount: number;
  vectorized: boolean;
  error?: string;
}

function isQuotaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  return /RESOURCE_EXHAUSTED|429|Too Many Requests|prepayment credits are depleted/i.test(message);
}

function summarizeFallback(rawText: string): ClinicalExtraction {
  const normalized = rawText.replace(/\r/g, '').trim();
  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const summary = normalized.slice(0, 1500);
  const symptomHints = lines
    .filter((line) => /motivo|signo|sintom|dolor|vomit|diar|tos|disnea|cojera|fiebre/i.test(line))
    .slice(0, 6);
  const diagnosisHints = lines
    .filter((line) => /diagn[oó]st|impresi[oó]n|dx|presunt|hallazgo/i.test(line))
    .slice(0, 4);
  const treatmentHints = lines
    .filter((line) => /tratamiento|plan|medic|fluid|cirug|analgesi|antibi/i.test(line))
    .slice(0, 6);

  return {
    symptoms: symptomHints.length > 0 ? symptomHints : undefined,
    diagnosis: diagnosisHints.length > 0 ? diagnosisHints : undefined,
    treatment: treatmentHints.length > 0 ? treatmentHints : undefined,
    summary,
    missingFields: ['Validar extracción manualmente'],
  };
}

function buildManualReviewFallback(fileType: ClinicalFileType): ClinicalExtraction {
  return {
    summary:
      `El archivo ${fileType.toUpperCase()} se guardo, pero la extraccion automatica no pudo completarse ` +
      'porque la cuota de Gemini esta agotada. Completa el resumen clinico manualmente para usarlo en simulaciones.',
    missingFields: [
      'Resumen clinico manual',
      'Sintomas principales',
      'Diagnostico',
      'Tratamiento',
    ],
  };
}

function chunkText(text: string, size = 1000, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= size) return clean ? [clean] : [];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    chunks.push(clean.slice(start, start + size));
    start += size - overlap;
  }
  return chunks;
}

async function ocrFromFile(dataUri: string, contentType?: string): Promise<string> {
  const res = await ai.generate({
    prompt: [
      { media: { url: dataUri, contentType } },
      {
        text:
          'Extrae TODO el texto de este documento clínico veterinario, respetando el ' +
          'orden y los datos numéricos (dosis, valores de laboratorio, fechas). ' +
          'Devuelve solo el texto plano, sin comentarios.',
      },
    ],
  });
  return res.text ?? '';
}

export async function processDocumentAction(
  params: ProcessDocumentParams
): Promise<ProcessDocumentResult> {
  try {
    // 1. Obtener texto
    let rawText = params.rawText?.trim() ?? '';
    if (!rawText) {
      if (!params.dataUri) throw new Error('Falta dataUri o rawText.');
      if (params.fileType === 'txt') {
        const base64 = params.dataUri.split(',')[1] ?? '';
        rawText = Buffer.from(base64, 'base64').toString('utf-8');
      } else {
        try {
          rawText = await ocrFromFile(params.dataUri, params.contentType);
        } catch (err) {
          if (!isQuotaError(err)) throw err;

          const extraction = buildManualReviewFallback(params.fileType);
          const adminDb = getAdminDb();
          if (adminDb) {
            await adminDb.collection('clinicalDocuments').doc(params.documentId).set(
              {
                extractedText: '',
                extraction,
                processingStatus: 'completed',
                processingError:
                  'Extraccion automatica no disponible por cuota agotada de Gemini. Se requiere revision manual.',
                updatedAt: Date.now(),
              },
              { merge: true }
            );
          }

          return {
            ok: true,
            rawText: '',
            extraction,
            chunkCount: 0,
            vectorized: false,
            error:
              'La historia se guardo, pero la extraccion automatica quedo en modo manual porque la cuota de Gemini esta agotada.',
          };
        }
      }
    }

    if (!rawText.trim()) {
      return { ok: false, rawText: '', chunkCount: 0, vectorized: false, error: 'No se pudo extraer texto.' };
    }

    // 2. Estructurar con IA
    let extraction: ClinicalExtraction;
    try {
      extraction = (await extractClinicalData({ rawText })) as ClinicalExtraction;
    } catch (err) {
      console.warn('[process-document] Falling back to heuristic extraction:', err);
      extraction = summarizeFallback(rawText);
    }

    // 3. Chunking + embeddings + Vector Search (Admin SDK)
    const adminDb = getAdminDb();
    let chunkCount = 0;
    let vectorized = false;
    if (adminDb) {
      const chunks = chunkText(rawText);
      const batch = adminDb.batch();
      const col = adminDb.collection('documentChunks');
      for (let i = 0; i < chunks.length; i++) {
        const vec = await embedText(chunks[i]);
        const ref = col.doc();
        const data: Record<string, unknown> = {
          documentId: params.documentId,
          clinicId: params.clinicId,
          petId: params.petId,
          text: chunks[i],
          index: i,
          createdAt: Date.now(),
        };
        if (vec) {
          data.embedding = FieldValue.vector(vec);
          vectorized = true;
        }
        batch.set(ref, data);
      }
      await batch.commit();
      chunkCount = chunks.length;

      // 4. Actualizar el documento clínico
      await adminDb.collection('clinicalDocuments').doc(params.documentId).set(
        {
          extractedText: rawText.slice(0, 50000),
          extraction,
          processingStatus: 'completed',
          processingError: null,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }

    return { ok: true, rawText, extraction, chunkCount, vectorized };
  } catch (err) {
    console.error('[process-document] Error:', err);
    const adminDb = getAdminDb();
    if (adminDb) {
      try {
        const failureData: Record<string, unknown> = {
          processingStatus: 'failed',
          processingError: err instanceof Error ? err.message : 'Error desconocido',
          updatedAt: Date.now(),
        };
        if (params.rawText) {
          failureData.extractedText = params.rawText.slice(0, 50000);
          failureData.extraction = summarizeFallback(params.rawText);
        }
        await adminDb.collection('clinicalDocuments').doc(params.documentId).set(
          failureData,
          { merge: true }
        );
      } catch (persistErr) {
        console.error('[process-document] Error persisting failure state:', persistErr);
      }
    }
    return {
      ok: false,
      rawText: '',
      chunkCount: 0,
      vectorized: false,
      error: isQuotaError(err)
        ? 'La historia no pudo procesarse con Gemini por falta de cuota. Intenta con texto manual o vuelve a probar cuando haya saldo.'
        : err instanceof Error
          ? err.message
          : 'Error desconocido al procesar el documento.',
    };
  }
}
