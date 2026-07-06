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
    <div className="clinical-mesh flex min-h-screen w-full flex-col bg-transparent">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-[282px] flex-col border-r border-white/60 bg-white/72 backdrop-blur-xl sm:flex">
        <div className="flex h-20 items-center border-b border-slate-200/70 px-7">
          <Link
            href="/dashboard"
            className="group flex items-center gap-3 font-semibold text-lg text-slate-900 transition-transform duration-200 hover:translate-x-0.5"
          >
            <div className="clinical-glow flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-emerald-500 text-white">
              <UniversityLogo className="h-6 w-6" />
            </div>
            <div>
              <span className="clinical-kicker block">Clinical Tech</span>
              <span>SimVet</span>
            </div>
          </Link>
        </div>
        <div className="flex-1 overflow-auto px-4 py-5">
          <MainNav />
        </div>
      </aside>
      <div className="flex flex-col sm:pl-[282px]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-white/60 bg-white/72 px-5 backdrop-blur-xl sm:px-8">
          <PageHeader />
          <div className="sm:hidden">{/* Placeholder for mobile nav trigger */}</div>
          <UserNav student={studentForNav} />
        </header>
        <main className="flex-1 px-4 py-5 sm:px-7 sm:py-6">
          <div className="clinical-shell overflow-hidden p-1">
            <div className="min-h-[calc(100vh-9rem)] rounded-[1.35rem] bg-white/40 px-3 py-4 sm:px-5 sm:py-5">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
