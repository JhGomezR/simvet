'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/auth-context';
import {
  petsRepo,
  ownersRepo,
  consultationsRepo,
  clinicalDocumentsRepo,
} from '@/lib/repositories.clinical';
import type { Pet, Owner, Consultation, ClinicalDocument } from '@/lib/types';
import {
  Loader2,
  AlertCircle,
  PawPrint,
  Users,
  Stethoscope,
  FileText,
  FlaskConical,
  Syringe,
  Pill,
  Search,
  ArrowRight,
} from 'lucide-react';

type Stats = {
  pets: number;
  owners: number;
  consultations: number;
  documents: number;
};

const QUICK_LINKS = [
  { href: '/clinica/mascotas', label: 'Mascotas', icon: PawPrint, description: 'Gestionar pacientes' },
  { href: '/clinica/propietarios', label: 'Propietarios', icon: Users, description: 'Gestionar clientes' },
  { href: '/clinica/consultas', label: 'Consultas', icon: Stethoscope, description: 'Atención médica' },
  { href: '/clinica/prevencion', label: 'Prevención', icon: Syringe, description: 'Vacunas y desparasitación' },
  { href: '/clinica/formulas', label: 'Fórmulas', icon: Pill, description: 'Recetas médicas' },
  { href: '/clinica/laboratorio', label: 'Laboratorio', icon: FlaskConical, description: 'Exámenes y resultados' },
  { href: '/clinica/historias', label: 'Historias clínicas', icon: FileText, description: 'Documentos clínicos' },
  { href: '/clinica/busqueda', label: 'Búsqueda', icon: Search, description: 'Casos similares' },
];

export default function ClinicaDashboardPage() {
  const { user, profile } = useAuth();
  const clinicId = profile?.clinicId ?? 'default';

  const [stats, setStats] = useState<Stats>({ pets: 0, owners: 0, consultations: 0, documents: 0 });
  const [recentConsultations, setRecentConsultations] = useState<Consultation[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<ClinicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [pets, owners, consultations, documents] = await Promise.all([
          petsRepo.listByClinic(clinicId),
          ownersRepo.listByClinic(clinicId),
          consultationsRepo.listByClinic(clinicId),
          clinicalDocumentsRepo.listByClinic(clinicId),
        ]);

        if (!active) return;

        setStats({
          pets: pets.length,
          owners: owners.length,
          consultations: consultations.length,
          documents: documents.length,
        });
        setRecentConsultations(consultations.slice(0, 5));
        setRecentDocuments(documents.slice(0, 5));
      } catch (err) {
        if (active)
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar el panel clínico.'
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

  const statCards: { label: string; value: number; icon: typeof PawPrint; href: string }[] = [
    { label: 'Mascotas', value: stats.pets, icon: PawPrint, href: '/clinica/mascotas' },
    { label: 'Propietarios', value: stats.owners, icon: Users, href: '/clinica/propietarios' },
    { label: 'Consultas', value: stats.consultations, icon: Stethoscope, href: '/clinica/consultas' },
    { label: 'Documentos', value: stats.documents, icon: FileText, href: '/clinica/historias' },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel clínico</h1>
        <p className="text-muted-foreground">
          Resumen de la actividad de su veterinaria.
        </p>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Tarjetas de totales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} href={card.href}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {card.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="text-3xl font-bold">{card.value}</div>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Accesos rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Accesos rápidos</CardTitle>
          <CardDescription>Navegue a cada submódulo del sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-none">{link.label}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {link.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Consultas recientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Consultas recientes</CardTitle>
              <CardDescription>Últimas 5 consultas registradas.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/clinica/consultas">
                Ver todas
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Cargando...
              </div>
            ) : recentConsultations.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                <Stethoscope className="h-8 w-8" />
                <p className="text-sm">Aún no hay consultas registradas.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentConsultations.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {format(new Date(c.date), 'd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/clinica/consultas/${c.id}`}
                          className="hover:underline"
                        >
                          {c.reason}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Documentos recientes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Documentos recientes</CardTitle>
              <CardDescription>Últimos 5 documentos clínicos.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/clinica/historias">
                Ver todos
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Cargando...
              </div>
            ) : recentDocuments.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                <FileText className="h-8 w-8" />
                <p className="text-sm">Aún no hay documentos cargados.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Archivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDocuments.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {format(new Date(d.uploadedAt), 'd MMM yyyy', { locale: es })}
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{d.fileName}</span>
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
