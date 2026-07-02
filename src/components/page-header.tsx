"use client";

import { usePathname } from 'next/navigation';

const pageMeta = [
  {
    match: '/profesor/crear-caso',
    title: 'Creación de Caso Clínico',
    subtitle: 'Diseña escenarios clínicos con criterios pedagógicos y rutas de decisión claras.',
  },
  {
    match: '/profesor',
    title: 'Panel Docente',
    subtitle: 'Supervisa simulaciones, publicaciones y desempeño académico desde una sola vista.',
  },
  {
    match: '/simulacion',
    title: 'Simulación Clínica',
    subtitle: 'Interpreta al paciente, prioriza el ABCDE y toma decisiones con soporte visual continuo.',
  },
  {
    match: '/admin',
    title: 'Administración',
    subtitle: 'Gestiona cuentas, roles y el marco operativo del ecosistema SimVet.',
  },
  {
    match: '/dashboard',
    title: 'Dashboard Académico',
    subtitle: 'Consulta casos, progreso y prioridades de entrenamiento en un panel claro y accionable.',
  },
];

export function PageHeader() {
  const pathname = usePathname();
  const current = pageMeta.find((item) => pathname.startsWith(item.match)) ?? pageMeta[4];

  return (
    <div className="min-w-0 animate-fade-up">
      <p className="clinical-kicker mb-1">SimVet Workspace</p>
      <h1 className="truncate text-xl font-semibold md:text-2xl">{current.title}</h1>
      <p className="hidden text-sm text-muted-foreground md:block">{current.subtitle}</p>
    </div>
  );
}

