'use client';

import { AuthGuard } from "@/components/auth-guard";

export default function ProfesorLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard requiredRole={['professor', 'admin']}>{children}</AuthGuard>;
}
