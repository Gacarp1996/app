import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { TrainingProvider } from '../../contexts/TrainingContext';
import { useAcademia } from '../../contexts/AcademiaContext';
import { useAuth } from '../../contexts/AuthContext';
import { getPlayers } from "../../Database/FirebasePlayers";
import { getObjectives } from '../../Database/FirebaseObjectives';
import { getSessions } from '../../Database/FirebaseSessions';
import { getTournaments } from '../../Database/FirebaseTournaments';
import { getDisputedTournaments } from '../../Database/FirebaseDisputedTournaments'; 
import GlobalHeader from './GlobalHeader';

import PlayersListPage from '../../pages/PlayersListPage';
import StartTrainingPage from '../../pages/StartTrainingPage';
import TrainingSessionPage from '../../pages/TrainingSessionPage';
import PlayerProfilePage from '../../pages/PlayerProfilePage';
import EditObjectivesPage from '../../pages/EditObjectivesPage';
import ObjectiveDetailPage from '../../pages/ObjectiveDetailPage';
import SessionDetailPage from '../../pages/SessionDetailPage';
import { Player, Objective, TrainingSession, Tournament, DisputedTournament } from '../../types'; 
import AcademiaSettingsPage from '../../pages/AcademiaSettingsPage';
import HomePage from '@/pages/HomePage';

// ✅ IMPORTS PARA MODAL GLOBAL
import { useConfigModal } from '../../contexts/ConfigModalContext';
import { MainConfigModal } from '../../components/academia-settings/sections/MainConfigModal';
import { RoleChangeModal } from '../../components/academia-settings';
import Modal from '../../components/shared/Modal';
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
  const { isConfigModalOpen, closeConfigModal } = useConfigModal(); // ✅ USAR CONTEXT
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [disputedTournaments, setDisputedTournaments] = useState<DisputedTournament[]>([]);
  const [dataLoading, setDataLoading] = useState(true); 
  const [processingAction, setProcessingAction] = useState<string | boolean>(false);

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

  // ✅ CORREGIDO: Hook con callback vacío
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
    () => {} // ✅ CALLBACK VACÍO PARA EVITAR ERROR
  );

  useEffect(() => {
    if (!academiaActual) {
      navigate('/select-academia');
      return;
    }
    
    fetchData();
  }, [academiaActual, navigate]);

  const fetchData = async () => {
    if (!academiaActual) return;
    
    setDataLoading(true);
    try {
      const [playersData, objectivesData, sessionsData, tournamentsData, disputedData] = await Promise.all([
        getPlayers(academiaActual.id),
        getObjectives(academiaActual.id),
        getSessions(academiaActual.id),
        getTournaments(academiaActual.id),
        getDisputedTournaments(academiaActual.id)
      ]);
      
      setPlayers(playersData || []);
      setObjectives(objectivesData || []);
      setSessions(sessionsData || []);
      setTournaments(tournamentsData || []);
      setDisputedTournaments(disputedData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Establecer arrays vacíos en caso de error
      setPlayers([]);
      setObjectives([]);
      setSessions([]);
      setTournaments([]);
      setDisputedTournaments([]);
    } finally {
      setDataLoading(false);
    }
  };

  // ✅ HANDLERS PARA EL MODAL DE CONFIGURACIÓN
  const handleRemoveUser = async (userId: string) => {
    if (!academiaActual || !currentUser) return;
    
    const userToRemove = users.find(u => u.userId === userId);
    if (!userToRemove) return;
    
    const isAcademia = academiaActual.tipo === 'academia' || !academiaActual.tipo;
    const entityTypeText = isAcademia ? 'academia' : 'grupo';
    
    if (isAcademia && userToRemove.role === 'academyDirector') {
      const directorCount = await countDirectors(academiaActual.id);
      if (directorCount <= 1) {
        alert(`No puedes eliminar al último director de la ${entityTypeText}.`);
        return;
      }
    }
    
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

  const handleChangeAcademia = () => {
    closeConfigModal(); // Cerrar modal primero
    limpiarAcademiaActual();
    navigate('/select-academia');
  };

  const handleOpenAdvancedConfig = () => {
    closeConfigModal();
    // Navegar a academia-settings para configuración avanzada
    navigate('/academia-settings');
  };

  // ✅ FUNCIÓN HELPER PARA DETERMINAR TIPO
  const getEntityType = () => {
    if (academiaActual?.tipo) {
      return academiaActual.tipo;
    }
    // Fallback para academias legacy
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
      await handleDeleteAcademia(e); // ✅ PASAR EL EVENTO
      closeConfigModal(); // Cerrar modal de configuración después de eliminar
    } catch (error) {
      console.error('Error en eliminación:', error);
    }
  };

  if (!academiaActual) {
    return null;
  }

  // Mostrar loading mientras se cargan los datos
  if (dataLoading) {
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
             players={players || []} 
             onDataChange={fetchData} 
             academiaId={academiaActual.id}
             academiaActual={academiaActual}
            />
          } />
            <Route path="/academia-settings" element={
              <AcademiaSettingsPage />
                } />

            <Route path="/player/:playerId" element={
              <PlayerProfilePage 
                players={players || []} 
                objectives={objectives || []} 
                sessions={sessions || []} 
                tournaments={tournaments || []} 
                onDataChange={fetchData}
                academiaId={academiaActual.id}
              />
            } />
            <Route path="/start-training" element={
              <StartTrainingPage 
                players={players || []} 
              />
            } />
            <Route path="/training/:playerId" element={
              <TrainingSessionPage 
                allPlayers={players || []} 
                allObjectives={objectives || []} 
                allTournaments={tournaments || []} 
                onDataChange={fetchData}
                academiaId={academiaActual.id}
                sessions={sessions || []}
              />
            } />
            <Route path="/session/:sessionId" element={
              <SessionDetailPage 
                sessions={sessions || []} 
                players={players || []} 
              />
            } />
            <Route path="/objective/:objectiveId/edit" element={
              <ObjectiveDetailPage 
                allObjectives={objectives || []} 
                players={players || []} 
                onDataChange={fetchData}
                academiaId={academiaActual.id}
              />
            } />
            <Route path="/player/:playerId/edit-objectives" element={
              <EditObjectivesPage 
                players={players || []} 
                allObjectives={objectives || []} 
                onDataChange={fetchData}
                academiaId={academiaActual.id}
              />
            } />
            {/* Esta redirección ahora tiene más sentido, si no encuentra ninguna ruta, va a la de inicio */ }
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </TrainingProvider>
      </main>

      {/* ✅ MODAL DE CONFIGURACIÓN GLOBAL */}
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

      {/* ✅ MODAL DE CAMBIO DE ROL */}
      <RoleChangeModal
        isOpen={isRoleModalOpen}
        onClose={closeRoleModal}
        user={users.find(u => u.userId === selectedUserId) || null}
        currentUserRole={rolActual}
        academiaType={getEntityType()}
        onConfirm={handlePromoteUser}
      />

      {/* ✅ MODAL DE ELIMINACIÓN SIN CLASSNAME */}
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