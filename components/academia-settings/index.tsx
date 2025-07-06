// components/academia-settings/index.tsx
import React from 'react';
import { AcademiaUser, UserRole } from '../../Database/FirebaseRoles';

// UserCard Component
export const UserCard: React.FC<{
  user: AcademiaUser;
  isCurrentUser: boolean;
  canManageUsers: boolean;
  onChangeRole: () => void;
  onRemoveUser: () => void;
  processingAction: boolean;
}> = ({ user, isCurrentUser, canManageUsers, onChangeRole, onRemoveUser, processingAction }) => {
  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'director':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'subdirector':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'entrenador':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700">
      <div className="flex items-center gap-3">
        <div>
          <p className="font-medium text-white">{user.userEmail}</p>
          <span className={`inline-block px-2 py-1 rounded-full text-xs border ${getRoleBadgeColor(user.role)}`}>
            {user.role}
          </span>
        </div>
        {isCurrentUser && (
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
            (Tú)
          </span>
        )}
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

// AcademiaInfoSection Component
export const AcademiaInfoSection: React.FC<{
  academiaName: string;
  academiaId: string;
}> = ({ academiaName, academiaId }) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg shadow-lg mb-6 border border-gray-700">
      <h2 className="text-2xl font-semibold text-green-400 mb-4">Información de la Academia</h2>
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-400">Nombre:</p>
          <p className="text-lg font-medium text-white">{academiaName}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">ID de acceso:</p>
          <p className="text-lg font-mono text-green-400 bg-gray-800 px-3 py-1 rounded inline-block mt-1">{academiaId}</p>
        </div>
      </div>
    </div>
  );
};

// UserProfileSection Component
export const UserProfileSection: React.FC<{
  userEmail?: string;
  currentRole?: string;
}> = ({ userEmail, currentRole }) => {
  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case 'director':
        return 'Director';
      case 'subdirector':
        return 'Subdirector';
      case 'entrenador':
        return 'Entrenador';
      default:
        return 'Sin rol';
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'director':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'subdirector':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'entrenador':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg shadow-lg mb-6 border border-gray-700">
      <h2 className="text-2xl font-semibold text-green-400 mb-4">Tu Perfil</h2>
      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-400">Email:</p>
          <p className="text-lg font-medium text-white">{userEmail || 'No disponible'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-2">Rol actual:</p>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(currentRole)}`}>
            {getRoleDisplayName(currentRole)}
          </span>
        </div>
      </div>
    </div>
  );
};

// DeleteAcademiaSection Component
export const DeleteAcademiaSection: React.FC<{
  onDeleteClick: () => void;
  processingAction: boolean;
}> = ({ onDeleteClick, processingAction }) => {
  return (
    <div className="bg-red-900/20 backdrop-blur-sm p-6 rounded-lg shadow-lg mb-6 border border-red-700">
      <h2 className="text-2xl font-semibold text-red-400 mb-4">Zona de Peligro</h2>
      <p className="text-gray-300 mb-4">
        Esta acción eliminará permanentemente la academia y todos sus datos asociados.
      </p>
      <button
        onClick={onDeleteClick}
        disabled={processingAction}
        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Eliminar Academia
      </button>
    </div>
  );
};

// ChangeAcademiaSection Component
export const ChangeAcademiaSection: React.FC<{
  onChangeAcademia: () => void;
}> = ({ onChangeAcademia }) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg shadow-lg mb-6 border border-gray-700">
      <h2 className="text-2xl font-semibold text-green-400 mb-4">Cambiar de Academia</h2>
      <p className="text-gray-300 mb-4">
        Selecciona otra academia o crea una nueva.
      </p>
      <button
        onClick={onChangeAcademia}
        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-lg transition-all duration-200"
      >
        Cambiar Academia
      </button>
    </div>
  );
};

// LoadingSpinner Component
export const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
      {message && <p className="mt-4 text-gray-400">{message}</p>}
    </div>
  );
};

// PermissionError Component
export const PermissionError: React.FC<{
  onRetry: () => void;
  onGoHome: () => void;
}> = ({ onRetry, onGoHome }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="bg-red-900/20 backdrop-blur-sm p-8 rounded-lg border border-red-700 max-w-md">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Sin Permisos</h2>
        <p className="text-gray-300 mb-6">
          No tienes permisos para acceder a esta sección. Contacta con el director de la academia.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-600"
          >
            Reintentar
          </button>
          <button
            onClick={onGoHome}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200"
          >
            Ir al Inicio
          </button>
        </div>
      </div>
    </div>
  );
};