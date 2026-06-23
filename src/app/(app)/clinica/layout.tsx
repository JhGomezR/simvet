'use client';
/**
 * Layout del módulo de gestión clínica (SimVet Clinical).
 * Protege todas las rutas /clinica/* para roles clínicos.
 */
import { AuthGuard } from '@/components/auth-guard';
import { CLINICAL_ROLES } from '@/lib/types';

export default function ClinicaLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRole={CLINICAL_ROLES}>{children}</AuthGuard>;
}
