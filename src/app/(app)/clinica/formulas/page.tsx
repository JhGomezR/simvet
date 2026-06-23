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
import { prescriptionsRepo, petsRepo } from '@/lib/repositories.clinical';
import type { Prescription, Pet } from '@/lib/types';
import { Loader2, Plus, Pill, AlertCircle } from 'lucide-react';

export default function FormulasPage() {
  const { user, profile } = useAuth();
  const clinicId = profile?.clinicId ?? 'default';

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
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
        const list = await prescriptionsRepo.listByClinic(clinicId);
        if (!active) return;
        setPrescriptions(list);

        // Resolver nombres de mascota para los petId presentes.
        const ids = Array.from(new Set(list.map((p) => p.petId)));
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
              : 'No se pudieron cargar las fórmulas.'
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
          <h1 className="text-2xl font-bold tracking-tight">Fórmulas</h1>
          <p className="text-muted-foreground">
            Fórmulas y recetas médicas emitidas en la clínica.
          </p>
        </div>
        <Button asChild>
          <Link href="/clinica/formulas/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva fórmula
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de fórmulas</CardTitle>
          <CardDescription>
            {loading ? 'Cargando...' : `${prescriptions.length} fórmula(s)`}
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
              Cargando fórmulas...
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <Pill className="h-10 w-10" />
              <p>Aún no se han registrado fórmulas.</p>
              <Button asChild variant="outline">
                <Link href="/clinica/formulas/nueva">
                  <Plus className="mr-2 h-4 w-4" />
                  Crear la primera
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Mascota</TableHead>
                  <TableHead>Diagnóstico</TableHead>
                  <TableHead>Medicamentos</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(p.date), 'd MMM yyyy, HH:mm', {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/clinica/formulas/${p.id}`}
                        className="hover:underline"
                      >
                        {petNames[p.petId] ?? '—'}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.diagnosis?.trim() ? p.diagnosis : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {p.items?.length ?? 0} ítem(s)
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/clinica/formulas/${p.id}`}>
                          Ver receta
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
