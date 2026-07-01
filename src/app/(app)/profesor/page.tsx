'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArchiveRestore,
  Eye,
  FilePlus2,
  Loader2,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react';
import { CaseHistoryTable } from '@/components/dashboard/case-history-table';
import { ProfessorDashboard } from '@/components/profesor/professor-dashboard';
import { cohortPerformanceData, commonErrorsData, studentComparisonData } from '@/lib/data';
import { useAuth } from '@/contexts/auth-context';
import { attemptsRepo, casesRepo } from '@/lib/repositories';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Case, ClinicalCase } from '@/lib/types';

export default function ProfessorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [myCases, setMyCases] = useState<ClinicalCase[]>([]);
  const [publishedCases, setPublishedCases] = useState<ClinicalCase[]>([]);
  const [history, setHistory] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyCaseId, setBusyCaseId] = useState<string | null>(null);

  const loadProfessorData = useCallback(async () => {
    if (!user) return;
    try {
      const [cases, attempts] = await Promise.all([
        casesRepo.listByAuthor(user.uid),
        attemptsRepo.listByStudent(user.uid).catch(() => []),
      ]);

      const ownCaseMap = new Map(cases.map((item) => [item.id, item] as const));
      const enrichedHistory: Case[] = attempts.map((attempt) => ({
        id: attempt.id,
        name: ownCaseMap.get(attempt.caseId)?.name ?? attempt.caseId,
        date: new Date(attempt.startedAt).toISOString().slice(0, 10),
        score: attempt.finalScore ?? 0,
        status: attempt.status === 'completed' ? 'Completado' : 'En progreso',
      }));

      setMyCases(cases);
      setPublishedCases(cases.filter((item) => item.status === 'published'));
      setHistory(enrichedHistory);
    } catch (err) {
      console.error('Error cargando casos:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfessorData();
  }, [loadProfessorData]);

  async function handleToggleStatus(clinicalCase: ClinicalCase) {
    setBusyCaseId(clinicalCase.id);
    try {
      const nextStatus = clinicalCase.status === 'published' ? 'draft' : 'published';
      await casesRepo.update(clinicalCase.id, { status: nextStatus });
      await loadProfessorData();
      toast({
        title: nextStatus === 'published' ? 'Caso publicado' : 'Caso movido a borrador',
        description: clinicalCase.name,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'No se pudo actualizar el caso',
        description: err instanceof Error ? err.message : 'Intenta nuevamente.',
      });
    } finally {
      setBusyCaseId(null);
    }
  }

  async function handleDeleteCase(clinicalCase: ClinicalCase) {
    const confirmed = window.confirm(`¿Eliminar el caso "${clinicalCase.name}"?`);
    if (!confirmed) return;

    setBusyCaseId(clinicalCase.id);
    try {
      await casesRepo.remove(clinicalCase.id);
      await loadProfessorData();
      toast({
        title: 'Caso eliminado',
        description: clinicalCase.name,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'No se pudo eliminar el caso',
        description: err instanceof Error ? err.message : 'Intenta nuevamente.',
      });
    } finally {
      setBusyCaseId(null);
    }
  }

  return (
    <div className="space-y-6 py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Mis Casos Clínicos</CardTitle>
            <CardDescription>Administra tus casos, su estado y su publicación.</CardDescription>
          </div>
          <Button onClick={() => router.push('/profesor/crear-caso')}>
            <FilePlus2 className="mr-2 h-4 w-4" />
            Crear caso
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : myCases.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aún no has creado casos. Crea tu primer caso clínico.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {myCases.map((clinicalCase) => (
                <div
                  key={clinicalCase.id}
                  className="rounded-lg border p-4 transition-colors hover:border-primary"
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="font-medium">{clinicalCase.name}</p>
                    <Badge
                      variant={clinicalCase.status === 'published' ? 'default' : 'secondary'}
                    >
                      {clinicalCase.status === 'published' ? 'Publicado' : 'Borrador'}
                    </Badge>
                  </div>
                  <p className="mb-2 text-xs text-muted-foreground">
                    {clinicalCase.difficulty} · {clinicalCase.patient.species} ·{' '}
                    {clinicalCase.patient.weightKg} kg
                  </p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {clinicalCase.description}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/simulacion/${clinicalCase.id}`)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/profesor/editar/${clinicalCase.id}`)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyCaseId === clinicalCase.id}
                      onClick={() => void handleToggleStatus(clinicalCase)}
                    >
                      {busyCaseId === clinicalCase.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : clinicalCase.status === 'published' ? (
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      {clinicalCase.status === 'published' ? 'Borrador' : 'Publicar'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busyCaseId === clinicalCase.id}
                      onClick={() => void handleDeleteCase(clinicalCase)}
                    >
                      {busyCaseId === clinicalCase.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Casos Disponibles Publicados</CardTitle>
            <CardDescription>
              Estos son los casos que ya quedaron visibles para la simulación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {publishedCases.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Aún no tienes casos publicados. Publica uno desde &quot;Mis Casos Clínicos&quot;.
              </p>
            ) : (
              <div className="grid gap-3">
                {publishedCases.map((clinicalCase) => (
                  <a
                    key={clinicalCase.id}
                    href={`/simulacion/${clinicalCase.id}`}
                    className="block rounded-lg border p-4 transition-colors hover:border-primary"
                  >
                    <p className="font-medium">{clinicalCase.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {clinicalCase.difficulty} · {clinicalCase.patient.species}
                    </p>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial de Casos Completados</CardTitle>
            <CardDescription>
              Aquí verás las simulaciones realizadas con esta cuenta de profesor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Todavía no has completado simulaciones con esta cuenta. Puedes abrir un caso
                publicado para probarlo y validar su comportamiento.
              </p>
            ) : (
              <CaseHistoryTable cases={history} />
            )}
          </CardContent>
        </Card>
      </div>

      <ProfessorDashboard
        cohortData={cohortPerformanceData}
        errorData={commonErrorsData}
        studentData={studentComparisonData}
      />
    </div>
  );
}
