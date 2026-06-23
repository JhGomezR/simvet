'use client';

import { useEffect, useState } from 'react';
import { ProfessorDashboard } from "@/components/profesor/professor-dashboard";
import { cohortPerformanceData, commonErrorsData, studentComparisonData } from "@/lib/data";
import { useAuth } from "@/contexts/auth-context";
import { casesRepo } from "@/lib/repositories";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { FilePlus2, Loader2 } from 'lucide-react';
import type { ClinicalCase } from '@/lib/types';

export default function ProfessorPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [myCases, setMyCases] = useState<ClinicalCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const cases = await casesRepo.listByAuthor(user.uid);
        setMyCases(cases);
      } catch (err) {
        console.error('Error cargando casos:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="py-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Mis Casos Clínicos</CardTitle>
            <CardDescription>Casos que has creado y publicado.</CardDescription>
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
            <p className="text-sm text-muted-foreground py-6 text-center">
              Aún no has creado casos. Crea tu primer caso clínico.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {myCases.map((c) => (
                <div key={c.id} className="border rounded-lg p-4 hover:border-primary transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium">{c.name}</p>
                    <Badge variant={c.status === 'published' ? 'default' : 'secondary'}>
                      {c.status === 'published' ? 'Publicado' : 'Borrador'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {c.difficulty} · {c.patient.species} · {c.patient.weightKg} kg
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => router.push(`/simulacion/${c.id}`)}
                  >
                    Previsualizar
                  </Button>
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
