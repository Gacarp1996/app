// components/modals/RoleChangeModal.tsx
import React, { useState, useEffect } from 'react';
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

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  // Definir roles disponibles según el tipo de academia y rol actual del usuario
  const getAvailableRoles = (): UserRole[] => {
    if (academiaType === 'grupo-entrenamiento') {
      return [];
    } else {
      if (currentUserRole === 'academyDirector') {
        if (user.role === 'academyCoach') {
          return ['academySubdirector', 'academyDirector'];
        } else if (user.role === 'academySubdirector') {
          return ['academyCoach', 'academyDirector'];
        }
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
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Container scrolleable */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          {/* Modal */}
          <div
            className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl w-full max-w-[600px] shadow-2xl shadow-green-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl">
              {/* Header */}
              <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-xl rounded-t-xl border-b border-gray-800">
                <div className="flex justify-between items-center p-4 sm:p-6">
                  <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
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
              </div>
              
              {/* Contenido */}
              <div className="p-4 sm:p-6">
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
                    <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <p className="text-xs sm:text-sm text-gray-400 mb-1">Usuario:</p>
                      <p className="text-base sm:text-lg font-medium text-white break-all">{user.userEmail}</p>
                      {user.userName && user.userName !== user.userEmail.split('@')[0] && (
                        <p className="text-xs sm:text-sm text-gray-400 mt-1">{user.userName}</p>
                      )}
                      <div className="mt-2">
                        <span className="text-xs sm:text-sm text-gray-400">Rol actual: </span>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs border ${
                          getRoleInfo(user.role).bgColor
                        } ${getRoleInfo(user.role).color} ${getRoleInfo(user.role).borderColor}`}>
                          {getRoleInfo(user.role).name}
                        </span>
                      </div>
                    </div>

                    {/* Lista de roles disponibles */}
                    <div className="space-y-2 sm:space-y-3">
                      <p className="text-xs sm:text-sm font-medium text-gray-300">
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
                              className={`block p-3 sm:p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
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
                              <div className="flex items-start gap-2 sm:gap-3">
                                <span className="text-xl sm:text-2xl flex-shrink-0">{roleInfo.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`font-medium text-sm sm:text-base ${roleInfo.color}`}>
                                      {roleInfo.name}
                                    </span>
                                    {isCurrentRole && (
                                      <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
                                        Rol actual
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs sm:text-sm text-gray-400 mt-1">
                                    {roleInfo.description}
                                  </p>
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {/* Advertencia para promoción a director */}
                    {selectedRole === 'academyDirector' && (user.role === 'academyCoach' || user.role === 'academySubdirector') && (
                      <div className="mt-3 sm:mt-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                        <p className="text-xs sm:text-sm text-red-400">
                          <strong>⚠️ Importante:</strong> Al promover a director, este usuario tendrá los mismos permisos que tú, incluyendo:
                        </p>
                        <ul className="text-xs sm:text-sm text-red-400 mt-2 ml-4 list-disc">
                          <li>Gestionar todos los usuarios y sus roles</li>
                          <li>Modificar configuración de la academia</li>
                          <li>Promover a otros usuarios a director</li>
                          <li>No podrás degradar su rol posteriormente</li>
                        </ul>
                        <p className="text-xs sm:text-sm text-yellow-400 mt-2">
                          Esta acción es <strong>irreversible</strong> sin acceso directo a la base de datos.
                        </p>
                      </div>
                    )}

                    {/* Advertencia para promoción a subdirector */}
                    {selectedRole === 'academySubdirector' && user.role === 'academyCoach' && (
                      <div className="mt-3 sm:mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg">
                        <p className="text-xs sm:text-sm text-yellow-400">
                          <strong>Nota:</strong> Al promover a subdirector, este usuario podrá gestionar otros usuarios (excepto directores) y ayudar en la administración de la academia.
                        </p>
                      </div>
                    )}

                    {/* Advertencia para degradación a entrenador */}
                    {selectedRole === 'academyCoach' && user.role === 'academySubdirector' && (
                      <div className="mt-3 sm:mt-4 p-3 bg-orange-900/20 border border-orange-700 rounded-lg">
                        <p className="text-xs sm:text-sm text-orange-400">
                          <strong>Advertencia:</strong> Al cambiar a entrenador, este usuario perderá los permisos de gestión de usuarios y administración de la academia.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer con botones - sticky en bottom */}
              {canChangeRole && (
                <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-xl rounded-b-xl border-t border-gray-800 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                    <button
                      onClick={onClose}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200"
                      disabled={isProcessing}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirm}
                      disabled={!selectedRole || selectedRole === user.role || isProcessing}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-600 text-black font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Cambiando...' : 'Confirmar Cambio'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleChangeModal;