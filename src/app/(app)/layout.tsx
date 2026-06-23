'use client';

import Link from "next/link";
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { UniversityLogo } from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import type { Student } from "@/lib/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppLayoutInner>{children}</AppLayoutInner>
    </AuthGuard>
  );
}

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();

  // Adaptamos el perfil al shape Student que espera UserNav (compatibilidad).
  const studentForNav: Student = {
    name: profile?.displayName ?? 'Usuario',
    level: profile?.level ?? 'Básico',
    academicProgress: profile?.academicProgress ?? 0,
    averageScore: profile?.averageScore ?? 0,
    triagePerformance: profile?.triagePerformance ?? 0,
    avatarUrl: profile?.avatarUrl ?? 'https://picsum.photos/seed/101/100/100',
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-card sm:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold text-lg"
          >
            <UniversityLogo className="h-8 w-8" />
            <span className="">SimVet</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <MainNav />
        </div>
      </aside>
      <div className="flex flex-col sm:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-card px-6">
          <PageHeader />
          <div className="sm:hidden">{/* Placeholder for mobile nav trigger */}</div>
          <UserNav student={studentForNav} />
        </header>
        <main className="flex-1 gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          {children}
        </main>
      </div>
    </div>
  );
}
