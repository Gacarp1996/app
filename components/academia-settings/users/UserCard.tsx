// components/academia-settings/users/UserCard.tsx
import React from 'react';
import { AcademiaUser, UserRole } from '../../../Database/FirebaseRoles';
import { RoleBadge } from './RoleBadge';

interface UserCardProps {
  user: AcademiaUser;
  isCurrentUser: boolean;
  canManageUsers: boolean;
  currentUserRole?: UserRole | null; // ✅ NUEVA PROP
  onChangeRole: () => void;
  onRemoveUser: () => void;
  processingAction: boolean;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  isCurrentUser,
  canManageUsers,
  currentUserRole,
  onChangeRole,
  onRemoveUser,
  processingAction
}) => {
  // ✅ VALIDACIÓN: Los directores NO pueden ser eliminados por nadie
  const canBeRemoved = user.role !== 'academyDirector';
  
  // ✅ VALIDACIÓN: Solo directores pueden cambiar roles, subdirectores no pueden cambiar el rol de directores
  const canChangeThisUserRole = currentUserRole === 'academyDirector' && user.role !== 'academyDirector';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{user.userEmail}</p>
        <div className="mt-1 flex items-center gap-2">
          <RoleBadge role={user.role} />
          {isCurrentUser && (
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
              Tú
            </span>
          )}
        </div>
      </div>
      
      {canManageUsers && !isCurrentUser && (
        <div className="flex flex-wrap gap-2 sm:flex-nowrap sm:ml-4">
          {/* ✅ Botón de cambiar rol - Solo visible si se puede cambiar */}
          {canChangeThisUserRole ? (
            <button
              onClick={onChangeRole}
              disabled={processingAction}
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-all duration-200 disabled:opacity-50 min-w-[100px]"
            >
              Cambiar rol
            </button>
          ) : (
            <div className="flex-1 sm:flex-initial px-3 py-1.5 bg-gray-800/50 text-gray-500 text-sm rounded border border-gray-700 min-w-[100px] text-center cursor-not-allowed"
              title={user.role === 'academyDirector' ? 'No se puede cambiar el rol de un director' : 'Sin permisos para cambiar este rol'}
            >
              Cambiar rol
            </div>
          )}
          
          {/* ✅ Botón de eliminar - Deshabilitado para directores */}
          {canBeRemoved ? (
            <button
              onClick={onRemoveUser}
              disabled={processingAction}
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-red-900/50 hover:bg-red-800/50 text-red-400 text-sm rounded transition-all duration-200 disabled:opacity-50 min-w-[100px]"
            >
              {processingAction ? 'Eliminando...' : 'Eliminar'}
            </button>
          ) : (
            <div 
              className="flex-1 sm:flex-initial px-3 py-1.5 bg-gray-800/50 text-gray-500 text-sm rounded border border-gray-700 min-w-[100px] text-center cursor-not-allowed"
              title="Los directores no pueden ser eliminados. Deben abandonar la academia voluntariamente."
            >
              No eliminable
            </div>
          )}
        </div>
      )}
      
      {/* ✅ Mensaje informativo para el usuario actual */}
      {isCurrentUser && canManageUsers && (
        <div className="text-sm text-gray-400 sm:ml-4">
          {user.role === 'academyDirector' 
            ? 'Para abandonar, usa la opción en Gestión de Membresía'
            : 'No puedes eliminarte a ti mismo'}
        </div>
      )}
    </div>
  );
};