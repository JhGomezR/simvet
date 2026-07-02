"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FlaskConical,
  BookUser,
  FilePlus2,
  ShieldCheck,
  Users,
  PawPrint,
  Stethoscope,
  FileText,
  Search,
  Settings,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/auth-context";
import type { UserRole } from "@/lib/types";

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles?: UserRole[]; // si se omite, visible a todos los logueados
};

const CLINICAL: UserRole[] = ['admin', 'veterinarian', 'assistant', 'professor'];

const navItems: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/simulacion/1", icon: FlaskConical, label: "Simulación" },
  // ── Gestión clínica (SimVet Clinical) ──
  { href: "/clinica/propietarios", icon: Users, label: "Propietarios", roles: CLINICAL },
  { href: "/clinica/mascotas", icon: PawPrint, label: "Mascotas", roles: CLINICAL },
  { href: "/clinica/consultas", icon: Stethoscope, label: "Consultas", roles: CLINICAL },
  { href: "/clinica/historias", icon: FileText, label: "Historias IA", roles: CLINICAL },
  { href: "/clinica/busqueda", icon: Search, label: "Búsqueda IA", roles: CLINICAL },
  // ── Docencia ──
  { href: "/profesor", icon: BookUser, label: "Modo Profesor", roles: ['professor', 'admin'] },
  { href: "/profesor/crear-caso", icon: FilePlus2, label: "Crear Caso", roles: ['professor', 'admin'] },
  // ── Administración ──
  { href: "/admin", icon: ShieldCheck, label: "Administración", roles: ['admin'] },
  { href: "/admin/configuracion", icon: Settings, label: "Configuración", roles: ['admin'] },
];

export function MainNav() {
  const pathname = usePathname();
  const { role, roles } = useAuth();

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return item.roles.some((requiredRole) => roles.includes(requiredRole) || role === requiredRole);
  });

  return (
    <nav className="grid items-start gap-2 px-2 text-sm font-medium">
      <TooltipProvider>
        {visibleItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href.startsWith('/simulacion') && pathname.startsWith('/simulacion'));
          return (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl px-4 py-3 text-slate-500 transition-all duration-200 ease-in-out hover:bg-white hover:text-slate-900 hover:shadow-[0_12px_30px_-24px_rgba(15,23,42,0.45)]",
                    isActive && "clinical-glow bg-white text-slate-900 shadow-[0_16px_35px_-26px_rgba(15,23,42,0.42)]"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors duration-200 group-hover:bg-primary/10 group-hover:text-primary",
                      isActive && "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="truncate">{label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                {label}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </TooltipProvider>
    </nav>
  );
}
