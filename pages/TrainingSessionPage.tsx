import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { Player, Objective, Tournament } from '../types';
import { useTrainingSession } from '../hooks/useTrainingSession';
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

interface TrainingSessionPageProps {
  allPlayers: Player[];
  allObjectives: Objective[];
  allTournaments: Tournament[];
  onDataChange: () => Promise<void>; // 
  academiaId: string;
  sessions?: any[];
}

const TrainingSessionPage: React.FC<TrainingSessionPageProps> = (props) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { playerId } = useParams();
  
  // Detectar si estamos en modo edición
  const editSessionId = searchParams.get('edit');
  const isEditMode = !!editSessionId;
  
  // Estado para tracking de navegación
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { sessions = [], academiaId } = props;
  
  // Encontrar la sesión original si estamos editando
  const originalSession = isEditMode ? sessions.find(s => s.id === editSessionId) : null;
  const originalPlayer = originalSession ? props.allPlayers.find(p => p.id === originalSession.jugadorId) : null;

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
    
    // Estados del formulario
    currentTipoKey,
    currentAreaKey,
    currentEjercicioName,
    currentEjercicioEspecifico,
    tiempoCantidad,
    intensidad,
    
    // Opciones disponibles
    availableTipoKeys,
    availableAreaKeys,
    availableEjercicioNames,
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
    setCurrentEjercicioName,
    setCurrentEjercicioEspecifico,
    setTiempoCantidad,
    setIntensidad,
    
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
    
    // Props para componentes
    allPlayers,
    allObjectives,
    allTournaments,
  } = useTrainingSession({
    ...props,
    editSessionId,
    originalSession
  });

  // Detectar cambios para mostrar advertencia
  useEffect(() => {
    setHasUnsavedChanges(exercises.length > 0 || observaciones.trim().length > 0);
  }, [exercises, observaciones]);

  // Función para manejar navegación hacia atrás
  const handleGoBack = () => {
    if (hasUnsavedChanges) {
      const confirmExit = window.confirm(
        '¿Estás seguro de que quieres salir? Se perderán todos los cambios no guardados.'
      );
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
          allObjectives={allObjectives} 
          allTournaments={allTournaments} 
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
          currentTipo={currentTipoKey}
          currentArea={currentAreaKey}
          currentEjercicio={currentEjercicioName}
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

        {/* Header mejorado con navegación */}
        <div className="mb-6 lg:mb-10">
          <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl shadow-2xl shadow-green-500/10">
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 sm:p-6 lg:p-8">
              {/* Breadcrumb y botón volver */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={handleGoBack}
                  className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 group"
                  title={isEditMode ? "Volver al perfil" : "Volver a inicio"}
                >
                  <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  <span className="hidden sm:inline">
                    {isEditMode ? "Volver al Perfil" : "Volver"}
                  </span>
                </button>
                
                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-gray-400">
                  <span>Entrenamientos</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-green-400">
                    {isEditMode ? "Editando Sesión" : "Nueva Sesión"}
                  </span>
                </nav>
              </div>

              {/* Título e información */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                      {isEditMode ? "Editando Entrenamiento" : "Entrenamiento en Curso"}
                    </h1>
                    {isEditMode && (
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-full border border-blue-500/30">
                        Modo Edición
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm sm:text-base lg:text-lg text-gray-400 truncate" title={playerNamesDisplay}>
                    {playerNamesDisplay}
                    {isEditMode && originalSession && (
                      <span className="ml-2 text-yellow-400">
                        • {new Date(originalSession.fecha).toLocaleDateString('es-ES')}
                      </span>
                    )}
                  </p>
                </div>
                
                {/* Botones de acción */}
                <div className="flex gap-2 lg:gap-3 flex-shrink-0">
                  <button 
                    onClick={() => setIsParticipantModalOpen(true)} 
                    className="px-4 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-400 font-semibold rounded-lg transition-all duration-200 border border-purple-500/30 hover:border-purple-500/50 text-sm lg:text-base"
                  >
                    Participantes
                  </button>
                  <button 
                    onClick={() => setIsObjectiveModalOpen(true)} 
                    className="px-4 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30 text-blue-400 font-semibold rounded-lg transition-all duration-200 border border-blue-500/30 hover:border-blue-500/50 text-sm lg:text-base"
                  >
                    Ver Info
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advertencia en modo edición */}
        {isEditMode && (
          <div className="mb-6 bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-blue-300 font-medium">Modo Edición Activado</p>
                <p className="text-blue-400 text-sm mt-1">
                  Estás modificando un entrenamiento existente. Los cambios sobrescribirán la sesión original y se mantendrá la encuesta post-entrenamiento si existe.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Grid principal para desktop */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Columna principal */}
          <div className="lg:col-span-8 space-y-6">
            {/* Selector de jugadores mejorado */}
            <PlayerSelector
              participants={participants}
              activePlayerIds={activePlayerIds}
              onPlayerToggleActive={handlePlayerToggleActive}
              onToggleSelectAll={toggleSelectAllPlayers}
            />

            {/* Panel de recomendaciones de entrenamiento */}
            <ActiveSessionRecommendations
              participants={participants}
              academiaId={academiaId}
              sessions={sessions}
            />
            
            {/* Mostrar objetivos cuando hay un solo jugador seleccionado */}
            {singleActivePlayer && objectivesForSingleActivePlayer.length > 0 && (
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg">
                <p className="text-gray-400 text-sm lg:text-base">
                  <span className="text-green-400 font-semibold">Objetivos de {singleActivePlayer.name}:</span> {objectivesForSingleActivePlayer.map(o => o.textoObjetivo).join(', ')}
                </p>
              </div>
            )}

            {/* Formulario de ejercicio mejorado para desktop */}
            <ExerciseForm
              currentTipoKey={currentTipoKey}
              currentAreaKey={currentAreaKey}
              currentEjercicioName={currentEjercicioName}
              currentEjercicioEspecifico={currentEjercicioEspecifico}
              tiempoCantidad={tiempoCantidad}
              intensidad={intensidad}
              availableTipoKeys={availableTipoKeys}
              availableAreaKeys={availableAreaKeys}
              availableEjercicioNames={availableEjercicioNames}
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

            {/* Observaciones de la sesión */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg">
                <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">Observaciones de la Sesión</h2>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={4}
                  className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"
                  placeholder="Añade aquí notas sobre la actitud del jugador, condiciones climáticas, sensaciones, etc."
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

        {/* Botón de finalizar con navegación mejorada */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-lg border-t border-gray-800 lg:relative lg:mt-8 lg:p-0 lg:bg-transparent lg:backdrop-blur-none lg:border-0">
          <div className="flex gap-3">
            {/* Botón cancelar para móvil */}
            <button 
              onClick={handleGoBack}
              className="lg:hidden px-4 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200 flex-shrink-0"
            >
              Cancelar
            </button>
            
            {/* Botón finalizar */}
            <button 
              onClick={handleFinishTraining} 
              className="flex-1 px-6 py-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold text-lg lg:text-xl rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/25"
            >
              <span className="flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                </svg>
                {isEditMode ? "Guardar Cambios" : "Finalizar y Guardar"}
              </span>
            </button>
          </div>
        </div>
        
        {/* Espaciado extra en móvil para el botón fijo */}
        <div className="h-20 lg:hidden"></div>
      </div>
    </div>
  );
};

export default TrainingSessionPage;