"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FlaskConical, BookUser, FilePlus2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/simulacion/1", icon: FlaskConical, label: "Simulación" },
  { href: "/profesor", icon: BookUser, label: "Modo Profesor" },
  { href: "/profesor/crear-caso", icon: FilePlus2, label: "Crear Caso" },
];

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="grid items-start px-2 text-sm font-medium">
      <TooltipProvider>
        {navItems.map(({ href, icon: Icon, label }) => {
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
