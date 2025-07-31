// components/academia-settings/users/RoleBadge.tsx
import React from 'react';
import { UserRole } from '../../../Database/FirebaseRoles';
import { getRoleDisplayName, getRoleBadgeColor } from '../sections/helpers';

interface RoleBadgeProps {
  role: UserRole;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role }) => {
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(role)}`}>
      {getRoleDisplayName(role)}
    </span>
  );
};