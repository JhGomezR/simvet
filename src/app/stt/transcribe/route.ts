/**
 * POST /stt/transcribe — Voz a texto (Whisper-equivalente con Gemini audio).
 *
 * Entrada: multipart/form-data con campo `audio` (archivo), o JSON
 *          { audioDataUri, contentType?, language? }.
 * Salida:  JSON { text, language } | { error }.
 */
import { NextResponse } from 'next/server';
import { transcribeAudioAction } from '@/app/actions/voice';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const contentTypeHeader = req.headers.get('content-type') ?? '';
    let audioDataUri: string;
    let contentType: string | undefined;
    let language: string | undefined;

    if (contentTypeHeader.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('audio');
      language = (form.get('language') as string) || undefined;
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Falta el archivo de audio (campo "audio").' }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      contentType = file.type || 'audio/webm';
      audioDataUri = `data:${contentType};base64,${buf.toString('base64')}`;
    } else {
      const body = await req.json();
      audioDataUri = body.audioDataUri;
      contentType = body.contentType;
      language = body.language;
      if (!audioDataUri) {
        return NextResponse.json({ error: 'Falta audioDataUri.' }, { status: 400 });
      }
    }

    const res = await transcribeAudioAction({ audioDataUri, contentType, language });
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 502 });
    return NextResponse.json(res.result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error procesando el audio.' },
      { status: 500 }
    );
  }
}
