'use client';

/**
 * AuthGuard — envuelve rutas protegidas.
 *
 * Funcionalidad:
 * 1. Si no hay sesión, redirige a /login.
 * 2. Si mustChangePassword=true, fuerza ir a /account/change-password.
 * 3. Si requiredRole no se cumple, redirige a /dashboard.
 *
 * Nota: la fuente de verdad para seguridad son las Firestore Rules. Este guard
 * es UX (evita renderizar páginas que el backend bloquearía igualmente).
 */
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import type { UserRole } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[]; // si se omite, basta con estar logueado
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { user, profile, roles, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // 1. Sin sesión → login
    if (!user) {
      router.replace('/login');
      return;
    }

    // 2. Esperando que el perfil termine de cargar
    if (!profile) return;

    // 3. Forzar cambio de contraseña
    if (profile.mustChangePassword && pathname !== '/account/change-password') {
      router.replace('/account/change-password');
      return;
    }

    // 4. Validar rol requerido
    if (requiredRole) {
      const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      const rolesFromProfile = profile.roles ?? roles ?? [profile.role];
      const allowed =
        requiredRoles.some(
          (required) => required === profile.role || rolesFromProfile.includes(required)
        ) || rolesFromProfile.includes('admin');
      if (!allowed) {
        router.replace('/dashboard');
        return;
      }
    }
  }, [loading, user, profile, requiredRole, router, pathname, roles]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
