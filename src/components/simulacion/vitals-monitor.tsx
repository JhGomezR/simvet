import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type Vitals } from "@/lib/types";
import { HeartPulse, Lung, Thermometer, BrainCircuit, Droplets } from "lucide-react";

interface VitalsMonitorProps {
  vitals: Vitals;
  status: 'Stable' | 'Improving' | 'Worsening';
}

const VitalSign = ({ icon: Icon, label, value, unit, className }: { icon: React.ElementType, label: string, value: string | number, unit: string, className?: string }) => (
    <div className={cn("flex items-start gap-4 p-4 rounded-lg", className)}>
        <Icon className="h-8 w-8 text-primary mt-1" />
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value} <span className="text-base font-normal">{unit}</span></p>
        </div>
    </div>
);

export function VitalsMonitor({ vitals, status }: VitalsMonitorProps) {
  const statusClasses = {
    Stable: "border-muted",
    Improving: "border-green-500 animate-pulse",
    Worsening: "border-destructive animate-pulse",
  };

  return (
    <Card className={cn("transition-all border-2", statusClasses[status])}>
      <CardHeader>
        <CardTitle>Monitor Clínico</CardTitle>
        <CardDescription>Signos vitales en tiempo real.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4">
        <VitalSign icon={HeartPulse} label="Frecuencia Cardíaca" value={vitals.heartRate} unit="lpm" />
        <VitalSign icon={Lung} label="Frecuencia Respiratoria" value={vitals.respiratoryRate} unit="rpm" />
        <VitalSign icon={Thermometer} label="Temperatura" value={vitals.temperature} unit="°C" />
        <VitalSign icon={Droplets} label="Perfusión" value={vitals.perfusionStatus} unit="" />
        <VitalSign icon={BrainCircuit} label="Conciencia" value={vitals.consciousnessLevel} unit="" />
      </CardContent>
    </Card>
  );
}
