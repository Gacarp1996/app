// components/academia-settings/users/UserCard.tsx
import React from 'react';
import { AcademiaUser, UserRole } from '../../../Database/FirebaseRoles';

interface UserCardProps {
  user: AcademiaUser;
  isCurrentUser: boolean;
  canManageUsers: boolean;
  onChangeRole: () => void;
  onRemoveUser: () => void;
  processingAction: boolean;
}

// Función helper para nombres de roles en español
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

// Función helper para colores de roles
const getRoleBadgeColor = (role: UserRole) => {
  switch (role) {
    case 'academyDirector':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'academySubdirector':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'academyCoach':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'groupCoach':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'assistantCoach':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

export const UserCard: React.FC<UserCardProps> = ({
  user,
  isCurrentUser,
  canManageUsers,
  onChangeRole,
  onRemoveUser,
  processingAction
}) => {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex items-center gap-3">
        <div>
          <p className="font-medium text-white">{user.userEmail}</p>
          <span className={`inline-block px-2 py-1 rounded-full text-xs border ${getRoleBadgeColor(user.role)}`}>
            {getRoleDisplayName(user.role)}
          </span>
        </div>
      </div>
      
      {canManageUsers && !isCurrentUser && (
        <div className="flex gap-2">
          <button
            onClick={onChangeRole}
            disabled={processingAction}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-all duration-200 disabled:opacity-50"
          >
            Cambiar rol
          </button>
          <button
            onClick={onRemoveUser}
            disabled={processingAction}
            className="px-3 py-1 bg-red-900/50 hover:bg-red-800/50 text-red-400 text-sm rounded transition-all duration-200 disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
};