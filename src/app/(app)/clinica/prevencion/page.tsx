'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import {
  petsRepo,
  vaccinationsRepo,
  dewormingsRepo,
} from '@/lib/repositories.clinical';
import type { Pet, Vaccination, Deworming, DewormingType } from '@/lib/types';
import {
  Loader2,
  Syringe,
  Bug,
  AlertCircle,
  PawPrint,
} from 'lucide-react';

// ── Helpers ────────────────────────────────────────────────

/** Convierte un valor de <input type="date"> (YYYY-MM-DD) a epoch ms. */
function dateInputToEpoch(value: string): number | undefined {
  if (!value) return undefined;
  const ms = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(ms) ? undefined : ms;
}

function fmtEpoch(ms?: number): string {
  if (!ms) return '—';
  return format(new Date(ms), 'd MMM yyyy', { locale: es });
}

const DEWORMING_TYPE_LABEL: Record<DewormingType, string> = {
  interna: 'Interna',
  externa: 'Externa',
  mixta: 'Mixta',
};

// ── Schemas ────────────────────────────────────────────────

const vaccinationSchema = z.object({
  vaccineName: z.string().min(2, 'El nombre de la vacuna es requerido.'),
  manufacturer: z.string().optional(),
  batch: z.string().optional(),
  appliedDate: z.string().min(1, 'La fecha de aplicación es requerida.'),
  nextDueDate: z.string().optional(),
  notes: z.string().optional(),
});
type VaccinationFormValues = z.infer<typeof vaccinationSchema>;

const dewormingSchema = z.object({
  product: z.string().min(2, 'El producto es requerido.'),
  type: z.enum(['interna', 'externa', 'mixta']),
  appliedDate: z.string().min(1, 'La fecha de aplicación es requerida.'),
  weightKg: z.string().optional(),
  nextDueDate: z.string().optional(),
  notes: z.string().optional(),
});
type DewormingFormValues = z.infer<typeof dewormingSchema>;

// ── Página ─────────────────────────────────────────────────

export default function PrevencionPage() {
  const { user, profile } = useAuth();
  const clinicId = profile?.clinicId ?? 'default';

  const [pets, setPets] = useState<Pet[]>([]);
  const [petsLoading, setPetsLoading] = useState(true);
  const [petsError, setPetsError] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string>('');

  // Cargar mascotas de la clínica
  useEffect(() => {
    let active = true;
    async function load() {
      setPetsLoading(true);
      setPetsError(null);
      try {
        const list = await petsRepo.listByClinic(clinicId);
        if (active) setPets(list);
      } catch (err) {
        if (active)
          setPetsError(
            err instanceof Error
              ? err.message
              : 'No se pudieron cargar las mascotas.'
          );
      } finally {
        if (active) setPetsLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [clinicId]);

  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? null;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Prevención</h1>
        <p className="text-muted-foreground">
          Registro de vacunación y desparasitación por paciente.
        </p>
      </div>

      {/* Selector de mascota */}
      <Card>
        <CardHeader>
          <CardTitle>Paciente</CardTitle>
          <CardDescription>
            Seleccione la mascota para ver y registrar su historial preventivo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {petsError ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{petsError}</span>
            </div>
          ) : petsLoading ? (
            <div className="flex items-center py-4 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando mascotas...
            </div>
          ) : pets.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <PawPrint className="h-8 w-8" />
              <p>No hay mascotas registradas en esta clínica.</p>
            </div>
          ) : (
            <Select value={selectedPetId} onValueChange={setSelectedPetId}>
              <SelectTrigger className="max-w-md">
                <SelectValue placeholder="Seleccione una mascota" />
              </SelectTrigger>
              <SelectContent>
                {pets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.species}
                    {p.breed ? ` (${p.breed})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {!selectedPet ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
            <Syringe className="h-10 w-10" />
            <p>Seleccione un paciente para gestionar su prevención.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="vacunacion" className="space-y-4">
          <TabsList>
            <TabsTrigger value="vacunacion">
              <Syringe className="mr-2 h-4 w-4" />
              Vacunación
            </TabsTrigger>
            <TabsTrigger value="desparasitacion">
              <Bug className="mr-2 h-4 w-4" />
              Desparasitación
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vacunacion" className="space-y-6">
            <VaccinationSection
              pet={selectedPet}
              clinicId={clinicId}
              vetUid={user?.uid ?? ''}
            />
          </TabsContent>

          <TabsContent value="desparasitacion" className="space-y-6">
            <DewormingSection
              pet={selectedPet}
              clinicId={clinicId}
              vetUid={user?.uid ?? ''}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ── Sección: Vacunación ────────────────────────────────────

function VaccinationSection({
  pet,
  clinicId,
  vetUid,
}: {
  pet: Pet;
  clinicId: string;
  vetUid: string;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [records, setRecords] = useState<Vaccination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<VaccinationFormValues>({
    resolver: zodResolver(vaccinationSchema),
    defaultValues: {
      vaccineName: '',
      manufacturer: '',
      batch: '',
      appliedDate: '',
      nextDueDate: '',
      notes: '',
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await vaccinationsRepo.listByPet(pet.id);
      setRecords(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las vacunas.'
      );
    } finally {
      setLoading(false);
    }
  }, [pet.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(data: VaccinationFormValues) {
    if (!vetUid) {
      toast({ variant: 'destructive', title: 'Sesión no válida.' });
      return;
    }
    const appliedDate = dateInputToEpoch(data.appliedDate);
    if (!appliedDate) {
      form.setError('appliedDate', { message: 'Fecha inválida.' });
      return;
    }

    setSubmitting(true);
    try {
      await vaccinationsRepo.create({
        clinicId,
        petId: pet.id,
        vetUid,
        vaccineName: data.vaccineName,
        manufacturer: data.manufacturer || undefined,
        batch: data.batch || undefined,
        appliedDate,
        nextDueDate: dateInputToEpoch(data.nextDueDate ?? ''),
        notes: data.notes || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: vetUid,
      });
      toast({
        title: 'Vacuna registrada',
        description: `"${data.vaccineName}" para ${pet.name}.`,
      });
      form.reset();
      await load();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al registrar la vacuna',
        description:
          err instanceof Error
            ? err.message
            : 'Verifica las reglas de Firestore.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Nueva vacuna</CardTitle>
          <CardDescription>
            Registre una aplicación de vacuna para {pet.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vaccineName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre de la vacuna</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Quíntuple canina" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="manufacturer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fabricante (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Zoetis" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="batch"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lote (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: L-2024-08" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="appliedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de aplicación</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nextDueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Próximo refuerzo (opcional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observaciones, reacciones, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Registrar vacuna
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de vacunación</CardTitle>
          <CardDescription>
            {loading ? 'Cargando...' : `${records.length} registro(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando vacunas...
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <Syringe className="h-8 w-8" />
              <p>Aún no hay vacunas registradas para {pet.name}.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vacuna</TableHead>
                  <TableHead>Fabricante</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Aplicada</TableHead>
                  <TableHead>Próximo refuerzo</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">
                      {v.vaccineName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {v.manufacturer?.trim() ? v.manufacturer : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {v.batch?.trim() ? v.batch : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtEpoch(v.appliedDate)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtEpoch(v.nextDueDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {v.notes?.trim() ? v.notes : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ── Sección: Desparasitación ───────────────────────────────

function DewormingSection({
  pet,
  clinicId,
  vetUid,
}: {
  pet: Pet;
  clinicId: string;
  vetUid: string;
}) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [records, setRecords] = useState<Deworming[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<DewormingFormValues>({
    resolver: zodResolver(dewormingSchema),
    defaultValues: {
      product: '',
      type: 'interna',
      appliedDate: '',
      weightKg: '',
      nextDueDate: '',
      notes: '',
    },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await dewormingsRepo.listByPet(pet.id);
      setRecords(list);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las desparasitaciones.'
      );
    } finally {
      setLoading(false);
    }
  }, [pet.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(data: DewormingFormValues) {
    if (!vetUid) {
      toast({ variant: 'destructive', title: 'Sesión no válida.' });
      return;
    }
    const appliedDate = dateInputToEpoch(data.appliedDate);
    if (!appliedDate) {
      form.setError('appliedDate', { message: 'Fecha inválida.' });
      return;
    }
    const weightKg = data.weightKg
      ? parseFloat(data.weightKg.replace(/[^\d.]/g, ''))
      : undefined;

    setSubmitting(true);
    try {
      await dewormingsRepo.create({
        clinicId,
        petId: pet.id,
        vetUid,
        product: data.product,
        type: data.type,
        appliedDate,
        weightKg:
          weightKg !== undefined && !Number.isNaN(weightKg)
            ? weightKg
            : undefined,
        nextDueDate: dateInputToEpoch(data.nextDueDate ?? ''),
        notes: data.notes || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: vetUid,
      });
      toast({
        title: 'Desparasitación registrada',
        description: `"${data.product}" para ${pet.name}.`,
      });
      form.reset();
      await load();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al registrar la desparasitación',
        description:
          err instanceof Error
            ? err.message
            : 'Verifica las reglas de Firestore.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Nueva desparasitación</CardTitle>
          <CardDescription>
            Registre una aplicación de antiparasitario para {pet.name}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="product"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Producto</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Drontal Plus" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione el tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="interna">Interna</SelectItem>
                          <SelectItem value="externa">Externa</SelectItem>
                          <SelectItem value="mixta">Mixta</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="appliedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de aplicación</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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
                      <FormLabel>Peso (kg, opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="Ej: 12.5"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nextDueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Próxima dosis (opcional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observaciones, dosis, etc."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Registrar desparasitación
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de desparasitación</CardTitle>
          <CardDescription>
            {loading ? 'Cargando...' : `${records.length} registro(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando desparasitaciones...
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
              <Bug className="h-8 w-8" />
              <p>Aún no hay desparasitaciones registradas para {pet.name}.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Aplicada</TableHead>
                  <TableHead>Peso (kg)</TableHead>
                  <TableHead>Próxima dosis</TableHead>
                  <TableHead>Notas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.product}</TableCell>
                    <TableCell>{DEWORMING_TYPE_LABEL[d.type]}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtEpoch(d.appliedDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.weightKg != null ? d.weightKg : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {fmtEpoch(d.nextDueDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {d.notes?.trim() ? d.notes : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
