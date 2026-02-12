import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PawPrint } from "lucide-react";
import { type Patient } from "@/lib/types";

interface PatientInfoPanelProps {
  patient: Patient;
}

const InfoRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

export function PatientInfoPanel({ patient }: PatientInfoPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <PawPrint className="h-8 w-8 text-primary" />
        <div>
            <CardTitle>{patient.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <InfoRow label="Especie" value={patient.species} />
        <InfoRow label="Edad" value={patient.age} />
        <InfoRow label="Peso" value={patient.weight} />
        <div className="pt-2 text-sm">
            <p className="text-muted-foreground mb-1">Motivo de Consulta:</p>
            <p className="font-medium">{patient.chiefComplaint}</p>
        </div>
      </CardContent>
    </Card>
  );
}
