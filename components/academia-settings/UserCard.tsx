import React from 'react';
import { AcademiaUser } from '../../Database/FirebaseRoles';
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
    <div className="bg-app-surface-alt p-4 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex-grow">
        <p className="text-app-primary font-medium">{user.userName || user.userEmail}</p>
        <p className="text-app-secondary text-sm">{user.userEmail}</p>
        <div className="mt-2">
          <RoleBadge role={user.role} />
          {isCurrentUser && (
            <span className="ml-2 text-xs text-app-secondary">(Tú)</span>
          )}
        </div>
      </div>
      
      {canManageUsers && !isCurrentUser && (
        <div className="flex gap-2">
          <button
            onClick={onChangeRole}
            className="app-button btn-primary text-sm px-3 py-1"
            disabled={processingAction}
          >
            Cambiar Rol
          </button>
          <button
            onClick={onRemoveUser}
            className="app-button btn-danger text-sm px-3 py-1"
            disabled={processingAction}
          >
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
};
