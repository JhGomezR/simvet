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
import { labExamsRepo, petsRepo } from '@/lib/repositories.clinical';
import type { LabExam, LabExamStatus } from '@/lib/types';
import { Loader2, Plus, FlaskConical, AlertCircle } from 'lucide-react';

const STATUS_LABELS: Record<LabExamStatus, string> = {
  solicitado: 'Solicitado',
  en_proceso: 'En proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

const STATUS_VARIANTS: Record<
  LabExamStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  solicitado: 'secondary',
  en_proceso: 'default',
  completado: 'outline',
  cancelado: 'destructive',
};

export default function LaboratorioPage() {
  const { user, profile } = useAuth();
  const clinicId = profile?.clinicId ?? 'default';

  const [exams, setExams] = useState<LabExam[]>([]);
  const [petNames, setPetNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await labExamsRepo.listByClinic(clinicId);
        if (!active) return;
        setExams(list);

        // Resolver nombres de mascota para los petId presentes.
        const ids = Array.from(new Set(list.map((e) => e.petId)));
        const entries = await Promise.all(
          ids.map(async (id) => {
            try {
              const pet = await petsRepo.getById(id);
              return [id, pet?.name ?? '—'] as const;
            } catch {
              return [id, '—'] as const;
            }
          })
        );
        if (active) setPetNames(Object.fromEntries(entries));
      } catch (err) {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar los exámenes.'
          );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [user, clinicId]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laboratorio</h1>
          <p className="text-muted-foreground">
            Exámenes de laboratorio solicitados y sus resultados.
          </p>
        </div>
        <Button asChild>
          <Link href="/clinica/laboratorio/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo examen
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de exámenes</CardTitle>
          <CardDescription>
            {loading ? 'Cargando...' : `${exams.length} examen(es)`}
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
              Cargando exámenes...
            </div>
          ) : exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <FlaskConical className="h-10 w-10" />
              <p>Aún no se han registrado exámenes de laboratorio.</p>
              <Button asChild variant="outline">
                <Link href="/clinica/laboratorio/nueva">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear el primero
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitado</TableHead>
                  <TableHead>Mascota</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Resultados</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(e.requestedDate), 'd MMM yyyy, HH:mm', {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {petNames[e.petId] ?? '—'}
                    </TableCell>
                    <TableCell>{e.type?.trim() ? e.type : '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {e.results?.length ?? 0} parámetro(s)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[e.status]}>
                        {STATUS_LABELS[e.status]}
                      </Badge>
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
