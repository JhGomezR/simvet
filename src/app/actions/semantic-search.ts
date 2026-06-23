'use server';
/**
 * Server Action — búsqueda semántica de historias clínicas similares.
 *
 * "Busca casos parecidos a un perro con vómito, fiebre y diarrea".
 *
 * 1. Genera el embedding de la consulta (Gemini).
 * 2. findNearest sobre documentChunks (Firestore Vector Search).
 * 3. Enriqua cada resultado con la extracción del documento de origen.
 *
 * Requiere Admin SDK con credenciales. Sin ellas devuelve lista vacía + aviso.
 */
import { embedText } from '@/ai/embeddings';
import { getAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { ClinicalExtraction, SemanticSearchResult } from '@/lib/types';

export interface SemanticSearchParams {
  query: string;
  clinicId?: string;
  limit?: number;
}

export interface SemanticSearchResponse {
  ok: boolean;
  results: SemanticSearchResult[];
  error?: string;
}

export async function semanticSearchAction(
  params: SemanticSearchParams
): Promise<SemanticSearchResponse> {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return {
      ok: false,
      results: [],
      error: 'Búsqueda semántica no disponible (faltan credenciales de servidor).',
    };
  }

  try {
    const limit = params.limit ?? 5;
    const qvec = await embedText(params.query);
    if (!qvec) return { ok: false, results: [], error: 'No se pudo generar el embedding de la consulta.' };

    const vectorQuery = adminDb.collection('documentChunks').findNearest({
      vectorField: 'embedding',
      queryVector: FieldValue.vector(qvec),
      limit: limit * 4, // pedimos de más para filtrar por clínica en memoria
      distanceMeasure: 'COSINE',
      distanceResultField: 'distance',
    });

    const snap = await vectorQuery.get();

    // Dedup por documento (nos quedamos con el chunk más cercano de cada doc)
    const seen = new Map<string, SemanticSearchResult>();
    for (const d of snap.docs) {
      const data = d.data() as { documentId: string; petId?: string; text: string; clinicId: string; distance?: number };
      if (params.clinicId && data.clinicId !== params.clinicId) continue;
      if (seen.has(data.documentId)) continue;
      seen.set(data.documentId, {
        documentId: data.documentId,
        petId: data.petId,
        chunkText: data.text,
        distance: data.distance ?? 0,
      });
    }

    // Enriquecer con la extracción del documento de origen
    const results = Array.from(seen.values()).slice(0, limit);
    await Promise.all(
      results.map(async (r) => {
        const docSnap = await adminDb.collection('clinicalDocuments').doc(r.documentId).get();
        if (docSnap.exists) {
          r.extraction = (docSnap.data()?.extraction as ClinicalExtraction) ?? undefined;
        }
      })
    );

    return { ok: true, results };
  } catch (err) {
    console.error('[semantic-search] Error:', err);
    return {
      ok: false,
      results: [],
      error: err instanceof Error ? err.message : 'Error en la búsqueda semántica.',
    };
  }
}
