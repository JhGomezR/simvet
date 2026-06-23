'use client';
/**
 * Banner de IA responsable (SimVet Clinical).
 * Se muestra junto a cualquier salida generada por IA para recordar que es
 * orientativa y debe validarla un veterinario.
 */
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_AI_DISCLAIMER } from '@/lib/types';

export function AiDisclaimer({ message, className }: { message?: string; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200',
        className
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message ?? DEFAULT_AI_DISCLAIMER}</p>
    </div>
  );
}
