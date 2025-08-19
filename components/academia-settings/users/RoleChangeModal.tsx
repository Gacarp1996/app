// components/modals/RoleChangeModal.tsx (o donde lo tengas ubicado)
import React, { useState } from 'react';
import { AcademiaUser, UserRole } from '@/Database/FirebaseRoles';
import { TipoEntidad } from '@/types/types';
import { getRoleInfo } from '@/components/academia-settings/sections/helpers';

interface RoleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AcademiaUser | null;
  currentUserRole: UserRole | null;
  academiaType?: TipoEntidad;
  onConfirm: (userId: string, newRole: UserRole) => Promise<void>;
}

const RoleChangeModal: React.FC<RoleChangeModalProps> = ({
  isOpen,
  onClose,
  user,
  currentUserRole,
  academiaType,
  onConfirm
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !user) return null;

  // Definir roles disponibles según el tipo de academia y rol actual del usuario
  const getAvailableRoles = (): UserRole[] => {
    if (academiaType === 'grupo-entrenamiento') {
      // Para grupos de entrenamiento: no se pueden cambiar roles
      // El creador siempre es groupCoach y los demás siempre son assistantCoach
      return [];
    } else {
      // Para academias normales:
      // Los directores pueden cambiar roles entre subdirector, entrenador y director
      if (currentUserRole === 'academyDirector') {
        if (user.role === 'academyCoach') {
          // ✅ ACTUALIZADO: Puede promover a subdirector O director
          return ['academySubdirector', 'academyDirector'];
        } else if (user.role === 'academySubdirector') {
          // ✅ ACTUALIZADO: Puede promover subdirector a director o degradar a entrenador
          return ['academyCoach', 'academyDirector'];
        }
        // ⚠️ Un director NO puede degradar a otro director
      }
      return [];
    }
  };

  const availableRoles = getAvailableRoles();
  const canChangeRole = (currentUserRole === 'academyDirector' || currentUserRole === 'academySubdirector') && availableRoles.length > 0;

  const handleConfirm = async () => {
    if (!selectedRole || !user) return;
    
    setIsProcessing(true);
    try {
      await onConfirm(user.userId, selectedRole as UserRole);
      onClose();
    } catch (error) {
      console.error('Error cambiando rol:', error);
      alert('Error al cambiar el rol del usuario');
    } finally {
      setIsProcessing(false);
      setSelectedRole('');
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl w-[90vw] max-w-[600px] shadow-2xl shadow-green-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-800">
            <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              Cambiar Rol de Usuario
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-green-400 transition-all duration-200 hover:rotate-90 transform"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Contenido */}
          <div className="p-6">
            {!canChangeRole ? (
              <div className="text-center py-8">
                <p className="text-gray-400">
                  {academiaType === 'grupo-entrenamiento' 
                    ? 'En los grupos de entrenamiento personal, los roles son fijos y no se pueden cambiar.'
                    : user.role === 'academySubdirector'
                    ? 'Los subdirectores no pueden cambiar su propio rol ni el de otros usuarios.'
                    : user.role === 'academyDirector'
                    ? 'Los directores no pueden cambiar su propio rol ni el de otros directores.'
                    : 'No hay opciones de cambio de rol disponibles para este usuario.'}
                </p>
              </div>
            ) : (
              <>
                {/* Usuario seleccionado */}
                <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Usuario:</p>
                  <p className="text-lg font-medium text-white">{user.userEmail}</p>
                  {user.userName && user.userName !== user.userEmail.split('@')[0] && (
                    <p className="text-sm text-gray-400 mt-1">{user.userName}</p>
                  )}
                  <div className="mt-2">
                    <span className="text-sm text-gray-400">Rol actual: </span>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs border ${
                      getRoleInfo(user.role).bgColor
                    } ${getRoleInfo(user.role).color} ${getRoleInfo(user.role).borderColor}`}>
                      {getRoleInfo(user.role).name}
                    </span>
                  </div>
                </div>

                {/* Lista de roles disponibles */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-300">
                    {user.role === 'academyCoach' 
                      ? 'Puedes promover a este entrenador a:' 
                      : user.role === 'academySubdirector'
                      ? 'Puedes cambiar el rol de este subdirector a:'
                      : 'Selecciona el nuevo rol:'}
                  </p>
                  
                  {availableRoles.length === 0 ? (
                    <div className="text-center py-4 text-gray-400">
                      No hay cambios de rol disponibles para este usuario.
                    </div>
                  ) : (
                    availableRoles.map((role) => {
                      const roleInfo = getRoleInfo(role);
                      const isCurrentRole = role === user.role;
                      
                      return (
                        <label
                          key={role}
                          className={`block p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                            isCurrentRole
                              ? 'bg-gray-800/30 border-gray-700 opacity-50 cursor-not-allowed'
                              : selectedRole === role
                              ? `${roleInfo.bgColor} ${roleInfo.borderColor} border-2`
                              : 'bg-gray-800/20 border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={role}
                            checked={selectedRole === role}
                            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                            disabled={isCurrentRole}
                            className="sr-only"
                          />
                          <div className="flex items-start gap-3">
                            <span className="text-2xl flex-shrink-0">{roleInfo.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${roleInfo.color}`}>
                                  {roleInfo.name}
                                </span>
                                {isCurrentRole && (
                                  <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
                                    Rol actual
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-400 mt-1">
                                {roleInfo.description}
                              </p>
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>

                {/* ✅ NUEVA: Advertencia para promoción a director */}
                {selectedRole === 'academyDirector' && (user.role === 'academyCoach' || user.role === 'academySubdirector') && (
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                    <p className="text-sm text-red-400">
                      <strong>⚠️ Importante:</strong> Al promover a director, este usuario tendrá los mismos permisos que tú, incluyendo:
                    </p>
                    <ul className="text-sm text-red-400 mt-2 ml-4 list-disc">
                      <li>Gestionar todos los usuarios y sus roles</li>
                      <li>Modificar configuración de la academia</li>
                      <li>Promover a otros usuarios a director</li>
                      <li>No podrás degradar su rol posteriormente</li>
                    </ul>
                    <p className="text-sm text-yellow-400 mt-2">
                      Esta acción es <strong>irreversible</strong> sin acceso directo a la base de datos.
                    </p>
                  </div>
                )}

                {/* Advertencia para promoción a subdirector */}
                {selectedRole === 'academySubdirector' && user.role === 'academyCoach' && (
                  <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                    <p className="text-sm text-yellow-400">
                      <strong>Nota:</strong> Al promover a subdirector, este usuario podrá gestionar otros usuarios (excepto directores) y ayudar en la administración de la academia.
                    </p>
                  </div>
                )}

                {/* Advertencia para degradación a entrenador */}
                {selectedRole === 'academyCoach' && user.role === 'academySubdirector' && (
                  <div className="mt-4 p-3 bg-orange-900/20 border border-orange-700 rounded-lg">
                    <p className="text-sm text-orange-400">
                      <strong>Advertencia:</strong> Al cambiar a entrenador, este usuario perderá los permisos de gestión de usuarios y administración de la academia.
                    </p>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200"
                    disabled={isProcessing}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!selectedRole || selectedRole === user.role || isProcessing}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-600 text-black font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Cambiando...' : 'Confirmar Cambio'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleChangeModal;