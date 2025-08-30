// AppWithAcademia.tsx - MIGRADO CON SONNER NOTIFICATIONS

import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { TrainingProvider } from '../../contexts/TrainingContext';
import { useAcademia } from '../../contexts/AcademiaContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayer } from '../../contexts/PlayerContext'; 
import { useSession } from '../../contexts/SessionContext';
import { useObjective } from '../../contexts/ObjectiveContext';
import { useTournament } from '../../contexts/TournamentContext';
import { useNotification } from '../../hooks/useNotification'; // ✅ NUEVO IMPORT
import GlobalHeader from './GlobalHeader';

import PlayersListPage from '../../pages/PlayersListPage';
import StartTrainingPage from '../../pages/StartTrainingPage';
import TrainingSessionPage from '../../pages/TrainingSessionPage';
import PlayerProfilePage from '../../pages/PlayerProfilePage';
import EditObjectivesPage from '../../pages/EditObjectivesPage';
import ObjectiveDetailPage from '../../pages/ObjectiveDetailPage';
import SessionDetailPage from '../../pages/SessionDetailPage';
import AcademiaSettingsPage from '../../pages/AcademiaSettingsPage';
import HomePage from '@/pages/HomePage';

// ✅ IMPORTS PARA MODALES GLOBALES
import { useConfigModal } from '../../contexts/ConfigModalContext';
import { MainConfigModal } from '../../components/academia-settings/sections/MainConfigModal';
import { AdvancedConfigModal } from '../../components/academia-settings/sections/AdvancedConfigModal';
import { RoleChangeModal } from '../../components/academia-settings';
import Modal from '../../components/shared/Modal';
import { 
  AcademiaConfig, 
  getAcademiaConfig, 
  saveAcademiaConfig,
  updateRecommendationsAnalysisWindow
} from '../../Database/FirebaseAcademiaConfig';
import { 
  useAcademiaSettings, 
  useUserManagement, 
  useDeleteAcademia 
} from '../../hooks/useAcademiaSettings';
import { 
  updateUserRole, 
  removeUserFromAcademia, 
  countDirectors,
  UserRole as UserRoleType
} from '../../Database/FirebaseRoles';

const AppWithAcademia: React.FC = () => {
  const { academiaActual } = useAcademia();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const notification = useNotification(); // ✅ USAR HOOK DE NOTIFICACIONES
  
  // ✅ USAR PlayerContext
  const { players, loadingPlayers, refreshPlayers } = usePlayer();
  
  // ✅ USAR SessionContext
  const { 
    sessions, 
    loadingSessions, 
    refreshSessions,
    getTodaySessions 
  } = useSession();
  
  // ✅ USAR ObjectiveContext
  const { 
    objectives, 
    loadingObjectives, 
    refreshObjectives 
  } = useObjective();
  
  // ✅ USAR TournamentContext
  const {
    tournaments,
    disputedTournaments,
    loadingTournaments,
    loadingDisputedTournaments,
    refreshAllTournaments
  } = useTournament();
  
  // ✅ USAR CONTEXTO PARA AMBOS MODALES
  const { 
    isConfigModalOpen, 
    closeConfigModal,
    isAdvancedModalOpen,
    openAdvancedModal,
    closeAdvancedModal 
  } = useConfigModal();
  
  // ✅ Estados solo para procesamiento
  const [processingAction, setProcessingAction] = useState<string | boolean>(false);

  // ✅ ESTADOS PARA CONFIGURACIÓN DE ENCUESTAS
  const [surveyConfig, setSurveyConfig] = useState<AcademiaConfig | null>(null);
  const [loadingSurveyConfig, setLoadingSurveyConfig] = useState(false);
  const [savingSurveyConfig, setSavingSurveyConfig] = useState(false);

  // ✅ NUEVO: ESTADOS PARA CONFIGURACIÓN DE RECOMENDACIONES
  const [recommendationsConfig, setRecommendationsConfig] = useState<AcademiaConfig | null>(null);
  const [loadingRecommendationsConfig, setLoadingRecommendationsConfig] = useState(false);
  const [savingRecommendationsConfig, setSavingRecommendationsConfig] = useState(false);
  const [pendingRecommendationsDays, setPendingRecommendationsDays] = useState<number>(7);

  // ✅ HOOKS PARA EL MODAL DE CONFIGURACIÓN
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

  useEffect(() => {
    if (!academiaActual) {
      navigate('/select-academia');
      return;
    }
  }, [academiaActual, navigate]);

  // ✅ NUEVO: EFECTO PARA CARGAR CONFIGURACIÓN DE RECOMENDACIONES
  useEffect(() => {
    if (isAdvancedModalOpen && academiaActual && !recommendationsConfig && !loadingRecommendationsConfig) {
      loadRecommendationsConfig();
    }
  }, [isAdvancedModalOpen, academiaActual, recommendationsConfig, loadingRecommendationsConfig]);

  // ✅ EFECTO PARA CARGAR CONFIGURACIÓN DE SURVEYS
  useEffect(() => {
    if (isAdvancedModalOpen && academiaActual && !surveyConfig && !loadingSurveyConfig) {
      loadSurveyConfig();
    }
  }, [isAdvancedModalOpen, academiaActual, surveyConfig, loadingSurveyConfig]);

  // ✅ NUEVO: FUNCIÓN PARA CARGAR CONFIGURACIÓN DE RECOMENDACIONES
  const loadRecommendationsConfig = async () => {
    if (!academiaActual) return;
    
    setLoadingRecommendationsConfig(true);
    try {
      const config = await getAcademiaConfig(academiaActual.id);
      setRecommendationsConfig(config);
      setPendingRecommendationsDays(config.recommendationsAnalysisWindowDays);
    
    } catch (error) {
      console.error('❌ Error cargando configuración de recomendaciones:', error);
    } finally {
      setLoadingRecommendationsConfig(false);
    }
  };

  // ✅ FUNCIÓN PARA CARGAR CONFIGURACIÓN DE SURVEYS
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

  // ✅ HANDLERS PARA EL MODAL DE CONFIGURACIÓN - MIGRADO CON SONNER
  const handleRemoveUser = async (userId: string) => {
    if (!academiaActual || !currentUser) return;
    
    const userToRemove = users.find(u => u.userId === userId);
    if (!userToRemove) return;
    
    const isAcademia = academiaActual.tipo === 'academia' || !academiaActual.tipo;
    const entityTypeText = isAcademia ? 'academia' : 'grupo';
    
    if (isAcademia && userToRemove.role === 'academyDirector') {
      const directorCount = await countDirectors(academiaActual.id);
      if (directorCount <= 1) {
        // MIGRADO: alert → notification.error
        notification.error(
          `No puedes eliminar al último director de la ${entityTypeText}`,
          'Debe haber al menos un director'
        );
        return;
      }
    }
    
    // MIGRADO: window.confirm → notification.confirm
    const confirmed = await notification.confirm({
      title: 'Eliminar Usuario',
      message: `¿Estás seguro de eliminar a ${userToRemove.userEmail} del ${entityTypeText}?`,
      type: 'danger',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    setProcessingAction(userId);
    try {
      await removeUserFromAcademia(academiaActual.id, userId);
      await loadUsers();
      // MIGRADO: alert → notification.success
      notification.success('Usuario eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      // MIGRADO: alert → notification.error
      notification.error('Error al eliminar el usuario');
    } finally {
      setProcessingAction(false);
    }
  };

  const handlePromoteUser = async (userId: string, newRole: UserRoleType) => {
    if (!academiaActual) return;
    
    setProcessingAction(userId);
    
    // MIGRADO: Usar promise toast
    await notification.promise(
      updateUserRole(academiaActual.id, userId, newRole),
      {
        loading: 'Actualizando rol...',
        success: 'Rol actualizado exitosamente',
        error: 'Error al actualizar el rol'
      }
    );
    
    await loadUsers();
    setProcessingAction(false);
  };

  const handleChangeAcademia = () => {
    closeConfigModal();
    limpiarAcademiaActual();
    navigate('/select-academia');
  };

  // ✅ HANDLER PARA ABRIR CONFIGURACIÓN AVANZADA
  const handleOpenAdvancedConfig = () => {
    openAdvancedModal();
  };

  // ✅ NUEVO: HANDLERS PARA CONFIGURACIÓN DE RECOMENDACIONES - MIGRADO
  const handleRecommendationsConfigChange = (days: number) => {

    setPendingRecommendationsDays(days);
  };

  const handleSaveRecommendationsConfig = async () => {
    if (!academiaActual || !recommendationsConfig) {
      // MIGRADO: console.error + return → notification.error
      notification.error('No hay academia o configuración para guardar');
      return;
    }

    setSavingRecommendationsConfig(true);
    const loadingId = notification.loading('Guardando configuración de recomendaciones...');
    
    try {
   

      await updateRecommendationsAnalysisWindow(academiaActual.id, pendingRecommendationsDays);
      
      // Actualizar estado local
      setRecommendationsConfig({
        ...recommendationsConfig,
        recommendationsAnalysisWindowDays: pendingRecommendationsDays
      });

      // MIGRADO: alert → notification.success
      notification.dismiss(loadingId);
      notification.success('Configuración de recomendaciones guardada exitosamente');

      
    } catch (error) {
      console.error('❌ Error guardando configuración de recomendaciones:', error);
      // MIGRADO: alert → notification.error
      notification.dismiss(loadingId);
      notification.error('Error al guardar la configuración de recomendaciones');
    } finally {
      setSavingRecommendationsConfig(false);
    }
  };

  // ✅ HANDLERS PARA CONFIGURACIÓN DE ENCUESTAS
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
    
    // MIGRADO: Usar promise toast
    await notification.promise(
      saveAcademiaConfig(academiaActual.id, {
        encuestasHabilitadas: surveyConfig.encuestasHabilitadas,
        preguntasEncuesta: surveyConfig.preguntasEncuesta
      }),
      {
        loading: 'Guardando configuración de encuestas...',
        success: 'Configuración de encuestas guardada exitosamente',
        error: 'Error al guardar la configuración'
      }
    );
    
    setSavingSurveyConfig(false);
  };

  const handleToggleSurveys = (enabled: boolean) => {
    if (!surveyConfig) return;
    
    setSurveyConfig(prev => prev ? {
      ...prev,
      encuestasHabilitadas: enabled
    } : null);
  };

  // ✅ FUNCIÓN HELPER PARA DETERMINAR TIPO
  const getEntityType = () => {
    if (academiaActual?.tipo) {
      return academiaActual.tipo;
    }
    return 'academia';
  };

  // ✅ NOMBRES DINÁMICOS PARA EL MODAL DE ELIMINAR
  const isAcademia = getEntityType() === 'academia';
  const entityTypeCapitalized = isAcademia ? 'Academia' : 'Grupo';
  const deleteWarningText = isAcademia 
    ? 'Esta acción marcará la academia como inactiva y la eliminará de tu lista. Los datos se conservarán en la base de datos.'
    : 'Esta acción marcará el grupo como inactivo y lo eliminará de tu lista. Los datos se conservarán en la base de datos.';

  // ✅ FUNCIÓN PERSONALIZADA PARA ELIMINAR
  const handleDeleteWithCallback = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await handleDeleteAcademia(e);
      closeConfigModal();
    } catch (error) {
      console.error('Error en eliminación:', error);
    }
  };

  // ✅ FUNCIÓN ACTUALIZADA para refrescar todos los datos
  const handleDataChange = async () => {
    await Promise.all([
      refreshPlayers(),
      refreshSessions(),
      refreshObjectives(),
      refreshAllTournaments()
    ]);
  };

  if (!academiaActual) {
    return null;
  }

  // ✅ MOSTRAR LOADING SI CUALQUIER DATO ESTÁ CARGANDO
  if (loadingPlayers || loadingSessions || loadingObjectives || loadingTournaments || loadingDisputedTournaments) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-[60px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent mx-auto"></div>
          <p className="mt-4 text-app-secondary">Cargando datos de la academia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-[60px]">
      <GlobalHeader />
      <main className="container mx-auto p-4 flex-grow">
        <TrainingProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/players" element={
              <PlayersListPage 
                academiaActual={academiaActual}
              />
            } />
            <Route path="/academia-settings" element={<AcademiaSettingsPage />} />
            <Route path="/player/:playerId" element={
              <PlayerProfilePage 
                onDataChange={handleDataChange}
              />
            } />
            <Route path="/start-training" element={
              <StartTrainingPage />
            } />
            <Route path="/training/:playerId" element={
              <TrainingSessionPage />
            } />
            <Route path="/session/:sessionId" element={
              <SessionDetailPage/>
            } />
            <Route path="/objective/:objectiveId/edit" element={
              <ObjectiveDetailPage 
                onDataChange={handleDataChange}
              />
            } />
            <Route path="/player/:playerId/edit-objectives" element={
              <EditObjectivesPage />
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </TrainingProvider>
      </main>

      {/* ✅ MODAL DE CONFIGURACIÓN PRINCIPAL */}
      {academiaActual && (
        <MainConfigModal
          isOpen={isConfigModalOpen}
          onClose={closeConfigModal}
          entityName={academiaActual.nombre}
          entityId={academiaActual.id}
          entityType={getEntityType()}
          users={users}
          currentUserId={currentUser?.uid}
          currentUserEmail={currentUser?.email}
          currentUserRole={rolActual}
          loadingUsers={loadingRole}
          processingAction={processingAction}
          onRemoveUser={handleRemoveUser}
          onChangeRole={openRoleModal}
          onChangeAcademia={handleChangeAcademia}
          onDeleteEntity={openDeleteModal}
          onOpenAdvancedConfig={handleOpenAdvancedConfig}
        />
      )}

      {/* ✅ MODAL DE CONFIGURACIÓN AVANZADA - ARREGLADO CON PROPS DE RECOMENDACIONES */}
      {academiaActual && (
        <AdvancedConfigModal
          isOpen={isAdvancedModalOpen}
          onClose={closeAdvancedModal}
          // Props para surveys
          surveyConfig={surveyConfig}
          loadingSurveyConfig={loadingSurveyConfig}
          savingSurveyConfig={savingSurveyConfig}
          onToggleSurveys={handleToggleSurveys}
          onSurveyConfigChange={handleSurveyConfigChange}
          onSaveSurveyConfig={handleSaveSurveyConfig}
          // ✅ NUEVAS PROPS PARA RECOMENDACIONES
          recommendationsConfig={recommendationsConfig}
          loadingRecommendationsConfig={loadingRecommendationsConfig}
          savingRecommendationsConfig={savingRecommendationsConfig}
          onRecommendationsConfigChange={handleRecommendationsConfigChange}
          onSaveRecommendationsConfig={handleSaveRecommendationsConfig}
        />
      )}

      {/* ✅ MODAL DE CAMBIO DE ROL */}
      <RoleChangeModal
        isOpen={isRoleModalOpen}
        onClose={closeRoleModal}
        user={users.find(u => u.userId === selectedUserId) || null}
        currentUserRole={rolActual}
        academiaType={getEntityType()}
        onConfirm={handlePromoteUser}
      />

      {/* ✅ MODAL DE ELIMINACIÓN */}
      <div className={`${isDeleteModalOpen ? 'block' : 'hidden'} fixed inset-0 z-[150]`}>
        <Modal 
          isOpen={isDeleteModalOpen} 
          onClose={closeDeleteModal} 
          title={`Eliminar ${entityTypeCapitalized}`}
        >
          <form onSubmit={handleDeleteWithCallback} className="p-6">
            <h3 className="text-xl font-bold text-red-400 mb-4">
              Eliminar {entityTypeCapitalized}
            </h3>
            <p className="text-gray-300 mb-4 leading-relaxed">
              {deleteWarningText}
            </p>
            <p className="text-gray-400 mb-4 text-sm">
              Escribe tu contraseña para confirmar esta acción:
            </p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Tu contraseña"
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white mb-4 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              required
            />
            {deleteError && (
              <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/30 rounded p-2">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!deletePassword.trim()}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Eliminar {entityTypeCapitalized}
              </button>
            </div>
          </form>
        </Modal>
      </div>

      <footer className="bg-app-footer text-center text-sm p-3 text-app-footer">
        © 2024 TenisCoaching App - {academiaActual.nombre}
        {academiaActual.tipo === 'grupo-entrenamiento' && ' | Grupo de Entrenamiento Personal'}
      </footer>
    </div>
  );
};

export default AppWithAcademia;