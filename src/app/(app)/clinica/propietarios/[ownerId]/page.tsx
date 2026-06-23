'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ownersRepo, petsRepo } from '@/lib/repositories.clinical';
import { ownerFullName, type Owner, type Pet } from '@/lib/types';
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Plus,
  PawPrint,
  Mail,
  Phone,
  MapPin,
  IdCard,
  ChevronRight,
} from 'lucide-react';

export default function PropietarioDetailPage() {
  const params = useParams<{ ownerId: string }>();
  const ownerId = params?.ownerId;

  const [owner, setOwner] = useState<Owner | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    setError(null);
    try {
      const [ownerData, petsData] = await Promise.all([
        ownersRepo.getById(ownerId),
        petsRepo.listByOwner(ownerId),
      ]);
      if (!ownerData) {
        setError('No se encontró el propietario.');
        setOwner(null);
        setPets([]);
        return;
      }
      setOwner(ownerData);
      setPets(petsData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la información del propietario.'
      );
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Cargando propietario...
      </div>
    );
  }

  if (error || !owner) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/clinica/propietarios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a propietarios
          </Link>
        </Button>
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error ?? 'Propietario no encontrado.'}</span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={load}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/clinica/propietarios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a propietarios
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{ownerFullName(owner)}</CardTitle>
          <CardDescription>Datos del propietario</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <IdCard className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Documento</dt>
                <dd className="text-sm">{owner.idDocument ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Teléfono</dt>
                <dd className="text-sm">{owner.phone ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">Correo</dt>
                <dd className="text-sm">{owner.email ?? '—'}</dd>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <dt className="text-xs text-muted-foreground">
                  Dirección / Ciudad
                </dt>
                <dd className="text-sm">
                  {[owner.address, owner.city].filter(Boolean).join(', ') || '—'}
                </dd>
              </div>
            </div>
            {owner.notes ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Notas</dt>
                <dd className="whitespace-pre-wrap text-sm">{owner.notes}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PawPrint className="h-5 w-5" />
              Mascotas
            </CardTitle>
            <CardDescription>
              Mascotas asociadas a este propietario.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href={`/clinica/mascotas?ownerId=${owner.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar mascota
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {pets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
              <PawPrint className="h-10 w-10" />
              <p className="font-medium">Sin mascotas registradas</p>
              <p className="text-sm">
                Usa &quot;Agregar mascota&quot; para registrar la primera.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Especie</TableHead>
                  <TableHead className="hidden md:table-cell">Raza</TableHead>
                  <TableHead className="hidden md:table-cell">Sexo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pets.map((pet) => (
                  <TableRow key={pet.id}>
                    <TableCell className="font-medium">{pet.name}</TableCell>
                    <TableCell>{pet.species}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {pet.breed ?? '—'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {pet.sex ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/clinica/mascotas/${pet.id}`}>
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
