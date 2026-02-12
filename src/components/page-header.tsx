"use client";

import { usePathname } from 'next/navigation';

export function PageHeader() {
  const pathname = usePathname();
  
  let title = "Dashboard";

  if (pathname.startsWith('/profesor')) {
    title = "Panel de Analítica";
  } else if (pathname.startsWith('/simulacion')) {
    title = "Simulación de Caso Clínico";
  } else if (pathname.startsWith('/dashboard')) {
    title = "Dashboard del Estudiante";
  }

  return (
    <h1 className="text-xl font-semibold md:text-2xl">
      {title}
    </h1>
  );
}
