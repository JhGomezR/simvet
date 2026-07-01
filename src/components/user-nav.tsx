'use client';

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type Student } from "@/lib/types";
import { User, LogOut, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

interface UserNavProps {
  student: Student;
}

export function UserNav({ student }: UserNavProps) {
  const router = useRouter();
  const { signOut, profile, roles } = useAuth();
  const initials = student.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const roleLabels = roles
    .filter((role) => role !== 'student')
    .map((role) =>
      role === 'admin' ? 'Administrador' : role === 'professor' ? 'Profesor' : role
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={student.avatarUrl} alt={student.name} data-ai-hint="person face" />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{student.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {roleLabels.length > 0 ? roleLabels.join(' · ') : `Nivel: ${student.level}`}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/account/change-password')}>
            <KeyRound className="mr-2 h-4 w-4" />
            <span>Cambiar contraseña</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
