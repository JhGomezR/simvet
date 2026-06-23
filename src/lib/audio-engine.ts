/**
 * Audio Engine — Sintetizador de sonidos del monitor clínico.
 *
 * Diseño:
 * - Todo se genera con Web Audio API (sin archivos MP3, sin CDN)
 * - AudioContext único, se inicializa lazy en la primera interacción del usuario
 *   (los navegadores bloquean audio sin gesture del usuario)
 * - Cada sonido es un envelope corto sobre un oscillator + filter
 *
 * Sonidos disponibles:
 * - beep()      : pip cardíaco estilo monitor (triangle wave + envelope)
 * - breath()    : whoosh respiratorio (noise + low-pass filter)
 * - alarm()     : tono de alarma de SpO2 (pitch depende del valor)
 * - critical()  : pulso de alarma crítica continua
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muted = false;
  private volume = 0.5;

  // Inicialización lazy. Los browsers requieren un user gesture para crear AudioContext.
  private ensureContext(): AudioContext {
    if (this.ctx && this.ctx.state !== 'closed') return this.ctx;
    const AC = (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) as typeof AudioContext | undefined;
    if (!AC) throw new Error('Web Audio API no disponible');
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : this.volume;
    this.masterGain.connect(this.ctx.destination);
    return this.ctx;
  }

  resume() {
    try {
      this.ensureContext().resume().catch(() => {});
    } catch {
      // silent
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ensureContext().currentTime, 0.05);
    }
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ensureContext().currentTime, 0.05);
    }
  }

  isMuted() { return this.muted; }
  getVolume() { return this.volume; }

  /**
   * Beep cardíaco — pip corto, agudo, estilo monitor de ECG.
   * @param spO2  Si se pasa, ajusta el pitch (más bajo SpO2 = pitch más bajo)
   */
  beep(spO2?: number) {
    if (this.muted) return;
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;
      const now = ctx.currentTime;

      // El pitch base es ~700Hz para SpO2 normal. Por cada % por debajo de 95, baja 15Hz.
      // SpO2 de 88% → ~600Hz. SpO2 de 80% → ~480Hz. Como en monitores reales.
      const basePitch = 700;
      const pitchShift = spO2 !== undefined && spO2 < 95 ? (95 - spO2) * 15 : 0;
      const pitch = Math.max(280, basePitch - pitchShift);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = pitch;

      const gain = ctx.createGain();
      // Envelope: ataque rápido, decay corto
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.8, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // silent
    }
  }

  /**
   * Sonido respiratorio — whoosh suave de inspiración + espiración.
   */
  breath() {
    if (this.muted) return;
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;
      const now = ctx.currentTime;

      // Generar ruido blanco corto y filtrarlo low-pass para simular flujo de aire
      const bufferSize = ctx.sampleRate * 0.9; // ~900ms total
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1);
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 350;
      filter.Q.value = 1;

      const gain = ctx.createGain();
      // Envelope con dos fases: inspiración (sube) y espiración (baja)
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.25);   // inhalación
      gain.gain.linearRampToValueAtTime(0.05, now + 0.5);    // breve pausa
      gain.gain.linearRampToValueAtTime(0.18, now + 0.7);    // exhalación
      gain.gain.linearRampToValueAtTime(0, now + 0.9);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now);
      noise.stop(now + 0.9);
    } catch {
      // silent
    }
  }

  /**
   * Alarma crítica — pulso intermitente cuando el paciente entra en estado crítico.
   * Llamar repetidamente (cada ~500ms desde el componente).
   */
  critical() {
    if (this.muted) return;
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(660, now + 0.12);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.01);
      gain.gain.setValueAtTime(0.35, now + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // silent
    }
  }

  /**
   * Tono de "asistolia" / flatline — para casos donde la FC llega a 0.
   */
  flatline() {
    if (this.muted) return;
    try {
      const ctx = this.ensureContext();
      if (!this.masterGain) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 440;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.setValueAtTime(0.25, now + 0.95);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.05);
    } catch {
      // silent
    }
  }
}

// Singleton (solo cliente)
let _engine: AudioEngine | null = null;
export function getAudioEngine(): AudioEngine {
  if (!_engine) _engine = new AudioEngine();
  return _engine;
}
