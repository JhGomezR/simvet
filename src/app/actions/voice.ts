'use server';
/**
 * Server Actions de voz (SimVet Clinical).
 *
 * STT (voz→texto): transcripción con Gemini multimodal (español nativo).
 *   El veterinario dicta síntomas / diagnóstico / tratamiento y se guarda
 *   en la historia clínica.
 *
 * TTS (texto→voz): intenta el modelo TTS de Gemini. Si no está disponible,
 *   devuelve ok:false y el cliente usa Web Speech API (SpeechSynthesis).
 *
 * Decisión de arquitectura: Whisper/Kokoro no corren en Firebase serverless,
 * por eso se usa Gemini audio + Web Speech (ver hooks/use-speech.ts).
 */
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import type { TranscriptionResult, SpeechResult } from '@/lib/types';

export interface TranscribeParams {
  /** data URI del audio (data:audio/...;base64,...) */
  audioDataUri: string;
  contentType?: string;
  language?: string; // por defecto 'es'
}

export interface TranscribeResponse {
  ok: boolean;
  result?: TranscriptionResult;
  error?: string;
}

export async function transcribeAudioAction(params: TranscribeParams): Promise<TranscribeResponse> {
  try {
    const lang = params.language ?? 'es';
    const res = await ai.generate({
      prompt: [
        { media: { url: params.audioDataUri, contentType: params.contentType } },
        {
          text:
            `Transcribe literalmente este audio clínico veterinario al idioma ${lang}. ` +
            'Devuelve únicamente la transcripción, sin comentarios ni puntuación añadida artificialmente.',
        },
      ],
    });
    const text = (res.text ?? '').trim();
    if (!text) return { ok: false, error: 'No se obtuvo transcripción.' };
    return { ok: true, result: { text, language: lang } };
  } catch (err) {
    console.error('[voice/stt] Error:', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Error transcribiendo el audio.' };
  }
}

export interface SpeakParams {
  text: string;
  voiceName?: string;
}

export interface SpeakResponse {
  ok: boolean;
  result?: SpeechResult;
  error?: string;
  fallbackToClient?: boolean; // indica al cliente que use Web Speech
}

/** Envuelve PCM de 16-bit / 24kHz en un contenedor WAV. */
function pcmToWav(pcm: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export async function synthesizeSpeechAction(params: SpeakParams): Promise<SpeakResponse> {
  try {
    const res = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: params.voiceName ?? 'Achernar' } },
        },
      } as Record<string, unknown>,
      prompt: params.text.slice(0, 5000),
    });

    const media = (res as { media?: { url?: string; contentType?: string } }).media;
    if (!media?.url) return { ok: false, fallbackToClient: true, error: 'El modelo no devolvió audio.' };

    // media.url suele ser data:audio/L16;base64,... (PCM crudo) → envolver en WAV.
    const base64 = media.url.split(',')[1] ?? '';
    const raw = Buffer.from(base64, 'base64');
    const isWav = (media.contentType ?? '').includes('wav');
    const wav = isWav ? raw : pcmToWav(raw);
    return {
      ok: true,
      result: { audioBase64: wav.toString('base64'), mimeType: 'audio/wav' },
    };
  } catch (err) {
    console.error('[voice/tts] Error:', err);
    return {
      ok: false,
      fallbackToClient: true,
      error: err instanceof Error ? err.message : 'TTS no disponible; usa la voz del navegador.',
    };
  }
}
