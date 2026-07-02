'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowRight, GraduationCap, Loader2, Percent } from 'lucide-react';
import { StatCard } from '@/components/dashboard/stat-card';
import { CaseHistoryTable } from '@/components/dashboard/case-history-table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { attemptsRepo, casesRepo } from '@/lib/repositories';
import { normalizeUserRoles, ROLE_PLAYBOOKS } from '@/lib/rbac';
import type { Attempt, Case, ClinicalCase } from '@/lib/types';

function computeDashboardMetrics(attempts: Attempt[], availableCases: ClinicalCase[]) {
  const completed = attempts.filter((attempt) => attempt.status === 'completed');
  const averageScore =
    completed.length > 0
      ? Math.round(
          completed.reduce((sum, attempt) => sum + (attempt.finalScore ?? 0), 0) /
            completed.length
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
      ? Math.round(
          (new Set(completed.map((attempt) => attempt.caseId)).size / availableCases.length) * 100
        )
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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user || !profile) return;
      setLoadError(null);

      try {
        const roles = new Set(profile.roles ?? [profile.role]);
        const isProfessor = roles.has('professor') || roles.has('admin');

        const loadedAttempts = await attemptsRepo.listByStudent(user.uid).catch((err) => {
          console.error('No se pudo cargar el historial de intentos del dashboard:', err);
          return [];
        });
        const caseIds = Array.from(new Set(loadedAttempts.map((attempt) => attempt.caseId)));

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

        const enrichedHistory: Case[] = loadedAttempts.map((attempt) => {
          const currentCase = caseMap.get(attempt.caseId);
          return {
            id: attempt.id,
            name: currentCase?.name ?? attempt.caseId,
            date: new Date(attempt.startedAt).toISOString().slice(0, 10),
            score: attempt.finalScore ?? 0,
            status: attempt.status === 'completed' ? 'Completado' : 'En progreso',
          };
        });

        setHistory(enrichedHistory);
        setAttempts(loadedAttempts);
        setAvailableCases(publishedCases);

        if (isProfessor) {
          const ownCaseMap = new Map(professorCases.map((item) => [item.id, item] as const));
          const enrichedProfessorHistory: Case[] = loadedAttempts.map((attempt) => ({
            id: attempt.id,
            name: ownCaseMap.get(attempt.caseId)?.name ?? attempt.caseId,
            date: new Date(attempt.startedAt).toISOString().slice(0, 10),
            score: attempt.finalScore ?? 0,
            status: attempt.status === 'completed' ? 'Completado' : 'En progreso',
          }));

          setProfessorPublishedCases(professorCases.filter((item) => item.status === 'published'));
          setProfessorHistory(enrichedProfessorHistory);
        } else {
          setProfessorPublishedCases([]);
          setProfessorHistory([]);
        }
      } catch (err) {
        console.error('Error cargando dashboard:', err);
        setLoadError(
          err instanceof Error ? err.message : 'No se pudo cargar por completo el dashboard.'
        );
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = window.setTimeout(() => {
      setLoading(false);
      setLoadError(
        (current) =>
          current ??
          'La carga del dashboard tardó demasiado. Se mostrará el contenido disponible.'
      );
    }, 8000);

    void load();
    return () => window.clearTimeout(timeoutId);
  }, [user, profile]);

  const metrics = useMemo(
    () => computeDashboardMetrics(attempts, availableCases),
    [attempts, availableCases]
  );
  const roles = useMemo(
    () => new Set(profile?.roles ?? (profile ? [profile.role] : [])),
    [profile]
  );
  const showProfessorSections = roles.has('professor') || roles.has('admin');
  const rolePlaybooks = useMemo(
    () =>
      normalizeUserRoles(profile?.role, profile?.roles)
        .map((role) => ROLE_PLAYBOOKS[role])
        .filter(Boolean),
    [profile]
  );

  if (loading || !profile) {
    return (
      <div className="flex min-h-[48vh] items-center justify-center">
        <div className="clinical-panel flex min-w-[280px] items-center gap-4 px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Cargando entorno clínico</p>
            <p className="text-sm text-muted-foreground">
              Estamos preparando tus métricas, casos y progreso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <Card className="overflow-hidden">
        <CardHeader className="relative">
          <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          <p className="clinical-kicker">Role Briefing</p>
          <CardTitle>Tu espacio operativo en SimVet</CardTitle>
          <CardDescription>
            Este panel resume qué debes hacer dentro de la plataforma según los roles activos de tu
            cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {loadError ? (
            <div className="rounded-[1rem] border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
              {loadError}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-3">
            {rolePlaybooks.map((playbook) => (
              <div
                key={playbook.role}
                className="rounded-[1.35rem] border border-slate-200/80 bg-white/75 p-5 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.55)] transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-primary/70">
                      {playbook.title}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{playbook.summary}</p>
                  </div>
                  <Badge
                    variant={
                      playbook.role === 'admin'
                        ? 'destructive'
                        : playbook.role === 'professor'
                          ? 'default'
                          : 'secondary'
                    }
                  >
                    {playbook.title}
                  </Badge>
                </div>
                <div className="mt-5 space-y-2">
                  {playbook.responsibilities.slice(0, 3).map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-200/70 bg-slate-50/70 px-3 py-2 text-sm text-slate-700"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Nivel Actual" value={metrics.level} icon={GraduationCap} />
        <StatCard title="Score Promedio" value={`${metrics.averageScore}%`} icon={Percent} />
        <StatCard
          title="Desempeño en Triage"
          value={`${metrics.triagePerformance}%`}
          icon={Activity}
        />
        <Card>
          <CardHeader className="pb-3">
            <p className="clinical-kicker">Performance</p>
            <CardTitle className="text-base font-medium">Progreso Académico</CardTitle>
            <CardDescription>Avance frente a los casos clínicos publicados.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-3">
              <div className="text-4xl font-semibold tracking-tight text-slate-950">
                {metrics.academicProgress}%
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Seguimiento activo
              </span>
            </div>
            <Progress value={metrics.academicProgress} className="mt-4 h-2.5" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <p className="clinical-kicker">Published Simulations</p>
          <CardTitle>Casos disponibles</CardTitle>
          <CardDescription>
            Casos clínicos publicados por docentes y listos para practicar con enfoque de triage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableCases.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-sm text-muted-foreground">
              No hay casos publicados todavía. Cuando un profesor publique simulaciones, te
              aparecerán aquí con acceso directo.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {availableCases.map((clinicalCase) => (
                <a
                  key={clinicalCase.id}
                  href={`/simulacion/${clinicalCase.id}`}
                  className="group rounded-[1.35rem] border border-slate-200/80 bg-white/80 p-5 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.5)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_30px_55px_-35px_rgba(15,23,42,0.45)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{clinicalCase.name}</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {clinicalCase.patient.species}
                        {clinicalCase.sourceDocumentId
                          ? ' · Basado en historia clínica'
                          : ' · Caso docente'}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="rounded-full border-primary/20 bg-primary/5 text-primary"
                    >
                      {clinicalCase.difficulty}
                    </Badge>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Abrir simulación</span>
                    <ArrowRight className="h-4 w-4 text-primary transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showProfessorSections ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <p className="clinical-kicker">Teacher Lens</p>
              <CardTitle>Casos publicados por tu cuenta</CardTitle>
              <CardDescription>
                Aquí ves los casos que ya quedaron visibles para el flujo de simulación.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {professorPublishedCases.length === 0 ? (
                <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-7 text-sm text-muted-foreground">
                  Aún no tienes casos publicados. Publica uno desde el modo profesor para que se
                  refleje en el dashboard del estudiante.
                </div>
              ) : (
                <div className="grid gap-3">
                  {professorPublishedCases.map((clinicalCase) => (
                    <a
                      key={clinicalCase.id}
                      href={`/simulacion/${clinicalCase.id}`}
                      className="rounded-[1.15rem] border border-slate-200/80 bg-white/75 p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)]"
                    >
                      <p className="font-semibold text-slate-900">{clinicalCase.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
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
              <p className="clinical-kicker">Teacher Feedback Loop</p>
              <CardTitle>Historial de pruebas y validación</CardTitle>
              <CardDescription>
                Simulaciones completadas con esta misma cuenta para revisar comportamiento y
                calidad del caso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {professorHistory.length === 0 ? (
                <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-7 text-sm text-muted-foreground">
                  Todavía no has completado simulaciones con esta cuenta. Puedes abrir un caso
                  publicado para validarlo end to end.
                </div>
              ) : (
                <CaseHistoryTable cases={professorHistory} />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <p className="clinical-kicker">Learning Trace</p>
          <CardTitle>
            {showProfessorSections
              ? 'Historial personal de simulaciones'
              : 'Historial de casos completados'}
          </CardTitle>
          <CardDescription>
            {showProfessorSections
              ? 'Revisa tu desempeño personal al usar simulaciones con esta cuenta.'
              : 'Revisa tu evolución clínica en simulaciones anteriores.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="rounded-[1.2rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-7 text-sm text-muted-foreground">
              Aún no has completado ningún caso. Inicia uno desde la sección de casos disponibles
              para empezar a construir tu historial.
            </div>
          ) : (
            <CaseHistoryTable cases={history} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
