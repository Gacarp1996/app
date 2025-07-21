// pages/AcademiaSettingsPage.tsx (Refactorizado)
import { FC, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { getUserRoleInAcademia, UserRole } from '../Database/FirebaseRoles';
import { AcademiaConfig, getAcademiaConfig, saveAcademiaConfig } from '../Database/FirebaseAcademiaConfig';
import { useLocation, useNavigate } from 'react-router-dom';

// Importar componentes extraídos
import { DashboardRenderer } from '../components/academia-settings/shared/DashboardRenderer';
import { MainConfigModal } from '../components/academia-settings/sections/MainConfigModal';
import { AdvancedConfigModal } from '../components/academia-settings/sections/AdvancedConfigModal';

import Modal from '../components/shared/Modal';
// ✅ BIEN - Separa los imports
import { LoadingSpinner, PermissionError, RoleChangeModal } from '../components/academia-settings';


// Importar hooks personalizados
import { 
  useAcademiaSettings, 
  useUserManagement, 
  useDeleteAcademia 
} from '../hooks/useAcademiaSettings';
import { 
  updateUserRole, 
  removeUserFromAcademia, 
  countDirectors,
  UserRole as UserRoleType
} from '../Database/FirebaseRoles';

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
  const {
    rolActual,
    users,
    loadingRole,
    permissionError,
    loadUsers,
    limpiarAcademiaActual,
    navigate: hookNavigate,
    eliminarAcademiaDeMisAcademias
  } = useAcademiaSettings();

  const {
    selectedUserId,
    isRoleModalOpen,
    openRoleModal,
    closeRoleModal
  } = useUserManagement(
    academiaActual,
    currentUser,
    users,
    loadUsers,
    () => {}
  );

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
    hookNavigate,
    () => {}
  );

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
    
    if (userToRemove.role === 'academyDirector') {
      const directorCount = await countDirectors(academiaActual.id);
      if (directorCount <= 1) {
        alert('No puedes eliminar al último director de la academia.');
        return;
      }
    }
    
    if (window.confirm(`¿Estás seguro de eliminar a ${userToRemove.userEmail} de la academia?`)) {
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
  const handleChangeAcademia = () => {
    limpiarAcademiaActual();
    navigate('/select-academia');
  };

  const handleOpenAdvancedConfig = () => {
    setIsMainConfigModalOpen(false);
    setIsAdvancedConfigModalOpen(true);
  };

  const handleCloseAdvancedConfig = () => {
    setIsAdvancedConfigModalOpen(false);
    setIsMainConfigModalOpen(true);
  };

  // Renders condicionales
  if (!academiaActual) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">No hay academia seleccionada</p>
          <button 
            onClick={() => hookNavigate('/select-academia')} 
            className="mt-4 px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold rounded-lg transition-all duration-200"
          >
            Seleccionar Academia
          </button>
        </div>
      </div>
    );
  }

  if (loading || loadingRole) {
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
          onGoHome={() => hookNavigate('/')} 
        />
      </div>
    );
  }

  return (
    <>
      {/* Dashboard principal según el rol */}
      <DashboardRenderer userRole={userRole} />
      
      {/* Modal principal de configuración */}
      <MainConfigModal
        isOpen={isMainConfigModalOpen}
        onClose={() => setIsMainConfigModalOpen(false)}
        academiaName={academiaActual.nombre}
        academiaId={academiaActual.id}
        users={users}
        currentUserId={currentUser?.uid}
        currentUserEmail={currentUser?.email}
        currentUserRole={rolActual}
        loadingUsers={loading}
        processingAction={processingAction}
        onRemoveUser={handleRemoveUser}
        onChangeRole={openRoleModal}
        onChangeAcademia={handleChangeAcademia}
        onDeleteAcademia={openDeleteModal}
        onOpenAdvancedConfig={handleOpenAdvancedConfig}
      />

      {/* Modal de configuración avanzada */}
      <AdvancedConfigModal
        isOpen={isAdvancedConfigModalOpen}
        onClose={handleCloseAdvancedConfig}
        surveyConfig={surveyConfig}
        loadingSurveyConfig={loadingSurveyConfig}
        savingSurveyConfig={savingSurveyConfig}
        onToggleSurveys={handleToggleSurveys}
        onSurveyConfigChange={handleSurveyConfigChange}
        onSaveSurveyConfig={handleSaveSurveyConfig}
      />

      {/* Modal de cambio de rol */}
      <RoleChangeModal
        isOpen={isRoleModalOpen}
        onClose={closeRoleModal}
        user={users.find(u => u.userId === selectedUserId) || null}
        currentUserRole={rolActual}
        academiaType="academia"
        onConfirm={handlePromoteUser}
      />

      {/* Modal de eliminación de academia */}
      <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal} title="Eliminar Academia">
        <div className="p-6">
          <h3 className="text-xl font-bold text-red-400 mb-4">Eliminar Academia</h3>
          <p className="text-gray-300 mb-4">
            Esta acción eliminará permanentemente la academia y todos sus datos. 
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
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AcademiaSettingsPage;