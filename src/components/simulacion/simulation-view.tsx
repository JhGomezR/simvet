"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PatientInfoPanel } from "./patient-info-panel";
import { DecisionPanel } from "./decision-panel";
import { VitalsMonitor, type PatientStatus } from "./vitals-monitor";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "./feedback-dialog";
import { AcademicProgressPanel } from "./academic-progress-panel";
import type {
  ClinicalCase,
  Vitals,
  AcademicMetrics,
  AttemptEvent,
  Feedback,
  ActivityTiming,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Clock, Loader2, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { attemptsRepo } from "@/lib/repositories";
import { generateFeedbackAction } from "@/app/actions/generate-feedback";

interface SimulationViewProps {
  clinicalCase: ClinicalCase;
}

const MAX_VITALS_HISTORY = 60;

/**
 * Calcula los tiempos de ejecución por actividad a partir de los eventos
 * cronológicos del intento (flujo: "Tiempos de ejecución de cada actividad").
 * Agrupa por tipo de evento y mide el lapso entre el inicio y el último evento
 * de cada categoría.
 */
function computeActivityTimings(
  events: AttemptEvent[],
  startedAt: number,
  finishedAt: number
): ActivityTiming[] {
  const LABELS: Record<string, string> = {
    evaluation: 'Evaluación ABCDE',
    anamnesis: 'Anamnesis',
    exam: 'Examen físico',
    test: 'Pruebas diagnósticas',
    differential: 'Diagnóstico diferencial',
    treatment: 'Tratamiento',
    note: 'Notas',
  };
  const byType = new Map<string, number[]>();
  for (const e of events) {
    const arr = byType.get(e.type) ?? [];
    arr.push(e.timestamp);
    byType.set(e.type, arr);
  }
  const timings: ActivityTiming[] = [];
  for (const [type, stamps] of byType) {
    const start = Math.min(...stamps);
    const end = Math.max(...stamps);
    timings.push({
      activity: LABELS[type] ?? type,
      startedAt: start,
      finishedAt: end,
      durationMs: Math.max(0, end - start),
    });
  }
  timings.sort((a, b) => a.startedAt - b.startedAt);
  return timings;
}

function timingsToSummary(timings: ActivityTiming[], totalMs: number): string {
  const fmt = (ms: number) => `${Math.round(ms / 1000)}s`;
  const parts = timings.map((t) => `${t.activity}: ${fmt(t.durationMs ?? 0)}`);
  return `Tiempo total: ${fmt(totalMs)}. ${parts.join('; ')}.`;
}

export function SimulationView({ clinicalCase }: SimulationViewProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [simTime, setSimTime] = useState(0);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [generatingFeedback, setGeneratingFeedback] = useState(false);
  const [vitalsHistory, setVitalsHistory] = useState<Vitals[]>([clinicalCase.initialVitals]);
  const [patientStatus, setPatientStatus] = useState<PatientStatus>('Critical');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [academicMetrics, setAcademicMetrics] = useState<AcademicMetrics>({
    score: 100,
    criticalErrors: [],
    omissions: [],
    logicalReasoning: 80,
  });
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [activityTimings, setActivityTimings] = useState<ActivityTiming[]>([]);
  const eventsRef = useRef<AttemptEvent[]>([]);
  const attemptIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  const questions = clinicalCase.studentQuestions ?? [];

  const currentVitals = vitalsHistory[vitalsHistory.length - 1];
  const isPatientStable = patientStatus === 'Stable' || patientStatus === 'Improving';

  // Crear el intento en Firestore al montar
  useEffect(() => {
    const createAttempt = async () => {
      if (!user || attemptIdRef.current) return;
      try {
        const id = await attemptsRepo.create({
          studentUid: user.uid,
          caseId: clinicalCase.id,
          status: 'in_progress',
          startedAt: startedAtRef.current,
        });
        attemptIdRef.current = id;
      } catch (err) {
        console.error('No se pudo crear el intento:', err);
      }
    };
    createAttempt();
  }, [user, clinicalCase.id]);

  const updatePatientStatus = useCallback((vitals: Vitals) => {
    let score = 0;
    // Frecuencia cardíaca por especie aproximada
    const isCat = (clinicalCase.patient.species || '').toLowerCase().includes('felino');
    const hrUpper = isCat ? 220 : 160;
    const hrLower = isCat ? 120 : 60;
    if (vitals.heartRate < hrUpper && vitals.heartRate > hrLower) score++;
    else score--;

    if (vitals.respiratoryRate < 40 && vitals.respiratoryRate > 12) score++;
    else score--;

    if (vitals.perfusionStatus === 'Normal' || vitals.perfusionStatus === 'Adecuada') score++;
    if (vitals.consciousnessLevel === 'Alerta') score++;
    if (vitals.spO2 && vitals.spO2 >= 94) score++;
    if (vitals.spO2 && vitals.spO2 < 88) score--;

    if (score > 2) {
      setPatientStatus((prev) => (prev === 'Improving' || prev === 'Stable' ? 'Stable' : 'Improving'));
    } else if (score >= 0) {
      setPatientStatus((prev) => (prev === 'Worsening' || prev === 'Unstable' ? 'Unstable' : 'Worsening'));
    } else {
      setPatientStatus('Critical');
    }
  }, [clinicalCase.patient.species]);

  // Simulation tick — degradación natural si no es estable
  useEffect(() => {
    const timer = setInterval(() => {
      setSimTime((t) => t + 1);

      setVitalsHistory((prev) => {
        const last = prev[prev.length - 1];
        const next = { ...last };
        if (!isPatientStable && (simTime + 1) % 5 === 0) {
          next.heartRate += 2;
          next.respiratoryRate += 1;
          if (next.spO2) next.spO2 = Math.max(70, next.spO2 - 1);
          if (next.lactate) next.lactate = Math.min(15, next.lactate + 0.2);
        }
        updatePatientStatus(next);
        const arr = [...prev, next];
        return arr.length > MAX_VITALS_HISTORY ? arr.slice(arr.length - MAX_VITALS_HISTORY) : arr;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [simTime, isPatientStable, updatePatientStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleAction = (actionType: string, value: string) => {
    setCompletedSteps((prev) => ({ ...prev, [value]: true }));

    // Registrar evento
    const ev: AttemptEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      type: actionType.toLowerCase() as AttemptEvent['type'],
      actionId: value,
      actionLabel: value,
    };
    eventsRef.current.push(ev);

    // Aplicar efecto del tratamiento sobre las vitales
    setVitalsHistory((prevHistory) => {
      const newVitals = { ...prevHistory[prevHistory.length - 1] };

      if (value === 'Oxigenoterapia' || value === 'Vía Aérea' || value === 'Respiración') {
        newVitals.respiratoryRate = Math.max(20, newVitals.respiratoryRate - 5);
        if (newVitals.spO2) newVitals.spO2 = Math.min(99, newVitals.spO2 + 6);
      }
      if (value === 'Fluidoterapia' || value === 'Circulación') {
        newVitals.heartRate = Math.max(80, newVitals.heartRate - 10);
        newVitals.perfusionStatus = 'Adecuada';
        if (newVitals.systolicBP) newVitals.systolicBP = Math.min(120, newVitals.systolicBP + 20);
        if (newVitals.lactate) newVitals.lactate = Math.max(1.5, newVitals.lactate - 1.5);
      }
      if (value === 'Administrar Fármaco') {
        // Genérico: leve mejora
        if (newVitals.consciousnessLevel === 'Estuporoso') {
          newVitals.consciousnessLevel = 'Apagado';
        }
      }

      const newHistory = [...prevHistory, newVitals];
      return newHistory.length > MAX_VITALS_HISTORY
        ? newHistory.slice(newHistory.length - MAX_VITALS_HISTORY)
        : newHistory;
    });

    setAcademicMetrics((prev) => ({ ...prev, score: Math.min(100, prev.score + 2) }));

    toast({
      title: 'Acción realizada',
      description: value,
    });
  };

  const handleFinalize = async () => {
    setGeneratingFeedback(true);
    setIsFeedbackOpen(true);

    // Tiempos de ejecución por actividad
    const finishedAt = Date.now();
    const totalDurationMs = finishedAt - startedAtRef.current;
    const timings = computeActivityTimings(eventsRef.current, startedAtRef.current, finishedAt);
    setActivityTimings(timings);
    const activitySummary = timingsToSummary(timings, totalDurationMs);

    // Respuestas del estudiante a las preguntas dirigidas
    const answersArr = questions
      .map((q) => ({ question: q.prompt, answer: studentAnswers[q.id] ?? '' }))
      .filter((a) => a.answer.trim().length > 0);
    const studentDiagnosis =
      questions
        .filter((q) => q.kind === 'diagnostico')
        .map((q) => studentAnswers[q.id])
        .find((a) => a && a.trim().length > 0) ?? undefined;

    // Construir input para el flow de Gemini
    const studentActions = eventsRef.current.map((e) => `[${new Date(e.timestamp).toISOString().slice(11, 19)}] ${e.actionLabel}`);
    const idealPathway = clinicalCase.idealPathway?.join(' → ') ?? 'No definido';
    const finalScore = academicMetrics.score;

    // Heurística simple: errores e ítems correctos (mejorable con análisis del flow Genkit)
    const recommendedTreatments = clinicalCase.treatmentPlan?.filter((t) => t.isRecommended).map((t) => t.name) ?? [];
    const studentTreatments = studentActions.filter((a) => a.includes('terapia') || a.includes('Administrar'));
    const correctDecisions = studentTreatments.slice(0, 3);
    const criticalErrors = recommendedTreatments
      .filter((tx) => !studentActions.some((a) => a.toLowerCase().includes(tx.toLowerCase())))
      .slice(0, 3)
      .map((tx) => `No se realizó: ${tx}`);

    try {
      const fb = await generateFeedbackAction({
        caseSummary: `${clinicalCase.name}. ${clinicalCase.description}. Paciente: ${clinicalCase.patient.name}, ${clinicalCase.patient.species}, ${clinicalCase.patient.weightKg} kg. Motivo: ${clinicalCase.patient.chiefComplaint}.`,
        studentActions,
        criticalErrors,
        correctDecisions,
        idealClinicalPathway: idealPathway,
        finalScore,
        correctDiagnosis: clinicalCase.finalDiagnosis,
        studentDiagnosis,
        studentAnswers: answersArr,
        activitySummary,
      });
      setFeedback(fb);

      // Persistir el intento finalizado
      if (attemptIdRef.current) {
        await attemptsRepo.update(attemptIdRef.current, {
          status: 'completed',
          finishedAt,
          finalScore,
          vitalsTimeline: vitalsHistory,
          events: eventsRef.current,
          feedback: fb,
          activityTimings: timings,
          studentAnswers: answersArr.map((a, i) => ({ questionId: questions[i]?.id ?? `q${i}`, answer: a.answer })),
          totalDurationMs,
        });
      }
    } catch (err) {
      console.error('Error finalizando:', err);
      toast({
        variant: 'destructive',
        title: 'Error generando feedback',
        description: 'Tu intento fue guardado pero el feedback no pudo generarse.',
      });
    } finally {
      setGeneratingFeedback(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center bg-card p-2 rounded-lg border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xl font-bold bg-primary text-primary-foreground p-2 rounded">
            <Clock className="h-6 w-6" />
            <span>{formatTime(simTime)}</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-destructive font-semibold">
            <AlertTriangle className="h-5 w-5" />
            <span>EL PACIENTE PUEDE FALLECER SI NO SE ACTÚA</span>
          </div>
        </div>
        <Button size="lg" onClick={handleFinalize} disabled={generatingFeedback}>
          {generatingFeedback && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Finalizar Caso y Evaluar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-3 space-y-6">
          <PatientInfoPanel patient={clinicalCase.patient} caseInfo={clinicalCase} />
          <AcademicProgressPanel metrics={academicMetrics} />
          {questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HelpCircle className="h-4 w-4" /> Preguntas del caso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((q, i) => (
                  <div key={q.id} className="space-y-1.5">
                    <Label htmlFor={`q-${q.id}`} className="text-sm">
                      {i + 1}. {q.prompt}
                    </Label>
                    {q.options && q.options.length > 0 ? (
                      <div className="space-y-1">
                        {q.options.map((opt) => (
                          <label key={opt} className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              value={opt}
                              checked={studentAnswers[q.id] === opt}
                              onChange={(e) =>
                                setStudentAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                              }
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    ) : (
                      <Textarea
                        id={`q-${q.id}`}
                        value={studentAnswers[q.id] ?? ''}
                        onChange={(e) =>
                          setStudentAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                        }
                        placeholder="Tu respuesta..."
                        className="min-h-[64px] text-sm"
                      />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        <div className="lg:col-span-5">
          <DecisionPanel
            onAction={handleAction}
            completedSteps={completedSteps}
            isPatientStable={isPatientStable}
            clinicalCase={clinicalCase}
          />
        </div>
        <div className="lg:col-span-4">
          <VitalsMonitor vitalsHistory={vitalsHistory} status={patientStatus} />
        </div>
      </div>

      <FeedbackDialog
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        timings={activityTimings}
        feedback={feedback ?? {
          narrativeSummary: generatingFeedback ? 'Generando análisis con IA...' : '',
          criticalErrors: [],
          correctDecisions: [],
          academicRecommendations: [],
          comparisonWithIdealPathway: '',
          finalScore: academicMetrics.score,
        }}
      />
    </div>
  );
}
