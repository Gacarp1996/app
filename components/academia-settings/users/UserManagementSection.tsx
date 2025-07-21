// components/academia-settings/users/UserManagementSection.tsx
import React from 'react';
import { AcademiaUser, UserRole } from '../../../Database/FirebaseRoles';
import { UserCard } from './UserCard'; // Import directo, no circular

interface UserManagementSectionProps {
  users: AcademiaUser[];
  currentUserId: string | undefined;
  currentUserRole: UserRole | null;
  loading: boolean;
  processingAction: string | boolean;
  onRemoveUser: (userId: string) => Promise<void>;
  onChangeRole: (userId: string) => void;
}

export const UserManagementSection: React.FC<UserManagementSectionProps> = ({
  users,
  currentUserId,
  currentUserRole,
  loading,
  processingAction,
  onRemoveUser,
  onChangeRole
}) => {
  const canManageUsers = currentUserRole === 'academyDirector' || currentUserRole === 'academySubdirector';

  if (loading) {
    return (
      <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white leading-tight">Gestión de Usuarios</h2>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
          <p className="mt-2 text-gray-400">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-500/20 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white leading-tight">Gestión de Usuarios</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => (
          <UserCard
            key={user.userId}
            user={user}
            isCurrentUser={currentUserId === user.userId}
            canManageUsers={canManageUsers}
            processingAction={typeof processingAction === 'string' && processingAction === user.userId}
            onRemoveUser={() => void onRemoveUser(user.userId)}
            onChangeRole={() => onChangeRole(user.userId)}
          />
        ))}
      </div>
    </div>
  );
};