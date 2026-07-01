'use client';

import { useEffect, useMemo, use, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  ArrowLeft,
  Bug,
  FileText,
  FlaskConical,
  Loader2,
  PawPrint,
  Pill,
  Plus,
  Stethoscope,
  Syringe,
  Trash2,
} from 'lucide-react';
import { deleteObject, ref } from 'firebase/storage';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import {
  clinicalDocumentsRepo,
  consultationsRepo,
  dewormingsRepo,
  documentChunksRepo,
  labExamsRepo,
  ownersRepo,
  petsRepo,
  prescriptionsRepo,
  vaccinationsRepo,
} from '@/lib/repositories.clinical';
import { ownerFullName } from '@/lib/types';
import type {
  ClinicalDocument,
  Consultation,
  Deworming,
  LabExam,
  Owner,
  Pet,
  Prescription,
  Vaccination,
} from '@/lib/types';

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

type TimelineItem = {
  id: string;
  when: number;
  type:
    | 'consulta'
    | 'vacuna'
    | 'desparasitacion'
    | 'formula'
    | 'laboratorio'
    | 'documento';
  title: string;
  subtitle?: string;
  summary?: string;
  badge?: string;
};

function buildTimelineItems({
  consultations,
  vaccinations,
  dewormings,
  prescriptions,
  labExams,
  documents,
}: {
  consultations: Consultation[];
  vaccinations: Vaccination[];
  dewormings: Deworming[];
  prescriptions: Prescription[];
  labExams: LabExam[];
  documents: ClinicalDocument[];
}): TimelineItem[] {
  const consultationItems: TimelineItem[] = consultations.map((item) => ({
    id: `consultation-${item.id}`,
    when: item.date,
    type: 'consulta',
    title: item.reason,
    subtitle: 'Consulta médica',
    summary: item.diagnosis ?? item.notes ?? item.anamnesis,
    badge: item.status,
  }));

  const vaccinationItems: TimelineItem[] = vaccinations.map((item) => ({
    id: `vaccination-${item.id}`,
    when: item.appliedDate,
    type: 'vacuna',
    title: item.vaccineName,
    subtitle: 'Vacunación',
    summary: item.notes ?? item.manufacturer,
    badge: item.batch,
  }));

  const dewormingItems: TimelineItem[] = dewormings.map((item) => ({
    id: `deworming-${item.id}`,
    when: item.appliedDate,
    type: 'desparasitacion',
    title: item.product,
    subtitle: 'Desparasitación',
    summary: item.notes,
    badge: item.type,
  }));

  const prescriptionItems: TimelineItem[] = prescriptions.map((item) => ({
    id: `prescription-${item.id}`,
    when: item.date,
    type: 'formula',
    title: 'Fórmula médica',
    subtitle: item.diagnosis ?? 'Prescripción',
    summary: item.items.map((entry) => entry.drug).join(', '),
    badge: `${item.items.length} ítem(s)`,
  }));

  const labItems: TimelineItem[] = labExams.map((item) => ({
    id: `lab-${item.id}`,
    when: item.resultDate ?? item.requestedDate,
    type: 'laboratorio',
    title: item.type,
    subtitle: 'Laboratorio',
    summary: item.interpretation ?? item.notes,
    badge: item.status,
  }));

  const documentItems: TimelineItem[] = documents.map((item) => ({
    id: `document-${item.id}`,
    when: item.uploadedAt,
    type: 'documento',
    title: item.fileName,
    subtitle: 'Documento clínico',
    summary: item.extraction?.summary ?? item.processingError,
    badge: item.processingStatus,
  }));

  return [
    ...consultationItems,
    ...vaccinationItems,
    ...dewormingItems,
    ...prescriptionItems,
    ...labItems,
    ...documentItems,
  ].sort((a, b) => b.when - a.when);
}

function timelineTone(type: TimelineItem['type']) {
  switch (type) {
    case 'consulta':
      return {
        icon: <Stethoscope className="h-4 w-4" />,
        label: 'Consulta',
      };
    case 'vacuna':
      return {
        icon: <Syringe className="h-4 w-4" />,
        label: 'Vacuna',
      };
    case 'desparasitacion':
      return {
        icon: <Bug className="h-4 w-4" />,
        label: 'Desparasitación',
      };
    case 'formula':
      return {
        icon: <Pill className="h-4 w-4" />,
        label: 'Fórmula',
      };
    case 'laboratorio':
      return {
        icon: <FlaskConical className="h-4 w-4" />,
        label: 'Laboratorio',
      };
    case 'documento':
      return {
        icon: <FileText className="h-4 w-4" />,
        label: 'Documento',
      };
  }
}

export default function PetDetailPage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = use(params);
  const { profile } = useAuth();
  const { toast } = useToast();
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
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
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

        const [ownerData, cons, vacs, dews, pres, labs, docs] = await Promise.all([
          fetchedPet.ownerId ? ownersRepo.getById(fetchedPet.ownerId) : Promise.resolve(null),
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
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'No se pudo cargar la historia clínica del paciente.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [petId]);

  const age = useMemo(() => calcAge(pet?.birthDate, pet?.approxAge), [pet?.birthDate, pet?.approxAge]);
  const timelineItems = useMemo(
    () =>
      buildTimelineItems({
        consultations,
        vaccinations,
        dewormings,
        prescriptions,
        labExams,
        documents,
      }),
    [consultations, vaccinations, dewormings, prescriptions, labExams, documents]
  );

  async function handleDeleteDocument(doc: ClinicalDocument) {
    const confirmed = window.confirm(
      `¿Eliminar el archivo "${doc.fileName}" y sus fragmentos asociados?`
    );
    if (!confirmed) return;

    setDeletingDocumentId(doc.id);
    try {
      let storageCleanupWarning: string | null = null;

      if (doc.storagePath) {
        try {
          await deleteObject(ref(storage, doc.storagePath));
        } catch (err) {
          const code =
            typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : '';
          if (code !== 'storage/unauthorized' && code !== 'storage/object-not-found') {
            throw err;
          }
          storageCleanupWarning =
            'El documento se elimino de SimVet, pero el archivo heredado de Storage requiere limpieza manual.';
          console.warn('No se pudo eliminar el archivo clinico en Storage:', doc.storagePath, err);
        }
      }

      const chunks = await documentChunksRepo.listByDocument(doc.id);
      await Promise.all(chunks.map((chunk) => documentChunksRepo.remove(chunk.id)));
      await clinicalDocumentsRepo.remove(doc.id);
      setDocuments((current) => current.filter((item) => item.id !== doc.id));
      console.warn(storageCleanupWarning ?? '');
      toast({
        title: 'Documento eliminado',
        description: 'El documento clínico y sus fragmentos asociados fueron eliminados.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el documento.';
      toast({
        variant: 'destructive',
        title: 'Error al eliminar documento',
        description: message,
      });
    } finally {
      setDeletingDocumentId(null);
    }
  }

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

  const consultationHref = `/clinica/consultas/nueva?petId=${pet.id}`;
  const preventionHref = `/clinica/prevencion?petId=${pet.id}`;
  const formulaHref = `/clinica/formulas/nueva?petId=${pet.id}`;
  const laboratoryHref = `/clinica/laboratorio/nueva?petId=${pet.id}`;
  const historyHref = `/clinica/historias?petId=${pet.id}`;

  return (
    <div className="container mx-auto space-y-6 py-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Acciones clínicas</CardTitle>
          <CardDescription>
            Registra nuevas actuaciones clínicas directamente sobre la historia del paciente.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Button asChild variant="outline">
            <Link href={consultationHref}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva consulta
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={preventionHref}>
              <Plus className="mr-2 h-4 w-4" />
              Prevención
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={formulaHref}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva fórmula
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={laboratoryHref}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo examen
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={historyHref}>
              <Plus className="mr-2 h-4 w-4" />
              Subir historia
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="flex h-auto flex-wrap">
          <TabsTrigger value="timeline">Línea de tiempo</TabsTrigger>
          <TabsTrigger value="datos">Datos</TabsTrigger>
          <TabsTrigger value="consultas">Consultas</TabsTrigger>
          <TabsTrigger value="vacunas">Vacunas</TabsTrigger>
          <TabsTrigger value="desparasitacion">Desparasitación</TabsTrigger>
          <TabsTrigger value="formulas">Fórmulas</TabsTrigger>
          <TabsTrigger value="laboratorio">Laboratorio</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Historia clínica integral</CardTitle>
              <CardDescription>
                Línea de tiempo consolidada con consultas, prevención, fórmulas, laboratorio y documentos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {timelineItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
                  <FileText className="h-8 w-8" />
                  <p>Aún no hay eventos clínicos registrados para este paciente.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {timelineItems.map((item) => {
                    const tone = timelineTone(item.type);
                    return (
                      <div key={item.id} className="rounded-xl border p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {tone.icon}
                              <span>{tone.label}</span>
                              <span>·</span>
                              <span>{fmtDate(item.when)}</span>
                            </div>
                            <h3 className="font-medium">{item.title}</h3>
                            {item.subtitle && (
                              <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                            )}
                            {item.summary && (
                              <p className="text-sm text-foreground/80">{item.summary}</p>
                            )}
                          </div>
                          {item.badge && <Badge variant="secondary">{item.badge}</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                      ? format(new Date(pet.birthDate), "d 'de' MMMM yyyy", { locale: es })
                      : undefined
                  }
                />
                <Field label="Peso" value={pet.weightKg != null ? `${pet.weightKg} kg` : undefined} />
                <Field label="Color" value={pet.color} />
                <Field label="Microchip" value={pet.microchip} />
                <Field label="Esterilizado/a" value={pet.sterilized ? 'Sí' : 'No'} />
                <Field label="Tipo de sangre" value={pet.bloodType} />
              </dl>
              <Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Alergias" value={pet.allergies} />
                <Field label="Condiciones crónicas" value={pet.chronicConditions} />
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
                  <p className="text-sm text-muted-foreground">Sin dueño asociado.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consultas">
          <SectionCard
            title="Consultas médicas"
            description="Historial de consultas del paciente."
            createLabel="Nueva consulta"
            createHref={consultationHref}
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
                {consultations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{fmtDate(item.date)}</TableCell>
                    <TableCell>{item.reason}</TableCell>
                    <TableCell>{item.diagnosis ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="vacunas">
          <SectionCard
            title="Vacunación"
            description="Vacunas aplicadas y refuerzos."
            createLabel="Abrir prevención"
            createHref={preventionHref}
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
                {vaccinations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.vaccineName}</TableCell>
                    <TableCell>{fmtDate(item.appliedDate)}</TableCell>
                    <TableCell>{fmtDate(item.nextDueDate)}</TableCell>
                    <TableCell>{item.batch ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="desparasitacion">
          <SectionCard
            title="Desparasitación"
            description="Productos antiparasitarios aplicados."
            createLabel="Abrir prevención"
            createHref={preventionHref}
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
                {dewormings.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.product}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.type}</Badge>
                    </TableCell>
                    <TableCell>{fmtDate(item.appliedDate)}</TableCell>
                    <TableCell>{fmtDate(item.nextDueDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="formulas">
          <SectionCard
            title="Fórmulas médicas"
            description="Recetas y prescripciones."
            createLabel="Nueva fórmula"
            createHref={formulaHref}
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
                {prescriptions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{fmtDate(item.date)}</TableCell>
                    <TableCell>{item.items.map((entry) => entry.drug).join(', ') || '—'}</TableCell>
                    <TableCell>{item.diagnosis ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="laboratorio">
          <SectionCard
            title="Laboratorio"
            description="Exámenes de laboratorio solicitados."
            createLabel="Nuevo examen"
            createHref={laboratoryHref}
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
                {labExams.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.type}</TableCell>
                    <TableCell>{fmtDate(item.requestedDate)}</TableCell>
                    <TableCell>{fmtDate(item.resultDate)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="documentos">
          <SectionCard
            title="Documentos clínicos"
            description="Archivos e historias adjuntas."
            createLabel="Subir documento"
            createHref={historyHref}
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
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.fileName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.fileType}</Badge>
                    </TableCell>
                    <TableCell>{fmtDate(item.uploadedAt)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.processingStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleDeleteDocument(item)}
                        disabled={deletingDocumentId === item.id}
                        aria-label={`Eliminar ${item.fileName}`}
                      >
                        {deletingDocumentId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
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
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
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
