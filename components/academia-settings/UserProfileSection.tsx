import React from 'react';
import { UserRole } from '../../Database/FirebaseRoles';
import { RoleBadge } from './RoleBadge';

interface UserProfileSectionProps {
  userEmail: string | null | undefined;
  currentRole: UserRole | null;
}

export const UserProfileSection: React.FC<UserProfileSectionProps> = ({ 
  userEmail, 
  currentRole 
}) => {
  return (
    <div className="bg-app-surface p-6 rounded-lg shadow-lg mb-6">
      <h2 className="text-2xl font-semibold text-app-accent mb-4">Mi Perfil</h2>
      <div className="space-y-2">
        <p className="text-app-primary">
          <span className="font-semibold">Email:</span> {userEmail}
        </p>
        <p className="text-app-primary">
          <span className="font-semibold">Mi rol:</span>{' '}
          {currentRole ? (
            <RoleBadge role={currentRole} />
          ) : (
            <span className="text-app-secondary italic">Sin rol asignado</span>
          )}
        </p>
      </div>
    </div>
  );
};