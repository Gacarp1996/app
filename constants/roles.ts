// constants/roles.ts

import { UserRole } from '../Database/FirebaseRoles';

// Constantes de roles
export const ROLES = {
  ACADEMY_DIRECTOR: 'academyDirector',
  ACADEMY_SUBDIRECTOR: 'academySubdirector',
  ACADEMY_COACH: 'academyCoach',
  GROUP_COACH: 'groupCoach',
  ASSISTANT_COACH: 'assistantCoach'
} as const;

// Información de roles para UI
export const ROLE_INFO: Record<UserRole, {
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  permissions: string[];
}> = {
  academyDirector: {
    name: 'Director de Academia',
    shortName: 'Director',
    description: 'Control total sobre la academia, puede gestionar usuarios y configuración',
    icon: '👑',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    permissions: [
      'Gestionar usuarios y roles',
      'Configurar academia',
      'Eliminar academia',
      'Ver todos los datos',
      'Crear y editar jugadores',
      'Registrar entrenamientos'
    ]
  },
  academySubdirector: {
    name: 'Subdirector de Academia',
    shortName: 'Subdirector',
    description: 'Puede gestionar usuarios y ayudar en la administración',
    icon: '🏆',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    permissions: [
      'Gestionar usuarios (excepto directores)',
      'Ver configuración de academia',
      'Ver todos los datos',
      'Crear y editar jugadores',
      'Registrar entrenamientos'
    ]
  },
  academyCoach: {
    name: 'Entrenador de Academia',
    shortName: 'Entrenador',
    description: 'Puede registrar entrenamientos y gestionar jugadores',
    icon: '🎾',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    permissions: [
      'Crear y editar jugadores',
      'Registrar entrenamientos',
      'Ver objetivos y planificación',
      'Registrar torneos'
    ]
  },
  groupCoach: {
    name: 'Entrenador de Grupo',
    shortName: 'Ent. Grupo',
    description: 'Gestiona su grupo personal de entrenamiento',
    icon: '🏃',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    permissions: [
      'Gestionar su grupo personal',
      'Crear jugadores (con límite)',
      'Registrar entrenamientos',
      'Ver y editar toda la información del grupo'
    ]
  },
  assistantCoach: {
    name: 'Entrenador Asistente',
    shortName: 'Asistente',
    description: 'Apoya en los entrenamientos y registro de actividades',
    icon: '🤝',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
    permissions: [
      'Registrar entrenamientos',
      'Ver jugadores y objetivos',
      'Agregar observaciones',
      'Acceso limitado a edición'
    ]
  }
};

// Funciones helper para verificar permisos
export const canManageUsers = (role: UserRole | null): boolean => {
  return role === ROLES.ACADEMY_DIRECTOR || role === ROLES.ACADEMY_SUBDIRECTOR;
};

export const canDeleteAcademy = (role: UserRole | null): boolean => {
  return role === ROLES.ACADEMY_DIRECTOR;
};

export const canEditAcademyConfig = (role: UserRole | null): boolean => {
  return role === ROLES.ACADEMY_DIRECTOR || role === ROLES.ACADEMY_SUBDIRECTOR;
};

export const canCreatePlayers = (role: UserRole | null): boolean => {
  // Todos los roles pueden crear jugadores
  return role !== null;
};

export const canEditPlayers = (role: UserRole | null): boolean => {
  // Todos los roles pueden editar jugadores
  return role !== null;
};

export const canRegisterTrainings = (role: UserRole | null): boolean => {
  // Todos los roles pueden registrar entrenamientos
  return role !== null;
};

// Orden de jerarquía de roles (menor número = mayor jerarquía)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  academyDirector: 0,
  academySubdirector: 1,
  academyCoach: 2,
  groupCoach: 3,
  assistantCoach: 4
};

// Función para comparar jerarquía de roles
export const compareRoleHierarchy = (roleA: UserRole, roleB: UserRole): number => {
  return ROLE_HIERARCHY[roleA] - ROLE_HIERARCHY[roleB];
};

// Roles disponibles según el tipo de entidad y contexto
export const getRolesByEntityType = (entityType: 'academia' | 'grupo-entrenamiento'): UserRole[] => {
  if (entityType === 'grupo-entrenamiento') {
    // En grupos de entrenamiento solo existen estos dos roles
    return [ROLES.GROUP_COACH, ROLES.ASSISTANT_COACH] as UserRole[];
  }
  // En academias existen estos tres roles
  return [ROLES.ACADEMY_DIRECTOR, ROLES.ACADEMY_SUBDIRECTOR, ROLES.ACADEMY_COACH] as UserRole[];
};

// Función para obtener el rol por defecto para nuevos usuarios
export const getDefaultRoleForNewUser = (entityType: 'academia' | 'grupo-entrenamiento', isCreator: boolean): UserRole => {
  if (isCreator) {
    return entityType === 'grupo-entrenamiento' ? ROLES.GROUP_COACH : ROLES.ACADEMY_DIRECTOR;
  }
  return entityType === 'grupo-entrenamiento' ? ROLES.ASSISTANT_COACH : ROLES.ACADEMY_COACH;
};

// Función para verificar si un rol puede ser cambiado
export const canChangeUserRole = (
  currentUserRole: UserRole | null,
  targetUserRole: UserRole,
  entityType: 'academia' | 'grupo-entrenamiento'
): boolean => {
  // En grupos de entrenamiento, los roles son fijos
  if (entityType === 'grupo-entrenamiento') {
    return false;
  }
  
  // Solo el director puede cambiar roles en academias
  if (currentUserRole !== ROLES.ACADEMY_DIRECTOR) {
    return false;
  }
  
  // El director solo puede promover coaches a subdirectores
  return targetUserRole === ROLES.ACADEMY_COACH;
};

// Roles que puede asignar cada rol
export const getAssignableRoles = (
  assignerRole: UserRole,
  currentTargetRole: UserRole,
  entityType: 'academia' | 'grupo-entrenamiento'
): UserRole[] => {
  // En grupos de entrenamiento no se pueden cambiar roles
  if (entityType === 'grupo-entrenamiento') {
    return [];
  }
  
  // Solo el director puede cambiar roles
  if (assignerRole !== ROLES.ACADEMY_DIRECTOR) {
    return [];
  }
  
  // Si el usuario actual es coach, puede ser promovido a subdirector
  if (currentTargetRole === ROLES.ACADEMY_COACH) {
    return [ROLES.ACADEMY_SUBDIRECTOR];
  }
  
  // Los subdirectores y directores no pueden cambiar de rol
  return [];
};