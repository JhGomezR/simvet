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
import { prescriptionsRepo, petsRepo } from '@/lib/repositories.clinical';
import type { Pet, PrescriptionItem } from '@/lib/types';
import { Loader2, Plus, Trash2, AlertCircle, ArrowLeft } from 'lucide-react';

const ROUTES = [
  'IV',
  'IM',
  'SC',
  'PO',
  'IO',
  'IN',
  'tópica',
  'rectal',
  'oftálmica',
  'ótica',
] as const;

const prescriptionItemSchema = z.object({
  drug: z.string().min(1, 'El medicamento es requerido.'),
  presentation: z.string().optional(),
  dose: z.string().optional(),
  route: z.enum(ROUTES).optional(),
  frequency: z.string().optional(),
  durationDays: z.coerce.number().int().min(0).optional(),
  instructions: z.string().optional(),
});

const prescriptionFormSchema = z.object({
  petId: z.string().min(1, 'Debe seleccionar una mascota.'),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  items: z
    .array(prescriptionItemSchema)
    .min(1, 'Agregue al menos un medicamento.'),
});

type PrescriptionFormValues = z.infer<typeof prescriptionFormSchema>;

const EMPTY_ITEM: PrescriptionFormValues['items'][number] = {
  drug: '',
  presentation: '',
  dose: '',
  route: undefined,
  frequency: '',
  durationDays: undefined,
  instructions: '',
};

export default function NuevaFormulaPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, profile } = useAuth();
  const clinicId = profile?.clinicId ?? 'default';

  const [pets, setPets] = useState<Pet[]>([]);
  const [loadingPets, setLoadingPets] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionFormSchema),
    defaultValues: {
      petId: '',
      diagnosis: '',
      notes: '',
      items: [{ ...EMPTY_ITEM }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
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

  async function onSubmit(data: PrescriptionFormValues) {
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

    setSubmitting(true);
    try {
      const now = Date.now();
      const items: PrescriptionItem[] = data.items.map((it) => ({
        drug: it.drug,
        presentation: it.presentation || undefined,
        dose: it.dose || undefined,
        route: it.route,
        frequency: it.frequency || undefined,
        durationDays: it.durationDays,
        instructions: it.instructions || undefined,
      }));

      const prescriptionId = await prescriptionsRepo.create({
        clinicId,
        petId: pet.id,
        vetUid: user.uid,
        date: now,
        items,
        diagnosis: data.diagnosis || undefined,
        notes: data.notes || undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: user.uid,
      });

      toast({
        title: 'Fórmula registrada',
        description: `Receta de "${pet.name}" guardada correctamente.`,
      });
      router.push(`/clinica/formulas/${prescriptionId}`);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al guardar la fórmula',
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
          <Link href="/clinica/formulas">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva fórmula</CardTitle>
          <CardDescription>
            Registre una receta médica con uno o más medicamentos para el
            paciente.
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
                className="space-y-8"
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

                <FormField
                  control={form.control}
                  name="diagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diagnóstico</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Diagnóstico asociado a la fórmula..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Medicamentos</h3>
                      <p className="text-sm text-muted-foreground">
                        Agregue cada medicamento con su posología.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ ...EMPTY_ITEM })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar medicamento
                    </Button>
                  </div>

                  {form.formState.errors.items?.message && (
                    <p className="text-sm font-medium text-destructive">
                      {form.formState.errors.items.message}
                    </p>
                  )}

                  {fields.map((item, index) => (
                    <Card key={item.id} className="border-muted">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                        <CardTitle className="text-base">
                          Medicamento {index + 1}
                        </CardTitle>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={fields.length === 1}
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.drug`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Medicamento</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ej: Amoxicilina"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.presentation`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Presentación</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ej: Tableta 250 mg"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.dose`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dosis</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ej: 10 mg/kg"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.route`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Vía</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Vía" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {ROUTES.map((r) => (
                                      <SelectItem key={r} value={r}>
                                        {r}
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
                            name={`items.${index}.frequency`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Frecuencia</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Ej: cada 12h"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.durationDays`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Duración (días)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="Ej: 7"
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
                          name={`items.${index}.instructions`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Indicaciones</FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={2}
                                  placeholder="Ej: Administrar con alimento."
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={2}
                          placeholder="Recomendaciones generales, controles, etc."
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
                    Guardar fórmula
                  </Button>
                  <Button asChild type="button" variant="outline">
                    <Link href="/clinica/formulas">Cancelar</Link>
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
