'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  prescriptionsRepo,
  petsRepo,
  ownersRepo,
} from '@/lib/repositories.clinical';
import type { Prescription, Pet, Owner } from '@/lib/types';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Printer,
  Pill,
  Trash2,
} from 'lucide-react';

function redactSensitiveText(text?: string | number | null) {
  if (text === undefined || text === null) return undefined;
  return `${text}`
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[correo oculto]')
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, '[telefono oculto]')
    .replace(/\b\d{6,}\b/g, '[identificador oculto]');
}

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

export default function FormulaDetallePage() {
  const params = useParams();
  const router = useRouter();
  const prescriptionId =
    typeof params.prescriptionId === 'string'
      ? params.prescriptionId
      : Array.isArray(params.prescriptionId)
        ? params.prescriptionId[0]
        : '';

  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [pet, setPet] = useState<Pet | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleDeletePrescription() {
    if (!prescription) return;
    const confirmed = window.confirm('¿Eliminar este documento de tratamiento?');
    if (!confirmed) return;

    try {
      await prescriptionsRepo.remove(prescription.id);
      router.push('/clinica/formulas');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar la fórmula.');
    }
  }

  useEffect(() => {
    if (!prescriptionId) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await prescriptionsRepo.getById(prescriptionId);
        if (!active) return;
        if (!data) {
          setError('La fórmula no existe o fue eliminada.');
          setPrescription(null);
          return;
        }
        setPrescription(data);
        if (data.petId) {
          const petData = await petsRepo.getById(data.petId);
          if (!active) return;
          setPet(petData);
          if (petData?.ownerId) {
            const ownerData = await ownersRepo.getById(petData.ownerId);
            if (active) setOwner(ownerData);
          }
        }
      } catch (err) {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar la fórmula.'
          );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [prescriptionId]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link href="/clinica/formulas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a fórmulas
          </Link>
        </Button>
        {prescription && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void handleDeletePrescription()}>
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          </div>
        )}
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Cargando fórmula...
        </div>
      ) : prescription ? (
        <Card className="print:border-0 print:shadow-none">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Fórmula médica
                </CardTitle>
                <CardDescription>
                  {format(
                    new Date(prescription.date),
                    "EEEE d 'de' MMMM yyyy, HH:mm",
                    { locale: es }
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field label="Paciente" value={pet?.name} />
              <Field label="Especie" value={pet?.species} />
              <Field
                label="Propietario"
                value={owner ? 'Propietario oculto' : undefined}
              />
              <Field label="Documento" value={redactSensitiveText(owner?.idDocument)} />
            </div>

            <Field label="Diagnóstico" value={prescription.diagnosis} />

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Medicamentos
              </p>
              {prescription.items && prescription.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicamento</TableHead>
                      <TableHead>Presentación</TableHead>
                      <TableHead>Dosis</TableHead>
                      <TableHead>Vía</TableHead>
                      <TableHead>Frecuencia</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Indicaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prescription.items.map((it, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {it.drug}
                        </TableCell>
                        <TableCell>{it.presentation || '—'}</TableCell>
                        <TableCell>{it.dose || '—'}</TableCell>
                        <TableCell>{it.route || '—'}</TableCell>
                        <TableCell>{it.frequency || '—'}</TableCell>
                        <TableCell>
                          {it.durationDays != null
                            ? `${it.durationDays} día(s)`
                            : '—'}
                        </TableCell>
                        <TableCell className="whitespace-pre-wrap">
                          {it.instructions || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sin medicamentos registrados.
                </p>
              )}
            </div>

            <Field label="Notas" value={prescription.notes} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
