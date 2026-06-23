'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, MessageSquare, Beaker, Syringe, AlertCircle, Stethoscope } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { ClinicalCase } from "@/lib/types";

interface DecisionPanelProps {
  onAction: (actionType: string, value: string) => void;
  completedSteps: Record<string, boolean>;
  isPatientStable: boolean;
  clinicalCase?: ClinicalCase;
}

const defaultEvaluation = ["Vía Aérea", "Respiración", "Circulación", "Discapacidad", "Exposición"];
const defaultTreatments = ["Oxigenoterapia", "Fluidoterapia", "Administrar Fármaco", "Sondaje Urinario"];

export function DecisionPanel({ onAction, completedSteps, isPatientStable, clinicalCase }: DecisionPanelProps) {
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
    onAction('anamnesis', text);
  };

  const handleExam = (id: string, technique: string, finding: string) => {
    setRevealedExam((prev) => ({ ...prev, [id]: finding }));
    onAction('exam', technique);
  };

  const handleTest = (id: string, name: string) => {
    setRevealedTests((prev) => ({ ...prev, [id]: true }));
    onAction('test', name);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Área de Decisiones Clínicas</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="evaluation">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="evaluation"><ClipboardCheck className="h-4 w-4 mr-1" />ABCDE</TabsTrigger>
            <TabsTrigger value="interrogation" disabled={!allEvaluationDone}>
              <MessageSquare className="h-4 w-4 mr-1" />Anamnesis
            </TabsTrigger>
            <TabsTrigger value="exam" disabled={!allEvaluationDone}>
              <Stethoscope className="h-4 w-4 mr-1" />Examen
            </TabsTrigger>
            <TabsTrigger value="exams" disabled={!isPatientStable}>
              <Beaker className="h-4 w-4 mr-1" />Pruebas
            </TabsTrigger>
            <TabsTrigger value="treatment">
              <Syringe className="h-4 w-4 mr-1" />Tratamiento
            </TabsTrigger>
          </TabsList>

          {/* ABCDE */}
          <TabsContent value="evaluation" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Realice la evaluación primaria del paciente. El orden es crítico.
            </p>
            <div className="space-y-3">
              {defaultEvaluation.map((action, index) => {
                const isCompleted = completedSteps[action];
                const isPreviousCompleted = index === 0 || completedSteps[defaultEvaluation[index - 1]];
                return (
                  <div key={action} className="flex items-center gap-3">
                    <Checkbox
                      id={action}
                      checked={isCompleted}
                      onCheckedChange={() => !isCompleted && onAction('Evaluation', action)}
                      disabled={isCompleted || !isPreviousCompleted}
                    />
                    <label
                      htmlFor={action}
                      className={cn(
                        "text-sm font-medium leading-none",
                        (isCompleted || !isPreviousCompleted) ? 'text-muted-foreground' : 'cursor-pointer'
                      )}
                    >
                      {action}
                    </label>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ANAMNESIS — preguntas del caso con respuestas reales del dueño */}
          <TabsContent value="interrogation" className="mt-4">
            {anamnesisItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este caso no tiene preguntas de anamnesis definidas todavía.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Pregunta lo que necesites saber. El propietario responde según el caso.
                </p>
                {anamnesisItems.map((q) => (
                  <div key={q.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-left h-auto py-2 whitespace-normal"
                        onClick={() => handleAnamnesis(q.id, q.text, q.ownerResponse)}
                        disabled={!!revealedAnamnesis[q.id]}
                      >
                        {q.text}
                      </Button>
                      <Badge variant="secondary" className="text-xs shrink-0">{q.relevance}</Badge>
                    </div>
                    {revealedAnamnesis[q.id] && (
                      <p className="mt-2 text-sm italic text-foreground/80 border-l-2 border-primary pl-3">
                        Dueño: "{revealedAnamnesis[q.id]}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* EXAMEN FÍSICO — hallazgos por sistema */}
          <TabsContent value="exam" className="mt-4">
            {examItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este caso no tiene hallazgos de examen definidos todavía.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Realiza el examen físico por sistema. Cada técnica revela un hallazgo.
                </p>
                {examItems.map((f) => (
                  <div key={f.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs uppercase text-muted-foreground">{f.system}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-1 text-left h-auto py-2 whitespace-normal"
                          onClick={() => handleExam(f.id, f.technique, f.finding)}
                          disabled={!!revealedExam[f.id]}
                        >
                          {f.technique}
                        </Button>
                      </div>
                      {f.isAbnormal && revealedExam[f.id] && (
                        <Badge variant="destructive" className="text-xs shrink-0">Anormal</Badge>
                      )}
                    </div>
                    {revealedExam[f.id] && (
                      <p className="mt-2 text-sm text-foreground/80 border-l-2 border-primary pl-3">
                        {revealedExam[f.id]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* PRUEBAS DIAGNÓSTICAS — con resultados reales */}
          <TabsContent value="exams" className="mt-4">
            {!isPatientStable && (
              <p className="text-xs text-destructive flex items-center gap-1 mb-2">
                <AlertCircle className="h-4 w-4" />
                El paciente debe estar estable para realizar exámenes complementarios.
              </p>
            )}
            {testItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Este caso no tiene pruebas diagnósticas definidas todavía.
              </p>
            ) : (
              <div className="space-y-3">
                {testItems.map((t) => (
                  <div key={t.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{t.name}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(t.id, t.name)}
                        disabled={!isPatientStable || revealedTests[t.id]}
                      >
                        {revealedTests[t.id] ? 'Solicitado' : 'Solicitar'}
                      </Button>
                    </div>
                    {revealedTests[t.id] && (
                      <div className="mt-3 space-y-1 text-xs">
                        {t.results.map((r, i) => (
                          <div key={i} className="flex justify-between border-t pt-1">
                            <span>{r.parameter}</span>
                            <span className={cn(
                              "font-mono",
                              r.flag === 'crítico' && 'text-destructive font-bold',
                              r.flag === 'alto' && 'text-amber-600',
                              r.flag === 'bajo' && 'text-blue-600'
                            )}>
                              {r.value} {r.unit ?? ''}
                              {r.referenceRange && (
                                <span className="text-muted-foreground ml-2">({r.referenceRange})</span>
                              )}
                            </span>
                          </div>
                        ))}
                        {t.interpretation && (
                          <p className="mt-2 italic text-foreground/70 border-l-2 border-primary pl-2">
                            {t.interpretation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TRATAMIENTO */}
          <TabsContent value="treatment" className="mt-4">
            {!isPatientStable && (
              <p className="text-xs text-destructive flex items-center gap-1 mb-2">
                <AlertCircle className="h-4 w-4" />
                Considera estabilizar al paciente antes de tratamientos específicos.
              </p>
            )}
            {treatmentItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {treatmentItems.map((tx) => (
                  <Button
                    key={tx.id}
                    variant="outline"
                    className="text-left h-auto py-2 whitespace-normal justify-start"
                    onClick={() => onAction('treatment', tx.name)}
                  >
                    <div>
                      <p className="text-sm font-medium">{tx.name}</p>
                      {(tx.drug || tx.doseMgPerKg) && (
                        <p className="text-xs text-muted-foreground">
                          {tx.drug} {tx.doseMgPerKg ? `· ${tx.doseMgPerKg} mg/kg` : ''} {tx.route ? `· ${tx.route}` : ''}
                        </p>
                      )}
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
                    onClick={() => onAction('Treatment', action)}
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
