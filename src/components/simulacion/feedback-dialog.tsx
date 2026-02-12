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
  import { CheckCircle2, XCircle, Lightbulb, Star } from "lucide-react";
  import { type Feedback } from "@/lib/types";
  
  interface FeedbackDialogProps {
    isOpen: boolean;
    onClose: () => void;
    feedback: Feedback;
  }
  
  export function FeedbackDialog({ isOpen, onClose, feedback }: FeedbackDialogProps) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Retroalimentación Académica</DialogTitle>
            <DialogDescription>
              Análisis detallado de tu desempeño en el caso clínico.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-6">
            <div className="space-y-6 py-4">
              <div className="flex justify-between items-center bg-muted p-4 rounded-lg">
                <span className="font-semibold text-lg">Puntaje Final</span>
                <Badge className="text-2xl py-2 px-4">{feedback.finalScore}</Badge>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Resumen Narrativo</h3>
                <p className="text-sm text-muted-foreground">{feedback.narrativeSummary}</p>
              </div>
  
              <Separator />
  
              <div>
                <h3 className="font-semibold mb-3 flex items-center text-destructive">
                  <XCircle className="h-5 w-5 mr-2" />
                  Errores Críticos
                </h3>
                <div className="space-y-4">
                  {feedback.criticalErrors.map((item, index) => (
                    <div key={index} className="p-3 bg-destructive/10 rounded-lg">
                      <p className="font-semibold text-destructive">{item.error}</p>
                      <p className="text-sm mt-1">{item.explanation}</p>
                      <p className="text-sm mt-2 font-medium flex items-start"><Lightbulb className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0"/> <span>{item.recommendation}</span></p>
                    </div>
                  ))}
                </div>
              </div>
  
              <Separator />
  
              <div>
                <h3 className="font-semibold mb-3 flex items-center text-green-600">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Decisiones Correctas
                </h3>
                <div className="space-y-3">
                  {feedback.correctDecisions.map((item, index) => (
                    <div key={index} className="p-3 bg-green-600/10 rounded-lg">
                       <p className="font-semibold text-green-700">{item.decision}</p>
                       <p className="text-sm mt-1">{item.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2 flex items-center">
                    <Star className="h-5 w-5 mr-2" />
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
  