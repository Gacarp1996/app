// components/academia-settings/users/UserManagementSection.tsx
import React from 'react';
import { AcademiaUser, UserRole } from '../../../Database/FirebaseRoles';
import { UserCard } from './UserCard';

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

  // ✅ Contar directores para mostrar información útil
  const directorCount = users.filter(u => u.role === 'academyDirector').length;

  return (
    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white leading-tight">Gestión de Usuarios</h2>
            <p className="text-sm text-gray-400 mt-1">
              {users.length} usuario{users.length !== 1 ? 's' : ''} • {directorCount} director{directorCount !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* ✅ Mensaje informativo sobre directores */}
      {currentUserRole === 'academyDirector' && directorCount > 1 && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
          <p className="text-sm text-blue-400 flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Hay {directorCount} directores en esta academia. Los directores no pueden ser eliminados, solo pueden abandonar voluntariamente desde "Gestión de Membresía".
            </span>
          </p>
        </div>
      )}

      <div className="space-y-3">
        {users.map((user) => (
          <UserCard
            key={user.userId}
            user={user}
            isCurrentUser={currentUserId === user.userId}
            canManageUsers={canManageUsers}
            currentUserRole={currentUserRole} // ✅ PASAR EL ROL ACTUAL
            processingAction={typeof processingAction === 'string' && processingAction === user.userId}
            onRemoveUser={() => void onRemoveUser(user.userId)}
            onChangeRole={() => onChangeRole(user.userId)}
          />
        ))}
      </div>
    </div>
  );
};