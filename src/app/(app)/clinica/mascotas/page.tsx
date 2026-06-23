'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { petsRepo, ownersRepo } from '@/lib/repositories.clinical';
import { ownerFullName } from '@/lib/types';
import type { Pet, Owner, Species, PetSex } from '@/lib/types';
import { Loader2, Plus, PawPrint, AlertCircle } from 'lucide-react';

const SPECIES_OPTIONS: Species[] = [
  'Canino',
  'Felino',
  'Equino',
  'Bovino',
  'Aviar',
  'Otro',
];

const SEX_OPTIONS: PetSex[] = [
  'Macho',
  'Hembra',
  'Macho castrado',
  'Hembra esterilizada',
  'Desconocido',
];

const petFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido.'),
  species: z.enum(['Canino', 'Felino', 'Equino', 'Bovino', 'Aviar', 'Otro']),
  breed: z.string().optional(),
  sex: z.enum([
    'Macho',
    'Hembra',
    'Macho castrado',
    'Hembra esterilizada',
    'Desconocido',
  ]),
  birthDate: z.string().optional(),
  weightKg: z.coerce.number().min(0).optional(),
  color: z.string().optional(),
  microchip: z.string().optional(),
  sterilized: z.boolean().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
  ownerId: z.string().min(1, 'Debe seleccionar un dueño.'),
});

type PetFormValues = z.infer<typeof petFormSchema>;

export default function MascotasPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const clinicId = profile?.clinicId ?? 'default';

  const preselectedOwnerId = searchParams.get('ownerId') ?? '';

  const [pets, setPets] = useState<Pet[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [speciesFilter, setSpeciesFilter] = useState<string>('todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PetFormValues>({
    resolver: zodResolver(petFormSchema),
    defaultValues: {
      name: '',
      species: 'Canino',
      breed: '',
      sex: 'Desconocido',
      birthDate: '',
      weightKg: undefined,
      color: '',
      microchip: '',
      sterilized: false,
      allergies: '',
      chronicConditions: '',
      ownerId: preselectedOwnerId,
    },
  });

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [petsList, ownersList] = await Promise.all([
        petsRepo.listByClinic(clinicId),
        ownersRepo.listByClinic(clinicId),
      ]);
      setPets(petsList);
      setOwners(ownersList);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las mascotas.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  useEffect(() => {
    if (preselectedOwnerId) {
      form.setValue('ownerId', preselectedOwnerId);
      setDialogOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedOwnerId]);

  const ownerName = useMemo(() => {
    const map = new Map(owners.map((o) => [o.id, ownerFullName(o)]));
    return (ownerId: string) => map.get(ownerId) ?? 'Sin dueño';
  }, [owners]);

  const filteredPets = useMemo(() => {
    if (speciesFilter === 'todas') return pets;
    return pets.filter((p) => p.species === speciesFilter);
  }, [pets, speciesFilter]);

  async function onSubmit(data: PetFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Sesión no válida.' });
      return;
    }
    setSubmitting(true);
    try {
      const now = Date.now();
      await petsRepo.create({
        clinicId,
        ownerId: data.ownerId,
        name: data.name,
        species: data.species,
        breed: data.breed || undefined,
        sex: data.sex,
        birthDate: data.birthDate || undefined,
        weightKg: data.weightKg,
        color: data.color || undefined,
        microchip: data.microchip || undefined,
        sterilized: data.sterilized ?? false,
        allergies: data.allergies || undefined,
        chronicConditions: data.chronicConditions || undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: user.uid,
      });
      toast({
        title: 'Mascota registrada',
        description: `"${data.name}" se agregó correctamente.`,
      });
      setDialogOpen(false);
      form.reset({
        name: '',
        species: 'Canino',
        breed: '',
        sex: 'Desconocido',
        birthDate: '',
        weightKg: undefined,
        color: '',
        microchip: '',
        sterilized: false,
        allergies: '',
        chronicConditions: '',
        ownerId: '',
      });
      await loadData();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al registrar la mascota',
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mascotas</h1>
          <p className="text-muted-foreground">
            Pacientes registrados en la veterinaria.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva mascota
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar nueva mascota</DialogTitle>
              <DialogDescription>
                Complete los datos del paciente.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="ownerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dueño</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un dueño" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {owners.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              No hay dueños registrados.
                            </div>
                          ) : (
                            owners.map((o) => (
                              <SelectItem key={o.id} value={o.id}>
                                {ownerFullName(o)}
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
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Firulais" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="species"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especie</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Especie" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SPECIES_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
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
                    name="breed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Raza</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Labrador" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sexo</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sexo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SEX_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
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
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de nacimiento</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="color"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Marrón" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="microchip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Microchip</FormLabel>
                        <FormControl>
                          <Input placeholder="N.º de microchip" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alergias</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Alergias conocidas"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="chronicConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condiciones crónicas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Condiciones crónicas relevantes"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sterilized"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Esterilizado/a</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Registrar mascota
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Listado de pacientes</CardTitle>
              <CardDescription>
                {loading
                  ? 'Cargando...'
                  : `${filteredPets.length} mascota(s)`}
              </CardDescription>
            </div>
            <div className="w-full sm:w-56">
              <Select value={speciesFilter} onValueChange={setSpeciesFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por especie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las especies</SelectItem>
                  {SPECIES_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando mascotas...
            </div>
          ) : filteredPets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <PawPrint className="h-10 w-10" />
              <p>No hay mascotas registradas.</p>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Registrar la primera
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Especie</TableHead>
                  <TableHead>Raza</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Dueño</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPets.map((pet) => (
                  <TableRow key={pet.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/clinica/mascotas/${pet.id}`}
                        className="hover:underline"
                      >
                        {pet.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{pet.species}</Badge>
                    </TableCell>
                    <TableCell>{pet.breed ?? '—'}</TableCell>
                    <TableCell>{pet.sex ?? '—'}</TableCell>
                    <TableCell>{ownerName(pet.ownerId)}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/clinica/mascotas/${pet.id}`}>
                          Ver ficha
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
