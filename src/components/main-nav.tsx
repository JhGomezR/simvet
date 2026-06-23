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
  const { role } = useAuth();

  const visibleItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return role && item.roles.includes(role);
  });

  return (
    <nav className="grid items-start px-2 text-sm font-medium">
      <TooltipProvider>
        {visibleItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href.startsWith('/simulacion') && pathname.startsWith('/simulacion'));
          return (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                    isActive && "bg-muted text-primary"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
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
