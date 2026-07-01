'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { usersRepo } from '@/lib/repositories';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ShieldCheck, Users, BookOpen, Loader2 } from 'lucide-react';
import type { UserProfile, UserRole } from '@/lib/types';

type ManageableRole = 'student' | 'professor' | 'admin';

export default function AdminPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await usersRepo.listAll();
        setUsers(list);
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Error cargando usuarios',
          description: err instanceof Error ? err.message : 'Intenta de nuevo',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [toast]);

  const adminCount = users.filter((u) => (u.roles ?? [u.role]).includes('admin')).length;

  const handleRoleChange = async (uid: string, newRole: ManageableRole) => {
    setBusyUid(uid);
    try {
      await usersRepo.updateRole(uid, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
      );
      toast({ title: `Rol actualizado a ${newRole}` });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error actualizando rol',
        description: err instanceof Error ? err.message : 'Intenta de nuevo',
      });
    } finally {
      setBusyUid(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Panel de Administración</h1>
          <p className="text-sm text-muted-foreground">
            Gestión global del sistema SimVet Urgencias
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Profesores</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => (u.roles ?? [u.role]).includes('professor')).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => (u.roles ?? [u.role]).includes('student')).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestión de usuarios</CardTitle>
          <CardDescription>
            Admin conserva acceso total al sistema. No quites el rol al unico administrador sin promover otro antes.
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
                  <TableHead>Rol actual</TableHead>
                  <TableHead>Cambiar rol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.uid}>
                    <TableCell>{u.displayName}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(u.roles ?? [u.role]).map((currentRole) => (
                          <Badge
                            key={`${u.uid}-${currentRole}`}
                            variant={
                              currentRole === 'admin'
                                ? 'destructive'
                                : currentRole === 'professor'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {currentRole}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.role}
                        disabled={busyUid === u.uid}
                        onValueChange={(v) => handleRoleChange(u.uid, v as ManageableRole)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Estudiante</SelectItem>
                          <SelectItem value="professor">Profesor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      {(u.roles ?? [u.role]).includes('admin') && adminCount === 1 && user?.uid === u.uid && (
                        <p className="mt-1 text-xs text-amber-700">
                          Eres el unico administrador. Promueve otro admin antes de cambiar este rol.
                        </p>
                      )}
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
