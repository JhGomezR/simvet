'use client';

import { useEffect, useMemo, use, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  ArrowLeft,
  Bug,
  Eye,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
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
  if (!ms) return '-';
  return format(new Date(ms), "d 'de' MMM yyyy", { locale: es });
}

function fmtDateTime(ms?: number): string {
  if (!ms) return '-';
  return format(new Date(ms), "d 'de' MMM yyyy HH:mm", { locale: es });
}

function epochToDateInput(ms?: number): string {
  if (!ms) return '';
  return format(new Date(ms), 'yyyy-MM-dd');
}

function dateInputToEpoch(value?: string): number | undefined {
  if (!value) return undefined;
  const ms = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

type TimelineItem = {
  id: string;
  entityId: string;
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
  details?: string[];
  href?: string;
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
    entityId: item.id,
    when: item.date,
    type: 'consulta',
    title: item.reason,
    subtitle: 'Consulta médica',
    summary: item.diagnosis ?? item.notes ?? item.anamnesis,
    badge: item.status,
    details: [
      item.anamnesis ? `Anamnesis: ${item.anamnesis}` : '',
      item.physicalExam ? `Examen fisico: ${item.physicalExam}` : '',
      item.differentialDiagnosis ? `Diagnosticos diferenciales: ${item.differentialDiagnosis}` : '',
      item.treatmentPlan ? `Plan terapeutico: ${item.treatmentPlan}` : '',
      item.notes ? `Notas: ${item.notes}` : '',
    ].filter(Boolean),
  }));

  const vaccinationItems: TimelineItem[] = vaccinations.map((item) => ({
    id: `vaccination-${item.id}`,
    entityId: item.id,
    when: item.appliedDate,
    type: 'vacuna',
    title: item.vaccineName,
    subtitle: 'Vacunacion',
    summary: item.notes ?? item.manufacturer,
    badge: item.batch,
    details: [
      item.manufacturer ? `Fabricante: ${item.manufacturer}` : '',
      item.batch ? `Lote: ${item.batch}` : '',
      item.nextDueDate ? `Proximo refuerzo: ${fmtDate(item.nextDueDate)}` : '',
      item.notes ? `Notas: ${item.notes}` : '',
    ].filter(Boolean),
  }));

  const dewormingItems: TimelineItem[] = dewormings.map((item) => ({
    id: `deworming-${item.id}`,
    entityId: item.id,
    when: item.appliedDate,
    type: 'desparasitacion',
    title: item.product,
    subtitle: 'Desparasitacion',
    summary: item.notes,
    badge: item.type,
    details: [
      `Tipo: ${item.type}`,
      item.weightKg != null ? `Peso registrado: ${item.weightKg} kg` : '',
      item.nextDueDate ? `Proxima aplicacion: ${fmtDate(item.nextDueDate)}` : '',
      item.notes ? `Notas: ${item.notes}` : '',
    ].filter(Boolean),
  }));

  const prescriptionItems: TimelineItem[] = prescriptions.map((item) => ({
    id: `prescription-${item.id}`,
    entityId: item.id,
    when: item.date,
    type: 'formula',
    title: 'Fórmula médica',
    subtitle: item.diagnosis ?? 'Prescripción',
    summary: item.items.map((entry) => entry.drug).join(', '),
    badge: `${item.items.length} ítem(s)`,
  }));

  const labItems: TimelineItem[] = labExams.map((item) => ({
    id: `lab-${item.id}`,
    entityId: item.id,
    when: item.resultDate ?? item.requestedDate,
    type: 'laboratorio',
    title: item.type,
    subtitle: 'Laboratorio',
    summary: item.interpretation ?? item.notes,
    badge: item.status,
    href: item.fileUrl,
  }));

  const documentItems: TimelineItem[] = documents.map((item) => ({
    id: `document-${item.id}`,
    entityId: item.id,
    when: item.uploadedAt,
    type: 'documento',
    title: item.fileName,
    subtitle: 'Documento clínico',
    summary: item.extraction?.summary ?? item.processingError,
    badge: item.processingStatus,
    href: item.storageUrl,
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
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<TimelineItem | null>(null);
  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [editingTimeline, setEditingTimeline] = useState(false);
  const [savingTimeline, setSavingTimeline] = useState(false);
  const [timelineDraft, setTimelineDraft] = useState<Record<string, string>>({});
  const [editPatientDialogOpen, setEditPatientDialogOpen] = useState(false);
  const [savingPatient, setSavingPatient] = useState(false);
  const [patientDraft, setPatientDraft] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('timeline');
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

  const selectedConsultation =
    selectedTimelineItem?.type === 'consulta'
      ? consultations.find((item) => item.id === selectedTimelineItem.entityId) ?? null
      : null;
  const selectedVaccination =
    selectedTimelineItem?.type === 'vacuna'
      ? vaccinations.find((item) => item.id === selectedTimelineItem.entityId) ?? null
      : null;
  const selectedDeworming =
    selectedTimelineItem?.type === 'desparasitacion'
      ? dewormings.find((item) => item.id === selectedTimelineItem.entityId) ?? null
      : null;
  const selectedPrescription =
    selectedTimelineItem?.type === 'formula'
      ? prescriptions.find((item) => item.id === selectedTimelineItem.entityId) ?? null
      : null;
  const selectedLabExam =
    selectedTimelineItem?.type === 'laboratorio'
      ? labExams.find((item) => item.id === selectedTimelineItem.entityId) ?? null
      : null;
  const selectedDocument =
    selectedTimelineItem?.type === 'documento'
      ? documents.find((item) => item.id === selectedTimelineItem.entityId) ?? null
      : null;

  function getTimelineItem(type: TimelineItem['type'], entityId: string) {
    return timelineItems.find((item) => item.type === type && item.entityId === entityId) ?? null;
  }

  function openTimelineItem(item: TimelineItem) {
    setSelectedTimelineItem(item);
    setEditingTimeline(false);
    switch (item.type) {
      case 'consulta': {
        const current = consultations.find((entry) => entry.id === item.entityId);
        setTimelineDraft({
          anamnesis: current?.anamnesis ?? '',
          physicalExam: current?.physicalExam ?? '',
          diagnosis: current?.diagnosis ?? '',
          differentialDiagnosis: current?.differentialDiagnosis ?? '',
          treatmentPlan: current?.treatmentPlan ?? '',
          notes: current?.notes ?? '',
          status: current?.status ?? 'abierta',
        });
        break;
      }
      case 'vacuna': {
        const current = vaccinations.find((entry) => entry.id === item.entityId);
        setTimelineDraft({
          vaccineName: current?.vaccineName ?? '',
          manufacturer: current?.manufacturer ?? '',
          batch: current?.batch ?? '',
          nextDueDate: epochToDateInput(current?.nextDueDate),
          notes: current?.notes ?? '',
        });
        break;
      }
      case 'desparasitacion': {
        const current = dewormings.find((entry) => entry.id === item.entityId);
        setTimelineDraft({
          product: current?.product ?? '',
          type: current?.type ?? 'interna',
          weightKg: current?.weightKg != null ? String(current.weightKg) : '',
          nextDueDate: epochToDateInput(current?.nextDueDate),
          notes: current?.notes ?? '',
        });
        break;
      }
      case 'formula': {
        const current = prescriptions.find((entry) => entry.id === item.entityId);
        setTimelineDraft({
          diagnosis: current?.diagnosis ?? '',
          notes: current?.notes ?? '',
        });
        break;
      }
      case 'laboratorio': {
        const current = labExams.find((entry) => entry.id === item.entityId);
        setTimelineDraft({
          type: current?.type ?? '',
          status: current?.status ?? 'solicitado',
          resultDate: epochToDateInput(current?.resultDate),
          interpretation: current?.interpretation ?? '',
          notes: current?.notes ?? '',
        });
        break;
      }
      default:
        setTimelineDraft({});
    }
    setTimelineDialogOpen(true);
  }

  function openPatientEditDialog() {
    if (!pet) return;
    setPatientDraft({
      name: pet.name ?? '',
      species: pet.species ?? '',
      breed: pet.breed ?? '',
      sex: pet.sex ?? '',
      color: pet.color ?? '',
      weightKg: pet.weightKg != null ? String(pet.weightKg) : '',
      allergies: pet.allergies ?? '',
      chronicConditions: pet.chronicConditions ?? '',
      notes: pet.notes ?? '',
      ownerPhone: owner?.phone ?? '',
      ownerEmail: owner?.email ?? '',
      ownerCity: owner?.city ?? '',
      ownerAddress: owner?.address ?? '',
    });
    setEditPatientDialogOpen(true);
  }

  async function handleSavePatientData() {
    if (!pet) return;

    setSavingPatient(true);
    try {
      const petPatch: Partial<Pet> = {
        name: patientDraft.name || pet.name,
        species: patientDraft.species || pet.species,
        breed: patientDraft.breed || undefined,
        sex: (patientDraft.sex as Pet['sex']) || undefined,
        color: patientDraft.color || undefined,
        weightKg: patientDraft.weightKg ? Number(patientDraft.weightKg) : undefined,
        allergies: patientDraft.allergies || undefined,
        chronicConditions: patientDraft.chronicConditions || undefined,
        notes: patientDraft.notes || undefined,
      };
      await petsRepo.update(pet.id, petPatch);
      setPet((current) => (current ? { ...current, ...petPatch } : current));

      if (owner) {
        const ownerPatch: Partial<Owner> = {
          phone: patientDraft.ownerPhone || undefined,
          email: patientDraft.ownerEmail || undefined,
          city: patientDraft.ownerCity || undefined,
          address: patientDraft.ownerAddress || undefined,
        };
        await ownersRepo.update(owner.id, ownerPatch);
        setOwner((current) => (current ? { ...current, ...ownerPatch } : current));
      }

      toast({
        title: 'Datos actualizados',
        description: 'La ficha del paciente se actualizó correctamente.',
      });
      setEditPatientDialogOpen(false);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'No se pudieron guardar los datos',
        description: err instanceof Error ? err.message : 'Error al actualizar la ficha del paciente.',
      });
    } finally {
      setSavingPatient(false);
    }
  }

  async function handleSaveTimelineItem() {
    if (!selectedTimelineItem) return;

    setSavingTimeline(true);
    try {
      switch (selectedTimelineItem.type) {
        case 'consulta': {
          if (!selectedConsultation) break;
          const patch: Partial<Consultation> = {
            anamnesis: timelineDraft.anamnesis || undefined,
            physicalExam: timelineDraft.physicalExam || undefined,
            diagnosis: timelineDraft.diagnosis || undefined,
            differentialDiagnosis: timelineDraft.differentialDiagnosis || undefined,
            treatmentPlan: timelineDraft.treatmentPlan || undefined,
            notes: timelineDraft.notes || undefined,
            status: (timelineDraft.status as Consultation['status']) ?? selectedConsultation.status,
          };
          await consultationsRepo.update(selectedConsultation.id, patch);
          setConsultations((current) =>
            current.map((item) => (item.id === selectedConsultation.id ? { ...item, ...patch } : item))
          );
          break;
        }
        case 'vacuna': {
          if (!selectedVaccination) break;
          const patch: Partial<Vaccination> = {
            vaccineName: timelineDraft.vaccineName || selectedVaccination.vaccineName,
            manufacturer: timelineDraft.manufacturer || undefined,
            batch: timelineDraft.batch || undefined,
            nextDueDate: dateInputToEpoch(timelineDraft.nextDueDate),
            notes: timelineDraft.notes || undefined,
          };
          await vaccinationsRepo.update(selectedVaccination.id, patch);
          setVaccinations((current) =>
            current.map((item) => (item.id === selectedVaccination.id ? { ...item, ...patch } : item))
          );
          break;
        }
        case 'desparasitacion': {
          if (!selectedDeworming) break;
          const patch: Partial<Deworming> = {
            product: timelineDraft.product || selectedDeworming.product,
            type: (timelineDraft.type as Deworming['type']) ?? selectedDeworming.type,
            weightKg: timelineDraft.weightKg ? Number(timelineDraft.weightKg) : undefined,
            nextDueDate: dateInputToEpoch(timelineDraft.nextDueDate),
            notes: timelineDraft.notes || undefined,
          };
          await dewormingsRepo.update(selectedDeworming.id, patch);
          setDewormings((current) =>
            current.map((item) => (item.id === selectedDeworming.id ? { ...item, ...patch } : item))
          );
          break;
        }
        case 'formula': {
          if (!selectedPrescription) break;
          const patch: Partial<Prescription> = {
            diagnosis: timelineDraft.diagnosis || undefined,
            notes: timelineDraft.notes || undefined,
          };
          await prescriptionsRepo.update(selectedPrescription.id, patch);
          setPrescriptions((current) =>
            current.map((item) => (item.id === selectedPrescription.id ? { ...item, ...patch } : item))
          );
          break;
        }
        case 'laboratorio': {
          if (!selectedLabExam) break;
          const patch: Partial<LabExam> = {
            type: timelineDraft.type || selectedLabExam.type,
            status: (timelineDraft.status as LabExam['status']) ?? selectedLabExam.status,
            resultDate: dateInputToEpoch(timelineDraft.resultDate),
            interpretation: timelineDraft.interpretation || undefined,
            notes: timelineDraft.notes || undefined,
          };
          await labExamsRepo.update(selectedLabExam.id, patch);
          setLabExams((current) =>
            current.map((item) => (item.id === selectedLabExam.id ? { ...item, ...patch } : item))
          );
          break;
        }
      }

      toast({
        title: 'Ficha actualizada',
        description: 'La informacion clinica se guardo correctamente.',
      });
      setEditingTimeline(false);
      setTimelineDialogOpen(false);
      setActiveTab('documentos');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'No se pudo actualizar la ficha',
        description: err instanceof Error ? err.message : 'Error al guardar la informacion.',
      });
    } finally {
      setSavingTimeline(false);
    }
  }

  function handleExportClinicalHistoryPdf() {
    if (!pet) return;

    const popup = window.open('', '_blank', 'noopener,noreferrer,width=980,height=720');
    if (!popup) {
      toast({
        variant: 'destructive',
        title: 'No se pudo exportar el PDF',
        description: 'Permite ventanas emergentes para generar la historia clinica en PDF.',
      });
      return;
    }

    const sections = [
      {
        title: 'Consultas',
        lines: consultations.map(
          (item) =>
            `<li><strong>${escapeHtml(fmtDateTime(item.date))}</strong> - ${escapeHtml(
              item.reason
            )}<br/>Diagnostico: ${escapeHtml(item.diagnosis ?? 'Sin registro')}<br/>Anamnesis: ${escapeHtml(
              item.anamnesis ?? 'Sin registro'
            )}</li>`
        ),
      },
      {
        title: 'Vacunacion',
        lines: vaccinations.map(
          (item) =>
            `<li><strong>${escapeHtml(fmtDate(item.appliedDate))}</strong> - ${escapeHtml(
              item.vaccineName
            )}<br/>Fabricante: ${escapeHtml(item.manufacturer ?? 'Sin registro')}<br/>Notas: ${escapeHtml(
              item.notes ?? 'Sin registro'
            )}</li>`
        ),
      },
      {
        title: 'Desparasitacion',
        lines: dewormings.map(
          (item) =>
            `<li><strong>${escapeHtml(fmtDate(item.appliedDate))}</strong> - ${escapeHtml(
              item.product
            )}<br/>Tipo: ${escapeHtml(item.type)}<br/>Notas: ${escapeHtml(item.notes ?? 'Sin registro')}</li>`
        ),
      },
      {
        title: 'Formulas',
        lines: prescriptions.map(
          (item) =>
            `<li><strong>${escapeHtml(fmtDateTime(item.date))}</strong> - ${escapeHtml(
              item.diagnosis ?? 'Sin diagnostico'
            )}<br/>Medicamentos: ${escapeHtml(item.items.map((entry) => entry.drug).join(', ') || 'Sin registro')}</li>`
        ),
      },
      {
        title: 'Laboratorio',
        lines: labExams.map(
          (item) =>
            `<li><strong>${escapeHtml(fmtDate(item.requestedDate))}</strong> - ${escapeHtml(
              item.type
            )}<br/>Estado: ${escapeHtml(item.status)}<br/>Interpretacion: ${escapeHtml(
              item.interpretation ?? 'Sin registro'
            )}</li>`
        ),
      },
      {
        title: 'Documentos clinicos',
        lines: documents.map(
          (item) =>
            `<li><strong>${escapeHtml(fmtDate(item.uploadedAt))}</strong> - ${escapeHtml(
              item.fileName
            )}<br/>Estado IA: ${escapeHtml(item.processingStatus)}<br/>Resumen: ${escapeHtml(
              item.extraction?.summary ?? item.processingError ?? 'Sin resumen'
            )}</li>`
        ),
      },
    ];

    popup.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Historia clinica - ${escapeHtml(pet.name)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #111827; }
    h1, h2 { margin-bottom: 8px; }
    p { margin: 4px 0; }
    section { margin-top: 24px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 10px; line-height: 1.5; }
  </style>
</head>
<body>
  <h1>Historia clinica de ${escapeHtml(pet.name)}</h1>
  <p><strong>Especie:</strong> ${escapeHtml(pet.species)}</p>
  <p><strong>Raza:</strong> ${escapeHtml(pet.breed ?? 'Sin registro')}</p>
  <p><strong>Edad:</strong> ${escapeHtml(age)}</p>
  <p><strong>Propietario:</strong> ${escapeHtml(owner ? ownerFullName(owner) : 'Sin propietario asociado')}</p>
  ${sections
    .map(
      (section) => `<section>
        <h2>${escapeHtml(section.title)}</h2>
        ${section.lines.length > 0 ? `<ul>${section.lines.join('')}</ul>` : '<p>Sin registros.</p>'}
      </section>`
    )
    .join('')}
</body>
</html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

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
  const vaccinationHref = `/clinica/prevencion?petId=${pet.id}&tab=vacunacion`;
  const dewormingHref = `/clinica/prevencion?petId=${pet.id}&tab=desparasitacion`;
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
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <Button asChild variant="outline">
            <Link href={consultationHref}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva consulta
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={vaccinationHref}>
              <Plus className="mr-2 h-4 w-4" />
              Prevención
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={dewormingHref}>
              <Plus className="mr-2 h-4 w-4" />
              Desparasitacion
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                            {item.details && item.details.length > 0 && (
                              <div className="space-y-1 pt-2">
                                {item.details.map((detail, index) => (
                                  <p key={`${item.id}-detail-${index}`} className="text-sm text-muted-foreground">
                                    {detail}
                                  </p>
                                ))}
                              </div>
                            )}
                            {item.href && (
                              <Button asChild variant="outline" size="sm" className="mt-2">
                                <a href={item.href} target="_blank" rel="noreferrer">
                                  <Eye className="mr-2 h-4 w-4" />
                                  Ver soporte
                                </a>
                              </Button>
                            )}
                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => openTimelineItem(item)}
                              >
                                Ver ficha
                              </Button>
                            </div>
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
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Datos del paciente</CardTitle>
                  <CardDescription>Informacion general, propietario y exportacion de la ficha.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={openPatientEditDialog}>
                    Editar datos
                  </Button>
                  <Button type="button" size="sm" onClick={handleExportClinicalHistoryPdf}>
                    Exportar PDF
                  </Button>
                </div>
              </div>
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
                  <TableHead>Diagnostico</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consultations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{fmtDate(item.date)}</TableCell>
                    <TableCell>{item.reason}</TableCell>
                    <TableCell>{item.diagnosis ?? '?'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        const current = getTimelineItem('consulta', item.id);
                        if (current) openTimelineItem(current);
                      }}>
                        Ver ficha
                      </Button>
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
            createHref={vaccinationHref}
            empty={vaccinations.length === 0}
            emptyIcon={<Syringe className="h-8 w-8" />}
            emptyText="No hay vacunas registradas."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vacuna</TableHead>
                  <TableHead>Aplicada</TableHead>
                  <TableHead>Proximo refuerzo</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vaccinations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.vaccineName}</TableCell>
                    <TableCell>{fmtDate(item.appliedDate)}</TableCell>
                    <TableCell>{fmtDate(item.nextDueDate)}</TableCell>
                    <TableCell>{item.batch ?? '?'}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        const current = getTimelineItem('vacuna', item.id);
                        if (current) openTimelineItem(current);
                      }}>
                        Ver ficha
                      </Button>
                    </TableCell>
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
            createHref={dewormingHref}
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
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        const current = getTimelineItem('desparasitacion', item.id);
                        if (current) openTimelineItem(current);
                      }}>
                        Ver ficha
                      </Button>
                    </TableCell>
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
                    <TableCell>{item.items.map((entry) => entry.drug).join(', ') || '?'}</TableCell>
                    <TableCell>{item.diagnosis ?? '?'}</TableCell>
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        const current = getTimelineItem('formula', item.id);
                        if (current) openTimelineItem(current);
                      }}>
                        Ver ficha
                      </Button>
                    </TableCell>
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
                  <TableHead className="text-right">Acciones</TableHead>
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
                    <TableCell className="text-right">
                      <Button type="button" variant="outline" size="sm" onClick={() => {
                        const current = getTimelineItem('laboratorio', item.id);
                        if (current) openTimelineItem(current);
                      }}>
                        Ver ficha
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Documentos clinicos</CardTitle>
                  <CardDescription>
                    Exporta en PDF la historia clinica consolidada del paciente y revisa sus soportes.
                  </CardDescription>
                </div>
                <Button type="button" size="sm" onClick={handleExportClinicalHistoryPdf}>
                  Exportar PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
                  <FileText className="h-8 w-8" />
                  <p>No hay documentos registrados.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((item) => (
                    <div key={item.id} className="rounded-xl border p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            <span>{fmtDate(item.uploadedAt)}</span>
                          </div>
                          <h3 className="font-medium">{item.fileName}</h3>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{item.fileType}</Badge>
                            <Badge variant="secondary">{item.processingStatus}</Badge>
                          </div>
                          {item.extraction?.summary && (
                            <p className="text-sm text-foreground/80">{item.extraction.summary}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button type="button" variant="outline" size="sm" onClick={() => {
                            const current = getTimelineItem('documento', item.id);
                            if (current) openTimelineItem(current);
                          }}>
                            Ver ficha
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <a href={item.storageUrl} target="_blank" rel="noreferrer">
                              <Eye className="mr-2 h-4 w-4" />
                              Ver PDF
                            </a>
                          </Button>
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedTimelineItem?.title ?? 'Ficha clínica'}</DialogTitle>
            <DialogDescription>
              {selectedTimelineItem
                ? `${timelineTone(selectedTimelineItem.type).label} registrada el ${fmtDateTime(selectedTimelineItem.when)}.`
                : 'Detalle clínico del evento.'}
            </DialogDescription>
          </DialogHeader>

          {selectedTimelineItem && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {selectedTimelineItem.badge && <Badge variant="secondary">{selectedTimelineItem.badge}</Badge>}
                {selectedTimelineItem.href && (
                  <Button asChild variant="outline" size="sm">
                    <a href={selectedTimelineItem.href} target="_blank" rel="noreferrer">
                      <Eye className="mr-2 h-4 w-4" />
                      Ver soporte
                    </a>
                  </Button>
                )}
                {selectedTimelineItem.type !== 'documento' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingTimeline((current) => !current)}
                  >
                    {editingTimeline ? 'Cancelar edición' : 'Editar ficha'}
                  </Button>
                )}
              </div>

              {selectedTimelineItem.type === 'consulta' && selectedConsultation && (
                <div className="grid gap-4">
                  <DetailBlock
                    label="Anamnesis"
                    editing={editingTimeline}
                    value={selectedConsultation.anamnesis}
                    draftValue={timelineDraft.anamnesis ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, anamnesis: value }))}
                    multiline
                  />
                  <DetailBlock
                    label="Examen físico"
                    editing={editingTimeline}
                    value={selectedConsultation.physicalExam}
                    draftValue={timelineDraft.physicalExam ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, physicalExam: value }))}
                    multiline
                  />
                  <DetailBlock
                    label="Diagnóstico"
                    editing={editingTimeline}
                    value={selectedConsultation.diagnosis}
                    draftValue={timelineDraft.diagnosis ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, diagnosis: value }))}
                  />
                  <DetailBlock
                    label="Diagnóstico diferencial"
                    editing={editingTimeline}
                    value={selectedConsultation.differentialDiagnosis}
                    draftValue={timelineDraft.differentialDiagnosis ?? ''}
                    onChange={(value) =>
                      setTimelineDraft((current) => ({ ...current, differentialDiagnosis: value }))
                    }
                    multiline
                  />
                  <DetailBlock
                    label="Plan de tratamiento"
                    editing={editingTimeline}
                    value={selectedConsultation.treatmentPlan}
                    draftValue={timelineDraft.treatmentPlan ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, treatmentPlan: value }))}
                    multiline
                  />
                  <DetailBlock
                    label="Notas"
                    editing={editingTimeline}
                    value={selectedConsultation.notes}
                    draftValue={timelineDraft.notes ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, notes: value }))}
                    multiline
                  />
                </div>
              )}

              {selectedTimelineItem.type === 'vacuna' && selectedVaccination && (
                <div className="grid gap-4">
                  <DetailBlock
                    label="Vacuna"
                    editing={editingTimeline}
                    value={selectedVaccination.vaccineName}
                    draftValue={timelineDraft.vaccineName ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, vaccineName: value }))}
                  />
                  <DetailBlock
                    label="Fabricante"
                    editing={editingTimeline}
                    value={selectedVaccination.manufacturer}
                    draftValue={timelineDraft.manufacturer ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, manufacturer: value }))}
                  />
                  <DetailBlock
                    label="Lote"
                    editing={editingTimeline}
                    value={selectedVaccination.batch}
                    draftValue={timelineDraft.batch ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, batch: value }))}
                  />
                  <DetailBlock
                    label="Próximo refuerzo"
                    editing={editingTimeline}
                    value={fmtDate(selectedVaccination.nextDueDate)}
                    draftValue={timelineDraft.nextDueDate ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, nextDueDate: value }))}
                    inputType="date"
                  />
                  <DetailBlock
                    label="Notas"
                    editing={editingTimeline}
                    value={selectedVaccination.notes}
                    draftValue={timelineDraft.notes ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, notes: value }))}
                    multiline
                  />
                </div>
              )}

              {selectedTimelineItem.type === 'desparasitacion' && selectedDeworming && (
                <div className="grid gap-4">
                  <DetailBlock
                    label="Producto"
                    editing={editingTimeline}
                    value={selectedDeworming.product}
                    draftValue={timelineDraft.product ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, product: value }))}
                  />
                  <DetailBlock
                    label="Tipo"
                    editing={editingTimeline}
                    value={selectedDeworming.type}
                    draftValue={timelineDraft.type ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, type: value }))}
                  />
                  <DetailBlock
                    label="Peso"
                    editing={editingTimeline}
                    value={selectedDeworming.weightKg != null ? `${selectedDeworming.weightKg} kg` : undefined}
                    draftValue={timelineDraft.weightKg ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, weightKg: value }))}
                    inputType="number"
                  />
                  <DetailBlock
                    label="Próxima aplicación"
                    editing={editingTimeline}
                    value={fmtDate(selectedDeworming.nextDueDate)}
                    draftValue={timelineDraft.nextDueDate ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, nextDueDate: value }))}
                    inputType="date"
                  />
                  <DetailBlock
                    label="Notas"
                    editing={editingTimeline}
                    value={selectedDeworming.notes}
                    draftValue={timelineDraft.notes ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, notes: value }))}
                    multiline
                  />
                </div>
              )}

              {selectedTimelineItem.type === 'formula' && selectedPrescription && (
                <div className="grid gap-4">
                  <DetailBlock
                    label="Diagnóstico"
                    editing={editingTimeline}
                    value={selectedPrescription.diagnosis}
                    draftValue={timelineDraft.diagnosis ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, diagnosis: value }))}
                  />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Medicamentos</p>
                    <div className="rounded-md border p-3 text-sm">
                      {selectedPrescription.items.map((entry, index) => (
                        <p key={`${selectedPrescription.id}-${index}`}>
                          {[entry.drug, entry.dose, entry.frequency, entry.route].filter(Boolean).join(' | ')}
                        </p>
                      ))}
                    </div>
                  </div>
                  <DetailBlock
                    label="Notas"
                    editing={editingTimeline}
                    value={selectedPrescription.notes}
                    draftValue={timelineDraft.notes ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, notes: value }))}
                    multiline
                  />
                </div>
              )}

              {selectedTimelineItem.type === 'laboratorio' && selectedLabExam && (
                <div className="grid gap-4">
                  <DetailBlock
                    label="Tipo de examen"
                    editing={editingTimeline}
                    value={selectedLabExam.type}
                    draftValue={timelineDraft.type ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, type: value }))}
                  />
                  <DetailBlock
                    label="Estado"
                    editing={editingTimeline}
                    value={selectedLabExam.status}
                    draftValue={timelineDraft.status ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, status: value }))}
                  />
                  <DetailBlock
                    label="Fecha de resultado"
                    editing={editingTimeline}
                    value={fmtDate(selectedLabExam.resultDate)}
                    draftValue={timelineDraft.resultDate ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, resultDate: value }))}
                    inputType="date"
                  />
                  <DetailBlock
                    label="Interpretación"
                    editing={editingTimeline}
                    value={selectedLabExam.interpretation}
                    draftValue={timelineDraft.interpretation ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, interpretation: value }))}
                    multiline
                  />
                  <DetailBlock
                    label="Notas"
                    editing={editingTimeline}
                    value={selectedLabExam.notes}
                    draftValue={timelineDraft.notes ?? ''}
                    onChange={(value) => setTimelineDraft((current) => ({ ...current, notes: value }))}
                    multiline
                  />
                </div>
              )}

              {selectedTimelineItem.type === 'documento' && selectedDocument && (
                <div className="grid gap-4">
                  <StaticField label="Archivo" value={selectedDocument.fileName} />
                  <StaticField label="Estado IA" value={selectedDocument.processingStatus} />
                  <StaticField label="Resumen" value={selectedDocument.extraction?.summary ?? selectedDocument.processingError} />
                </div>
              )}

              {editingTimeline && selectedTimelineItem.type !== 'documento' && (
                <div className="flex justify-end">
                  <Button type="button" onClick={() => void handleSaveTimelineItem()} disabled={savingTimeline}>
                    {savingTimeline ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
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

function StaticField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="whitespace-pre-wrap rounded-md border p-3 text-sm">{value ? value : '?'}</div>
    </div>
  );
}

function DetailBlock({
  label,
  value,
  editing,
  draftValue,
  onChange,
  multiline = false,
  inputType = 'text',
}: {
  label: string;
  value?: string | null;
  editing: boolean;
  draftValue: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  inputType?: string;
}) {
  if (!editing) {
    return <StaticField label={label} value={value} />;
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {multiline ? (
        <Textarea value={draftValue} onChange={(event) => onChange(event.target.value)} rows={4} />
      ) : (
        <Input type={inputType} value={draftValue} onChange={(event) => onChange(event.target.value)} />
      )}
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
