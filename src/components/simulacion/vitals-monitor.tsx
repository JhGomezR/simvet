'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type Vitals } from '@/lib/types';
import {
  ArrowDown,
  ArrowUp,
  BrainCircuit,
  Droplets,
  HeartPulse,
  Minus,
  Thermometer,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { VitalTrendChart } from './vital-trend-chart';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useVitalsAudio } from '@/hooks/use-vitals-audio';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type PatientStatus = 'Stable' | 'Improving' | 'Worsening' | 'Critical' | 'Unstable';

interface VitalsMonitorProps {
  vitalsHistory: Vitals[];
  status: PatientStatus;
}

const statusConfig = {
  Stable: { class: 'border-emerald-300', text: 'Estable', tone: 'text-emerald-700' },
  Improving: { class: 'border-emerald-400', text: 'Mejorando', tone: 'text-emerald-700' },
  Worsening: { class: 'border-amber-400', text: 'Empeorando', tone: 'text-amber-700' },
  Unstable: { class: 'border-amber-500', text: 'Inestable', tone: 'text-amber-700' },
  Critical: { class: 'border-rose-500', text: 'Crítico', tone: 'text-rose-700' },
} as const;

function getTrend(current: number, prev: number) {
  if (current > prev) return { icon: ArrowUp, class: 'text-rose-500' };
  if (current < prev) return { icon: ArrowDown, class: 'text-emerald-500' };
  return { icon: Minus, class: 'text-muted-foreground' };
}

function VitalSign({
  icon: Icon,
  label,
  value,
  unit,
  trendIcon: TrendIcon,
  trendClass,
  chartData,
  chartKey,
  chartColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit: string;
  trendIcon: React.ElementType;
  trendClass: string;
  chartData: Vitals[];
  chartKey: keyof Vitals;
  chartColor: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-slate-200/80 bg-white/75 p-4 transition-all duration-200 hover:border-primary/20">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{label}</p>
            <div className="flex items-center gap-1">
              <p className="text-2xl font-semibold text-slate-950">{value}</p>
              <p className="w-10 text-sm text-muted-foreground">{unit}</p>
              <TrendIcon className={cn('h-4 w-4', trendClass)} />
            </div>
          </div>
          {chartData.length > 1 ? (
            <div className="mt-3">
              <VitalTrendChart data={chartData} dataKey={chartKey} strokeColor={chartColor} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MiniVital({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.05rem] border border-slate-200/80 bg-slate-50/80 px-3 py-3">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function VitalsMonitor({ vitalsHistory, status }: VitalsMonitorProps) {
  const currentVitals = vitalsHistory[vitalsHistory.length - 1];
  const prevVitals = vitalsHistory.length > 1 ? vitalsHistory[vitalsHistory.length - 2] : currentVitals;

  const audio = useVitalsAudio({
    heartRate: currentVitals?.heartRate ?? 0,
    respiratoryRate: currentVitals?.respiratoryRate ?? 0,
    spO2: currentVitals?.spO2,
    status,
  });

  if (!currentVitals) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monitor clínico</CardTitle>
          <CardDescription>Esperando datos del paciente...</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Inicia la simulación para visualizar los signos vitales en tiempo real.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hrTrend = getTrend(currentVitals.heartRate, prevVitals.heartRate);
  const rrTrend = getTrend(currentVitals.respiratoryRate, prevVitals.respiratoryRate);
  const tempTrend = getTrend(currentVitals.temperature, prevVitals.temperature);
  const config = statusConfig[status] ?? statusConfig.Stable;

  return (
    <Card className={cn('overflow-hidden border-2 transition-all duration-200', config.class)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="clinical-kicker">Live Monitor</p>
            <CardTitle className="mt-2">Monitor clínico</CardTitle>
            <CardDescription className="mt-2">Signos vitales y evolución del paciente.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'rounded-full border border-current/10 px-3 py-1 text-sm font-semibold',
                config.tone
              )}
            >
              {config.text}
            </span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  title={audio.muted ? 'Audio desactivado' : 'Audio activo'}
                  onClick={() => {
                    if (audio.muted) audio.setMuted(false);
                  }}
                >
                  {audio.muted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5 text-primary" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Audio del monitor</span>
                    <Button
                      variant={audio.muted ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => audio.setMuted(!audio.muted)}
                    >
                      {audio.muted ? 'Activar' : 'Silenciar'}
                    </Button>
                  </div>
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Volumen ({Math.round(audio.volume * 100)}%)
                    </p>
                    <Slider
                      value={[audio.volume * 100]}
                      max={100}
                      step={5}
                      onValueChange={(v) => audio.setVolume(v[0] / 100)}
                      disabled={audio.muted}
                    />
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    El beep cardíaco se sincroniza con la FC y el tono se ajusta cuando cae la
                    saturación.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <VitalSign
          icon={HeartPulse}
          label="Frecuencia cardíaca"
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
          label="Frecuencia respiratoria"
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

        <div className="grid gap-3 sm:grid-cols-2">
          {currentVitals.spO2 !== undefined ? (
            <MiniVital label="SpO2" value={`${currentVitals.spO2}%`} />
          ) : null}
          {currentVitals.systolicBP !== undefined ? (
            <MiniVital label="PA Sistólica" value={`${currentVitals.systolicBP} mmHg`} />
          ) : null}
          {currentVitals.capillaryRefillTime !== undefined ? (
            <MiniVital label="TRC" value={`${currentVitals.capillaryRefillTime} s`} />
          ) : null}
          {currentVitals.lactate !== undefined ? (
            <MiniVital label="Lactato" value={`${currentVitals.lactate} mmol/L`} />
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-[1.05rem] border border-slate-200/80 bg-slate-50/80 px-3 py-3">
            <Droplets className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Perfusión</p>
              <p className="text-sm font-semibold text-slate-900">{currentVitals.perfusionStatus}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-[1.05rem] border border-slate-200/80 bg-slate-50/80 px-3 py-3">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Conciencia</p>
              <p className="text-sm font-semibold text-slate-900">{currentVitals.consciousnessLevel}</p>
            </div>
          </div>
        </div>

        {currentVitals.mucousColor ? (
          <div className="flex items-center gap-3 rounded-[1.05rem] border border-slate-200/80 bg-slate-50/80 px-3 py-3">
            <Droplets className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Mucosas</p>
              <p className="text-sm font-semibold text-slate-900">{currentVitals.mucousColor}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
