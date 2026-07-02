'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Clock, HelpCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PatientInfoPanel } from './patient-info-panel';
import { DecisionPanel } from './decision-panel';
import { VitalsMonitor, type PatientStatus } from './vitals-monitor';
import { FeedbackDialog } from './feedback-dialog';
import { AcademicProgressPanel } from './academic-progress-panel';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { attemptsRepo } from '@/lib/repositories';
import { generateFeedbackAction } from '@/app/actions/generate-feedback';
import type {
  AcademicMetrics,
  ActivityTiming,
  AttemptEvent,
  ClinicalCase,
  Feedback,
  Vitals,
} from '@/lib/types';

interface SimulationViewProps {
  clinicalCase: ClinicalCase;
}

const MAX_VITALS_HISTORY = 60;

function computeActivityTimings(events: AttemptEvent[]): ActivityTiming[] {
  const labels: Record<string, string> = {
    evaluation: 'Evaluación ABCDE',
    anamnesis: 'Anamnesis',
    exam: 'Examen físico',
    test: 'Pruebas diagnósticas',
    differential: 'Diagnóstico diferencial',
    treatment: 'Tratamiento',
    note: 'Notas',
  };

  const byType = new Map<string, number[]>();
  for (const event of events) {
    const previous = byType.get(event.type) ?? [];
    previous.push(event.timestamp);
    byType.set(event.type, previous);
  }

  return Array.from(byType.entries())
    .map(([type, timestamps]) => ({
      activity: labels[type] ?? type,
      startedAt: Math.min(...timestamps),
      finishedAt: Math.max(...timestamps),
      durationMs: Math.max(0, Math.max(...timestamps) - Math.min(...timestamps)),
    }))
    .sort((a, b) => a.startedAt - b.startedAt);
}

function timingsToSummary(timings: ActivityTiming[], totalMs: number): string {
  const fmt = (ms: number) => `${Math.round(ms / 1000)}s`;
  return `Tiempo total: ${fmt(totalMs)}. ${timings
    .map((timing) => `${timing.activity}: ${fmt(timing.durationMs ?? 0)}`)
    .join('; ')}.`;
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
  const isPatientStable = patientStatus === 'Stable' || patientStatus === 'Improving';

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
        toast({
          variant: 'destructive',
          title: 'No se pudo iniciar el historial de la simulación',
          description:
            err instanceof Error
              ? err.message
              : 'Revisa permisos de Firestore para intentos y vuelve a intentarlo.',
        });
      }
    };
    void createAttempt();
  }, [user, clinicalCase.id, toast]);

  const updatePatientStatus = useCallback(
    (vitals: Vitals) => {
      let score = 0;
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

      if (score > 2) setPatientStatus('Stable');
      else if (score >= 0) setPatientStatus('Improving');
      else if (score === -1) setPatientStatus('Unstable');
      else setPatientStatus('Critical');
    },
    [clinicalCase.patient.species]
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setSimTime((value) => value + 1);
      setVitalsHistory((previous) => {
        const last = previous[previous.length - 1];
        const next = { ...last };
        if (!isPatientStable && (simTime + 1) % 5 === 0) {
          next.heartRate += 2;
          next.respiratoryRate += 1;
          if (next.spO2) next.spO2 = Math.max(70, next.spO2 - 1);
          if (next.lactate) next.lactate = Math.min(15, next.lactate + 0.2);
        }
        updatePatientStatus(next);
        const merged = [...previous, next];
        return merged.length > MAX_VITALS_HISTORY
          ? merged.slice(merged.length - MAX_VITALS_HISTORY)
          : merged;
      });
    }, 2000);

    return () => clearInterval(timer);
  }, [simTime, isPatientStable, updatePatientStatus]);

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }

  function handleAction(actionType: string, actionId: string, actionLabel: string) {
    setCompletedSteps((prev) => ({ ...prev, [actionId]: true, [actionLabel]: true }));

    const event: AttemptEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      type: actionType.toLowerCase() as AttemptEvent['type'],
      actionId,
      actionLabel,
    };
    eventsRef.current.push(event);

    const selectedTreatment = clinicalCase.treatmentPlan?.find((item) => item.id === actionId);

    setVitalsHistory((previous) => {
      const next = { ...previous[previous.length - 1] };

      if (
        actionId === 'Vía Aérea' ||
        actionId === 'Respiración' ||
        actionLabel.toLowerCase().includes('oxigen')
      ) {
        next.respiratoryRate = Math.max(20, next.respiratoryRate - 5);
        if (next.spO2) next.spO2 = Math.min(99, next.spO2 + 6);
      }

      if (
        actionId === 'Circulación' ||
        actionLabel.toLowerCase().includes('fluid') ||
        actionLabel.toLowerCase().includes('cristalo')
      ) {
        next.heartRate = Math.max(80, next.heartRate - 10);
        next.perfusionStatus = 'Adecuada';
        if (next.systolicBP) next.systolicBP = Math.min(120, next.systolicBP + 20);
        if (next.lactate) next.lactate = Math.max(1.5, next.lactate - 1.5);
      }

      if (selectedTreatment?.expectedEffect?.vitals) {
        Object.assign(next, selectedTreatment.expectedEffect.vitals);
      }

      if (
        actionLabel.toLowerCase().includes('analgesi') ||
        actionLabel.toLowerCase().includes('farmaco') ||
        actionLabel.toLowerCase().includes('fármaco')
      ) {
        if (next.consciousnessLevel === 'Estuporoso') {
          next.consciousnessLevel = 'Apagado';
        }
      }

      updatePatientStatus(next);
      const merged = [...previous, next];
      return merged.length > MAX_VITALS_HISTORY
        ? merged.slice(merged.length - MAX_VITALS_HISTORY)
        : merged;
    });

    setAcademicMetrics((prev) => ({
      ...prev,
      score: Math.min(100, prev.score + 2),
      logicalReasoning: selectedTreatment?.isRecommended
        ? Math.min(100, prev.logicalReasoning + 3)
        : prev.logicalReasoning,
    }));

    toast({
      title: 'Acción realizada',
      description: actionLabel,
    });
  }

  async function handleFinalize() {
    setGeneratingFeedback(true);
    setIsFeedbackOpen(true);

    const finishedAt = Date.now();
    const totalDurationMs = finishedAt - startedAtRef.current;
    const timings = computeActivityTimings(eventsRef.current);
    setActivityTimings(timings);
    const activitySummary = timingsToSummary(timings, totalDurationMs);

    const answersArr = questions
      .map((question) => ({ question: question.prompt, answer: studentAnswers[question.id] ?? '' }))
      .filter((answer) => answer.answer.trim().length > 0);
    const studentDiagnosis =
      questions
        .filter((question) => question.kind === 'diagnostico')
        .map((question) => studentAnswers[question.id])
        .find((answer) => answer && answer.trim().length > 0) ?? undefined;

    const studentActions = eventsRef.current.map(
      (event) => `[${new Date(event.timestamp).toISOString().slice(11, 19)}] ${event.actionLabel}`
    );
    const idealPathway = clinicalCase.idealPathway?.join(' → ') ?? 'No definido';
    const finalScore = academicMetrics.score;

    const recommendedTreatments =
      clinicalCase.treatmentPlan?.filter((item) => item.isRecommended).map((item) => item.name) ??
      [];
    const correctDecisions = studentActions.slice(0, 4);
    const criticalErrors = recommendedTreatments
      .filter(
        (treatment) =>
          !studentActions.some((action) => action.toLowerCase().includes(treatment.toLowerCase()))
      )
      .slice(0, 3)
      .map((treatment) => `No se realizó: ${treatment}`);

    try {
      const generatedFeedback = await generateFeedbackAction({
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
      setFeedback(generatedFeedback);

      if (attemptIdRef.current) {
        await attemptsRepo.update(attemptIdRef.current, {
          status: 'completed',
          finishedAt,
          finalScore,
          vitalsTimeline: vitalsHistory,
          events: eventsRef.current,
          feedback: generatedFeedback,
          activityTimings: timings,
          studentAnswers: answersArr.map((answer, index) => ({
            questionId: questions[index]?.id ?? `q${index}`,
            answer: answer.answer,
          })),
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
  }

  return (
    <div className="w-full space-y-5">
      <div className="clinical-panel flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 rounded-[1.15rem] bg-slate-950 px-4 py-3 text-white shadow-[0_16px_35px_-24px_rgba(15,23,42,0.9)]">
            <Clock className="h-5 w-5 text-cyan-300" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Tiempo</p>
              <p className="font-mono text-xl font-semibold">{formatTime(simTime)}</p>
            </div>
          </div>
          <div className="rounded-[1.15rem] border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              El paciente puede deteriorarse si no se actúa a tiempo
            </div>
            <p className="mt-1 text-amber-800/90">
              Evalúa, estabiliza y decide con criterio antes de solicitar o tratar.
            </p>
          </div>
        </div>

        <Button size="lg" onClick={() => void handleFinalize()} disabled={generatingFeedback}>
          {generatingFeedback ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Finalizar caso y evaluar
        </Button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-3">
          <PatientInfoPanel patient={clinicalCase.patient} caseInfo={clinicalCase} />
          <AcademicProgressPanel metrics={academicMetrics} />
          {questions.length > 0 ? (
            <Card>
              <CardHeader>
                <p className="clinical-kicker">Case Reflection</p>
                <CardTitle className="flex items-center gap-2 text-base">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Preguntas del caso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {questions.map((question, index) => (
                  <div key={question.id} className="space-y-2">
                    <Label htmlFor={`q-${question.id}`} className="text-sm leading-6">
                      {index + 1}. {question.prompt}
                    </Label>
                    <Textarea
                      id={`q-${question.id}`}
                      value={studentAnswers[question.id] ?? ''}
                      onChange={(e) =>
                        setStudentAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))
                      }
                      placeholder="Escribe tu criterio clínico..."
                      className="min-h-[84px] text-sm"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="xl:col-span-5">
          <DecisionPanel
            onAction={handleAction}
            completedSteps={completedSteps}
            isPatientStable={isPatientStable}
            clinicalCase={clinicalCase}
          />
        </div>

        <div className="xl:col-span-4">
          <VitalsMonitor vitalsHistory={vitalsHistory} status={patientStatus} />
        </div>
      </div>

      <FeedbackDialog
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        timings={activityTimings}
        feedback={
          feedback ?? {
            narrativeSummary: generatingFeedback ? 'Generando análisis con IA...' : '',
            criticalErrors: [],
            correctDecisions: [],
            academicRecommendations: [],
            comparisonWithIdealPathway: '',
            finalScore: academicMetrics.score,
          }
        }
      />
    </div>
  );
}
