/**
 * POST /tts/speak — Texto a voz (Kokoro-equivalente con Gemini TTS).
 *
 * Entrada: JSON { text, voiceName? }.
 * Salida:  audio/wav (binario) si Gemini TTS está disponible; si no, JSON
 *          { fallbackToClient: true } para que el cliente use Web Speech API.
 */
import { NextResponse } from 'next/server';
import { synthesizeSpeechAction } from '@/app/actions/voice';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { text, voiceName } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Falta el texto a sintetizar.' }, { status: 400 });
    }

    const res = await synthesizeSpeechAction({ text, voiceName });
    if (!res.ok || !res.result) {
      return NextResponse.json(
        { error: res.error, fallbackToClient: res.fallbackToClient ?? true },
        { status: 200 } // 200 para que el cliente caiga limpio a Web Speech
      );
    }

    const audio = Buffer.from(res.result.audioBase64, 'base64');
    return new NextResponse(new Uint8Array(audio), {
      status: 200,
      headers: {
        'Content-Type': res.result.mimeType,
        'Content-Length': String(audio.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error generando el audio.' },
      { status: 500 }
    );
  }
}
