'use client';

import { useEffect, useState } from 'react';
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
import { ProfessorDashboard } from '@/components/profesor/professor-dashboard';
import { cohortPerformanceData, commonErrorsData, studentComparisonData } from '@/lib/data';
import { useAuth } from '@/contexts/auth-context';
import { casesRepo } from '@/lib/repositories';
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
import type { ClinicalCase } from '@/lib/types';

export default function ProfessorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [myCases, setMyCases] = useState<ClinicalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyCaseId, setBusyCaseId] = useState<string | null>(null);

  useEffect(() => {
    void loadCases();
  }, [user]);

  async function loadCases() {
    if (!user) return;
    try {
      const cases = await casesRepo.listByAuthor(user.uid);
      setMyCases(cases);
    } catch (err) {
      console.error('Error cargando casos:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(clinicalCase: ClinicalCase) {
    setBusyCaseId(clinicalCase.id);
    try {
      const nextStatus = clinicalCase.status === 'published' ? 'draft' : 'published';
      await casesRepo.update(clinicalCase.id, { status: nextStatus });
      await loadCases();
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
      await loadCases();
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

      <ProfessorDashboard
        cohortData={cohortPerformanceData}
        errorData={commonErrorsData}
        studentData={studentComparisonData}
      />
    </div>
  );
}
