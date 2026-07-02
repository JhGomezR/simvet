'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { AcademicMetrics } from '@/lib/types';
import { BookOpen, BrainCircuit, CheckCircle, Target, XCircle } from 'lucide-react';

interface AcademicProgressPanelProps {
  metrics: AcademicMetrics;
}

function MetricItem({
  icon: Icon,
  label,
  value,
  unit = '',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 px-3 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-semibold text-slate-900">
        {value}
        {unit}
      </span>
    </div>
  );
}

export function AcademicProgressPanel({ metrics }: AcademicProgressPanelProps) {
  return (
    <Card>
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1" className="border-b-0">
          <AccordionTrigger className="px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="clinical-kicker">Academic Tracking</p>
                <CardTitle className="mt-1 text-lg">Evaluación en progreso</CardTitle>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="space-y-4 pt-0">
              <MetricItem icon={Target} label="Puntos actuales" value={metrics.score} />
              <div className="rounded-[1.15rem] border border-slate-200/80 bg-white/75 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <BrainCircuit className="h-4 w-4" />
                  <span>Razonamiento lógico</span>
                </div>
                <Progress value={metrics.logicalReasoning} className="h-2.5" />
              </div>
              <div className="space-y-2 rounded-[1.15rem] border border-slate-200/80 bg-white/75 p-4">
                <h4 className="flex items-center gap-2 font-semibold text-slate-900">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Errores críticos
                </h4>
                {metrics.criticalErrors.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
                    {metrics.criticalErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    Ninguno por ahora.
                  </p>
                )}
              </div>
              <div className="space-y-2 rounded-[1.15rem] border border-slate-200/80 bg-white/75 p-4">
                <h4 className="flex items-center gap-2 font-semibold text-slate-900">
                  <XCircle className="h-4 w-4 text-amber-500" />
                  Omisiones
                </h4>
                {metrics.omissions.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-amber-700">
                    {metrics.omissions.map((omission, i) => (
                      <li key={i}>{omission}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    Ninguna por ahora.
                  </p>
                )}
              </div>
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
