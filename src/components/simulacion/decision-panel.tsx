import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardCheck, MessageSquare, Beaker, Syringe, Check, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

interface DecisionPanelProps {
  onAction: (actionType: string, value: string) => void;
  completedSteps: Record<string, boolean>;
  isPatientStable: boolean;
}

const evaluationActions = ["Vía Aérea", "Respiración", "Circulación", "Discapacidad", "Exposición"];
const interrogationActions = ["Anamnesis Remota", "Historial de Vacunas", "Ambiente", "Alimentación"];
const examActions = ["Hemograma", "Bioquímica", "Radiografía Tórax", "Ecografía FAST"];
const treatmentActions = ["Oxigenoterapia", "Fluidoterapia", "Administrar Fármaco", "Sondaje Urinario"];

export function DecisionPanel({ onAction, completedSteps, isPatientStable }: DecisionPanelProps) {
  const allEvaluationDone = evaluationActions.every(action => completedSteps[action]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Área de Decisiones Clínicas</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="evaluation">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="evaluation"><ClipboardCheck className="h-4 w-4 mr-1"/>ABCDE</TabsTrigger>
            <TabsTrigger value="interrogation" disabled={!allEvaluationDone}><MessageSquare className="h-4 w-4 mr-1"/>Interrogatorio</TabsTrigger>
            <TabsTrigger value="exams" disabled={!isPatientStable}><Beaker className="h-4 w-4 mr-1"/>Exámenes</TabsTrigger>
            <TabsTrigger value="treatment" disabled={!isPatientStable}><Syringe className="h-4 w-4 mr-1"/>Tratamiento</TabsTrigger>
          </TabsList>
          
          <TabsContent value="evaluation" className="mt-4">
            <p className="text-sm text-muted-foreground mb-4">Realice la evaluación primaria del paciente. El orden es crítico.</p>
            <div className="space-y-3">
              {evaluationActions.map((action, index) => {
                const isCompleted = completedSteps[action];
                const isPreviousCompleted = index === 0 || completedSteps[evaluationActions[index-1]];
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
                            className={cn("text-sm font-medium leading-none", (isCompleted || !isPreviousCompleted) ? 'text-muted-foreground' : 'cursor-pointer')}
                        >
                            {action}
                        </label>
                    </div>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="interrogation" className="mt-4">
             <div className="grid grid-cols-2 gap-2">
                {interrogationActions.map(action => (
                    <Button key={action} variant="outline" onClick={() => onAction('Interrogation', action)}>{action}</Button>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="exams" className="mt-4">
            {!isPatientStable && <p className="text-xs text-destructive flex items-center gap-1 mb-2"><AlertCircle className="h-4 w-4" />El paciente debe estar estable para realizar exámenes complementarios.</p>}
             <div className="grid grid-cols-2 gap-2">
                {examActions.map(action => (
                    <Button key={action} variant="outline" onClick={() => onAction('Exam', action)} disabled={!isPatientStable}>{action}</Button>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="treatment" className="mt-4">
           {!isPatientStable && <p className="text-xs text-destructive flex items-center gap-1 mb-2"><AlertCircle className="h-4 w-4" />El paciente debe estar estable para iniciar tratamientos específicos.</p>}
            <div className="grid grid-cols-2 gap-2">
                {treatmentActions.map(action => (
                    <Button key={action} variant="outline" onClick={() => onAction('Treatment', action)} disabled={!isPatientStable}>{action}</Button>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
