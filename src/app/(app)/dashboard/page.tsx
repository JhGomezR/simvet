'use client';

import { useEffect, useState } from 'react';
import { StatCard } from '@/components/dashboard/stat-card';
import { CaseHistoryTable } from '@/components/dashboard/case-history-table';
import { Progress } from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Activity, GraduationCap, Percent, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { attemptsRepo, casesRepo } from '@/lib/repositories';
import type { Case, ClinicalCase } from '@/lib/types';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [history, setHistory] = useState<Case[]>([]);
  const [availableCases, setAvailableCases] = useState<ClinicalCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const [hist, cases] = await Promise.all([
          attemptsRepo.listByStudent(user.uid),
          casesRepo.listPublished({ limit: 10 }),
        ]);
        const enriched: Case[] = hist.map((a) => {
          const c = cases.find((x) => x.id === a.caseId);
          return {
            id: a.id,
            name: c?.name ?? a.caseId,
            date: new Date(a.startedAt).toISOString().slice(0, 10),
            score: a.finalScore ?? 0,
            status: a.status === 'completed' ? 'Completado' : 'En progreso',
          };
        });
        setHistory(enriched);
        setAvailableCases(cases);
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  if (loading || !profile) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Nivel Actual"
          value={profile.level ?? 'Básico'}
          icon={GraduationCap}
        />
        <StatCard
          title="Score Promedio"
          value={`${profile.averageScore ?? 0}%`}
          icon={Percent}
        />
        <StatCard
          title="Desempeño en Triage"
          value={`${profile.triagePerformance ?? 0}%`}
          icon={Activity}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Progreso Académico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profile.academicProgress ?? 0}%</div>
            <Progress value={profile.academicProgress ?? 0} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Casos disponibles</CardTitle>
          <CardDescription>Casos clínicos publicados por tus profesores.</CardDescription>
        </CardHeader>
        <CardContent>
          {availableCases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No hay casos publicados todavía. Pídele a tu profesor que publique uno.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {availableCases.map((c) => (
                <a
                  key={c.id}
                  href={`/simulacion/${c.id}`}
                  className="block p-4 rounded-lg border hover:border-primary transition-colors"
                >
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.difficulty} · {c.patient.species}
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
          <CardDescription>Revisa tu desempeño en simulaciones anteriores.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Aún no has completado ningún caso. ¡Inicia uno desde "Casos disponibles"!
            </p>
          ) : (
            <CaseHistoryTable cases={history} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
