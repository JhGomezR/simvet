"use client";

import { useState, useEffect } from "react";
import { PatientInfoPanel } from "./patient-info-panel";
import { DecisionPanel } from "./decision-panel";
import { VitalsMonitor } from "./vitals-monitor";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "./feedback-dialog";
import { mockFeedback } from "@/lib/data";
import type { ClinicalCase, Vitals } from "@/lib/types";

interface SimulationViewProps {
  clinicalCase: ClinicalCase;
}

export function SimulationView({ clinicalCase }: SimulationViewProps) {
  const [vitals, setVitals] = useState<Vitals>(clinicalCase.initialVitals);
  const [simTime, setSimTime] = useState(0);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [patientStatus, setPatientStatus] = useState<'Stable' | 'Improving' | 'Worsening'>('Worsening');

  useEffect(() => {
    const timer = setInterval(() => {
      setSimTime((prevTime) => prevTime + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleAction = (actionType: string, value: string) => {
    // In a real app, this would trigger a state change in the simulation engine.
    // For this demo, we'll just log it and simulate a small improvement.
    console.log(`Action taken: ${actionType} - ${value}`);
    setVitals(prev => ({ ...prev, heartRate: prev.heartRate - 2, respiratoryRate: prev.respiratoryRate - 1 }));
    setPatientStatus('Improving');
    setTimeout(() => setPatientStatus('Stable'), 2000);
  };

  return (
    <div className="w-full">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Tiempo en Urgencias: {formatTime(simTime)}</h2>
        <Button onClick={() => setIsFeedbackOpen(true)}>Finalizar Caso</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3">
          <PatientInfoPanel patient={clinicalCase.patient} />
        </div>
        <div className="lg:col-span-5">
          <DecisionPanel onAction={handleAction} />
        </div>
        <div className="lg:col-span-4">
          <VitalsMonitor vitals={vitals} status={patientStatus} />
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
