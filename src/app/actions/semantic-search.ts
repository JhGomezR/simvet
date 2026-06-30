'use server';
/**
 * Server Action: busqueda semantica de historias clinicas similares.
 *
 * 1. Intenta generar embedding de la consulta y usar Vector Search.
 * 2. Si no hay embedding o Gemini no responde, cae a una busqueda lexical
 *    sobre el texto extraido y el resumen almacenado de los documentos.
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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function lexicalScore(queryTokens: string[], candidate: string): number {
  const haystack = candidate.toLowerCase();
  return queryTokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

async function lexicalFallback(
  params: SemanticSearchParams
): Promise<SemanticSearchResponse> {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return {
      ok: false,
      results: [],
      error: 'Búsqueda no disponible (faltan credenciales de servidor).',
    };
  }

  const limit = params.limit ?? 5;
  const queryTokens = tokenize(params.query);
  const docQuery = params.clinicId
    ? adminDb.collection('clinicalDocuments').where('clinicId', '==', params.clinicId)
    : adminDb.collection('clinicalDocuments');
  const snap = await docQuery.limit(50).get();

  const ranked = snap.docs
    .map((docSnap) => {
      const data = docSnap.data() as {
        petId?: string;
        extractedText?: string;
        extraction?: ClinicalExtraction;
      };
      const candidateText = [
        data.extractedText,
        data.extraction?.summary,
        data.extraction?.symptoms?.join(' '),
        data.extraction?.diagnosis?.join(' '),
        data.extraction?.treatment?.join(' '),
      ]
        .filter(Boolean)
        .join(' ');
      const score = lexicalScore(queryTokens, candidateText);
      return { docSnap, data, score, candidateText };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const results: SemanticSearchResult[] = ranked.map((item) => ({
    documentId: item.docSnap.id,
    petId: item.data.petId,
    chunkText: item.candidateText.slice(0, 400),
    distance: Math.max(0, 1 - item.score / Math.max(1, queryTokens.length)),
    extraction: item.data.extraction,
  }));

  return {
    ok: results.length > 0,
    results,
    error: results.length > 0 ? 'Resultados obtenidos por búsqueda lexical de respaldo.' : 'No se encontraron coincidencias.',
  };
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
    if (!qvec) {
      return lexicalFallback(params);
    }

    const vectorQuery = adminDb.collection('documentChunks').findNearest({
      vectorField: 'embedding',
      queryVector: FieldValue.vector(qvec),
      limit: limit * 4,
      distanceMeasure: 'COSINE',
      distanceResultField: 'distance',
    });

    const snap = await vectorQuery.get();
    const seen = new Map<string, SemanticSearchResult>();

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as {
        documentId: string;
        petId?: string;
        text: string;
        clinicId: string;
        distance?: number;
      };
      if (params.clinicId && data.clinicId !== params.clinicId) continue;
      if (seen.has(data.documentId)) continue;
      seen.set(data.documentId, {
        documentId: data.documentId,
        petId: data.petId,
        chunkText: data.text,
        distance: data.distance ?? 0,
      });
    }

    const results = Array.from(seen.values()).slice(0, limit);
    await Promise.all(
      results.map(async (result) => {
        const docSnap = await adminDb.collection('clinicalDocuments').doc(result.documentId).get();
        if (docSnap.exists) {
          result.extraction = (docSnap.data()?.extraction as ClinicalExtraction) ?? undefined;
        }
      })
    );

    return { ok: true, results };
  } catch (err) {
    console.error('[semantic-search] Error:', err);
    return lexicalFallback(params);
  }
}
