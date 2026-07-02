import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PawPrint, ShieldAlert } from 'lucide-react';
import { type ClinicalCase, type Patient } from '@/lib/types';
import Image from 'next/image';

interface PatientInfoPanelProps {
  patient: Patient;
  caseInfo: Pick<ClinicalCase, 'name' | 'difficulty'>;
}

const triageStyles: Record<string, string> = {
  'Nivel I - Resucitación': 'bg-rose-600 text-white',
  'Nivel II - Emergencia': 'bg-amber-400 text-slate-950',
  'Nivel III - Urgente': 'bg-yellow-300 text-slate-950',
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/80 px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

export function PatientInfoPanel({ patient, caseInfo }: PatientInfoPanelProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="space-y-4">
        {patient.imageUrl ? (
          <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-slate-100">
            <Image
              src={patient.imageUrl}
              alt={`Foto de ${patient.name}`}
              width={480}
              height={480}
              className="aspect-square w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
              data-ai-hint="dog"
            />
          </div>
        ) : null}

        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="clinical-kicker">Patient Snapshot</p>
            <CardTitle className="mt-2 text-2xl">{patient.name}</CardTitle>
            <CardDescription className="mt-2">
              {caseInfo.name} · Dificultad {caseInfo.difficulty}
            </CardDescription>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <PawPrint className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-2">
          <InfoRow label="Especie" value={patient.species} />
          {patient.breed ? <InfoRow label="Raza" value={patient.breed} /> : null}
          <InfoRow label="Edad" value={patient.age} />
          <InfoRow label="Peso" value={`${patient.weightKg} kg`} />
          {patient.sex ? <InfoRow label="Sexo" value={patient.sex} /> : null}
        </div>

        <div className="rounded-[1.15rem] border border-slate-200/80 bg-white/70 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-primary/70">Motivo de consulta</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{patient.chiefComplaint}</p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[1.15rem] border border-slate-200/80 bg-slate-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-slate-900">Prioridad de triage</span>
          </div>
          <Badge className={triageStyles[patient.triage] ?? 'bg-slate-900 text-white'}>
            {patient.triage}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
