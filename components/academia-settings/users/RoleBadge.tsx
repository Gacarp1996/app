// components/academia-settings/users/RoleBadge.tsx
import React from 'react';
import { UserRole } from '../../../Database/FirebaseRoles';

interface RoleBadgeProps {
  role: UserRole;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'academyDirector':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'academySubdirector':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'academyCoach':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'groupCoach':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'assistantCoach':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'academyDirector':
        return 'Director';
      case 'academySubdirector':
        return 'Subdirector';
      case 'academyCoach':
        return 'Entrenador';
      case 'groupCoach':
        return 'Entrenador de Grupo';
      case 'assistantCoach':
        return 'Entrenador Asistente';
      default:
        return role;
    }
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(role)}`}>
      {getRoleDisplayName(role)}
    </span>
  );
};