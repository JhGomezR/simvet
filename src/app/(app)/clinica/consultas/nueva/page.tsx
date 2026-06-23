'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { useSpeechToText } from '@/hooks/use-speech';
import { consultationsRepo, petsRepo } from '@/lib/repositories.clinical';
import type { Pet, ConsultationStatus } from '@/lib/types';
import { Loader2, Mic, MicOff, AlertCircle, ArrowLeft } from 'lucide-react';

type DictableField = 'anamnesis' | 'diagnosis';

const consultationFormSchema = z.object({
  petId: z.string().min(1, 'Debe seleccionar una mascota.'),
  reason: z.string().min(3, 'El motivo de consulta es requerido.'),
  anamnesis: z.string().optional(),
  physicalExam: z.string().optional(),
  weightKg: z.coerce.number().min(0).optional(),
  diagnosis: z.string().optional(),
  differentialDiagnosis: z.string().optional(),
  treatmentPlan: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['abierta', 'cerrada', 'cancelada']),
});

type ConsultationFormValues = z.infer<typeof consultationFormSchema>;

export default function NuevaConsultaPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, profile } = useAuth();
  const clinicId = profile?.clinicId ?? 'default';

  const [pets, setPets] = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Dictado por voz: campo enfocado que recibe la transcripción.
  const [activeField, setActiveField] = useState<DictableField | null>(null);
  const { listening, transcript, supported, start, stop, reset, setTranscript } =
    useSpeechToText('es-CO');

  const form = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: {
      petId: '',
      reason: '',
      anamnesis: '',
      physicalExam: '',
      weightKg: undefined,
      diagnosis: '',
      differentialDiagnosis: '',
      treatmentPlan: '',
      notes: '',
      status: 'abierta',
    },
  });

  useEffect(() => {
    let active = true;
    async function load() {
      setLoadingPets(true);
      setLoadError(null);
      try {
        const list = await petsRepo.listByClinic(clinicId);
        if (active) setPets(list);
      } catch (err) {
        if (active)
          setLoadError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar las mascotas.'
          );
      } finally {
        if (active) setLoadingPets(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [clinicId]);

  // Mientras se dicta, vuelca la transcripción en el campo activo.
  useEffect(() => {
    if (activeField && transcript) {
      form.setValue(activeField, transcript, { shouldValidate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, activeField]);

  function toggleDictation(field: DictableField) {
    if (!supported) {
      toast({
        variant: 'destructive',
        title: 'Dictado no disponible',
        description: 'Su navegador no soporta reconocimiento de voz.',
      });
      return;
    }
    if (listening && activeField === field) {
      stop();
      setActiveField(null);
      return;
    }
    // Cambiar de campo o iniciar: detener cualquier sesión previa.
    if (listening) stop();
    setActiveField(field);
    reset();
    setTranscript(form.getValues(field) ?? '');
    start();
  }

  async function onSubmit(data: ConsultationFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Sesión no válida.' });
      return;
    }
    const pet = pets.find((p) => p.id === data.petId);
    if (!pet) {
      toast({
        variant: 'destructive',
        title: 'Mascota no encontrada',
        description: 'Seleccione una mascota válida.',
      });
      return;
    }

    if (listening) stop();
    setSubmitting(true);
    try {
      const now = Date.now();
      const consultationId = await consultationsRepo.create({
        clinicId,
        petId: pet.id,
        ownerId: pet.ownerId,
        vetUid: user.uid,
        date: now,
        reason: data.reason,
        anamnesis: data.anamnesis || undefined,
        physicalExam: data.physicalExam || undefined,
        weightKg: data.weightKg,
        diagnosis: data.diagnosis || undefined,
        differentialDiagnosis: data.differentialDiagnosis || undefined,
        treatmentPlan: data.treatmentPlan || undefined,
        notes: data.notes || undefined,
        status: data.status as ConsultationStatus,
        createdAt: now,
        updatedAt: now,
        createdBy: user.uid,
      });
      toast({
        title: 'Consulta registrada',
        description: `Consulta de "${pet.name}" guardada correctamente.`,
      });
      router.push(`/clinica/consultas/${consultationId}`);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar la consulta',
        description:
          err instanceof Error
            ? err.message
            : 'Verifica las reglas de Firestore',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const DictationButton = ({ field }: { field: DictableField }) => {
    const isActive = listening && activeField === field;
    return (
      <Button
        type="button"
        variant={isActive ? 'destructive' : 'outline'}
        size="sm"
        onClick={() => toggleDictation(field)}
      >
        {isActive ? (
          <MicOff className="mr-2 h-4 w-4" />
        ) : (
          <Mic className="mr-2 h-4 w-4" />
        )}
        {isActive ? 'Detener dictado' : 'Dictar'}
      </Button>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/clinica/consultas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva consulta</CardTitle>
          <CardDescription>
            Registre la consulta médica del paciente. Puede usar el dictado por
            voz en anamnesis y diagnóstico.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{loadError}</span>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="petId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mascota</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={loadingPets}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                loadingPets
                                  ? 'Cargando mascotas...'
                                  : 'Seleccione una mascota'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pets.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No hay mascotas registradas.
                            </div>
                          ) : (
                            pets.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} · {p.species}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Motivo de consulta</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Vómitos y decaimiento"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weightKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peso (kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Ej: 12.5"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="anamnesis"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Anamnesis</FormLabel>
                        <DictationButton field="anamnesis" />
                      </div>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder="Historia clínica, evolución, antecedentes..."
                          {...field}
                        />
                      </FormControl>
                      {supported && (
                        <FormDescription>
                          {listening && activeField === 'anamnesis'
                            ? 'Escuchando... hable con claridad.'
                            : 'Pulse "Dictar" para rellenar este campo por voz.'}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="physicalExam"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Examen físico</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={4}
                          placeholder="Hallazgos del examen físico por sistemas..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="diagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Diagnóstico</FormLabel>
                        <DictationButton field="diagnosis" />
                      </div>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Diagnóstico presuntivo o definitivo..."
                          {...field}
                        />
                      </FormControl>
                      {supported && (
                        <FormDescription>
                          {listening && activeField === 'diagnosis'
                            ? 'Escuchando... hable con claridad.'
                            : 'Pulse "Dictar" para rellenar este campo por voz.'}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="differentialDiagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diagnóstico diferencial</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Diagnósticos diferenciales a considerar..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="treatmentPlan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan de tratamiento</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Medicación, procedimientos, recomendaciones..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Observaciones adicionales..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="abierta">Abierta</SelectItem>
                          <SelectItem value="cerrada">Cerrada</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={submitting}>
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Guardar consulta
                  </Button>
                  <Button asChild type="button" variant="outline">
                    <Link href="/clinica/consultas">Cancelar</Link>
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
