'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Clock,
  Lightbulb,
  Square,
  Star,
  Stethoscope,
  Volume2,
  XCircle,
} from 'lucide-react';
import { type ActivityTiming, type Feedback } from '@/lib/types';
import { AiDisclaimer } from '@/components/clinica/ai-disclaimer';
import { useTextToSpeech } from '@/hooks/use-speech';

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: Feedback;
  timings?: ActivityTiming[];
}

function fmtDuration(ms?: number) {
  if (!ms || ms < 0) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function buildSpeech(fb: Feedback): string {
  const parts = [
    `Retroalimentación del caso. Puntaje final: ${fb.finalScore} de 100.`,
    fb.narrativeSummary,
  ];
  if (typeof fb.diagnosisCorrect === 'boolean') {
    parts.push(fb.diagnosisCorrect ? 'El diagnóstico fue correcto.' : 'El diagnóstico no fue correcto.');
  }
  if (fb.criticalErrors.length) {
    parts.push('Errores críticos: ' + fb.criticalErrors.map((e) => e.error).join('; ') + '.');
  }
  if (fb.academicRecommendations.length) {
    parts.push('Recomendaciones: ' + fb.academicRecommendations.join('; ') + '.');
  }
  return parts.filter(Boolean).join(' ');
}

function ScoreBar({ label, value }: { label: string; value?: number }) {
  if (typeof value !== 'number') return null;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/100</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

export function FeedbackDialog({ isOpen, onClose, feedback, timings }: FeedbackDialogProps) {
  const { speak, stop, speaking, supported } = useTextToSpeech('es-ES');
  const hasContent = Boolean(feedback.narrativeSummary);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          stop();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-4xl overflow-hidden border-slate-200/80">
        <DialogHeader>
          <p className="clinical-kicker">Simulation Feedback</p>
          <DialogTitle className="text-2xl">Retroalimentación académica</DialogTitle>
          <DialogDescription>
            Análisis detallado de tu desempeño en el caso clínico.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="space-y-6 py-4">
            <div className="rounded-[1.25rem] border border-slate-200/80 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.16em] text-primary/70">Resultado final</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">Puntaje del caso</p>
                </div>
                <div className="flex items-center gap-3">
                  {supported && hasContent ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => (speaking ? stop() : speak(buildSpeech(feedback)))}
                    >
                      {speaking ? (
                        <>
                          <Square className="mr-2 h-4 w-4" /> Detener
                        </>
                      ) : (
                        <>
                          <Volume2 className="mr-2 h-4 w-4" /> Escuchar
                        </>
                      )}
                    </Button>
                  ) : null}
                  <Badge className="px-4 py-2 text-2xl">{feedback.finalScore}</Badge>
                </div>
              </div>
            </div>

            {hasContent ? <AiDisclaimer /> : null}

            {typeof feedback.diagnosisCorrect === 'boolean' ||
            typeof feedback.justificationScore === 'number' ||
            typeof feedback.treatmentScore === 'number' ? (
              <div className="space-y-3 rounded-[1.25rem] border border-slate-200/80 bg-white/80 p-5">
                <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  Evaluación clínica
                </h3>
                {typeof feedback.diagnosisCorrect === 'boolean' ? (
                  <div className="flex items-center gap-2 text-sm">
                    {feedback.diagnosisCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    Diagnóstico {feedback.diagnosisCorrect ? 'correcto' : 'incorrecto'}
                  </div>
                ) : null}
                <ScoreBar label="Justificación clínica" value={feedback.justificationScore} />
                <ScoreBar label="Tratamiento propuesto" value={feedback.treatmentScore} />
                {feedback.rubricBreakdown && feedback.rubricBreakdown.length > 0 ? (
                  <div className="pt-1">
                    {feedback.rubricBreakdown.map((r, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{r.criterion}</span>
                        <span className="font-medium">
                          {r.score}/{r.max}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {timings && timings.length > 0 ? (
              <div className="space-y-2 rounded-[1.25rem] border border-slate-200/80 bg-white/80 p-5">
                <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                  <Clock className="h-5 w-5 text-primary" />
                  Tiempos por actividad
                </h3>
                {timings.map((t, i) => (
                  <div
                    key={i}
                    className="flex justify-between rounded-xl bg-slate-50/80 px-3 py-2 text-sm"
                  >
                    <span className="text-muted-foreground">{t.activity}</span>
                    <span className="font-medium text-slate-900">{fmtDuration(t.durationMs)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            <div>
              <h3 className="mb-2 font-semibold text-slate-900">Resumen narrativo</h3>
              <p className="text-sm leading-6 text-muted-foreground">{feedback.narrativeSummary}</p>
            </div>

            <Separator />

            <div>
              <h3 className="mb-3 flex items-center font-semibold text-destructive">
                <XCircle className="mr-2 h-5 w-5" />
                Errores críticos
              </h3>
              <div className="space-y-4">
                {feedback.criticalErrors.map((item, index) => (
                  <div key={index} className="rounded-[1.15rem] bg-destructive/8 p-4">
                    <p className="font-semibold text-destructive">{item.error}</p>
                    <p className="mt-1 text-sm text-slate-700">{item.explanation}</p>
                    <p className="mt-2 flex items-start text-sm font-medium text-slate-800">
                      <Lightbulb className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{item.recommendation}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-3 flex items-center font-semibold text-emerald-700">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Decisiones correctas
              </h3>
              <div className="space-y-3">
                {feedback.correctDecisions.map((item, index) => (
                  <div key={index} className="rounded-[1.15rem] bg-emerald-50/90 p-4">
                    <p className="font-semibold text-emerald-800">{item.decision}</p>
                    <p className="mt-1 text-sm text-slate-700">{item.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            {feedback.academicRecommendations.length > 0 ? (
              <>
                <Separator />
                <div>
                  <h3 className="mb-3 flex items-center font-semibold text-slate-900">
                    <Lightbulb className="mr-2 h-5 w-5 text-primary" />
                    Recomendaciones académicas
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {feedback.academicRecommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : null}

            <Separator />

            <div>
              <h3 className="mb-2 flex items-center font-semibold text-slate-900">
                <Star className="mr-2 h-5 w-5 text-primary" />
                Comparación con la ruta clínica ideal
              </h3>
              <p className="text-sm leading-6 text-muted-foreground">
                {feedback.comparisonWithIdealPathway}
              </p>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
