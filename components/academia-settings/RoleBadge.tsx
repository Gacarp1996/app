import React from 'react';
import { UserRole } from '../../Database/FirebaseRoles';

interface RoleBadgeProps {
  role: UserRole;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'director':
        return 'bg-red-500 text-white';
      case 'subdirector':
        return 'bg-orange-500 text-white';
      case 'entrenador':
        return 'bg-blue-500 text-white';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'director':
        return 'Director';
      case 'subdirector':
        return 'Subdirector';
      case 'entrenador':
        return 'Entrenador';
    }
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(role)}`}>
      {getRoleDisplayName(role)}
    </span>
  );
};

