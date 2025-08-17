import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTrainingSession } from '../hooks/useTrainingSession';
import { usePlayer } from '../contexts/PlayerContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { useSession } from '../contexts/SessionContext';
import { useTournament } from '../contexts/TournamentContext';
import { useNotification } from '../hooks/useNotification'; // ✅ NUEVO IMPORT
import PostTrainingSurveyModal from '../components/training/PostTrainingSurveyModal';
import SurveyConfirmationModal from '../components/training/SurveyConfirmationModal';
import SurveyExitConfirmModal from '../components/training/SurveyExitConfirmModal';
import ManageParticipantsModal from '../components/training/ManageParticipantsModal';
import AddSpecificExerciseModal from '../components/training/AddSpecificExerciseModal';
import PlayerSelector from '../components/training/PlayerSelector';
import ExerciseForm from '../components/training/ExerciseForm';
import SurveySettings from '../components/training/SurveySettings';
import SessionSummary from '../components/training/SessionSummary';
import ObjectiveModal from '@/components/player-profile/ObjectiveModal';
import ActiveSessionRecommendations from '../components/training/ActiveSessionRecommendations';

// ✅ INTERFACE ACTUALIZADA - Ya no necesita allTournaments
interface TrainingSessionPageProps {
  // Ya no necesita props, todo viene del contexto
}

const TrainingSessionPage: React.FC<TrainingSessionPageProps> = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { playerId } = useParams();
  const { players: allPlayers } = usePlayer();
  const { academiaActual } = useAcademia();
  const academiaId = academiaActual?.id || '';
  const notification = useNotification(); // ✅ USAR HOOK DE NOTIFICACIONES
  
  // ✅ USAR SessionContext para obtener sesiones
  const { getSessionById } = useSession();
  
  // ✅ USAR TournamentContext para obtener torneos
  const { tournaments } = useTournament();
  
  // Detectar si estamos en modo edición
  const editSessionId = searchParams.get('edit');
  const isEditMode = !!editSessionId;
  
  // Estado para tracking de navegación
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // ✅ OBTENER SESIÓN ORIGINAL DEL CONTEXTO
  const originalSession = isEditMode ? getSessionById(editSessionId) : null;
  const originalPlayer = originalSession ? allPlayers.find(p => p.id === originalSession.jugadorId) : null;

  const {
    // Estados
    isLoading,
    participants,
    exercises,
    activePlayerIds,
    isObjectiveModalOpen,
    isParticipantModalOpen,
    isSurveyModalOpen,
    currentSurveyPlayerIndex,
    pendingSurveyPlayers,
    askForSurveys,
    isSurveyConfirmationModalOpen,
    isSurveyExitConfirmModalOpen,
    observaciones,
    isAddSpecificExerciseModalOpen,
    enabledSurveyQuestions,
    sessionDate,                    // ✅ NUEVO
    
    // Estados del formulario
    currentTipo,
    currentArea,
    currentEjercicio,
    currentEjercicioEspecifico,
    tiempoCantidad,
    intensidad,
    
    // Opciones disponibles
    availableTipos,
    availableAreas,
    availableEjercicios,
    availableSpecificExercises,
    
    // Valores computados
    playerNamesDisplay,
    singleActivePlayer,
    objectivesForSingleActivePlayer,
    
    // Setters
    setIsObjectiveModalOpen,
    setIsParticipantModalOpen,
    setAskForSurveys,
    setObservaciones,
    setIsAddSpecificExerciseModalOpen,
    setCurrentEjercicio,
    setCurrentEjercicioEspecifico,
    setTiempoCantidad,
    setIntensidad,
    setSessionDate,                  // ✅ NUEVO
    
    // Handlers
    handlePlayerToggleActive,
    toggleSelectAllPlayers,
    handleAddParticipant,
    handleRemoveParticipant,
    handleTipoChange,
    handleAreaChange,
    handleEjercicioChange,
    handleAddSpecificExercise,
    handleSubmitSpecificExercise,
    handleAddExerciseToSession,
    handleFinishTraining,
    handleSurveySubmit,
    handleCloseSurveyModal,
    handleConfirmStartSurveys,
    handleDeclineSurveys,
    handleConfirmExitSurveys,
    handleCancelExitSurveys,
  } = useTrainingSession({
    allTournaments: tournaments,  // ✅ AHORA VIENE DEL CONTEXTO
    editSessionId,
    originalSession              // ✅ YA VIENE DEL CONTEXTO
  });

  // Detectar cambios para mostrar advertencia
  useEffect(() => {
    setHasUnsavedChanges(exercises.length > 0 || observaciones.trim().length > 0);
  }, [exercises, observaciones]);

  // ✅ FUNCIÓN MIGRADA CON SONNER - Manejar navegación hacia atrás
  const handleGoBack = async () => {
    if (hasUnsavedChanges) {
      // MIGRADO: window.confirm → notification.confirm
      const confirmExit = await notification.confirm({
        title: 'Cambios sin guardar',
        message: '¿Estás seguro de que quieres salir? Se perderán todos los cambios no guardados.',
        type: 'warning',
        confirmText: 'Sí, salir sin guardar',
        cancelText: 'Continuar editando'
      });
      
      if (!confirmExit) return;
    }

    if (isEditMode && originalPlayer) {
      // Si estamos editando, volver al perfil del jugador
      navigate(`/player/${originalPlayer.id}`);
    } else {
      // Si estamos creando nueva sesión, volver a start-training
      navigate('/start-training');
    }
  };

  // Estados de carga y error
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Cargando sesión de entrenamiento...</p>
        </div>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No se pudo cargar la sesión</p>
          <button 
            onClick={() => navigate('/start-training')} 
            className="app-button btn-primary"
          >
            Volver a Inicio
          </button>
        </div>
      </div>
    );
  }

  // Render principal del componente
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Efectos de fondo sutiles */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px] bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10 max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Modales */}
        <ObjectiveModal 
          isOpen={isObjectiveModalOpen} 
          onClose={() => setIsObjectiveModalOpen(false)} 
          selectedPlayers={participants} 
          allTournaments={tournaments}  
        />
        <ManageParticipantsModal 
          isOpen={isParticipantModalOpen} 
          onClose={() => setIsParticipantModalOpen(false)} 
          currentParticipants={participants} 
          allPlayersFromStorage={allPlayers} 
          onRemoveParticipant={handleRemoveParticipant} 
          onAddParticipant={handleAddParticipant} 
        />
        
        {/* Modal para agregar ejercicios específicos */}
        <AddSpecificExerciseModal
          isOpen={isAddSpecificExerciseModalOpen}
          onClose={() => setIsAddSpecificExerciseModalOpen(false)}
          onSubmit={handleSubmitSpecificExercise}
          currentTipo={currentTipo}
          currentArea={currentArea}
          currentEjercicio={currentEjercicio}
        />
        
        {/* Modal de encuestas post-entrenamiento */}
        {isSurveyModalOpen && pendingSurveyPlayers[currentSurveyPlayerIndex] && (
          <PostTrainingSurveyModal
            isOpen={isSurveyModalOpen}
            onClose={handleCloseSurveyModal}
            player={pendingSurveyPlayers[currentSurveyPlayerIndex]}
            onSubmit={handleSurveySubmit}
            currentIndex={currentSurveyPlayerIndex}
            totalPlayers={pendingSurveyPlayers.length}
            enabledQuestions={enabledSurveyQuestions}
          />
        )}
        {/* Modal de confirmación de encuesta */}
        <SurveyConfirmationModal
          isOpen={isSurveyConfirmationModalOpen}
          onClose={handleDeclineSurveys}
          onConfirm={handleConfirmStartSurveys}
          playersCount={pendingSurveyPlayers.length}
        />
        
        {/* Modal de confirmación de salida de encuesta */}
        <SurveyExitConfirmModal
          isOpen={isSurveyExitConfirmModalOpen}
          onClose={handleCancelExitSurveys}
          onConfirmExit={handleConfirmExitSurveys}
          completedSurveys={currentSurveyPlayerIndex}
          totalSurveys={pendingSurveyPlayers.length}
          currentPlayerName={pendingSurveyPlayers[currentSurveyPlayerIndex]?.name}
        />

        {/* Header limpio y responsive */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800">
            {/* Navegación superior simplificada */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleGoBack}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 group"
                title={isEditMode ? "Volver al perfil" : "Volver a inicio"}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span className="text-sm sm:text-base">
                  {isEditMode ? "Volver" : "Volver"}
                </span>
              </button>

              {/* Selector de fecha móvil optimizado */}
              <div className="flex items-center gap-2 bg-gray-800/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-700">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  max={new Date().toLocaleDateString('en-CA')}
                  className="bg-transparent text-xs sm:text-sm font-medium text-gray-300 focus:outline-none 
                             focus:ring-1 focus:ring-green-500/50 rounded px-1 sm:px-2 py-1 cursor-pointer
                             hover:text-white transition-colors w-24 sm:w-auto"
                  title="Fecha del entrenamiento"
                />
              </div>
            </div>

            {/* Título simplificado */}
            <div className="text-center sm:text-left">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-1">
                    {isEditMode ? "Editando Entrenamiento" : "Entrenamiento Activo"}
                  </h1>
                  <p className="text-sm text-gray-400 truncate">
                    {playerNamesDisplay}
                  </p>
                  {isEditMode && (
                    <span className="inline-block mt-1 px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded border border-blue-500/30">
                      Modo Edición
                    </span>
                  )}
                </div>
                
                {/* Botones compactos */}
                <div className="flex gap-2 justify-center sm:justify-end">
                  <button 
                    onClick={() => setIsParticipantModalOpen(true)} 
                    className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-medium rounded-lg transition-all duration-200 border border-purple-500/30 text-sm"
                  >
                    <span className="hidden sm:inline">Participantes</span>
                    <span className="sm:hidden">👥</span>
                  </button>
                  <button 
                    onClick={() => setIsObjectiveModalOpen(true)} 
                    className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium rounded-lg transition-all duration-200 border border-blue-500/30 text-sm"
                  >
                    <span className="hidden sm:inline">Ver Info</span>
                    <span className="sm:hidden">ℹ️</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advertencia compacta en modo edición */}
        {isEditMode && (
          <div className="mb-4 bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-300 text-sm">
                <span className="font-medium">Editando sesión existente.</span>
                <span className="hidden sm:inline"> Los cambios sobrescribirán la sesión original.</span>
              </p>
            </div>
          </div>
        )}

        {/* Layout principal responsive */}
        <div className="space-y-4 sm:space-y-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
          {/* Columna principal */}
          <div className="lg:col-span-8 space-y-4 sm:space-y-6">
            {/* Selector de jugadores compacto */}
            <PlayerSelector
              participants={participants}
              activePlayerIds={activePlayerIds}
              onPlayerToggleActive={handlePlayerToggleActive}
              onToggleSelectAll={toggleSelectAllPlayers}
            />

            {/* Panel de recomendaciones colapsible en móvil */}
            <div className="lg:block">
              <ActiveSessionRecommendations
                participants={participants}
                currentSessionExercises={exercises} 
              />
            </div>
            
            {/* Objetivos compactos para un solo jugador */}
            {singleActivePlayer && objectivesForSingleActivePlayer.length > 0 && (
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-gray-800">
                <p className="text-sm text-gray-400">
                  <span className="text-green-400 font-medium">Objetivos de {singleActivePlayer.name}:</span>
                  <span className="block sm:inline sm:ml-1 mt-1 sm:mt-0">
                    {objectivesForSingleActivePlayer.map(o => o.textoObjetivo).join(', ')}
                  </span>
                </p>
              </div>
            )}

            {/* Formulario de ejercicio mejorado */}
            <ExerciseForm
              currentTipo={currentTipo}
              currentArea={currentArea}
              currentEjercicio={currentEjercicio}
              currentEjercicioEspecifico={currentEjercicioEspecifico}
              tiempoCantidad={tiempoCantidad}
              intensidad={intensidad}
              availableTipos={availableTipos}
              availableAreas={availableAreas}
              availableEjercicios={availableEjercicios}
              availableSpecificExercises={availableSpecificExercises}
              onTipoChange={handleTipoChange}
              onAreaChange={handleAreaChange}
              onEjercicioChange={handleEjercicioChange}
              onEjercicioEspecificoChange={setCurrentEjercicioEspecifico}
              onTiempoCantidadChange={setTiempoCantidad}
              onIntensidadChange={setIntensidad}
              onSubmit={handleAddExerciseToSession}
              onAddSpecificExercise={handleAddSpecificExercise}
            />

            {/* Observaciones compactas */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-gray-800">
                <h2 className="text-lg font-semibold text-white mb-3">Observaciones</h2>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20 transition-all duration-200 resize-none text-sm"
                  placeholder="Notas sobre actitud, condiciones, sensaciones..."
                />
            </div>

            {/* Configuración de encuestas - Solo mostrar en modo creación */}
            {!isEditMode && (
              <SurveySettings
                askForSurveys={askForSurveys}
                onAskForSurveysChange={setAskForSurveys}
              />
            )}
          </div>

          {/* Columna lateral - Lista de ejercicios y resumen */}
          <SessionSummary
            exercises={exercises}
            participants={participants}
          />
        </div>

        {/* Botón de finalizar optimizado para móvil */}
        <div className="sticky bottom-0 left-0 right-0 p-3 sm:p-4 bg-black/90 backdrop-blur-lg border-t border-gray-800 lg:relative lg:mt-6 lg:p-0 lg:bg-transparent lg:backdrop-blur-none lg:border-0 z-40">
          <div className="flex gap-2 sm:gap-3 max-w-4xl mx-auto">
            {/* Botón cancelar compacto */}
            <button 
              onClick={handleGoBack}
              className="lg:hidden px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-all duration-200 flex-shrink-0 text-sm"
            >
              Cancelar
            </button>
            
            {/* Botón finalizar */}
            <button 
              onClick={handleFinishTraining} 
              className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold text-sm sm:text-base lg:text-lg rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/25"
            >
              <span className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                </svg>
                <span className="hidden sm:inline">
                  {isEditMode ? "Guardar Cambios" : "Finalizar y Guardar"}
                </span>
                <span className="sm:hidden">
                  {isEditMode ? "Guardar" : "Finalizar"}
                </span>
              </span>
            </button>
          </div>
        </div>
        
        {/* Espaciado para botón fijo en móvil */}
        <div className="h-16 sm:h-20 lg:hidden"></div>
      </div>
    </div>
  );
};

export default TrainingSessionPage;