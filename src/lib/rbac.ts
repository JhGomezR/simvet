import type { UserRole } from '@/lib/types';

export type RolePlaybook = {
  role: UserRole;
  title: string;
  summary: string;
  responsibilities: string[];
  handoff: string[];
};

export const MANAGEABLE_ROLES: UserRole[] = [
  'student',
  'professor',
  'admin',
  'veterinarian',
  'assistant',
];

export const ROLE_PLAYBOOKS: Record<UserRole, RolePlaybook> = {
  admin: {
    role: 'admin',
    title: 'Administrador',
    summary: 'Configura la plataforma, crea usuarios, asigna roles y asegura que el flujo académico-clínico funcione.',
    responsibilities: [
      'Crear cuentas y definir rol principal y roles complementarios.',
      'Mantener la configuración global, clínicas y permisos operativos del sistema.',
      'Supervisar que profesores y estudiantes tengan acceso correcto a sus módulos.',
    ],
    handoff: [
      'Entrega al docente una cuenta lista para crear, publicar y revisar simulaciones.',
      'Entrega al estudiante una cuenta lista para resolver casos y recibir retroalimentación.',
    ],
  },
  professor: {
    role: 'professor',
    title: 'Docente',
    summary: 'Diseña casos clínicos y simulaciones basadas en historias clínicas para el entrenamiento académico.',
    responsibilities: [
      'Subir historias clínicas, generar simulaciones y publicarlas para sus estudiantes.',
      'Definir el nivel del caso, las decisiones esperadas y los criterios de evaluación.',
      'Revisar resultados, errores frecuentes y ajustar los casos para mejorar el aprendizaje.',
    ],
    handoff: [
      'Publica simulaciones que luego aparecen para el estudiante en dashboard y modo simulación.',
      'Usa el desempeño estudiantil para refinar preguntas, pruebas y tratamiento sugerido.',
    ],
  },
  student: {
    role: 'student',
    title: 'Estudiante',
    summary: 'Resuelve casos publicados, toma decisiones clínicas y aprende a partir del feedback.',
    responsibilities: [
      'Ingresar a los casos disponibles y completar el ABCDE, anamnesis, examen, pruebas y tratamiento.',
      'Responder las preguntas del caso con sustento clínico.',
      'Revisar la retroalimentación y su historial para mejorar futuras decisiones.',
    ],
    handoff: [
      'Retroalimenta al docente con sus errores y aciertos al resolver simulaciones.',
      'Convierte cada intento en evidencia de progreso académico dentro del dashboard.',
    ],
  },
  veterinarian: {
    role: 'veterinarian',
    title: 'Veterinario',
    summary: 'Gestiona información clínica real y valida el criterio médico sobre pacientes reales.',
    responsibilities: [
      'Registrar actos clínicos, consultas, fórmulas, laboratorio y documentos del paciente.',
      'Asegurar que la información usada como base de conocimiento sea clínicamente válida.',
      'Mantener la trazabilidad y calidad del registro clínico real.',
    ],
    handoff: [
      'Alimenta la base clínica que después puede apoyar simulaciones y búsquedas por IA.',
    ],
  },
  assistant: {
    role: 'assistant',
    title: 'Auxiliar',
    summary: 'Apoya el registro operativo y documental de la clínica para mantener el historial completo.',
    responsibilities: [
      'Cargar documentos, mantener datos de pacientes y apoyar la organización del expediente.',
      'Actualizar información operativa sin invadir decisiones médicas reservadas.',
      'Ayudar a que el flujo clínico tenga datos ordenados y reutilizables.',
    ],
    handoff: [
      'Prepara el entorno documental para que veterinarios y docentes trabajen sobre información limpia.',
    ],
  },
};

export function normalizeUserRoles(role?: UserRole | null, roles?: UserRole[] | null): UserRole[] {
  return Array.from(new Set([...(roles ?? []), ...(role ? [role] : [])]));
}

