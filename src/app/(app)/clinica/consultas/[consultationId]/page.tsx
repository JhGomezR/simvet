'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { consultationsRepo, petsRepo } from '@/lib/repositories.clinical';
import type { Consultation, Pet, ConsultationStatus } from '@/lib/types';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  PawPrint,
  Stethoscope,
} from 'lucide-react';

const STATUS_VARIANT: Record<
  ConsultationStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  abierta: 'default',
  cerrada: 'secondary',
  cancelada: 'destructive',
};

const STATUS_LABEL: Record<ConsultationStatus, string> = {
  abierta: 'Abierta',
  cerrada: 'Cerrada',
  cancelada: 'Cancelada',
};

function Field({ label, value }: { label: string; value?: string | number }) {
  const display =
    value === undefined || value === null || `${value}`.trim() === ''
      ? '—'
      : `${value}`;
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-sm">{display}</p>
    </div>
  );
}

export default function ConsultaDetallePage() {
  const params = useParams();
  const consultationId =
    typeof params.consultationId === 'string'
      ? params.consultationId
      : Array.isArray(params.consultationId)
        ? params.consultationId[0]
        : '';

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!consultationId) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await consultationsRepo.getById(consultationId);
        if (!active) return;
        if (!data) {
          setError('La consulta no existe o fue eliminada.');
          setConsultation(null);
          return;
        }
        setConsultation(data);
        if (data.petId) {
          const petData = await petsRepo.getById(data.petId);
          if (active) setPet(petData);
        }
      } catch (err) {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar la consulta.'
          );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [consultationId]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/clinica/consultas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a consultas
          </Link>
        </Button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Cargando consulta...
        </div>
      ) : consultation ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="h-5 w-5" />
                    {consultation.reason}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(consultation.date), "EEEE d 'de' MMMM yyyy, HH:mm", {
                      locale: es,
                    })}
                  </CardDescription>
                </div>
                <Badge variant={STATUS_VARIANT[consultation.status]}>
                  {STATUS_LABEL[consultation.status]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm">
                <PawPrint className="h-4 w-4 text-muted-foreground" />
                {pet ? (
                  <Link
                    href={`/clinica/mascotas/${pet.id}`}
                    className="font-medium hover:underline"
                  >
                    {pet.name} · {pet.species}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">
                    Paciente no disponible
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalle clínico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Field label="Anamnesis" value={consultation.anamnesis} />
                <Field
                  label="Examen físico"
                  value={consultation.physicalExam}
                />
                <Field
                  label="Peso (kg)"
                  value={consultation.weightKg}
                />
                <Field label="Diagnóstico" value={consultation.diagnosis} />
                <Field
                  label="Diagnóstico diferencial"
                  value={consultation.differentialDiagnosis}
                />
                <Field
                  label="Plan de tratamiento"
                  value={consultation.treatmentPlan}
                />
              </div>
              <Field label="Notas" value={consultation.notes} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
