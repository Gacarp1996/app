// components/academia-settings/sections/MainConfigModal.tsx
import React, { useState, useEffect } from 'react';
import { AcademiaUser, UserRole } from '../../../Database/FirebaseRoles';
import { TipoEntidad } from '../../../types/types';
import { UserManagementSection } from '../users/UserManagementSection';
import { AcademiaInfoSection } from '../sections/AcademiaInfoSection';
import { PendingRequestsSection } from '../sections/PendingRequestsSection';
import { 
  copyToClipboard,
  shouldShowUserManagement,
  shouldShowEntityInfo,
  shouldShowAdvancedConfig,
  shouldShowDeleteOption,
  generatePublicIdForGroup
} from './helpers';
import { RoleBadge } from '../users/RoleBadge';

// Componente para mostrar la información del perfil del usuario
const UserProfileSection: React.FC<{
  currentUserEmail: string | null | undefined;
  currentUserRole: UserRole | null;
}> = ({ currentUserEmail, currentUserRole }) => (
  <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 bg-blue-500/20 rounded-lg">
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-white leading-none">Mi Perfil</h2>
    </div>
    
    <div className="space-y-4">
      <div>
        <p className="text-gray-400 text-sm mb-1">Email:</p>
        <p className="text-white font-semibold">{currentUserEmail || 'No disponible'}</p>
      </div>
      
      <div>
        <p className="text-gray-400 text-sm mb-2">Rol actual:</p>
        {currentUserRole ? (
          <RoleBadge role={currentUserRole} />
        ) : (
          <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
            Sin rol
          </span>
        )}
      </div>
    </div>
  </div>
);

// Componente para la información de grupo de entrenamiento
const GroupInfoSection: React.FC<{
  groupName: string;
  groupId: string;
}> = ({ groupName, groupId }) => {
  const [publicId, setPublicId] = useState<string | null>(null);
  const [loadingPublicId, setLoadingPublicId] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadPublicId = async () => {
      try {
        const generatedId = generatePublicIdForGroup(groupId);
        setPublicId(generatedId);
      } catch (error) {
        console.error('Error generando ID público del grupo:', error);
        setPublicId(null);
      } finally {
        setLoadingPublicId(false);
      }
    };

    loadPublicId();
  }, [groupId]);

  const handleCopyId = async () => {
    if (!publicId) return;
    
    const success = await copyToClipboard(publicId);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Información del Grupo</h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-gray-400 text-sm mb-1">Nombre del Grupo:</p>
          <p className="text-white font-semibold text-lg">{groupName}</p>
        </div>
        
        <div>
          <p className="text-gray-400 text-sm mb-2">ID del Grupo:</p>
          {loadingPublicId ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              <span className="text-gray-500">Generando ID...</span>
            </div>
          ) : publicId ? (
            <div className="flex items-center gap-3">
              <code className="text-blue-400 font-mono text-xl font-bold bg-gray-900/50 px-3 py-2 rounded border tracking-wider">
                {publicId}
              </code>
              <button
                onClick={handleCopyId}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors group relative"
                title="Copiar ID"
              >
                {copied ? (
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              {copied && (
                <span className="text-green-400 text-sm font-medium animate-fade-in">
                  ¡Copiado!
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-400">Error generando ID público</span>
            </div>
          )}
          
          <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Comparte este código de 6 caracteres con entrenadores asistentes para que puedan unirse a tu grupo personal.
                Tu grupo puede tener hasta 3 jugadores.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface MainConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Información de la entidad (academia o grupo)
  entityName: string;
  entityId: string;
  entityType: TipoEntidad;
  // User data
  users: AcademiaUser[];
  currentUserId: string | undefined;
  currentUserEmail: string | null | undefined;
  currentUserRole: UserRole | null;
  loadingUsers: boolean;
  processingAction: string | boolean;
  // Actions
  onRemoveUser: (userId: string) => Promise<void>;
  onChangeRole: (userId: string) => void;
  onChangeAcademia: () => void;
  onDeleteEntity: () => void;
  onOpenAdvancedConfig: () => void;
  onReloadUsers?: () => Promise<void>; // ✅ NUEVA: Función para recargar usuarios tras procesar solicitudes
}

export const MainConfigModal: React.FC<MainConfigModalProps> = ({
  isOpen,
  onClose,
  entityName,
  entityId,
  entityType,
  users,
  currentUserId,
  currentUserEmail,
  currentUserRole,
  loadingUsers,
  processingAction,
  onRemoveUser,
  onChangeRole,
  onChangeAcademia,
  onDeleteEntity,
  onOpenAdvancedConfig,
  onReloadUsers // ✅ NUEVA prop para recargar usuarios
}) => {
  if (!isOpen) return null;

  // Determinar qué secciones mostrar según el rol y tipo de entidad
  const showUserManagement = shouldShowUserManagement(currentUserRole, entityType);
  const showEntityInfo = shouldShowEntityInfo(currentUserRole);
  const showAdvancedConfig = shouldShowAdvancedConfig(currentUserRole);
  const showDeleteOption = shouldShowDeleteOption(currentUserRole);

  // Títulos dinámicos según el tipo de entidad
  const isAcademia = entityType === 'academia';
  const deleteButtonText = isAcademia ? 'Eliminar Academia' : 'Eliminar Grupo';
  const deleteWarningText = isAcademia 
    ? 'Esta acción eliminará permanentemente la academia y todos sus datos asociados.'
    : 'Esta acción eliminará permanentemente el grupo de entrenamiento y todos sus datos asociados.';
  const configTitle = isAcademia ? 'Configuración de Academia' : 'Configuración de Grupo';
  const advancedConfigTitle = isAcademia ? 'Configuración Avanzada de Academia' : 'Configuración Avanzada de Grupo';

  return (
    <>
      {/* Overlay con efecto blur */}
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100]" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-2 sm:p-4">
        <div
          className="relative bg-gray-900/95 backdrop-blur-xl rounded-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] shadow-2xl shadow-green-500/20 border border-gray-800 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-800">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-green-500/20 rounded-lg">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                <span className="hidden sm:inline">{configTitle}</span>
                <span className="sm:hidden">Configuración</span>
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-green-400 transition-all duration-200 hover:rotate-90 transform p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Contenido del Modal */}
          <div className="p-3 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)] scrollbar-thin scrollbar-track-gray-800/30 scrollbar-thumb-gray-600/60 hover:scrollbar-thumb-gray-500/80">
            <div className="space-y-4 sm:space-y-6">
              
              {/* SECCIÓN 1: Gestión de usuarios - Solo para academyDirector (academia) y groupCoach (grupo) */}
              {showUserManagement && (
                <UserManagementSection
                  users={users}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  loading={loadingUsers}
                  processingAction={processingAction}
                  onRemoveUser={onRemoveUser}
                  onChangeRole={onChangeRole}
                />
              )}

              {/* SECCIÓN 2: Información de la entidad - Solo para academyDirector y groupCoach */}
              {showEntityInfo && entityId && (
                isAcademia ? (
                  <AcademiaInfoSection 
                    academiaName={entityName} 
                    academiaId={entityId} 
                  />
                ) : (
                  <GroupInfoSection 
                    groupName={entityName} 
                    groupId={entityId} 
                  />
                )
              )}

              {/* SECCIÓN 2.5: Solicitudes Pendientes - Solo para academyDirector */}
              {currentUserRole === 'academyDirector' && entityId && (
                <PendingRequestsSection 
                  academiaId={entityId}
                  onRequestProcessed={onReloadUsers} // ✅ CONECTAR callback para recargar usuarios
                />
              )}

              {/* SECCIÓN 3: Mi Perfil - Todos los roles lo ven */}
              <UserProfileSection 
                currentUserEmail={currentUserEmail}
                currentUserRole={currentUserRole}
              />

              {/* SECCIÓN 4: Configuración Avanzada - Solo academyDirector, academySubdirector y groupCoach */}
              {showAdvancedConfig && (
                <div className="bg-gray-800/50 p-3 sm:p-6 rounded-xl border border-gray-700">
                  {/* Header con título e icono */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-3">
                    <div className="p-1.5 sm:p-2 bg-purple-500/20 rounded-lg">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-white leading-none">Configuración Avanzada</h3>
                      <p className="text-gray-400 text-xs sm:text-sm mt-1">
                        {isAcademia ? 'Estructura de ejercicios y encuestas de la academia' : 'Estructura de ejercicios y encuestas del grupo'}
                      </p>
                    </div>
                    {/* Botón en desktop - oculto en móvil */}
                    <div className="hidden sm:block">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (typeof onOpenAdvancedConfig === 'function') {
                            onOpenAdvancedConfig();
                          }
                        }}
                        type="button"
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
                      >
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Configurar
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Botón en móvil - debajo del título */}
                  <div className="block sm:hidden">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (typeof onOpenAdvancedConfig === 'function') {
                          onOpenAdvancedConfig();
                        }
                      }}
                      type="button"
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 text-sm"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Configurar
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* SECCIÓN 5: Zona de Peligro - Solo academyDirector (academia) y groupCoach (grupo) */}
              {showDeleteOption && (
                <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 p-3 sm:p-6 rounded-xl border border-red-500/30 shadow-lg">
                  {/* Header con título e icono */}
                  <div className="flex items-center gap-2 sm:gap-3 mb-3">
                    <div className="p-1.5 sm:p-2 bg-red-500/20 rounded-lg">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base sm:text-xl font-bold text-red-400 leading-none">Zona de Peligro</h2>
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-3 text-sm sm:text-base leading-relaxed">
                    {deleteWarningText} No se puede deshacer esta operación.
                  </p>
                  
                  {/* Botón debajo del texto en móvil y desktop */}
                  <div className="flex justify-center sm:justify-end">
                    <button
                      onClick={onDeleteEntity}
                      disabled={typeof processingAction === 'string' ? false : processingAction}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none shadow-lg shadow-red-500/25 text-sm sm:text-base"
                    >
                    {typeof processingAction === 'boolean' && processingAction ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Eliminando...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {deleteButtonText}
                      </span>
                    )}
                  </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
};