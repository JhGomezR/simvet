'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Beaker,
  ClipboardCheck,
  MessageSquare,
  Stethoscope,
  Syringe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ClinicalCase } from '@/lib/types';

interface DecisionPanelProps {
  onAction: (actionType: string, actionId: string, actionLabel: string) => void;
  completedSteps: Record<string, boolean>;
  isPatientStable: boolean;
  clinicalCase?: ClinicalCase;
}

const defaultEvaluation = ['Vía Aérea', 'Respiración', 'Circulación', 'Discapacidad', 'Exposición'];
const defaultTreatments = ['Oxigenoterapia', 'Fluidoterapia', 'Administrar Fármaco', 'Sondaje Urinario'];

export function DecisionPanel({
  onAction,
  completedSteps,
  isPatientStable,
  clinicalCase,
}: DecisionPanelProps) {
  const allEvaluationDone = defaultEvaluation.every((action) => completedSteps[action]);
  const [revealedAnamnesis, setRevealedAnamnesis] = useState<Record<string, string>>({});
  const [revealedExam, setRevealedExam] = useState<Record<string, string>>({});
  const [revealedTests, setRevealedTests] = useState<Record<string, boolean>>({});

  const anamnesisItems = clinicalCase?.anamnesis ?? [];
  const examItems = clinicalCase?.physicalExam ?? [];
  const testItems = clinicalCase?.diagnosticTests ?? [];
  const treatmentItems = clinicalCase?.treatmentPlan ?? [];

  const handleAnamnesis = (id: string, text: string, response: string) => {
    setRevealedAnamnesis((prev) => ({ ...prev, [id]: response }));
    onAction('anamnesis', id, text);
  };

  const handleExam = (id: string, technique: string, finding: string) => {
    setRevealedExam((prev) => ({ ...prev, [id]: finding }));
    onAction('exam', id, technique);
  };

  const handleTest = (id: string, name: string) => {
    setRevealedTests((prev) => ({ ...prev, [id]: true }));
    onAction('test', id, name);
  };

  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <CardTitle>Área de Decisiones Clínicas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Prioriza estabilización, interroga con intención diagnóstica y usa pruebas o tratamientos
          según el estado real del paciente.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="evaluation">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="evaluation">
              <ClipboardCheck className="mr-1 h-4 w-4" />
              ABCDE
            </TabsTrigger>
            <TabsTrigger value="interrogation" disabled={!allEvaluationDone}>
              <MessageSquare className="mr-1 h-4 w-4" />
              Anamnesis
            </TabsTrigger>
            <TabsTrigger value="exam" disabled={!allEvaluationDone}>
              <Stethoscope className="mr-1 h-4 w-4" />
              Examen
            </TabsTrigger>
            <TabsTrigger value="exams" disabled={!allEvaluationDone}>
              <Beaker className="mr-1 h-4 w-4" />
              Pruebas
            </TabsTrigger>
            <TabsTrigger value="treatment">
              <Syringe className="mr-1 h-4 w-4" />
              Tratamiento
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evaluation" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Realiza la evaluación primaria en orden. Cada paso desbloquea una mejor toma de
              decisiones clínica.
            </p>
            {defaultEvaluation.map((action, index) => {
              const isCompleted = completedSteps[action];
              const isPreviousCompleted = index === 0 || completedSteps[defaultEvaluation[index - 1]];
              return (
                <div key={action} className="flex items-center gap-3 rounded-lg border p-3">
                  <Checkbox
                    id={action}
                    checked={isCompleted}
                    onCheckedChange={() => !isCompleted && onAction('evaluation', action, action)}
                    disabled={isCompleted || !isPreviousCompleted}
                  />
                  <label
                    htmlFor={action}
                    className={cn(
                      'text-sm font-medium leading-none',
                      isCompleted || !isPreviousCompleted ? 'text-muted-foreground' : 'cursor-pointer'
                    )}
                  >
                    {action}
                  </label>
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="interrogation" className="mt-4">
            {anamnesisItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este caso no tiene preguntas de anamnesis definidas todavía.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Formula preguntas concretas. La respuesta del propietario se irá revelando en la
                  medida en que la consultes.
                </p>
                {anamnesisItems.map((question) => (
                  <div key={question.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-auto whitespace-normal py-2 text-left"
                        onClick={() =>
                          handleAnamnesis(question.id, question.text, question.ownerResponse)
                        }
                        disabled={Boolean(revealedAnamnesis[question.id])}
                      >
                        {question.text}
                      </Button>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {question.relevance}
                      </Badge>
                    </div>
                    {revealedAnamnesis[question.id] && (
                      <p className="mt-2 border-l-2 border-primary pl-3 text-sm italic text-foreground/80">
                        Dueño: "{revealedAnamnesis[question.id]}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="exam" className="mt-4">
            {examItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este caso no tiene hallazgos de examen definidos todavía.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Realiza técnicas por sistema. Cada hallazgo aporta información para priorizar tus
                  siguientes decisiones.
                </p>
                {examItems.map((finding) => (
                  <div key={finding.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs uppercase text-muted-foreground">{finding.system}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-1 h-auto whitespace-normal py-2 text-left"
                          onClick={() =>
                            handleExam(finding.id, finding.technique, finding.finding)
                          }
                          disabled={Boolean(revealedExam[finding.id])}
                        >
                          {finding.technique}
                        </Button>
                      </div>
                      <Badge variant={finding.relevance === 'alta' ? 'default' : 'secondary'}>
                        {finding.relevance}
                      </Badge>
                    </div>
                    {revealedExam[finding.id] && (
                      <p className="mt-2 border-l-2 border-primary pl-3 text-sm text-foreground/80">
                        {revealedExam[finding.id]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="exams" className="mt-4">
            {!isPatientStable && (
              <p className="mb-2 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-4 w-4" />
                El paciente sigue inestable. Puedes pedir pruebas críticas, pero primero prioriza la
                reanimación.
              </p>
            )}
            {testItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este caso no tiene pruebas diagnósticas definidas todavía.
              </p>
            ) : (
              <div className="space-y-3">
                {testItems.map((test) => (
                  <div key={test.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{test.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {test.category} · {test.timeMinutes ?? 0} min · costo {test.costPoints ?? 0}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(test.id, test.name)}
                        disabled={Boolean(revealedTests[test.id])}
                      >
                        {revealedTests[test.id] ? 'Solicitada' : 'Solicitar'}
                      </Button>
                    </div>
                    {revealedTests[test.id] && (
                      <div className="mt-3 space-y-1 text-xs">
                        {test.results.map((result, index) => (
                          <div key={index} className="flex justify-between border-t pt-1">
                            <span>{result.parameter}</span>
                            <span
                              className={cn(
                                'font-mono',
                                result.flag === 'crítico' && 'font-bold text-destructive',
                                result.flag === 'alto' && 'text-amber-600',
                                result.flag === 'bajo' && 'text-blue-600'
                              )}
                            >
                              {result.value} {result.unit ?? ''}
                              {result.referenceRange && (
                                <span className="ml-2 text-muted-foreground">
                                  ({result.referenceRange})
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                        {test.interpretation && (
                          <p className="mt-2 border-l-2 border-primary pl-2 italic text-foreground/70">
                            {test.interpretation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="treatment" className="mt-4">
            {!isPatientStable && (
              <p className="mb-2 flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-4 w-4" />
                Considera estabilizar al paciente antes de tratamientos específicos no urgentes.
              </p>
            )}
            {treatmentItems.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {treatmentItems.map((treatment) => (
                  <Button
                    key={treatment.id}
                    variant={treatment.isRecommended ? 'default' : 'outline'}
                    className="h-auto justify-start whitespace-normal py-3 text-left"
                    onClick={() => onAction('treatment', treatment.id, treatment.name)}
                  >
                    <div>
                      <p className="text-sm font-medium">{treatment.name}</p>
                      <p className="text-xs opacity-80">
                        {treatment.drug ? `${treatment.drug} · ` : ''}
                        {treatment.route ? `${treatment.route} · ` : ''}
                        {treatment.frequency ?? 'Según criterio clínico'}
                      </p>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {defaultTreatments.map((action) => (
                  <Button
                    key={action}
                    variant="outline"
                    onClick={() => onAction('treatment', action, action)}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
