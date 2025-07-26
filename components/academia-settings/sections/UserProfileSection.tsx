// components/academia-settings/sections/UserProfileSection.tsx
import React from 'react';
import { UserRole } from '../../../Database/FirebaseRoles';
import { RoleBadge } from '../users/RoleBadge';

interface UserProfileSectionProps {
  userEmail: string | null | undefined;
  currentRole: UserRole | null;
}

export const UserProfileSection: React.FC<UserProfileSectionProps> = ({ 
  userEmail, 
  currentRole 
}) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Mi Perfil</h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-gray-400 text-sm mb-1">Email:</p>
          <p className="text-white font-semibold">{userEmail || 'No disponible'}</p>
        </div>
        
        <div>
          <p className="text-gray-400 text-sm mb-2">Rol actual:</p>
          {currentRole ? (
            <RoleBadge role={currentRole} />
          ) : (
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
              Sin rol
            </span>
          )}
        </div>
      </div>
    </div>
  );
};