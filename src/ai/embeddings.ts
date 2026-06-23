'use server';
/**
 * Embeddings para búsqueda semántica (SimVet Clinical).
 *
 * Usa el embedder de Gemini (text-embedding-004, 768 dims) vía Genkit.
 * Estos vectores alimentan la búsqueda de "casos parecidos" en Firestore
 * Vector Search (ver src/lib/firebase-admin.ts).
 */
import { ai } from '@/ai/genkit';

const EMBEDDER = 'googleai/text-embedding-004';
export const EMBEDDING_DIMS = 768;

/** Normaliza la respuesta de Genkit a un number[] plano. */
function toVector(result: unknown): number[] {
  if (Array.isArray(result)) {
    const first = result[0] as { embedding?: number[] } | number | undefined;
    if (typeof first === 'number') return result as number[];
    if (first && Array.isArray(first.embedding)) return first.embedding;
  }
  const maybe = result as { embedding?: number[] };
  if (maybe && Array.isArray(maybe.embedding)) return maybe.embedding;
  throw new Error('Formato de embedding no reconocido');
}

/** Genera el embedding de un texto. Devuelve null si la IA no está disponible. */
export async function embedText(text: string): Promise<number[] | null> {
  const clean = text.trim();
  if (!clean) return null;
  try {
    const result = await ai.embed({ embedder: EMBEDDER, content: clean });
    return toVector(result);
  } catch (err) {
    console.error('[embeddings] Error generando embedding:', err);
    return null;
  }
}

/** Genera embeddings para varios textos en paralelo. */
export async function embedMany(texts: string[]): Promise<(number[] | null)[]> {
  return Promise.all(texts.map((t) => embedText(t)));
}
