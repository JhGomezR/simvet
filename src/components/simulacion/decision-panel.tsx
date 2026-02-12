import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, MessageSquare, Beaker, Syringe } from 'lucide-react';

interface DecisionPanelProps {
  onAction: (actionType: string, value: string) => void;
}

const actionButtons = {
  evaluation: ["Vía Aérea", "Respiración", "Circulación", "Discapacidad", "Exposición"],
  interrogation: ["Anamnesis Remota", "Historial de Vacunas", "Ambiente", "Alimentación"],
  exams: ["Hemograma", "Bioquímica", "Radiografía Tórax", "Ecografía FAST"],
  treatment: ["Oxigenoterapia", "Fluidoterapia", "Administrar Fármaco", "Sondaje Urinario"]
}

export function DecisionPanel({ onAction }: DecisionPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Área de Decisiones Clínicas</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="evaluation">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="evaluation"><ClipboardCheck className="h-4 w-4 mr-1"/>ABCDE</TabsTrigger>
            <TabsTrigger value="interrogation"><MessageSquare className="h-4 w-4 mr-1"/>Interrogatorio</TabsTrigger>
            <TabsTrigger value="exams"><Beaker className="h-4 w-4 mr-1"/>Exámenes</TabsTrigger>
            <TabsTrigger value="treatment"><Syringe className="h-4 w-4 mr-1"/>Tratamiento</TabsTrigger>
          </TabsList>
          <TabsContent value="evaluation" className="mt-4">
            <div className="grid grid-cols-2 gap-2">
              {actionButtons.evaluation.map(action => (
                <Button key={action} variant="outline" onClick={() => onAction('Evaluation', action)}>{action}</Button>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="interrogation" className="mt-4">
            <div className="grid grid-cols-2 gap-2">
                {actionButtons.interrogation.map(action => (
                    <Button key={action} variant="outline" onClick={() => onAction('Interrogation', action)}>{action}</Button>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="exams" className="mt-4">
             <div className="grid grid-cols-2 gap-2">
                {actionButtons.exams.map(action => (
                    <Button key={action} variant="outline" onClick={() => onAction('Exam', action)}>{action}</Button>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="treatment" className="mt-4">
            <div className="grid grid-cols-2 gap-2">
                {actionButtons.treatment.map(action => (
                    <Button key={action} variant="outline" onClick={() => onAction('Treatment', action)}>{action}</Button>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
