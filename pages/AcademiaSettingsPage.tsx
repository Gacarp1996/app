import React from 'react';
import Modal from '../components/shared/Modal';

// Importar componentes extraídos
<<<<<<< Updated upstream
import { 
  UserCard,
  AcademiaInfoSection,
  UserProfileSection,
  DeleteAcademiaSection,
  ChangeAcademiaSection,
  LoadingSpinner,
  PermissionError
} from '../components/academia-settings';
=======
import { DashboardRenderer } from '../components/academia-settings/shared/DashboardRenderer';
import { MainConfigModal } from '../components/academia-settings/sections/MainConfigModal';
import { AdvancedConfigModal } from '../components/academia-settings/sections/AdvancedConfigModal';

import Modal from '../components/shared/Modal';
// ✅ BIEN - Separa los imports
import { LoadingSpinner, PermissionError, RoleChangeModal } from '../components/academia-settings';
>>>>>>> Stashed changes

// Importar hooks personalizados
import { 
  useAcademiaSettings, 
  useUserManagement, 
  useDeleteAcademia 
} from '../hooks/useAcademiaSettings';

<<<<<<< Updated upstream
const AcademiaSettingsPage: React.FC = () => {
  // Hook principal
=======
// ✅ FIX TEMPORAL: Detectar tipo de entidad cuando no está definido
const getEntityTypeFromRole = (userRole: UserRoleType | null, academiaActual: any) => {
  // Si ya tiene tipo definido, usarlo
  if (academiaActual?.tipo) {
    return academiaActual.tipo;
  }
  
  // Si no tiene tipo, inferirlo del rol del usuario
  if (userRole && ['academyDirector', 'academySubdirector', 'academyCoach'].includes(userRole)) {
    return 'academia';
  }
  
  if (userRole && ['groupCoach', 'assistantCoach'].includes(userRole)) {
    return 'grupo-entrenamiento';
  }
  
  // Fallback: asumir que es academia (para compatibilidad con datos legacy)
  return 'academia';
};

const AcademiaSettingsPage: FC = () => {
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Estados principales
  const [userRole, setUserRole] = useState<UserRoleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | boolean>(false);
  
  // Estados para modales
  const [isMainConfigModalOpen, setIsMainConfigModalOpen] = useState(false);
  const [isAdvancedConfigModalOpen, setIsAdvancedConfigModalOpen] = useState(false);
  
  // Estados para configuración de encuestas
  const [surveyConfig, setSurveyConfig] = useState<AcademiaConfig | null>(null);
  const [loadingSurveyConfig, setLoadingSurveyConfig] = useState(false);
  const [savingSurveyConfig, setSavingSurveyConfig] = useState(false);

  // Hooks personalizados
>>>>>>> Stashed changes
  const {
    currentUser,
    academiaActual,
    rolActual,
    users,
    loading,
    loadingRole,
    permissionError,
    processingAction,
    setProcessingAction,
    loadUsers,
    limpiarAcademiaActual,
    navigate,
    eliminarAcademiaDeMisAcademias
  } = useAcademiaSettings();

<<<<<<< Updated upstream
  // Hook para manejo de usuarios
=======
  // ✅ CORREGIDO: Determinar si es academia o grupo (DESPUÉS de los hooks)
  const entityType = getEntityTypeFromRole(userRole || rolActual, academiaActual);
  const isAcademia = entityType === 'academia';
  const entityTypeText = isAcademia ? 'academia' : 'grupo';
  const entityTypeCapitalized = isAcademia ? 'Academia' : 'Grupo';

>>>>>>> Stashed changes
  const {
    selectedUserId,
    isRoleModalOpen,
    handleRemoveUser,
    handlePromoteUser,
    openRoleModal,
    closeRoleModal
  } = useUserManagement(
    academiaActual,
    currentUser,
    users,
    loadUsers,
    setProcessingAction
  );

  // Hook para eliminar academia
  const {
    isDeleteModalOpen,
    deletePassword,
    setDeletePassword,
    deleteError,
    handleDeleteAcademia,
    openDeleteModal,
    closeDeleteModal
  } = useDeleteAcademia(
    academiaActual,
    currentUser,
    eliminarAcademiaDeMisAcademias,
    navigate,
    setProcessingAction
  );

<<<<<<< Updated upstream
  // Manejadores simples
=======
  // Efectos
  useEffect(() => {
    (window as any).openAcademiaConfig = () => setIsMainConfigModalOpen(true);
    return () => {
      delete (window as any).openAcademiaConfig;
    };
  }, []);

  // Efecto para abrir modal automáticamente si viene con parámetro
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('openConfig') === 'true') {
      setIsMainConfigModalOpen(true);
      // Limpiar el parámetro de la URL sin recargar la página
      const newSearchParams = new URLSearchParams(location.search);
      newSearchParams.delete('openConfig');
      const newUrl = location.pathname + (newSearchParams.toString() ? '?' + newSearchParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [location]);

  useEffect(() => {
    if (isAdvancedConfigModalOpen && academiaActual && !surveyConfig && !loadingSurveyConfig) {
      loadSurveyConfig();
    }
  }, [isAdvancedConfigModalOpen, academiaActual, surveyConfig, loadingSurveyConfig]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (currentUser && academiaActual) {
        setLoading(true);
        try {
          const role = await getUserRoleInAcademia(academiaActual.id, currentUser.uid);
          setUserRole(role);
        } catch (error) {
          console.error('Error obteniendo rol del usuario:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchUserRole();
  }, [currentUser, academiaActual]);

  // Handlers para gestión de usuarios
  const handleRemoveUser = async (userId: string) => {
    if (!academiaActual || !currentUser) return;
    
    const userToRemove = users.find(u => u.userId === userId);
    if (!userToRemove) return;
    
    // ✅ CORREGIDO: Validación específica por tipo de entidad
    if (isAcademia && userToRemove.role === 'academyDirector') {
      const directorCount = await countDirectors(academiaActual.id);
      if (directorCount <= 1) {
        alert(`No puedes eliminar al último director de la ${entityTypeText}.`);
        return;
      }
    }
    
    // ✅ CORREGIDO: Mensaje dinámico
    if (window.confirm(`¿Estás seguro de eliminar a ${userToRemove.userEmail} del ${entityTypeText}?`)) {
      setProcessingAction(userId);
      try {
        await removeUserFromAcademia(academiaActual.id, userId);
        await loadUsers();
        alert('Usuario eliminado exitosamente');
      } catch (error) {
        console.error('Error eliminando usuario:', error);
        alert('Error al eliminar el usuario');
      } finally {
        setProcessingAction(false);
      }
    }
  };

  const handlePromoteUser = async (userId: string, newRole: UserRoleType) => {
    if (!academiaActual) return;
    
    setProcessingAction(userId);
    try {
      await updateUserRole(academiaActual.id, userId, newRole);
      await loadUsers();
      alert('Rol actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando rol:', error);
      alert('Error al actualizar el rol');
    } finally {
      setProcessingAction(false);
    }
  };

  // Handlers para configuración de encuestas
  const loadSurveyConfig = async () => {
    if (!academiaActual) return;
    
    setLoadingSurveyConfig(true);
    try {
      const config = await getAcademiaConfig(academiaActual.id);
      setSurveyConfig(config);
    } catch (error) {
      console.error('Error cargando configuración de encuestas:', error);
    } finally {
      setLoadingSurveyConfig(false);
    }
  };

  const handleSurveyConfigChange = (key: keyof AcademiaConfig['preguntasEncuesta'], checked: boolean) => {
    if (!surveyConfig) return;
    
    setSurveyConfig(prev => ({
      ...prev!,
      preguntasEncuesta: {
        ...prev!.preguntasEncuesta,
        [key]: checked
      }
    }));
  };

  const handleSaveSurveyConfig = async () => {
    if (!surveyConfig || !academiaActual) return;
    
    setSavingSurveyConfig(true);
    try {
      await saveAcademiaConfig(academiaActual.id, {
        encuestasHabilitadas: surveyConfig.encuestasHabilitadas,
        preguntasEncuesta: surveyConfig.preguntasEncuesta
      });
    } catch (error) {
      console.error('Error guardando configuración:', error);
    } finally {
      setSavingSurveyConfig(false);
      setIsAdvancedConfigModalOpen(false);
    }
  };

  const handleToggleSurveys = (enabled: boolean) => {
    if (!surveyConfig) return;
    
    setSurveyConfig(prev => prev ? {
      ...prev,
      encuestasHabilitadas: enabled
    } : null);
  };

  // Handlers de navegación
>>>>>>> Stashed changes
  const handleChangeAcademia = () => {
    limpiarAcademiaActual();
    navigate('/select-academia');
  };

  // Estados de carga y error
  if (!academiaActual) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">No hay academia seleccionada</p>
          <button 
            onClick={() => navigate('/select-academia')} 
            className="mt-4 px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold rounded-lg transition-all duration-200"
          >
            Seleccionar Academia
          </button>
        </div>
      </div>
    );
  }

  if (loadingRole) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner message="Cargando configuración..." />
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <PermissionError 
          onRetry={() => window.location.reload()} 
          onGoHome={() => navigate('/')} 
        />
      </div>
    );
  }

<<<<<<< Updated upstream
  const currentRole = rolActual;
=======
  // ✅ NUEVO: Debug para verificar los valores
  console.log('🔍 Debug AcademiaSettingsPage:', {
    entityName: academiaActual?.nombre,
    entityId: academiaActual?.id,
    entityType: entityType,
    originalType: academiaActual?.tipo,
    userRole: userRole || rolActual,
    isAcademia
  });
>>>>>>> Stashed changes

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Efectos de fondo - Una sola instancia */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
      <div className="fixed top-20 left-20 w-64 h-64 lg:w-96 lg:h-96 bg-green-500/10 rounded-full blur-3xl"></div>
      <div className="fixed bottom-20 right-20 w-64 h-64 lg:w-96 lg:h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      
<<<<<<< Updated upstream
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-green-400 mb-8">Configuración de Academia</h1>
=======
      {/* Modal principal de configuración */}
      <MainConfigModal
       isOpen={isMainConfigModalOpen}
       onClose={() => setIsMainConfigModalOpen(false)}
       // ✅ PROPS ACTUALIZADAS CON FIX:
       entityName={academiaActual.nombre}
       entityId={academiaActual.id}
       entityType={entityType} // ✅ USAR EL TIPO CORREGIDO
       // Props que siguen igual:
       users={users}
       currentUserId={currentUser?.uid}
       currentUserEmail={currentUser?.email}
       currentUserRole={rolActual}
       loadingUsers={loading}
       processingAction={processingAction}
       onRemoveUser={handleRemoveUser}
       onChangeRole={openRoleModal}
       onChangeAcademia={handleChangeAcademia}
       onDeleteEntity={openDeleteModal}
       onOpenAdvancedConfig={handleOpenAdvancedConfig}
/>
>>>>>>> Stashed changes

        <UserProfileSection 
          userEmail={currentUser?.email} 
          currentRole={currentRole} 
        />

<<<<<<< Updated upstream
        <AcademiaInfoSection 
          academiaName={academiaActual.nombre} 
          academiaId={academiaActual.id} 
        />

        {/* Lista de Usuarios */}
        {currentRole && (currentRole === 'director' || currentRole === 'subdirector') && !permissionError && (
          <div className="bg-gray-800/80 backdrop-blur-sm p-6 rounded-lg shadow-lg mb-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-green-400 mb-4">
              Usuarios de la Academia ({users.length})
            </h2>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <UserCard
                    key={user.userId}
                    user={user}
                    isCurrentUser={user.userId === currentUser?.uid}
                    canManageUsers={currentRole === 'director'}
                    onChangeRole={() => openRoleModal(user.userId)}
                    onRemoveUser={() => handleRemoveUser(user.userId)}
                    processingAction={processingAction}
                  />
                ))}
              </div>
            )}
=======
      {/* ✅ CORREGIDO: Modal de cambio de rol dinámico */}
      <RoleChangeModal
        isOpen={isRoleModalOpen}
        onClose={closeRoleModal}
        user={users.find(u => u.userId === selectedUserId) || null}
        currentUserRole={rolActual}
        academiaType={entityType} // ✅ USAR EL TIPO CORREGIDO
        onConfirm={handlePromoteUser}
      />

      {/* ✅ CORREGIDO: Modal de eliminación dinámico */}
      <Modal 
        isOpen={isDeleteModalOpen} 
        onClose={closeDeleteModal} 
        title={`Eliminar ${entityTypeCapitalized}`} // ✅ DINÁMICO
      >
        <div className="p-6">
          <h3 className="text-xl font-bold text-red-400 mb-4">Eliminar {entityTypeCapitalized}</h3>
          <p className="text-gray-300 mb-4">
            Esta acción eliminará permanentemente {isAcademia ? 'la academia' : 'el grupo'} y todos sus datos. 
            Escribe tu contraseña para confirmar:
          </p>
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Tu contraseña"
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white mb-4"
          />
          {deleteError && (
            <p className="text-red-400 text-sm mb-4">{deleteError}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={closeDeleteModal}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteAcademia}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Eliminar {entityTypeCapitalized}
            </button>
>>>>>>> Stashed changes
          </div>
        )}

        <ChangeAcademiaSection onChangeAcademia={handleChangeAcademia} />

        {currentRole && currentRole === 'director' && (
          <DeleteAcademiaSection 
            onDeleteClick={openDeleteModal} 
            processingAction={processingAction} 
          />
        )}

        {/* Modal para cambiar rol */}
        <Modal 
          isOpen={isRoleModalOpen} 
          onClose={closeRoleModal} 
          title="Cambiar Rol de Usuario"
        >
          {selectedUserId && (
            <div className="space-y-4">
              <p className="text-white">
                Selecciona el nuevo rol para {users.find(u => u.userId === selectedUserId)?.userEmail}:
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handlePromoteUser(selectedUserId, 'director')}
                  className="w-full text-left px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all duration-200"
                  disabled={processingAction}
                >
                  <span className="font-semibold">Director</span>
                  <p className="text-sm opacity-90">Todos los permisos de gestión</p>
                </button>
                <button
                  onClick={() => handlePromoteUser(selectedUserId, 'subdirector')}
                  className="w-full text-left px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-all duration-200"
                  disabled={processingAction}
                >
                  <span className="font-semibold">Subdirector</span>
                  <p className="text-sm opacity-90">Puede ver información pero no eliminar</p>
                </button>
                <button
                  onClick={() => handlePromoteUser(selectedUserId, 'entrenador')}
                  className="w-full text-left px-4 py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all duration-200"
                  disabled={processingAction}
                >
                  <span className="font-semibold">Entrenador</span>
                  <p className="text-sm opacity-90">Acceso básico para entrenamientos</p>
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal para eliminar academia */}
        <Modal 
          isOpen={isDeleteModalOpen} 
          onClose={closeDeleteModal} 
          title="Confirmar Eliminación de Academia"
        >
          <form onSubmit={handleDeleteAcademia} className="space-y-4">
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-700/50">
              <p className="text-red-400 font-semibold">
                ⚠️ Esta acción es irreversible
              </p>
              <p className="text-red-400 text-sm mt-2">
                Se eliminarán permanentemente:
              </p>
              <ul className="list-disc list-inside text-red-400 text-sm mt-1">
                <li>Todos los jugadores</li>
                <li>Todos los objetivos</li>
                <li>Todas las sesiones de entrenamiento</li>
                <li>Todos los torneos</li>
                <li>Todos los usuarios asociados</li>
              </ul>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ingresa tu contraseña para confirmar:
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full p-3 bg-gray-800/80 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                placeholder="Tu contraseña"
                required
              />
              {deleteError && (
                <p className="text-red-500 text-sm mt-2">{deleteError}</p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={processingAction || !deletePassword}
              >
                {processingAction ? 'Eliminando...' : 'Eliminar Academia'}
              </button>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-600"
                disabled={processingAction}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>

        {/* Botón para volver */}
        <div className="mt-8 text-center">
          <button 
            onClick={() => navigate('/')} 
            className="text-gray-400 hover:text-green-400 transition-colors duration-200 font-medium"
          >
            &larr; Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcademiaSettingsPage;