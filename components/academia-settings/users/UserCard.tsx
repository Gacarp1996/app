// components/academia-settings/users/UserCard.tsx
import React from 'react';
import { AcademiaUser } from '../../../Database/FirebaseRoles';
import { RoleBadge } from './RoleBadge';

interface UserCardProps {
  user: AcademiaUser;
  isCurrentUser: boolean;
  canManageUsers: boolean;
  onChangeRole: () => void;
  onRemoveUser: () => void;
  processingAction: boolean;
}

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
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{user.userEmail}</p>
        <div className="mt-1">
          <RoleBadge role={user.role} />
        </div>
      </div>
      
      {canManageUsers && !isCurrentUser && (
        <div className="flex gap-2 ml-4 flex-shrink-0">
          <button
            onClick={onChangeRole}
            disabled={processingAction}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-all duration-200 disabled:opacity-50"
          >
            Cambiar rol
          </button>
          <button
            onClick={onRemoveUser}
            disabled={processingAction}
            className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800/50 text-red-400 text-sm rounded transition-all duration-200 disabled:opacity-50"
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
};