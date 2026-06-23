'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  Lightbulb,
  Star,
  Volume2,
  Square,
  Clock,
  Stethoscope,
} from "lucide-react";
import { type Feedback, type ActivityTiming } from "@/lib/types";
import { AiDisclaimer } from "@/components/clinica/ai-disclaimer";
import { useTextToSpeech } from "@/hooks/use-speech";

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  feedback: Feedback;
  timings?: ActivityTiming[];
}

function fmtDuration(ms?: number) {
  if (!ms || ms < 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

/** Construye el texto que se leerá en voz alta (flujo J). */
function buildSpeech(fb: Feedback): string {
  const parts = [
    `Retroalimentación del caso. Puntaje final: ${fb.finalScore} de 100.`,
    fb.narrativeSummary,
  ];
  if (typeof fb.diagnosisCorrect === "boolean") {
    parts.push(fb.diagnosisCorrect ? "El diagnóstico fue correcto." : "El diagnóstico no fue correcto.");
  }
  if (fb.criticalErrors.length) {
    parts.push("Errores críticos: " + fb.criticalErrors.map((e) => e.error).join("; ") + ".");
  }
  if (fb.academicRecommendations.length) {
    parts.push("Recomendaciones: " + fb.academicRecommendations.join("; ") + ".");
  }
  return parts.filter(Boolean).join(" ");
}

function ScoreBar({ label, value }: { label: string; value?: number }) {
  if (typeof value !== "number") return null;
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
  const { speak, stop, speaking, supported } = useTextToSpeech("es-ES");
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
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Retroalimentación Académica</DialogTitle>
          <DialogDescription>
            Análisis detallado de tu desempeño en el caso clínico.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-6">
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-muted p-4">
              <span className="text-lg font-semibold">Puntaje Final</span>
              <div className="flex items-center gap-3">
                {supported && hasContent && (
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
                )}
                <Badge className="px-4 py-2 text-2xl">{feedback.finalScore}</Badge>
              </div>
            </div>

            {hasContent && <AiDisclaimer />}

            {/* Evaluación estructurada */}
            {(typeof feedback.diagnosisCorrect === "boolean" ||
              typeof feedback.justificationScore === "number" ||
              typeof feedback.treatmentScore === "number") && (
              <div className="space-y-3 rounded-lg border p-4">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Stethoscope className="h-5 w-5" /> Evaluación clínica
                </h3>
                {typeof feedback.diagnosisCorrect === "boolean" && (
                  <div className="flex items-center gap-2 text-sm">
                    {feedback.diagnosisCorrect ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    Diagnóstico {feedback.diagnosisCorrect ? "correcto" : "incorrecto"}
                  </div>
                )}
                <ScoreBar label="Justificación clínica" value={feedback.justificationScore} />
                <ScoreBar label="Tratamiento propuesto" value={feedback.treatmentScore} />
                {feedback.rubricBreakdown && feedback.rubricBreakdown.length > 0 && (
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
                )}
              </div>
            )}

            {/* Tiempos de ejecución por actividad */}
            {timings && timings.length > 0 && (
              <div className="space-y-2 rounded-lg border p-4">
                <h3 className="flex items-center gap-2 font-semibold">
                  <Clock className="h-5 w-5" /> Tiempos por actividad
                </h3>
                {timings.map((t, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.activity}</span>
                    <span className="font-medium">{fmtDuration(t.durationMs)}</span>
                  </div>
                ))}
              </div>
            )}

            <div>
              <h3 className="mb-2 font-semibold">Resumen Narrativo</h3>
              <p className="text-sm text-muted-foreground">{feedback.narrativeSummary}</p>
            </div>

            <Separator />

            <div>
              <h3 className="mb-3 flex items-center font-semibold text-destructive">
                <XCircle className="mr-2 h-5 w-5" />
                Errores Críticos
              </h3>
              <div className="space-y-4">
                {feedback.criticalErrors.map((item, index) => (
                  <div key={index} className="rounded-lg bg-destructive/10 p-3">
                    <p className="font-semibold text-destructive">{item.error}</p>
                    <p className="mt-1 text-sm">{item.explanation}</p>
                    <p className="mt-2 flex items-start text-sm font-medium">
                      <Lightbulb className="mr-2 mt-0.5 h-4 w-4 flex-shrink-0" />{" "}
                      <span>{item.recommendation}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="mb-3 flex items-center font-semibold text-green-600">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Decisiones Correctas
              </h3>
              <div className="space-y-3">
                {feedback.correctDecisions.map((item, index) => (
                  <div key={index} className="rounded-lg bg-green-600/10 p-3">
                    <p className="font-semibold text-green-700">{item.decision}</p>
                    <p className="mt-1 text-sm">{item.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            {feedback.academicRecommendations.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-2 flex items-center font-semibold">
                    <Lightbulb className="mr-2 h-5 w-5" /> Recomendaciones Académicas
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {feedback.academicRecommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <Separator />

            <div>
              <h3 className="mb-2 flex items-center font-semibold">
                <Star className="mr-2 h-5 w-5" />
                Comparación con Ruta Clínica Ideal
              </h3>
              <p className="text-sm text-muted-foreground">{feedback.comparisonWithIdealPathway}</p>
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
