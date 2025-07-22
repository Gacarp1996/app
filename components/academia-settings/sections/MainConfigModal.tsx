// components/academia-settings/sections/MainConfigModal.tsx
import React, { useState, useEffect } from 'react';
import { AcademiaUser, UserRole } from '../../../Database/FirebaseRoles';
import { TipoEntidad } from '../../../types';
import { UserManagementSection } from '../users/UserManagementSection';
import { AcademiaInfoSection } from '../sections/AcademiaInfoSection';

// Función helper para nombres de roles en español
const getRoleDisplayName = (role?: UserRole | null) => {
  if (!role) return 'Sin rol';
  
  switch (role) {
    case 'academyDirector':
      return 'Director';
    case 'academySubdirector':
      return 'Subdirector';
    case 'academyCoach':
      return 'Entrenador';
    case 'groupCoach':
      return 'Entrenador de Grupo';
    case 'assistantCoach':
      return 'Entrenador Asistente';
    default:
      return 'Sin rol';
  }
};

// Función helper para colores de roles
const getRoleBadgeColor = (role?: UserRole | null) => {
  if (!role) return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  
  switch (role) {
    case 'academyDirector':
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'academySubdirector':
      return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
    case 'academyCoach':
      return 'bg-green-500/20 text-green-400 border border-green-500/30';
    case 'groupCoach':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'assistantCoach':
      return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  }
};

// FUNCIONES DE LÓGICA CONDICIONAL
const shouldShowUserManagement = (role: UserRole | null, entityType: TipoEntidad) => {
  // En academias: solo academyDirector puede gestionar usuarios
  if (entityType === 'academia') {
    return role === 'academyDirector';
  }
  // En grupos: solo groupCoach puede gestionar usuarios
  if (entityType === 'grupo-entrenamiento') {
    return role === 'groupCoach';
  }
  return false;
};

const shouldShowEntityInfo = (role: UserRole | null) => {
  // Tanto directores de academia como coaches de grupo pueden ver info de su entidad
  return role === 'academyDirector' || role === 'groupCoach';
};

const shouldShowAdvancedConfig = (role: UserRole | null) => {
  // En academias: director y subdirector
  // En grupos: solo groupCoach
  return ['academyDirector', 'academySubdirector', 'groupCoach'].includes(role || '');
};

const shouldShowDeleteOption = (role: UserRole | null) => {
  // Solo directores de academia y coaches de grupo pueden eliminar su entidad
  return role === 'academyDirector' || role === 'groupCoach';
};

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
        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(currentUserRole)}`}>
          {getRoleDisplayName(currentUserRole)}
        </span>
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
        // Validar que groupId existe y no está vacío
        if (!groupId || typeof groupId !== 'string' || groupId.trim() === '') {
          console.warn('GroupId no válido:', groupId);
          setPublicId(null);
          return;
        }

        // Para grupos de entrenamiento, generamos un ID público simple
        // basado en los primeros 6 caracteres del Firebase ID
        if (groupId.length >= 6) {
          // Generar ID público de 6 caracteres a partir del groupId
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let generatedId = '';
          
          // Usar el groupId como semilla para generar un ID consistente
          for (let i = 0; i < 6; i++) {
            const charIndex = (groupId.charCodeAt(i % groupId.length) + i) % chars.length;
            generatedId += chars[charIndex];
          }
          
          setPublicId(generatedId);
        } else {
          // Fallback: usar el groupId completo en mayúsculas si es menor a 6 caracteres
          // Completar con caracteres adicionales si es necesario
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          let paddedId = groupId.toUpperCase();
          
          // Rellenar hasta 6 caracteres si es más corto
          while (paddedId.length < 6) {
            paddedId += chars[paddedId.length % chars.length];
          }
          
          setPublicId(paddedId.substring(0, 6));
        }
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
    
    try {
      await navigator.clipboard.writeText(publicId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copiando al portapapeles:', error);
      // Fallback para navegadores que no soportan clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = publicId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        console.error('Error en fallback de copia:', fallbackError);
      }
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
  onOpenAdvancedConfig
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
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div
          className="relative bg-gray-900/95 backdrop-blur-xl rounded-xl w-full max-w-4xl max-h-[90vh] shadow-2xl shadow-green-500/20 border border-gray-800 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                {configTitle}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-green-400 transition-all duration-200 hover:rotate-90 transform"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Contenido del Modal */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] scrollbar-thin scrollbar-track-gray-800/30 scrollbar-thumb-gray-600/60 hover:scrollbar-thumb-gray-500/80">
            <div className="space-y-6">
              
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

              {/* SECCIÓN 3: Mi Perfil - Todos los roles lo ven */}
              <UserProfileSection 
                currentUserEmail={currentUserEmail}
                currentUserRole={currentUserRole}
              />

              {/* SECCIÓN 4: Configuración Avanzada - Solo academyDirector, academySubdirector y groupCoach */}
              {showAdvancedConfig && (
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white leading-none">Configuración Avanzada</h3>
                        <p className="text-gray-400 text-sm">
                          {isAcademia ? 'Estructura de ejercicios y encuestas de la academia' : 'Estructura de ejercicios y encuestas del grupo'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={onOpenAdvancedConfig}
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
              )}

              {/* SECCIÓN 5: Zona de Peligro - Solo academyDirector (academia) y groupCoach (grupo) */}
              {showDeleteOption && (
                <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 p-6 rounded-xl border border-red-500/30 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-500/20 rounded-lg">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-red-400 leading-none">Zona de Peligro</h2>
                  </div>
                  
                  <p className="text-gray-300 mb-4 leading-relaxed">
                    {deleteWarningText} No se puede deshacer esta operación.
                  </p>
                  
                  <button
                    onClick={onDeleteEntity}
                    disabled={typeof processingAction === 'string' ? false : processingAction}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none shadow-lg shadow-red-500/25"
                  >
                    {typeof processingAction === 'boolean' && processingAction ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Eliminando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {deleteButtonText}
                      </span>
                    )}
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
};