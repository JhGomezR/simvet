'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { AcademicMetrics } from "@/lib/types";
import { BookOpen, BrainCircuit, CheckCircle, Target, XCircle } from "lucide-react";

interface AcademicProgressPanelProps {
  metrics: AcademicMetrics;
}

const MetricItem = ({ icon: Icon, label, value, unit = '' }: { icon: React.ElementType, label: string, value: string | number, unit?: string }) => (
    <div className="flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{label}</span>
        </div>
        <span className="font-semibold">{value}{unit}</span>
    </div>
);

export function AcademicProgressPanel({ metrics }: AcademicProgressPanelProps) {
  return (
    <Card>
      <Accordion type="single" collapsible defaultValue="item-1">
        <AccordionItem value="item-1" className="border-b-0">
          <AccordionTrigger className="p-6">
            <div className="flex items-center gap-4">
                <BookOpen className="h-6 w-6 text-primary" />
                <CardTitle className="text-lg">Evaluación en Progreso</CardTitle>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="space-y-4 pt-0">
                <MetricItem icon={Target} label="Puntos Actuales" value={metrics.score} />
                <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <BrainCircuit className="h-4 w-4" />
                        <span>Razonamiento Lógico</span>
                    </div>
                    <Progress value={metrics.logicalReasoning} className="h-2" />
                </div>
                 <div className="space-y-2 pt-2">
                    <h4 className="font-semibold flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" />Errores Críticos</h4>
                    {metrics.criticalErrors.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-destructive pl-2">
                            {metrics.criticalErrors.map((error, i) => <li key={i}>{error}</li>)}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground flex items-center gap-2 pl-2"><CheckCircle className="h-4 w-4 text-green-500" /> Ninguno por ahora.</p>
                    )}
                 </div>
                 <div className="space-y-2">
                    <h4 className="font-semibold flex items-center gap-2"><XCircle className="h-4 w-4 text-amber-500" />Omisiones</h4>
                    {metrics.omissions.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-amber-600 pl-2">
                            {metrics.omissions.map((omission, i) => <li key={i}>{omission}</li>)}
                        </ul>
                    ) : (
                         <p className="text-sm text-muted-foreground flex items-center gap-2 pl-2"><CheckCircle className="h-4 w-4 text-green-500" /> Ninguna por ahora.</p>
                    )}
                 </div>
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}
