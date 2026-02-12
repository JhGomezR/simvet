import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type Vitals } from "@/lib/types";
import { HeartPulse, Wind, Thermometer, BrainCircuit, Droplets, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { VitalTrendChart } from "./vital-trend-chart";

export type PatientStatus = 'Stable' | 'Improving' | 'Worsening' | 'Critical' | 'Unstable';

interface VitalsMonitorProps {
  vitalsHistory: Vitals[];
  status: PatientStatus;
}

const statusConfig = {
    Stable: { class: "border-status-stable", text: "Estable" },
    Improving: { class: "border-green-500 animate-pulse", text: "Mejorando" },
    Worsening: { class: "border-amber-500 animate-pulse", text: "Empeorando" },
    Unstable: { class: "border-status-unstable", text: "Inestable" },
    Critical: { class: "border-status-critical animate-pulse", text: "Crítico" },
};

const getTrend = (current: number, prev: number) => {
    if (current > prev) return { icon: ArrowUp, class: 'text-red-500' };
    if (current < prev) return { icon: ArrowDown, class: 'text-green-500' };
    return { icon: Minus, class: 'text-muted-foreground' };
}

const VitalSign = ({ 
    icon: Icon, 
    label, 
    value, 
    unit, 
    trendIcon: TrendIcon, 
    trendClass, 
    chartData, 
    chartKey, 
    chartColor
}: { 
    icon: React.ElementType, 
    label: string, 
    value: string | number, 
    unit: string, 
    trendIcon: React.ElementType,
    trendClass: string,
    chartData: any[],
    chartKey: keyof Vitals,
    chartColor: string
}) => (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
        <Icon className="h-7 w-7 text-primary" />
        <div className="flex-1">
            <div className="flex justify-between items-baseline">
                <p className="text-sm text-muted-foreground">{label}</p>
                <div className="flex items-center gap-1">
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm font-normal w-10">{unit}</p>
                    <TrendIcon className={cn("h-5 w-5", trendClass)} />
                </div>
            </div>
            {chartData.length > 1 && <VitalTrendChart data={chartData} dataKey={chartKey} strokeColor={chartColor} />}
        </div>
    </div>
);

export function VitalsMonitor({ vitalsHistory, status }: VitalsMonitorProps) {
  const currentVitals = vitalsHistory[vitalsHistory.length - 1];
  const prevVitals = vitalsHistory.length > 1 ? vitalsHistory[vitalsHistory.length - 2] : currentVitals;
  
  if (!currentVitals) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Monitor Clínico</CardTitle>
                <CardDescription>Esperando datos del paciente...</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Inicie la simulación para ver los signos vitales.</p>
            </CardContent>
        </Card>
    );
  }

  const hrTrend = getTrend(currentVitals.heartRate, prevVitals.heartRate);
  const rrTrend = getTrend(currentVitals.respiratoryRate, prevVitals.respiratoryRate);
  const tempTrend = getTrend(currentVitals.temperature, prevVitals.temperature);

  const config = statusConfig[status] || statusConfig.Stable;

  return (
    <Card className={cn("transition-all border-4", config.class)}>
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle>Monitor Clínico</CardTitle>
            <span className={cn("font-bold text-lg", config.class.replace('border-', 'text-'))}>{config.text}</span>
        </div>
        <CardDescription>Signos vitales en tiempo real.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3">
        <VitalSign 
            icon={HeartPulse} 
            label="Frecuencia Cardíaca" 
            value={currentVitals.heartRate} 
            unit="lpm"
            trendIcon={hrTrend.icon}
            trendClass={hrTrend.class}
            chartData={vitalsHistory}
            chartKey="heartRate"
            chartColor="hsl(var(--destructive))"
        />
        <VitalSign 
            icon={Wind} 
            label="Frecuencia Respiratoria" 
            value={currentVitals.respiratoryRate} 
            unit="rpm"
            trendIcon={rrTrend.icon}
            trendClass={rrTrend.class}
            chartData={vitalsHistory}
            chartKey="respiratoryRate"
            chartColor="hsl(var(--primary))"
        />
        <VitalSign 
            icon={Thermometer} 
            label="Temperatura" 
            value={currentVitals.temperature.toFixed(1)} 
            unit="°C"
            trendIcon={tempTrend.icon}
            trendClass={tempTrend.class}
            chartData={vitalsHistory}
            chartKey="temperature"
            chartColor="hsl(var(--accent))"
        />
        <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Droplets className="h-6 w-6 text-primary"/>
                <div>
                    <p className="text-xs text-muted-foreground">Perfusión</p>
                    <p className="text-md font-bold">{currentVitals.perfusionStatus}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <BrainCircuit className="h-6 w-6 text-primary"/>
                <div>
                    <p className="text-xs text-muted-foreground">Conciencia</p>
                    <p className="text-md font-bold">{currentVitals.consciousnessLevel}</p>
                </div>
            </div>
        </div>

      </CardContent>
    </Card>
  );
}
