'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirm) {
      toast({ variant: 'destructive', title: 'Las contraseñas no coinciden' });
      return;
    }
    if (newPwd.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Contraseña muy corta',
        description: 'Mínimo 8 caracteres',
      });
      return;
    }
    if (!auth.currentUser || !user) {
      toast({ variant: 'destructive', title: 'Sesión expirada, vuelve a iniciar' });
      router.push('/login');
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(auth.currentUser, newPwd);
      await updateDoc(doc(db, 'users', user.uid), {
        mustChangePassword: false,
        updatedAt: Date.now(),
      });
      toast({ title: 'Contraseña actualizada correctamente' });
      router.push('/dashboard');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description:
          err instanceof Error ? err.message : 'Intenta cerrar sesión y volver',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-6 w-6 text-amber-500" />
            <CardTitle>Cambio de contraseña requerido</CardTitle>
          </div>
          <CardDescription>
            {profile?.email
              ? `Cuenta: ${profile.email}. `
              : ''}
            Por seguridad, debes cambiar la contraseña temporal antes de continuar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPwd">Nueva contraseña</Label>
              <Input
                id="newPwd"
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres. Usa mayúsculas, minúsculas, números y símbolos.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar nueva contraseña</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cambiar contraseña
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
