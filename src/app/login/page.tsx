'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { UniversityLogo } from '@/components/icons';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { signInWithEmail, signInWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
      router.push('/dashboard');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description: err instanceof Error ? err.message : 'Credenciales inválidas',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error con Google Sign-In',
        description: err instanceof Error ? err.message : 'Intenta de nuevo',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="clinical-mesh relative flex min-h-screen items-center justify-center overflow-hidden bg-transparent p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_22%)]" />
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="clinical-shell hidden min-h-[620px] flex-col justify-between p-8 lg:flex">
          <div className="animate-fade-up">
            <p className="clinical-kicker mb-3">Clinical Learning Platform</p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight text-slate-900">
              Simulación veterinaria con claridad clínica y feedback guiado por IA.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Entrena decisiones en urgencias, estructura casos docentes y transforma historias clínicas en escenarios de aprendizaje más fieles a la práctica real.
            </p>
          </div>
          <div className="clinical-grid md:grid-cols-3">
            {[
              ['ABCDE', 'Priorización rápida con monitoreo y respuesta progresiva del paciente.'],
              ['Historias IA', 'Base clínica reutilizable para crear simulaciones y análisis futuros.'],
              ['Feedback', 'Retroalimentación estructurada con foco en razonamiento y tratamiento.'],
            ].map(([title, body]) => (
              <div
                key={title}
                className="rounded-[1.2rem] border border-white/70 bg-white/72 p-5 shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="mx-auto w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mb-5 flex justify-center">
              <div className="clinical-glow flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-primary to-emerald-500 text-white">
                <UniversityLogo className="h-9 w-9" />
              </div>
            </div>
            <p className="clinical-kicker">Secure Access</p>
            <CardTitle className="mt-2 text-3xl">SimVet Urgencias</CardTitle>
            <CardDescription>
              Ingresa a tu entorno clínico-académico con una experiencia limpia y enfocada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar sesión
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">o</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogle}
              disabled={submitting}
            >
              Continuar con Google
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Si es tu primera vez, contacta al administrador para crear tu cuenta.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

