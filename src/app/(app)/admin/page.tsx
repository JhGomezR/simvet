'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Users, BookOpen, Loader2, UserPlus, KeyRound, GraduationCap } from 'lucide-react';
import type { Clinic, UserProfile, UserRole } from '@/lib/types';

const roleOptions = ['student', 'professor', 'admin', 'veterinarian', 'assistant'] as const;

const createUserSchema = z.object({
  displayName: z.string().min(3, 'Ingresa al menos 3 caracteres.'),
  email: z.string().email('Correo inválido.'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').optional().or(z.literal('')),
  role: z.enum(roleOptions),
  roles: z.array(z.enum(roleOptions)).min(1, 'Selecciona al menos un rol.'),
  clinicId: z.string().optional().or(z.literal('')),
});

const accessSchema = z.object({
  uid: z.string().min(1),
  displayName: z.string().min(3, 'Ingresa al menos 3 caracteres.'),
  role: z.enum(roleOptions),
  roles: z.array(z.enum(roleOptions)).min(1, 'Selecciona al menos un rol.'),
  clinicId: z.string().optional().or(z.literal('')),
  mustChangePassword: z.boolean(),
});

type CreateUserValues = z.infer<typeof createUserSchema>;
type AccessValues = z.infer<typeof accessSchema>;

type CreatedCredentials = {
  email: string;
  temporaryPassword: string;
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
  const [savingAccess, setSavingAccess] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
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

  const accessForm = useForm<AccessValues>({
    resolver: zodResolver(accessSchema),
    defaultValues: {
      uid: '',
      displayName: '',
      role: 'student',
      roles: ['student'],
      clinicId: '',
      mustChangePassword: false,
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
      if (!selectedUid && list[0]) {
        setSelectedUid(list[0].uid);
      }
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

  const selectedUser = useMemo(
    () => users.find((profile) => profile.uid === selectedUid) ?? null,
    [selectedUid, users]
  );

  useEffect(() => {
    if (!selectedUser) return;
    accessForm.reset({
      uid: selectedUser.uid,
      displayName: selectedUser.displayName,
      role: selectedUser.role as AccessValues['role'],
      roles: normalizeUserRoles(selectedUser.role, selectedUser.roles) as AccessValues['roles'],
      clinicId: selectedUser.clinicId ?? '',
      mustChangePassword: selectedUser.mustChangePassword ?? false,
    });
  }, [accessForm, selectedUser]);

  const adminCount = users.filter((u) => normalizeUserRoles(u.role, u.roles).includes('admin')).length;
  const professorCount = users.filter((u) => normalizeUserRoles(u.role, u.roles).includes('professor')).length;
  const studentCount = users.filter((u) => normalizeUserRoles(u.role, u.roles).includes('student')).length;

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

      setCreatedCredentials({
        email: result.email,
        temporaryPassword: result.temporaryPassword,
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
      setSelectedUid(result.uid);
      toast({
        title: 'Usuario creado',
        description: 'La cuenta quedó registrada con acceso inicial y cambio obligatorio de contraseña.',
      });
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleSaveAccess(values: AccessValues) {
    setSavingAccess(true);
    try {
      const roles = ensurePrimaryRoleIncluded(values.role, values.roles);
      await usersRepo.updateAccess(values.uid, {
        role: values.role,
        roles,
        clinicId: values.clinicId || undefined,
        displayName: values.displayName,
        mustChangePassword: values.mustChangePassword,
      });

      setUsers((prev) =>
        prev.map((profile) =>
          profile.uid === values.uid
            ? {
                ...profile,
                displayName: values.displayName,
                role: values.role,
                roles,
                clinicId: values.clinicId || undefined,
                mustChangePassword: values.mustChangePassword,
              }
            : profile
        )
      );

      toast({
        title: 'Acceso actualizado',
        description: 'El perfil quedó alineado con su rol y su flujo dentro del sistema.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error actualizando acceso',
        description: err instanceof Error ? err.message : 'Intenta de nuevo.',
      });
    } finally {
      setSavingAccess(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <p className="text-sm text-muted-foreground">
            Crea cuentas, asigna roles y organiza el flujo entre administración, docencia y simulación.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuarios totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Docentes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{professorCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50/60">
        <CardHeader>
          <CardTitle className="text-amber-900">Requisito para crear usuarios desde administración</CardTitle>
          <CardDescription className="text-amber-800">
            Esta función depende de Firebase Admin corriendo en el servidor. Si estás en Vercel,
            configura credenciales del servicio y vuelve a desplegar.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-amber-900">
          <p>Opciones soportadas por el proyecto:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><code>FIREBASE_SERVICE_ACCOUNT</code> con el JSON completo de la cuenta de servicio.</li>
            <li><code>FIREBASE_PROJECT_ID</code>, <code>FIREBASE_CLIENT_EMAIL</code> y <code>FIREBASE_PRIVATE_KEY</code>.</li>
            <li>En local: <code>GOOGLE_APPLICATION_CREDENTIALS=./service-account.json</code>.</li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Crear usuario
            </CardTitle>
            <CardDescription>
              Crea la cuenta real en Firebase Auth y deja el perfil listo en Firestore con su rol inicial.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {createdCredentials ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
                <p className="font-medium text-emerald-800">Credenciales temporales generadas</p>
                <p className="mt-1 text-emerald-700">Correo: {createdCredentials.email}</p>
                <p className="text-emerald-700">
                  Contraseña temporal: <span className="font-mono">{createdCredentials.temporaryPassword}</span>
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
                          <Input type="text" placeholder="Opcional: se genera automáticamente" {...field} />
                        </FormControl>
                        <FormDescription>
                          Si la dejas vacía, el sistema genera una temporal.
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
                        <Select value={field.value || '__none__'} onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}>
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
                          <SelectTrigger className="max-w-[260px]">
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
                        El rol principal define el modo predominante de esa cuenta.
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
                              className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                            >
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
                                <span className="block font-medium">{ROLE_LABELS[role]}</span>
                                <span className="text-muted-foreground">{ROLE_PLAYBOOKS[role].summary}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={creatingUser}>
                  {creatingUser ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Crear usuario
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flujo entre roles</CardTitle>
            <CardDescription>
              Así se complementan las cuentas dentro de SimVet para que la simulación tenga sentido académico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(['admin', 'professor', 'student'] as const).map((role) => (
              <div key={role} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{ROLE_PLAYBOOKS[role].title}</p>
                    <p className="text-sm text-muted-foreground">{ROLE_PLAYBOOKS[role].summary}</p>
                  </div>
                  <Badge variant={role === 'admin' ? 'destructive' : role === 'professor' ? 'default' : 'secondary'}>
                    {ROLE_LABELS[role]}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2 text-sm">
                  <div>
                    <p className="font-medium">Responsabilidades</p>
                    <ul className="list-disc pl-5 text-muted-foreground">
                      {ROLE_PLAYBOOKS[role].responsibilities.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Conexión con otros roles</p>
                    <ul className="list-disc pl-5 text-muted-foreground">
                      {ROLE_PLAYBOOKS[role].handoff.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Gestión de usuarios</CardTitle>
            <CardDescription>
              Selecciona un usuario para editar su rol principal, roles activos, clínica y cambio obligatorio de contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
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
                      <TableRow key={profile.uid}>
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
                        <TableCell className="text-muted-foreground">{profile.clinicId ?? 'Sin asignar'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant={selectedUid === profile.uid ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedUid(profile.uid)}
                          >
                            Editar acceso
                          </Button>
                          {roles.includes('admin') && adminCount === 1 && user?.uid === profile.uid ? (
                            <p className="mt-1 text-xs text-amber-700">
                              Eres el único administrador actual.
                            </p>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acceso del usuario</CardTitle>
            <CardDescription>
              Ajusta cómo se mueve la cuenta dentro del sistema y qué modo tendrá por defecto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <p className="text-sm text-muted-foreground">
                Selecciona un usuario de la tabla para editar su acceso.
              </p>
            ) : (
              <Form {...accessForm}>
                <form onSubmit={accessForm.handleSubmit(handleSaveAccess)} className="space-y-5">
                  <FormField
                    control={accessForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accessForm.control}
                    name="clinicId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Clínica</FormLabel>
                        <Select value={field.value || '__none__'} onValueChange={(value) => field.onChange(value === '__none__' ? '' : value)}>
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

                  <FormField
                    control={accessForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol principal</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            const nextRole = value as UserRole;
                            field.onChange(nextRole);
                            accessForm.setValue(
                              'roles',
                              ensurePrimaryRoleIncluded(nextRole, accessForm.getValues('roles'))
                            );
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accessForm.control}
                    name="roles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Roles activos</FormLabel>
                        <div className="space-y-2">
                          {roleOptions.map((role) => {
                            const checked = field.value.includes(role);
                            return (
                              <label key={role} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) => {
                                    const current = new Set(field.value);
                                    if (value) current.add(role);
                                    else current.delete(role);
                                    current.add(accessForm.getValues('role'));
                                    field.onChange(Array.from(current));
                                  }}
                                />
                                <span>{ROLE_LABELS[role]}</span>
                              </label>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={accessForm.control}
                    name="mustChangePassword"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="pr-4">
                          <FormLabel className="flex items-center gap-2 text-base">
                            <KeyRound className="h-4 w-4" />
                            Cambio obligatorio de contraseña
                          </FormLabel>
                          <FormDescription>
                            Útil para cuentas nuevas o cuando el admin reinicia el acceso.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={savingAccess}>
                    {savingAccess ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Guardar acceso
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
