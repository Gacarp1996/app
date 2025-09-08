// app/components/security/SecureRoleManagerV2.tsx
import React, { useState, useEffect } from 'react';
import { secureRoleService, UserRole } from '../../services/SecureRoleService';
import { useAcademia } from '../../contexts/AcademiaContext';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: string;
  email: string;
  displayName?: string;
  currentRole?: UserRole | null;
}

interface SecureRoleManagerV2Props {
  users: User[];
  onUserUpdate?: (userId: string, newRole: UserRole) => void;
}

const ROLES = [
  { value: 'academyDirector', label: 'Director de Academia', level: 5, color: 'bg-purple-100 text-purple-800' },
  { value: 'academySubdirector', label: 'Subdirector', level: 4, color: 'bg-blue-100 text-blue-800' },
  { value: 'academyCoach', label: 'Entrenador de Academia', level: 3, color: 'bg-green-100 text-green-800' },
  { value: 'groupCoach', label: 'Entrenador de Grupo', level: 2, color: 'bg-yellow-100 text-yellow-800' },
  { value: 'assistantCoach', label: 'Asistente de Entrenador', level: 1, color: 'bg-gray-100 text-gray-800' }
] as const;

export const SecureRoleManagerV2: React.FC<SecureRoleManagerV2Props> = ({ 
  users, 
  onUserUpdate 
}) => {
  const { academiaActual } = useAcademia();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usersWithRoles, setUsersWithRoles] = useState<Array<User & { currentRole: UserRole | null }>>([]);

  useEffect(() => {
    if (academiaActual?.id && currentUser) {
      loadUserPermissions();
      loadUsersWithRoles();
    }
  }, [academiaActual, currentUser]);

  const loadUserPermissions = async () => {
    try {
      if (!academiaActual?.id || !currentUser) return;

      setLoading(true);
      
      // 🛡️ OBTENER ROL ACTUAL DESDE FIRESTORE SEGURO
      const userRole = await secureRoleService.getUserRole(currentUser.uid, academiaActual.id);
      setCurrentUserRole(userRole);

      // 🛡️ VERIFICAR PERMISOS DE GESTIÓN
      const managementPermission = await secureRoleService.canManageUsers(currentUser.uid, academiaActual.id);
      setCanManage(managementPermission.hasPermission);

      if (!managementPermission.hasPermission) {
        setError(managementPermission.reason || 'Sin permisos de gestión');
      }

    } catch (error) {
      console.error('Error cargando permisos:', error);
      setError('Error al verificar permisos');
      setCanManage(false);
    } finally {
      setLoading(false);
    }
  };

  const loadUsersWithRoles = async () => {
    try {
      if (!academiaActual?.id) return;

      // Cargar roles de todos los usuarios
      const usersWithCurrentRoles = await Promise.all(
        users.map(async (user) => {
          const role = await secureRoleService.getUserRole(user.id, academiaActual.id);
          return {
            ...user,
            currentRole: role
          };
        })
      );

      setUsersWithRoles(usersWithCurrentRoles);
    } catch (error) {
      console.error('Error cargando roles de usuarios:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      if (!academiaActual?.id || !currentUser) {
        throw new Error('Información de academia o usuario no disponible');
      }

      setLoading(true);
      setError(null);

      // 🛡️ ASIGNAR ROL USANDO SERVICIO SEGURO
      const result = await secureRoleService.assignRole(
        userId,
        academiaActual.id,
        newRole,
        `Cambio de rol realizado por ${currentUser.email}`
      );

      if (result.success) {
        // Actualizar estado local
        setUsersWithRoles(prev => 
          prev.map(user => 
            user.id === userId 
              ? { ...user, currentRole: newRole }
              : user
          )
        );

        // Notificar al componente padre
        onUserUpdate?.(userId, newRole);

        // Mostrar éxito
        alert(`✅ ${result.message}`);
      } else {
        throw new Error(result.message);
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

  const canAssignRole = (roleToAssign: UserRole): boolean => {
    if (!currentUserRole) return false;

    const currentRoleLevel = ROLES.find(r => r.value === currentUserRole)?.level || 0;
    const assignRoleLevel = ROLES.find(r => r.value === roleToAssign)?.level || 0;

    // Solo puede asignar roles de nivel inferior al suyo
    return currentRoleLevel > assignRoleLevel;
  };

  const getRoleInfo = (role: UserRole | null) => {
    if (!role) return { label: 'Sin rol', color: 'bg-red-100 text-red-800' };
    return ROLES.find(r => r.value === role) || { label: role, color: 'bg-gray-100 text-gray-800' };
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
              🚫 Acceso Denegado
            </h3>
            <p className="text-sm text-red-700 mt-1">
              No tienes permisos para gestionar roles de usuarios.<br/>
              <strong>Motivo:</strong> {error}
            </p>
            <p className="text-xs text-red-600 mt-2">
              Tu rol actual: <strong>{currentUserRole || 'Sin rol asignado'}</strong><br/>
              Se requiere: <strong>Director</strong> o <strong>Subdirector</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con información de seguridad */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-green-900 mb-2">
          🛡️ Gestión Segura de Roles (Sin Cloud Functions)
        </h3>
        <p className="text-sm text-green-700">
          Los cambios se validan con <strong>Firestore Security Rules</strong> y se registran en el log de auditoría.
        </p>
        <div className="grid grid-cols-2 gap-4 mt-3 text-xs text-green-600">
          <div>
            <strong>Tu rol:</strong> {getRoleInfo(currentUserRole).label}
          </div>
          <div>
            <strong>Academia:</strong> {academiaActual?.nombre}
          </div>
          <div>
            <strong>Validación:</strong> Firestore Rules (Servidor)
          </div>
          <div>
            <strong>Estado:</strong> ✅ Listo para Cloud Functions
          </div>
        </div>
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
          {usersWithRoles.map((user) => {
            const roleInfo = getRoleInfo(user.currentRole);
            return (
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
                    <div className="text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                    <select
                      className="rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm disabled:bg-gray-100"
                      value={user.currentRole || ''}
                      onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
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
            );
          })}
        </ul>
      </div>

      {/* Security Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              🔄 Sistema Híbrido Implementado
            </h3>
            <div className="text-sm text-blue-700 mt-1 space-y-1">
              <p>✅ <strong>Validación server-side:</strong> Firestore Security Rules</p>
              <p>✅ <strong>Logs de auditoría:</strong> Cada cambio registrado</p>
              <p>✅ <strong>Jerarquía de roles:</strong> Solo puedes asignar roles inferiores</p>
              <p>🚀 <strong>Cloud Functions:</strong> Listo para activar con upgrade</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureRoleManagerV2;
