// app/components/security/SecureRoleManager.tsx
import React, { useState, useEffect } from 'react';
import { jwtService } from '../../services/JWTService';
import { useAcademia } from '../../contexts/AcademiaContext';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: string;
  email: string;
  displayName?: string;
  role?: string;
}

interface SecureRoleManagerProps {
  users: User[];
  onUserUpdate?: (userId: string, newRole: string) => void;
}

const ROLES = [
  { value: 'academyDirector', label: 'Director de Academia', level: 5 },
  { value: 'academySubdirector', label: 'Subdirector', level: 4 },
  { value: 'academyCoach', label: 'Entrenador de Academia', level: 3 },
  { value: 'groupCoach', label: 'Entrenador de Grupo', level: 2 },
  { value: 'assistantCoach', label: 'Asistente de Entrenador', level: 1 }
];

export const SecureRoleManager: React.FC<SecureRoleManagerProps> = ({ 
  users, 
  onUserUpdate 
}) => {
  const { academiaActual } = useAcademia();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [userClaims, setUserClaims] = useState<any>(null);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPermissions();
  }, [academiaActual]);

  const checkPermissions = async () => {
    try {
      if (!academiaActual?.id || !currentUser) return;

      setLoading(true);
      
      // 🛡️ VERIFICAR PERMISOS DESDE EL SERVIDOR
      const canManageUsers = await jwtService.canManageUsers(academiaActual.id);
      setCanManage(canManageUsers);

      // 🔥 OBTENER CLAIMS ACTUALES
      const claims = await jwtService.getUserClaims();
      setUserClaims(claims.claims);

    } catch (error) {
      console.error('Error verificando permisos:', error);
      setError('Error al verificar permisos de gestión');
      setCanManage(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      if (!academiaActual?.id || !currentUser) {
        throw new Error('Información de academia o usuario no disponible');
      }

      setLoading(true);
      setError(null);

      // 🛡️ VERIFICAR PERMISOS ANTES DE ACTUALIZAR
      await jwtService.requirePermission(
        academiaActual.id,
        'academySubdirector',
        `change_role_to_${newRole}`
      );

      // 🔥 ACTUALIZAR ROL VÍA CLOUD FUNCTION
      const result = await jwtService.updateUserRole(
        userId,
        academiaActual.id,
        newRole,
        currentUser.uid
      );

      if (result.success) {
        // Notificar al componente padre
        onUserUpdate?.(userId, newRole);
        
        // Recargar permisos
        await checkPermissions();

        alert('✅ Rol actualizado correctamente');
      } else {
        throw new Error(result.message || 'Error al actualizar rol');
      }

    } catch (error) {
      console.error('Error updating role:', error);
      setError(
        error instanceof Error 
          ? error.message 
          : 'Error desconocido al actualizar rol'
      );
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUserRole = () => {
    if (!userClaims || !academiaActual?.id) return null;
    return userClaims.academias?.[academiaActual.id]?.role || null;
  };

  const canAssignRole = (roleToAssign: string): boolean => {
    const currentRole = getCurrentUserRole();
    if (!currentRole) return false;

    const currentRoleLevel = ROLES.find(r => r.value === currentRole)?.level || 0;
    const assignRoleLevel = ROLES.find(r => r.value === roleToAssign)?.level || 0;

    // Solo puede asignar roles de nivel inferior al suyo
    return currentRoleLevel > assignRoleLevel;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Verificando permisos...</span>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Acceso Denegado
            </h3>
            <p className="text-sm text-red-700 mt-1">
              No tienes permisos para gestionar roles de usuarios. Se requiere rol de Subdirector o Director.
            </p>
            <p className="text-xs text-red-600 mt-2">
              Tu rol actual: <strong>{getCurrentUserRole() || 'Sin rol asignado'}</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con información de seguridad */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">
          🛡️ Gestión Segura de Roles
        </h3>
        <p className="text-sm text-blue-700">
          Los cambios de roles se validan en el servidor y se registran en el log de auditoría.
        </p>
        <p className="text-xs text-blue-600 mt-1">
          Tu rol: <strong>{getCurrentUserRole()}</strong> | 
          Academia: <strong>{academiaActual?.nombre}</strong>
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users.map((user) => (
            <li key={user.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.displayName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {user.displayName || user.email}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    Rol actual: <span className="font-medium">{user.role || 'Sin asignar'}</span>
                  </div>
                  <select
                    className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    value={user.role || ''}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={loading}
                  >
                    <option value="">Seleccionar rol</option>
                    {ROLES.map((role) => (
                      <option 
                        key={role.value} 
                        value={role.value}
                        disabled={!canAssignRole(role.value)}
                      >
                        {role.label} {!canAssignRole(role.value) ? '(Sin permisos)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Security Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Aviso de Seguridad
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              • Solo puedes asignar roles de nivel inferior al tuyo<br/>
              • Todos los cambios se registran en el log de auditoría<br/>
              • Los permisos se validan en tiempo real desde el servidor
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureRoleManager;
