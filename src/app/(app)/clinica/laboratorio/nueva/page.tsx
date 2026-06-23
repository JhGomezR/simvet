'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { labExamsRepo, petsRepo } from '@/lib/repositories.clinical';
import type { Pet, LabExamStatus, TestResult, DiagnosticTest } from '@/lib/types';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Plus,
  Trash2,
} from 'lucide-react';

type LabCategory = NonNullable<DiagnosticTest['category']>;

const CATEGORY_OPTIONS: { value: LabCategory; label: string }[] = [
  { value: 'hematologia', label: 'Hematología' },
  { value: 'bioquimica', label: 'Bioquímica' },
  { value: 'imagen', label: 'Imagen' },
  { value: 'orina', label: 'Orina' },
  { value: 'gasometria', label: 'Gasometría' },
  { value: 'microbiologia', label: 'Microbiología' },
  { value: 'citologia', label: 'Citología' },
  { value: 'otro', label: 'Otro' },
];

const resultSchema = z.object({
  parameter: z.string().min(1, 'Parámetro requerido.'),
  value: z.string().min(1, 'Valor requerido.'),
  unit: z.string().optional(),
  referenceRange: z.string().optional(),
  flag: z.enum(['normal', 'bajo', 'alto', 'crítico']),
});

const labFormSchema = z.object({
  petId: z.string().min(1, 'Debe seleccionar una mascota.'),
  type: z.string().min(2, 'El tipo de examen es requerido.'),
  category: z.enum([
    'hematologia',
    'bioquimica',
    'imagen',
    'orina',
    'gasometria',
    'microbiologia',
    'citologia',
    'otro',
  ]),
  requestedDate: z.string().min(1, 'La fecha de solicitud es requerida.'),
  status: z.enum(['solicitado', 'en_proceso', 'completado', 'cancelado']),
  interpretation: z.string().optional(),
  notes: z.string().optional(),
  results: z.array(resultSchema),
});

type LabFormValues = z.infer<typeof labFormSchema>;

// yyyy-MM-ddTHH:mm para <input type="datetime-local">
function nowLocalInput(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function NuevoExamenPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, profile } = useAuth();
  const clinicId = profile?.clinicId ?? 'default';

  const [pets, setPets] = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LabFormValues>({
    resolver: zodResolver(labFormSchema),
    defaultValues: {
      petId: '',
      type: '',
      category: 'hematologia',
      requestedDate: nowLocalInput(),
      status: 'solicitado',
      interpretation: '',
      notes: '',
      results: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'results',
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

  async function onSubmit(data: LabFormValues) {
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

    const requestedMs = new Date(data.requestedDate).getTime();
    if (Number.isNaN(requestedMs)) {
      toast({
        variant: 'destructive',
        title: 'Fecha inválida',
        description: 'Revise la fecha de solicitud.',
      });
      return;
    }

    const results: TestResult[] = data.results.map((r) => ({
      parameter: r.parameter,
      value: r.value,
      unit: r.unit || undefined,
      referenceRange: r.referenceRange || undefined,
      flag: r.flag,
    }));

    setSubmitting(true);
    try {
      const now = Date.now();
      await labExamsRepo.create({
        clinicId,
        petId: pet.id,
        vetUid: user.uid,
        type: data.type,
        category: data.category,
        requestedDate: requestedMs,
        status: data.status as LabExamStatus,
        results: results.length ? results : undefined,
        interpretation: data.interpretation || undefined,
        notes: data.notes || undefined,
        resultDate: data.status === 'completado' ? now : undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: user.uid,
      });
      toast({
        title: 'Examen registrado',
        description: `Examen de "${pet.name}" guardado correctamente.`,
      });
      router.push('/clinica/laboratorio');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar el examen',
        description:
          err instanceof Error
            ? err.message
            : 'Verifica las reglas de Firestore',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/clinica/laboratorio">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo examen de laboratorio</CardTitle>
          <CardDescription>
            Registre la solicitud del examen y, si ya están disponibles, sus
            resultados.
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de examen</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej: Hemograma completo"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccione una categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                {c.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="requestedDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de solicitud</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
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
                            <SelectItem value="solicitado">
                              Solicitado
                            </SelectItem>
                            <SelectItem value="en_proceso">
                              En proceso
                            </SelectItem>
                            <SelectItem value="completado">
                              Completado
                            </SelectItem>
                            <SelectItem value="cancelado">
                              Cancelado
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Resultados dinámicos */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Resultados</h3>
                      <p className="text-sm text-muted-foreground">
                        Agregue cada parámetro medido con su valor y rango de
                        referencia.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({
                          parameter: '',
                          value: '',
                          unit: '',
                          referenceRange: '',
                          flag: 'normal',
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar parámetro
                    </Button>
                  </div>

                  {fields.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No hay resultados agregados.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {fields.map((row, index) => (
                        <div
                          key={row.id}
                          className="rounded-md border p-4 space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Parámetro #{index + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Quitar
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`results.${index}.parameter`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Parámetro</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Ej: Hematocrito"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`results.${index}.value`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Valor</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Ej: 42" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`results.${index}.unit`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unidad</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Ej: %" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`results.${index}.referenceRange`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Rango de referencia</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Ej: 37-55%"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`results.${index}.flag`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Indicador</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleccione" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="normal">
                                        Normal
                                      </SelectItem>
                                      <SelectItem value="bajo">Bajo</SelectItem>
                                      <SelectItem value="alto">Alto</SelectItem>
                                      <SelectItem value="crítico">
                                        Crítico
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="interpretation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interpretación</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          placeholder="Interpretación clínica de los resultados..."
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Análisis del médico veterinario sobre los hallazgos.
                      </FormDescription>
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

                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={submitting}>
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Guardar examen
                  </Button>
                  <Button asChild type="button" variant="outline">
                    <Link href="/clinica/laboratorio">Cancelar</Link>
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
