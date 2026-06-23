'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { ownersRepo } from '@/lib/repositories.clinical';
import { ownerFullName, type Owner } from '@/lib/types';
import {
  Loader2,
  Plus,
  Search,
  Users,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';

const ownerFormSchema = z.object({
  firstName: z.string().min(2, 'El nombre es requerido.'),
  lastName: z.string().min(2, 'El apellido es requerido.'),
  idDocument: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Correo inválido.').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
});

type OwnerFormValues = z.infer<typeof ownerFormSchema>;

export default function PropietariosPage() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const clinicId = profile?.clinicId ?? 'default';

  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<OwnerFormValues>({
    resolver: zodResolver(ownerFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      idDocument: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      notes: '',
    },
  });

  const loadOwners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ownersRepo.listByClinic(clinicId);
      setOwners(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los propietarios.'
      );
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    loadOwners();
  }, [loadOwners]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const t = term.trim();
    setError(null);
    setSearching(true);
    try {
      if (!t) {
        await loadOwners();
        return;
      }
      const results = await ownersRepo.searchByName(clinicId, t);
      setOwners(results);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al buscar propietarios.'
      );
    } finally {
      setSearching(false);
    }
  }

  async function onSubmit(data: OwnerFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Debes iniciar sesión.' });
      return;
    }
    setSubmitting(true);
    try {
      const now = Date.now();
      await ownersRepo.create({
        clinicId,
        firstName: data.firstName,
        lastName: data.lastName,
        idDocument: data.idDocument || undefined,
        phone: data.phone || undefined,
        email: data.email || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        notes: data.notes || undefined,
        createdAt: now,
        updatedAt: now,
        createdBy: user.uid,
      });
      toast({
        title: 'Propietario creado',
        description: `${data.firstName} ${data.lastName} fue registrado.`,
      });
      form.reset();
      setDialogOpen(false);
      await loadOwners();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al crear el propietario',
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
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="h-6 w-6" />
            Propietarios
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los propietarios registrados en la clínica.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo propietario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo propietario</DialogTitle>
              <DialogDescription>
                Registra los datos de contacto del propietario.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Juan" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Apellido</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Pérez" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="idDocument"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Documento</FormLabel>
                        <FormControl>
                          <Input placeholder="Cédula / documento" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: 300 000 0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="correo@ejemplo.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección</FormLabel>
                        <FormControl>
                          <Input placeholder="Calle / carrera" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Bogotá" {...field} />
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
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observaciones adicionales"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Guardar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de propietarios</CardTitle>
          <CardDescription>
            Busca por nombre, apellido o documento.
          </CardDescription>
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 pt-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Buscar propietario..."
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="secondary" disabled={searching}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Buscar'
              )}
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Cargando propietarios...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={loadOwners}
              >
                Reintentar
              </Button>
            </div>
          ) : owners.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10" />
              <p className="font-medium">No hay propietarios</p>
              <p className="text-sm">
                {term.trim()
                  ? 'No se encontraron resultados para tu búsqueda.'
                  : 'Crea el primer propietario con el botón "Nuevo propietario".'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="hidden md:table-cell">Correo</TableHead>
                  <TableHead className="hidden md:table-cell">Ciudad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell className="font-medium">
                      {ownerFullName(owner)}
                    </TableCell>
                    <TableCell>{owner.idDocument ?? '—'}</TableCell>
                    <TableCell>{owner.phone ?? '—'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {owner.email ?? '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {owner.city ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/clinica/propietarios/${owner.id}`}>
                          Ver
                          <ChevronRight className="ml-1 h-4 w-4" />
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
