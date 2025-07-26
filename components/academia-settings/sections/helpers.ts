// components/academia-settings/sections/helpers.ts

import { UserRole } from '../../../Database/FirebaseRoles';
import { TipoEntidad } from '../../../types';

// ========================================
// 1. HELPERS DE ROLES
// ========================================

export const getRoleDisplayName = (role?: UserRole | null): string => {
  if (!role) return 'Sin rol';
  
  const roleNames: Record<UserRole, string> = {
    'academyDirector': 'Director',
    'academySubdirector': 'Subdirector',
    'academyCoach': 'Entrenador',
    'groupCoach': 'Entrenador de Grupo',
    'assistantCoach': 'Entrenador Asistente'
  };
  
  return roleNames[role] || 'Sin rol';
};

export const getRoleBadgeColor = (role?: UserRole | null): string => {
  if (!role) return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  
  const roleColors: Record<UserRole, string> = {
    'academyDirector': 'bg-red-500/20 text-red-400 border border-red-500/30',
    'academySubdirector': 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    'academyCoach': 'bg-green-500/20 text-green-400 border border-green-500/30',
    'groupCoach': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    'assistantCoach': 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
  };
  
  return roleColors[role] || 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
};

// ========================================
// 2. HELPER DE CLIPBOARD
// ========================================

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Clipboard API failed, using fallback:', error);
    
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch (fallbackError) {
      console.error('Fallback copy also failed:', fallbackError);
      return false;
    }
  }
};

// ========================================
// 3. HELPERS DE PERMISOS
// ========================================

export const shouldShowUserManagement = (role: UserRole | null, entityType: TipoEntidad): boolean => {
  // En academias: solo academyDirector puede gestionar usuarios
  if (entityType === 'academia') {
    return role === 'academyDirector';
  }
  // En grupos: solo groupCoach puede gestionar usuarios
  if (entityType === 'grupo-entrenamiento') {
    return role === 'groupCoach';
  }
  return false;
};

export const shouldShowEntityInfo = (role: UserRole | null): boolean => {
  // Tanto directores de academia como coaches de grupo pueden ver info de su entidad
  return role === 'academyDirector' || role === 'groupCoach';
};

export const shouldShowAdvancedConfig = (role: UserRole | null): boolean => {
  // En academias: director y subdirector
  // En grupos: solo groupCoach
  return ['academyDirector', 'academySubdirector', 'groupCoach'].includes(role || '');
};

export const shouldShowDeleteOption = (role: UserRole | null): boolean => {
  // Solo directores de academia y coaches de grupo pueden eliminar su entidad
  return role === 'academyDirector' || role === 'groupCoach';
};

// ========================================
// 4. INFORMACIÓN DETALLADA DE ROLES
// ========================================

export interface RoleInfo {
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const getRoleInfo = (role: UserRole): RoleInfo => {
  const roleData: Record<UserRole, RoleInfo> = {
    academyDirector: {
      name: 'Director de Academia',
      description: 'Control total sobre la academia, puede gestionar usuarios y configuración',
      icon: '👑',
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30'
    },
    academySubdirector: {
      name: 'Subdirector de Academia',
      description: 'Puede gestionar usuarios y ayudar en la administración',
      icon: '🏆',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20',
      borderColor: 'border-orange-500/30'
    },
    academyCoach: {
      name: 'Entrenador de Academia',
      description: 'Puede registrar entrenamientos y gestionar jugadores',
      icon: '🎾',
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30'
    },
    groupCoach: {
      name: 'Entrenador de Grupo',
      description: 'Gestiona su grupo personal de entrenamiento',
      icon: '🏃',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/30'
    },
    assistantCoach: {
      name: 'Entrenador Asistente',
      description: 'Apoya en los entrenamientos y registro de actividades',
      icon: '🤝',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30'
    }
  };
  
  return roleData[role];
};

// ========================================
// 5. HELPER DE GENERACIÓN DE IDS PÚBLICOS
// ========================================

export const generatePublicIdForGroup = (groupId: string): string | null => {
  // Validar que groupId existe y no está vacío
  if (!groupId || typeof groupId !== 'string' || groupId.trim() === '') {
    console.warn('GroupId no válido:', groupId);
    return null;
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  if (groupId.length >= 6) {
    // Generar ID público de 6 caracteres a partir del groupId
    let generatedId = '';
    
    // Usar el groupId como semilla para generar un ID consistente
    for (let i = 0; i < 6; i++) {
      const charIndex = (groupId.charCodeAt(i % groupId.length) + i) % chars.length;
      generatedId += chars[charIndex];
    }
    
    return generatedId;
  } else {
    // Fallback: usar el groupId completo en mayúsculas si es menor a 6 caracteres
    let paddedId = groupId.toUpperCase();
    
    // Rellenar hasta 6 caracteres si es más corto
    while (paddedId.length < 6) {
      paddedId += chars[paddedId.length % chars.length];
    }
    
    return paddedId.substring(0, 6);
  }
};