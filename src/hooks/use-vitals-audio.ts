'use client';

/**
 * useVitalsAudio — sincroniza el motor de audio con las vitales del paciente.
 *
 * - Beep cardíaco cada 60/FC segundos
 * - Sonido respiratorio cada 60/FR segundos
 * - Alarma crítica intermitente cuando status === 'Critical'
 * - Persiste mute/volumen en localStorage
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { getAudioEngine } from '@/lib/audio-engine';

interface UseVitalsAudioArgs {
  heartRate: number;
  respiratoryRate: number;
  spO2?: number;
  status: string; // 'Stable' | 'Improving' | 'Worsening' | 'Unstable' | 'Critical'
  enabled?: boolean;
}

const LS_MUTED = 'simvet:audio:muted';
const LS_VOLUME = 'simvet:audio:volume';

export function useVitalsAudio({
  heartRate,
  respiratoryRate,
  spO2,
  status,
  enabled = true,
}: UseVitalsAudioArgs) {
  const [muted, setMutedState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(LS_MUTED) === '1';
  });
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.5;
    const v = parseFloat(localStorage.getItem(LS_VOLUME) ?? '0.5');
    return isNaN(v) ? 0.5 : v;
  });
  const [audioReady, setAudioReady] = useState(false);

  const beepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const criticalIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sincronizar estado con el motor
  useEffect(() => {
    const eng = getAudioEngine();
    eng.setMuted(muted);
    localStorage.setItem(LS_MUTED, muted ? '1' : '0');
  }, [muted]);

  useEffect(() => {
    const eng = getAudioEngine();
    eng.setVolume(volume);
    localStorage.setItem(LS_VOLUME, String(volume));
  }, [volume]);

  // Programar beeps cardíacos
  useEffect(() => {
    if (!enabled || !audioReady || muted) {
      if (beepIntervalRef.current) {
        clearInterval(beepIntervalRef.current);
        beepIntervalRef.current = null;
      }
      return;
    }
    if (heartRate <= 0) {
      // Asistolia → flatline
      const eng = getAudioEngine();
      eng.flatline();
      if (beepIntervalRef.current) {
        clearInterval(beepIntervalRef.current);
        beepIntervalRef.current = null;
      }
      return;
    }
    const intervalMs = Math.max(150, Math.round(60000 / heartRate));
    const eng = getAudioEngine();
    // Beep inicial inmediato
    eng.beep(spO2);
    if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
    beepIntervalRef.current = setInterval(() => eng.beep(spO2), intervalMs);

    return () => {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    };
  }, [heartRate, spO2, muted, enabled, audioReady]);

  // Programar respiración
  useEffect(() => {
    if (!enabled || !audioReady || muted) {
      if (breathIntervalRef.current) {
        clearInterval(breathIntervalRef.current);
        breathIntervalRef.current = null;
      }
      return;
    }
    if (respiratoryRate <= 0) {
      if (breathIntervalRef.current) {
        clearInterval(breathIntervalRef.current);
        breathIntervalRef.current = null;
      }
      return;
    }
    const intervalMs = Math.max(800, Math.round(60000 / respiratoryRate));
    const eng = getAudioEngine();
    if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    breathIntervalRef.current = setInterval(() => eng.breath(), intervalMs);
    // Primera respiración con desfase para no chocar con el beep
    const firstId = setTimeout(() => eng.breath(), 400);

    return () => {
      clearTimeout(firstId);
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
      breathIntervalRef.current = null;
    };
  }, [respiratoryRate, muted, enabled, audioReady]);

  // Alarma crítica intermitente
  useEffect(() => {
    if (!enabled || !audioReady || muted) {
      if (criticalIntervalRef.current) {
        clearInterval(criticalIntervalRef.current);
        criticalIntervalRef.current = null;
      }
      return;
    }
    const isCritical = status === 'Critical';
    if (!isCritical) {
      if (criticalIntervalRef.current) {
        clearInterval(criticalIntervalRef.current);
        criticalIntervalRef.current = null;
      }
      return;
    }
    const eng = getAudioEngine();
    if (criticalIntervalRef.current) clearInterval(criticalIntervalRef.current);
    criticalIntervalRef.current = setInterval(() => eng.critical(), 1500);

    return () => {
      if (criticalIntervalRef.current) clearInterval(criticalIntervalRef.current);
      criticalIntervalRef.current = null;
    };
  }, [status, muted, enabled, audioReady]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (beepIntervalRef.current) clearInterval(beepIntervalRef.current);
      if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
      if (criticalIntervalRef.current) clearInterval(criticalIntervalRef.current);
    };
  }, []);

  // Inicializar el AudioContext (requiere gesture del usuario).
  // Llamar desde un onClick para habilitar el audio.
  const enableAudio = useCallback(() => {
    const eng = getAudioEngine();
    eng.resume();
    setAudioReady(true);
  }, []);

  const setMuted = useCallback((m: boolean) => {
    setMutedState(m);
    if (!audioReady && !m) {
      // Si está activando audio por primera vez, inicializar contexto
      const eng = getAudioEngine();
      eng.resume();
      setAudioReady(true);
    }
  }, [audioReady]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (!audioReady && v > 0) {
      const eng = getAudioEngine();
      eng.resume();
      setAudioReady(true);
    }
  }, [audioReady]);

  return {
    muted,
    setMuted,
    volume,
    setVolume,
    audioReady,
    enableAudio,
  };
}
