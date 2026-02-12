import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PawPrint, AlertTriangle } from "lucide-react";
import { type Patient, type ClinicalCase } from "@/lib/types";
import Image from "next/image";

interface PatientInfoPanelProps {
  patient: Patient;
  caseInfo: Pick<ClinicalCase, 'name' | 'difficulty'>;
}

const InfoRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const triageColors = {
    'Nivel I - Resucitación': 'bg-red-600 text-white',
    'Nivel II - Emergencia': 'bg-amber-500 text-black',
    'Nivel III - Urgente': 'bg-yellow-400 text-black'
}

export function PatientInfoPanel({ patient, caseInfo }: PatientInfoPanelProps) {
  return (
    <Card>
      <CardHeader>
        {patient.imageUrl && (
            <div className="mb-4">
                <Image 
                    src={patient.imageUrl}
                    alt={`Foto de ${patient.name}`}
                    width={400}
                    height={400}
                    className="rounded-lg object-cover aspect-square"
                    data-ai-hint="dog"
                />
            </div>
        )}
        <div className="flex items-center justify-between">
            <CardTitle>{patient.name}</CardTitle>
            <PawPrint className="h-6 w-6 text-primary" />
        </div>
         <CardDescription>{caseInfo.name} ({caseInfo.difficulty})</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <InfoRow label="Especie" value={patient.species} />
            <InfoRow label="Edad" value={patient.age} />
            <InfoRow label="Peso" value={patient.weight} />
        </div>
        <div className="text-sm">
            <p className="text-muted-foreground mb-1">Motivo de Consulta:</p>
            <p className="font-medium">{patient.chiefComplaint}</p>
        </div>
        <div>
            <Badge className={triageColors[patient.triage]}>{patient.triage}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
