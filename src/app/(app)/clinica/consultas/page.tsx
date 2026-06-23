'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/auth-context';
import { consultationsRepo } from '@/lib/repositories.clinical';
import type { Consultation, ConsultationStatus } from '@/lib/types';
import { Loader2, Plus, Stethoscope, AlertCircle } from 'lucide-react';

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

export default function ConsultasPage() {
  const { user } = useAuth();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await consultationsRepo.listByVet(user!.uid);
        if (active) setConsultations(list);
      } catch (err) {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar las consultas.'
          );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consultas</h1>
          <p className="text-muted-foreground">
            Consultas recientes registradas por usted.
          </p>
        </div>
        <Button asChild>
          <Link href="/clinica/consultas/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva consulta
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de consultas</CardTitle>
          <CardDescription>
            {loading ? 'Cargando...' : `${consultations.length} consulta(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando consultas...
            </div>
          ) : consultations.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <Stethoscope className="h-10 w-10" />
              <p>Aún no ha registrado consultas.</p>
              <Button asChild variant="outline">
                <Link href="/clinica/consultas/nueva">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar la primera
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Diagnóstico</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultations.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(c.date), "d MMM yyyy, HH:mm", {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/clinica/consultas/${c.id}`}
                        className="hover:underline"
                      >
                        {c.reason}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.diagnosis?.trim() ? c.diagnosis : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[c.status]}>
                        {STATUS_LABEL[c.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/clinica/consultas/${c.id}`}>
                          Ver detalle
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
