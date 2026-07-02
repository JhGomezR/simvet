'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, GraduationCap, Loader2, Percent } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { CaseHistoryTable } from '@/components/dashboard/case-history-table';
import { Progress } from '@/components/ui/progress';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { attemptsRepo, casesRepo } from '@/lib/repositories';
import type { Attempt, Case, ClinicalCase } from '@/lib/types';

function computeDashboardMetrics(attempts: Attempt[], availableCases: ClinicalCase[]) {
  const completed = attempts.filter((attempt) => attempt.status === 'completed');
  const averageScore =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, attempt) => sum + (attempt.finalScore ?? 0), 0) / completed.length
        )
      : 0;

  const triagePerformance =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, attempt) => {
            const evaluationEvents =
              attempt.events?.filter((event) => event.type === 'evaluation').length ?? 0;
            const capped = Math.min(5, evaluationEvents);
            return sum + (capped / 5) * 100;
          }, 0) / completed.length
        )
      : 0;

  const academicProgress =
    availableCases.length > 0
      ? Math.round((new Set(completed.map((attempt) => attempt.caseId)).size / availableCases.length) * 100)
      : 0;

  const level =
    averageScore >= 85 ? 'Avanzado' : averageScore >= 60 ? 'Intermedio' : 'Básico';

  return { averageScore, triagePerformance, academicProgress, level };
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [history, setHistory] = useState<Case[]>([]);
  const [availableCases, setAvailableCases] = useState<ClinicalCase[]>([]);
  const [professorPublishedCases, setProfessorPublishedCases] = useState<ClinicalCase[]>([]);
  const [professorHistory, setProfessorHistory] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user || !profile) return;
      try {
        const roles = new Set(profile.roles ?? [profile.role]);
        const isProfessor = roles.has('professor') || roles.has('admin');

        const attempts = await attemptsRepo.listByStudent(user.uid).catch((err) => {
          console.error('No se pudo cargar el historial de intentos del dashboard:', err);
          return [];
        });
        const caseIds = Array.from(new Set(attempts.map((attempt) => attempt.caseId)));
        const [publishedCases, relatedCases, professorCases] = await Promise.all([
          casesRepo.listPublished({ limit: 20 }).catch((err) => {
            console.error('No se pudieron cargar los casos publicados del dashboard:', err);
            return [];
          }),
          Promise.all(
            caseIds.map((caseId) =>
              casesRepo.getById(caseId).catch((err) => {
                console.error(`No se pudo cargar el caso relacionado ${caseId}:`, err);
                return null;
              })
            )
          ),
          isProfessor
            ? casesRepo.listByAuthor(user.uid).catch((err) => {
                console.error('No se pudieron cargar los casos del profesor en el dashboard:', err);
                return [];
              })
            : Promise.resolve([]),
        ]);

        const caseMap = new Map<string, ClinicalCase>();
        for (const item of [...publishedCases, ...relatedCases.filter(Boolean)]) {
          if (item) caseMap.set(item.id, item);
        }

        const enriched: Case[] = attempts.map((attempt) => {
          const currentCase = caseMap.get(attempt.caseId);
          return {
            id: attempt.id,
            name: currentCase?.name ?? attempt.caseId,
            date: new Date(attempt.startedAt).toISOString().slice(0, 10),
            score: attempt.finalScore ?? 0,
            status: attempt.status === 'completed' ? 'Completado' : 'En progreso',
          };
        });

        setHistory(enriched);
        setAttempts(attempts);
        setAvailableCases(publishedCases);

        if (isProfessor) {
          const ownCaseMap = new Map(professorCases.map((item) => [item.id, item] as const));
          const enrichedProfessorHistory: Case[] = attempts.map((attempt) => ({
            id: attempt.id,
            name: ownCaseMap.get(attempt.caseId)?.name ?? attempt.caseId,
            date: new Date(attempt.startedAt).toISOString().slice(0, 10),
            score: attempt.finalScore ?? 0,
            status: attempt.status === 'completed' ? 'Completado' : 'En progreso',
          }));

          setProfessorPublishedCases(
            professorCases.filter((item) => item.status === 'published')
          );
          setProfessorHistory(enrichedProfessorHistory);
        } else {
          setProfessorPublishedCases([]);
          setProfessorHistory([]);
        }
      } catch (err) {
        console.error('Error cargando dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [user, profile]);

  const metrics = useMemo(
    () => computeDashboardMetrics(attempts, availableCases),
    [attempts, availableCases]
  );
  const roles = useMemo(() => new Set(profile?.roles ?? (profile ? [profile.role] : [])), [profile]);
  const showProfessorSections = roles.has('professor') || roles.has('admin');

  if (loading || !profile) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Nivel Actual" value={metrics.level} icon={GraduationCap} />
        <StatCard title="Score Promedio" value={`${metrics.averageScore}%`} icon={Percent} />
        <StatCard
          title="Desempeño en Triage"
          value={`${metrics.triagePerformance}%`}
          icon={Activity}
        />
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Progreso Académico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.academicProgress}%</div>
            <Progress value={metrics.academicProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Casos disponibles</CardTitle>
          <CardDescription>
            Casos clínicos publicados por tus profesores y generados a partir de historias clínicas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableCases.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No hay casos publicados todavía. Pídele a tu profesor que publique uno.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {availableCases.map((clinicalCase) => (
                <a
                  key={clinicalCase.id}
                  href={`/simulacion/${clinicalCase.id}`}
                  className="block rounded-lg border p-4 transition-colors hover:border-primary"
                >
                  <p className="font-medium">{clinicalCase.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {clinicalCase.difficulty} · {clinicalCase.patient.species}
                    {clinicalCase.sourceDocumentId ? ' · Basado en historia clínica' : ''}
                  </p>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showProfessorSections ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Casos Disponibles Publicados</CardTitle>
              <CardDescription>
                Estos son los casos que ya quedaron visibles para la simulación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {professorPublishedCases.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Aún no tienes casos publicados. Publica uno desde el modo profesor.
                </p>
              ) : (
                <div className="grid gap-3">
                  {professorPublishedCases.map((clinicalCase) => (
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
              {professorHistory.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Todavía no has completado simulaciones con esta cuenta. Puedes abrir un caso
                  publicado para probarlo y validar su comportamiento.
                </p>
              ) : (
                <CaseHistoryTable cases={professorHistory} />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {showProfessorSections ? 'Historial Personal de Simulaciones' : 'Historial de Casos Completados'}
          </CardTitle>
          <CardDescription>
            {showProfessorSections
              ? 'Revisa tu desempeño personal al usar simulaciones con esta cuenta.'
              : 'Revisa tu desempeño en simulaciones anteriores.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Aún no has completado ningún caso. Inicia uno desde &quot;Casos disponibles&quot;.
            </p>
          ) : (
            <CaseHistoryTable cases={history} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
