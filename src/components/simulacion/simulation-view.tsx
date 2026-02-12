"use client";

import { useState, useEffect, useCallback } from "react";
import { PatientInfoPanel } from "./patient-info-panel";
import { DecisionPanel } from "./decision-panel";
import { VitalsMonitor, type PatientStatus } from "./vitals-monitor";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "./feedback-dialog";
import { mockFeedback } from "@/lib/data";
import { AcademicProgressPanel } from "./academic-progress-panel";
import type { ClinicalCase, Vitals, AcademicMetrics } from "@/lib/types";
import { AlertTriangle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SimulationViewProps {
  clinicalCase: ClinicalCase;
}

const MAX_VITALS_HISTORY = 30;

export function SimulationView({ clinicalCase }: SimulationViewProps) {
  const [simTime, setSimTime] = useState(0);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [vitalsHistory, setVitalsHistory] = useState<Vitals[]>([clinicalCase.initialVitals]);
  const [patientStatus, setPatientStatus] = useState<PatientStatus>('Critical');
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [academicMetrics, setAcademicMetrics] = useState<AcademicMetrics>({
      score: 100,
      criticalErrors: [],
      omissions: [],
      logicalReasoning: 80,
  });
  const { toast } = useToast();

  const currentVitals = vitalsHistory[vitalsHistory.length - 1];
  const isPatientStable = patientStatus === 'Stable' || patientStatus === 'Improving';
  
  const updatePatientStatus = useCallback((vitals: Vitals) => {
    // This is a simplified logic model
    let score = 0;
    if (vitals.heartRate < 160 && vitals.heartRate > 80) score++;
    else score--;
    if (vitals.respiratoryRate < 40 && vitals.respiratoryRate > 15) score++;
    else score--;
    if (vitals.perfusionStatus === 'Normal' || vitals.perfusionStatus === 'Adequate') score++;
    if (vitals.consciousnessLevel === 'Alert') score++;

    if (score > 2) {
        setPatientStatus(prev => (prev === 'Improving' || prev === 'Stable') ? 'Stable' : 'Improving');
    } else if (score >= 0) {
        setPatientStatus(prev => (prev === 'Worsening' || prev === 'Unstable') ? 'Unstable' : 'Worsening');
    } else {
        setPatientStatus('Critical');
    }
  }, []);

  // Simulation tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSimTime((prevTime) => prevTime + 1);

      setVitalsHistory(prevHistory => {
        const lastVitals = prevHistory[prevHistory.length - 1];
        let newVitals = { ...lastVitals };

        // Simulate natural degradation if patient is not stable
        if (!isPatientStable && simTime % 5 === 0) {
            newVitals.heartRate += 2;
            newVitals.respiratoryRate += 1;
            
            toast({
                variant: 'destructive',
                title: 'Alerta: El paciente empeora',
                description: `FC: ${newVitals.heartRate} lpm, FR: ${newVitals.respiratoryRate} rpm`,
            })
        }
        
        updatePatientStatus(newVitals);

        const newHistory = [...prevHistory, newVitals];
        if (newHistory.length > MAX_VITALS_HISTORY) {
            return newHistory.slice(newHistory.length - MAX_VITALS_HISTORY);
        }
        return newHistory;
      });

    }, 2000); // Slower tick for more deliberate changes

    return () => clearInterval(timer);
  }, [simTime, isPatientStable, updatePatientStatus, toast]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleAction = (actionType: string, value: string) => {
    console.log(`Action taken: ${actionType} - ${value}`);
    setCompletedSteps(prev => ({...prev, [value]: true}));
    
    // Simulate vital changes based on action
    setVitalsHistory(prevHistory => {
        let newVitals = { ...prevHistory[prevHistory.length - 1] };
        let scoreChange = 0;
        
        if (value === 'Oxigenoterapia' || value === 'Vía Aérea' || value === 'Respiración') {
            newVitals.respiratoryRate = Math.max(20, newVitals.respiratoryRate - 5);
            scoreChange = 5;
        }
        if (value === 'Fluidoterapia' || value === 'Circulación') {
            newVitals.heartRate = Math.max(120, newVitals.heartRate - 10);
            newVitals.perfusionStatus = 'Adequate';
            scoreChange = 5;
        }

        const newHistory = [...prevHistory, newVitals];
        if (newHistory.length > MAX_VITALS_HISTORY) {
            return newHistory.slice(newHistory.length - MAX_VITALS_HISTORY);
        }
        return newHistory;
    });

    setAcademicMetrics(prev => ({...prev, score: prev.score + 5}));

    toast({
        title: "Acción Realizada",
        description: `${value}`,
    })
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
                <AlertTriangle className="h-5 w-5"/>
                <span>EL PACIENTE PUEDE FALLECER SI NO SE ACTÚA</span>
            </div>
        </div>
        <Button size="lg" onClick={() => setIsFeedbackOpen(true)}>Finalizar Caso y Evaluar</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-3 space-y-6">
          <PatientInfoPanel patient={clinicalCase.patient} caseInfo={clinicalCase} />
          <AcademicProgressPanel metrics={academicMetrics} />
        </div>
        <div className="lg:col-span-5">
          <DecisionPanel 
            onAction={handleAction} 
            completedSteps={completedSteps} 
            isPatientStable={isPatientStable}
          />
        </div>
        <div className="lg:col-span-4">
          <VitalsMonitor vitalsHistory={vitalsHistory} status={patientStatus} />
        </div>
      </div>

      <FeedbackDialog 
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        feedback={mockFeedback}
      />
    </div>
  );
}
