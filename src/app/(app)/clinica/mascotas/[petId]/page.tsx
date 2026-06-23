'use client';

import { useState, useEffect, useMemo, use } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/auth-context';
import {
  petsRepo,
  ownersRepo,
  consultationsRepo,
  vaccinationsRepo,
  dewormingsRepo,
  prescriptionsRepo,
  labExamsRepo,
  clinicalDocumentsRepo,
} from '@/lib/repositories.clinical';
import { ownerFullName } from '@/lib/types';
import type {
  Pet,
  Owner,
  Consultation,
  Vaccination,
  Deworming,
  Prescription,
  LabExam,
  ClinicalDocument,
} from '@/lib/types';
import {
  Loader2,
  AlertCircle,
  PawPrint,
  ArrowLeft,
  Plus,
  FileText,
  Syringe,
  Bug,
  Pill,
  FlaskConical,
  Stethoscope,
} from 'lucide-react';

function calcAge(birthDate?: string, approxAge?: string): string {
  if (!birthDate) return approxAge ?? 'Desconocida';
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return approxAge ?? 'Desconocida';
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years <= 0 && months <= 0) return 'Menos de 1 mes';
  if (years <= 0) return `${months} mes(es)`;
  if (months === 0) return `${years} año(s)`;
  return `${years} año(s), ${months} mes(es)`;
}

function fmtDate(ms?: number): string {
  if (!ms) return '—';
  return format(new Date(ms), "d 'de' MMM yyyy", { locale: es });
}

export default function PetDetailPage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = use(params);
  const { profile } = useAuth();
  const clinicId = profile?.clinicId ?? 'default';

  const [pet, setPet] = useState<Pet | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [dewormings, setDewormings] = useState<Deworming[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labExams, setLabExams] = useState<LabExam[]>([]);
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const fetchedPet = await petsRepo.getById(petId);
        if (!fetchedPet) {
          if (!cancelled) setError('No se encontró la mascota.');
          return;
        }
        const [
          ownerData,
          cons,
          vacs,
          dews,
          pres,
          labs,
          docs,
        ] = await Promise.all([
          fetchedPet.ownerId
            ? ownersRepo.getById(fetchedPet.ownerId)
            : Promise.resolve(null),
          consultationsRepo.listByPet(petId),
          vaccinationsRepo.listByPet(petId),
          dewormingsRepo.listByPet(petId),
          prescriptionsRepo.listByPet(petId),
          labExamsRepo.listByPet(petId),
          clinicalDocumentsRepo.listByPet(petId),
        ]);
        if (cancelled) return;
        setPet(fetchedPet);
        setOwner(ownerData);
        setConsultations(cons);
        setVaccinations(vacs);
        setDewormings(dews);
        setPrescriptions(pres);
        setLabExams(labs);
        setDocuments(docs);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo cargar la ficha clínica.'
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [petId]);

  const age = useMemo(
    () => calcAge(pet?.birthDate, pet?.approxAge),
    [pet?.birthDate, pet?.approxAge]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando ficha clínica...
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error ?? 'Mascota no disponible.'}</span>
        </div>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/clinica/mascotas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a mascotas
          </Link>
        </Button>
      </div>
    );
  }

  const createHref = (base: string) =>
    `${base}?petId=${pet.id}`;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/clinica/mascotas">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a mascotas
        </Link>
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PawPrint className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{pet.name}</h1>
            <p className="text-muted-foreground">
              {pet.species}
              {pet.breed ? ` · ${pet.breed}` : ''} · {age}
            </p>
          </div>
        </div>
        {pet.deceased && <Badge variant="destructive">Fallecido</Badge>}
      </div>

      <Tabs defaultValue="datos" className="w-full">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="consultas">Consultas</TabsTrigger>
          <TabsTrigger value="vacunas">Vacunas</TabsTrigger>
          <TabsTrigger value="desparasitacion">Desparasitación</TabsTrigger>
          <TabsTrigger value="formulas">Fórmulas</TabsTrigger>
          <TabsTrigger value="laboratorio">Laboratorio</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        {/* DATOS */}
        <TabsContent value="datos">
          <Card>
            <CardHeader>
              <CardTitle>Datos del paciente</CardTitle>
              <CardDescription>Información general y dueño.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Especie" value={pet.species} />
                <Field label="Raza" value={pet.breed} />
                <Field label="Sexo" value={pet.sex} />
                <Field label="Edad" value={age} />
                <Field
                  label="Fecha de nacimiento"
                  value={
                    pet.birthDate
                      ? format(new Date(pet.birthDate), "d 'de' MMMM yyyy", {
                          locale: es,
                        })
                      : undefined
                  }
                />
                <Field
                  label="Peso"
                  value={pet.weightKg != null ? `${pet.weightKg} kg` : undefined}
                />
                <Field label="Color" value={pet.color} />
                <Field label="Microchip" value={pet.microchip} />
                <Field
                  label="Esterilizado/a"
                  value={pet.sterilized ? 'Sí' : 'No'}
                />
                <Field label="Tipo de sangre" value={pet.bloodType} />
              </dl>
              <Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Alergias" value={pet.allergies} />
                <Field
                  label="Condiciones crónicas"
                  value={pet.chronicConditions}
                />
                <Field label="Notas" value={pet.notes} />
              </div>
              <Separator />
              <div>
                <h3 className="mb-2 text-sm font-medium">Dueño</h3>
                {owner ? (
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Nombre" value={ownerFullName(owner)} />
                    <Field label="Documento" value={owner.idDocument} />
                    <Field label="Teléfono" value={owner.phone} />
                    <Field label="Email" value={owner.email} />
                    <Field label="Ciudad" value={owner.city} />
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sin dueño asociado.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONSULTAS */}
        <TabsContent value="consultas">
          <SectionCard
            title="Consultas médicas"
            description="Historial de consultas del paciente."
            createLabel="Nueva consulta"
            createHref={createHref('/clinica/consultas/nueva')}
            empty={consultations.length === 0}
            emptyIcon={<Stethoscope className="h-8 w-8" />}
            emptyText="No hay consultas registradas."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Diagnóstico</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultations.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{fmtDate(c.date)}</TableCell>
                    <TableCell>{c.reason}</TableCell>
                    <TableCell>{c.diagnosis ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        {/* VACUNAS */}
        <TabsContent value="vacunas">
          <SectionCard
            title="Vacunación"
            description="Vacunas aplicadas y refuerzos."
            createLabel="Nueva vacuna"
            createHref={createHref('/clinica/vacunas/nueva')}
            empty={vaccinations.length === 0}
            emptyIcon={<Syringe className="h-8 w-8" />}
            emptyText="No hay vacunas registradas."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vacuna</TableHead>
                  <TableHead>Aplicada</TableHead>
                  <TableHead>Próximo refuerzo</TableHead>
                  <TableHead>Lote</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vaccinations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      {v.vaccineName}
                    </TableCell>
                    <TableCell>{fmtDate(v.appliedDate)}</TableCell>
                    <TableCell>{fmtDate(v.nextDueDate)}</TableCell>
                    <TableCell>{v.batch ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        {/* DESPARASITACIÓN */}
        <TabsContent value="desparasitacion">
          <SectionCard
            title="Desparasitación"
            description="Productos antiparasitarios aplicados."
            createLabel="Nueva desparasitación"
            createHref={createHref('/clinica/desparasitacion/nueva')}
            empty={dewormings.length === 0}
            emptyIcon={<Bug className="h-8 w-8" />}
            emptyText="No hay desparasitaciones registradas."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Aplicada</TableHead>
                  <TableHead>Próxima</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dewormings.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.product}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{d.type}</Badge>
                    </TableCell>
                    <TableCell>{fmtDate(d.appliedDate)}</TableCell>
                    <TableCell>{fmtDate(d.nextDueDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        {/* FÓRMULAS */}
        <TabsContent value="formulas">
          <SectionCard
            title="Fórmulas médicas"
            description="Recetas y prescripciones."
            createLabel="Nueva fórmula"
            createHref={createHref('/clinica/formulas/nueva')}
            empty={prescriptions.length === 0}
            emptyIcon={<Pill className="h-8 w-8" />}
            emptyText="No hay fórmulas registradas."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Medicamentos</TableHead>
                  <TableHead>Diagnóstico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{fmtDate(p.date)}</TableCell>
                    <TableCell>
                      {p.items.map((it) => it.drug).join(', ') || '—'}
                    </TableCell>
                    <TableCell>{p.diagnosis ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        {/* LABORATORIO */}
        <TabsContent value="laboratorio">
          <SectionCard
            title="Laboratorio"
            description="Exámenes de laboratorio solicitados."
            createLabel="Nuevo examen"
            createHref={createHref('/clinica/laboratorio/nuevo')}
            empty={labExams.length === 0}
            emptyIcon={<FlaskConical className="h-8 w-8" />}
            emptyText="No hay exámenes registrados."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Solicitado</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labExams.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.type}</TableCell>
                    <TableCell>{fmtDate(l.requestedDate)}</TableCell>
                    <TableCell>{fmtDate(l.resultDate)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{l.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        {/* DOCUMENTOS */}
        <TabsContent value="documentos">
          <SectionCard
            title="Documentos clínicos"
            description="Archivos e historias adjuntas."
            createLabel="Subir documento"
            createHref={createHref('/clinica/documentos/nuevo')}
            empty={documents.length === 0}
            emptyIcon={<FileText className="h-8 w-8" />}
            emptyText="No hay documentos registrados."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Subido</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.fileName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{d.fileType}</Badge>
                    </TableCell>
                    <TableCell>{fmtDate(d.uploadedAt)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{d.processingStatus}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{value ? value : '—'}</dd>
    </div>
  );
}

function SectionCard({
  title,
  description,
  createLabel,
  createHref,
  empty,
  emptyIcon,
  emptyText,
  children,
}: {
  title: string;
  description: string;
  createLabel: string;
  createHref: string;
  empty: boolean;
  emptyIcon: React.ReactNode;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href={createHref}>
              <Plus className="mr-2 h-4 w-4" />
              {createLabel}
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            {emptyIcon}
            <p>{emptyText}</p>
            <Button asChild variant="outline" size="sm">
              <Link href={createHref}>
                <Plus className="mr-2 h-4 w-4" />
                {createLabel}
              </Link>
            </Button>
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
