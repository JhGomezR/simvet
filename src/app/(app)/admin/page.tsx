'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/auth-context';
import { usersRepo } from '@/lib/repositories';
import { clinicsRepo } from '@/lib/repositories.clinical';
import { createManagedUserAction } from '@/app/actions/admin-users';
import { normalizeUserRoles, ROLE_PLAYBOOKS } from '@/lib/rbac';
import { ROLE_LABELS } from '@/lib/types';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen,
  GraduationCap,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import type { Clinic, UserProfile, UserRole } from '@/lib/types';

const roleOptions = ['student', 'professor', 'admin', 'veterinarian', 'assistant'] as const;

const createUserSchema = z.object({
  displayName: z.string().min(3, 'Ingresa al menos 3 caracteres.'),
  email: z.string().email('Correo inválido.'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres.')
    .optional()
    .or(z.literal('')),
  role: z.enum(roleOptions),
  roles: z.array(z.enum(roleOptions)).min(1, 'Selecciona al menos un rol.'),
  clinicId: z.string().optional().or(z.literal('')),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

type CreatedCredentials = {
  email: string;
  temporaryPassword: string;
  role: UserRole;
  credentialsValidated: boolean;
};

function ensurePrimaryRoleIncluded(role: UserRole, roles: UserRole[]) {
  return Array.from(new Set([...roles, role]));
}

export default function AdminPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);

  const createForm = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
      role: 'student',
      roles: ['student'],
      clinicId: '',
    },
  });

  async function loadData() {
    setLoading(true);
    try {
      const [list, clinicList] = await Promise.all([
        usersRepo.listAll(),
        clinicsRepo.listActive().catch(() => []),
      ]);
      setUsers(list);
      setClinics(clinicList);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error cargando administración',
        description: err instanceof Error ? err.message : 'Intenta de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adminCount = users.filter((u) => normalizeUserRoles(u.role, u.roles).includes('admin')).length;
  const professorCount = users.filter((u) =>
    normalizeUserRoles(u.role, u.roles).includes('professor')
  ).length;
  const studentCount = users.filter((u) =>
    normalizeUserRoles(u.role, u.roles).includes('student')
  ).length;

  async function handleCreateUser(values: CreateUserValues) {
    setCreatingUser(true);
    setCreatedCredentials(null);
    try {
      const result = await createManagedUserAction({
        displayName: values.displayName,
        email: values.email,
        password: values.password || undefined,
        role: values.role,
        roles: ensurePrimaryRoleIncluded(values.role, values.roles),
        clinicId: values.clinicId || undefined,
      });

      if (!result.ok) {
        toast({
          variant: 'destructive',
          title: 'No se pudo crear el usuario',
          description: result.error,
        });
        return;
      }

      if (!result.profileCreatedOnServer) {
        const now = Date.now();
        await usersRepo.createManagedProfile({
          uid: result.uid,
          email: result.email,
          displayName: values.displayName,
          role: values.role,
          roles: ensurePrimaryRoleIncluded(values.role, values.roles),
          clinicId: values.clinicId || undefined,
          mustChangePassword: true,
          level: 'Básico',
          academicProgress: 0,
          averageScore: 0,
          triagePerformance: 0,
          createdAt: now,
          updatedAt: now,
        });
      }

      setCreatedCredentials({
        email: result.email,
        temporaryPassword: result.temporaryPassword,
        role: values.role,
        credentialsValidated: result.credentialsValidated,
      });

      createForm.reset({
        displayName: '',
        email: '',
        password: '',
        role: 'student',
        roles: ['student'],
        clinicId: '',
      });

      await loadData();

      toast({
        title: 'Usuario creado',
        description:
          result.warning ??
          `La cuenta ya fue creada. Puedes cerrar sesión y probar el ingreso con este usuario en el modo ${ROLE_LABELS[
            values.role
          ].toLowerCase()}.`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'No se pudo completar la creación',
        description:
          err instanceof Error
            ? err.message
            : 'La cuenta pudo crearse parcialmente. Recarga el panel y verifica si el perfil aparece.',
      });
    } finally {
      setCreatingUser(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      <Card className="overflow-hidden">
        <CardHeader className="sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Panel de Administración</CardTitle>
            <CardDescription>Crea cuentas y asigna roles dentro de SimVet.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadData()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Recargar
          </Button>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Usuarios totales</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="text-4xl font-semibold text-slate-950">{users.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Administradores</CardTitle>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="text-4xl font-semibold text-slate-950">{adminCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Docentes</CardTitle>
            <BookOpen className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="text-4xl font-semibold text-slate-950">{professorCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Estudiantes</CardTitle>
            <GraduationCap className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="text-4xl font-semibold text-slate-950">{studentCount}</CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Los conteos de esta pantalla se basan en perfiles guardados en Firestore. Si un usuario
          ya inició sesión pero aún no aparece aquí, usa <strong>Recargar</strong> para
          sincronizar la lista.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crear usuario</CardTitle>
          <CardDescription>Crea la cuenta y define su base de acceso desde un solo flujo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {createdCredentials ? (
            <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-900">
              <p className="font-semibold">Usuario creado correctamente</p>
              <p className="mt-2">Correo: {createdCredentials.email}</p>
              <p>
                Contraseña temporal:{' '}
                <span className="rounded bg-white/70 px-2 py-1 font-mono">
                  {createdCredentials.temporaryPassword}
                </span>
              </p>
              <p className="mt-2">
                Rol inicial: <strong>{ROLE_LABELS[createdCredentials.role]}</strong>
              </p>
              <p>
                Login validado:{' '}
                <strong>{createdCredentials.credentialsValidated ? 'Sí' : 'Pendiente'}</strong>
              </p>
              <p className="mt-2">
                Ya puedes cerrar sesión y entrar con esta cuenta para comprobar su vista.
              </p>
            </div>
          ) : null}

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateUser)} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={createForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Nombre del usuario" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="usuario@simvet.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña temporal</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Opcional: se genera automáticamente"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Si la dejas vacía, el sistema genera una contraseña temporal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="clinicId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clínica</FormLabel>
                      <Select
                        value={field.value || '__none__'}
                        onValueChange={(value) =>
                          field.onChange(value === '__none__' ? '' : value)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sin asignar" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Sin asignar</SelectItem>
                          {clinics.map((clinic) => (
                            <SelectItem key={clinic.id} value={clinic.id}>
                              {clinic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol principal</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        const nextRole = value as UserRole;
                        field.onChange(nextRole);
                        createForm.setValue(
                          'roles',
                          ensurePrimaryRoleIncluded(nextRole, createForm.getValues('roles'))
                        );
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="max-w-[280px]">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      El rol principal define el modo predominante de la cuenta.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="roles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Roles habilitados</FormLabel>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {roleOptions.map((role) => {
                        const checked = field.value.includes(role);
                        return (
                          <label
                            key={role}
                            className="rounded-[1.1rem] border border-slate-200/80 bg-white/70 p-4 text-sm transition-all duration-200 hover:border-primary/25 hover:shadow-[0_20px_40px_-36px_rgba(15,23,42,0.6)]"
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(value) => {
                                  const current = new Set(field.value);
                                  if (value) current.add(role);
                                  else current.delete(role);
                                  current.add(createForm.getValues('role'));
                                  field.onChange(Array.from(current));
                                }}
                              />
                              <span>
                                <span className="block font-medium text-slate-900">
                                  {ROLE_LABELS[role]}
                                </span>
                                <span className="mt-1 block text-muted-foreground">
                                  {ROLE_PLAYBOOKS[role].summary}
                                </span>
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={creatingUser}>
                {creatingUser ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Crear usuario
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gestión de usuarios</CardTitle>
          <CardDescription>
            Revisa los usuarios registrados, sus roles y la clínica asignada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-hidden rounded-[1.2rem] border border-slate-200/80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Clínica</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((profile) => {
                    const roles = normalizeUserRoles(profile.role, profile.roles);
                    return (
                      <TableRow key={profile.uid} className="hover:bg-slate-50/80">
                        <TableCell className="font-medium">{profile.displayName}</TableCell>
                        <TableCell className="text-muted-foreground">{profile.email}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {roles.map((role) => (
                              <Badge
                                key={`${profile.uid}-${role}`}
                                variant={
                                  role === 'admin'
                                    ? 'destructive'
                                    : role === 'professor'
                                      ? 'default'
                                      : 'secondary'
                                }
                              >
                                {ROLE_LABELS[role]}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {profile.clinicId ?? 'Sin asignar'}
                        </TableCell>
                        <TableCell className="text-right">
                          {roles.includes('admin') && adminCount === 1 && user?.uid === profile.uid ? (
                            <p className="text-xs text-amber-700">
                              Eres el único administrador actual.
                            </p>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
