// hooks/useTrainingSession.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, TrainingSession, Tournament } from '../types/types';
import { useTraining } from '../contexts/TrainingContext';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useSession } from '../contexts/SessionContext';
import { useObjective } from '../contexts/ObjectiveContext';
import { SessionService } from '../services/sessionService';
import { useExerciseForm } from './useExerciseForm';
import { useSessionParticipants } from './useSessionParticipants';
import { useSessionSurveys } from './useSessionSurveys';
import { useSessionSave } from './useSessionSave';
import { useSessionPersistence } from './useSessionPersistence';

interface UseTrainingSessionProps {
  allTournaments: Tournament[];
  editSessionId?: string | null;
  originalSession?: TrainingSession | null;
}

export const useTrainingSession = ({
  allTournaments,
  editSessionId,
  originalSession
}: UseTrainingSessionProps) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia();
  const { players: allPlayers, refreshPlayers } = usePlayer();
  const { objectives: allObjectives } = useObjective();
  const { 
    addSession: addSessionToContext,
    updateSession: updateSessionInContext,
    refreshSessions: refreshSessionsInContext 
  } = useSession();
  const { 
    participants, 
    setParticipants, 
    exercises, 
    addExercise, 
    endSession, 
    loadSession,
    loadSessionForEdit
  } = useTraining();
  
  const academiaId = academiaActual?.id || '';
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode] = useState(!!editSessionId);
  
  // ✅ Ref para controlar si ya se cargó la sesión en modo edición
  const editSessionLoadedRef = useRef(false);
  
  // ✅ NUEVO: Estado para la fecha de la sesión (editable por el usuario)
  const [sessionDate, setSessionDate] = useState<string>(() => {
    // En modo edición, usar la fecha original
    if (isEditMode && originalSession) {
      const originalDate = new Date(originalSession.fecha);
      return originalDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
    }
    // Por defecto, usar fecha de hoy en hora local
    return new Date().toLocaleDateString('en-CA');
  });

  // Hook de persistencia en localStorage
  const localStorage = useSessionPersistence(academiaId);

  // Hook de guardado en Firebase - ✅ ACTUALIZADO para pasar sessionDate
  const {
    observaciones,
    specificExercises,
    pendingSessionsToSave,
    setObservaciones,
    setSpecificExercises,
    setPendingSessionsToSave,
    handleFinishTraining: handleFinishTrainingBase,
    saveSessionsDirectly
  } = useSessionSave({
    academiaId,
    currentUser,
    originalSession,
    isEditMode,
    sessionDate  // ✅ NUEVO: Pasar sessionDate
  });

  // Hook de formulario
  const exerciseForm = useExerciseForm({
    specificExercises,
    setSpecificExercises
  });

  // Hook de participantes
  const participantsManager = useSessionParticipants({
    participants,
    setParticipants,
    allObjectives,
    isEditMode
  });

  // Hook de encuestas
  const surveysManager = useSessionSurveys({
    academiaId,
    currentUser,
    pendingSessionsToSave,
    onSurveysComplete: async () => {
      localStorage.clearSession();
      endSession();
      navigate('/players');
      setTimeout(async () => {
        await refreshSessionsInContext();
        await refreshPlayers();
      }, 100);
    },
    onSessionsSaved: (sessionIds) => {
      // Opcional: manejar sessionIds si es necesario
    }
  });

  // Guardar en localStorage cuando cambien exercises o participants
  useEffect(() => {
    if (participants.length > 0 || exercises.length > 0) {
      localStorage.saveSession(participants, exercises);
    }
  }, [participants, exercises, localStorage]);

  // Cargar sesión inicial
  useEffect(() => {
    if (participants.length === 0 && !isEditMode) {
      const loaded = loadSession();
      if (!loaded) {
        navigate('/start-training');
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [participants.length, loadSession, navigate, isEditMode]);

  // ✅ Cargar datos de sesión en modo edición - MEJORADO
  useEffect(() => {
    // Solo ejecutar si:
    // 1. Estamos en modo edición
    // 2. Hay una sesión original con ejercicios
    // 3. No se ha cargado previamente
    // 4. Tenemos la lista de jugadores disponible
    if (
      isEditMode && 
      originalSession && 
      originalSession.ejercicios.length > 0 && 
      !editSessionLoadedRef.current &&
      allPlayers.length > 0
    ) {
      const player = allPlayers.find(p => p.id === originalSession.jugadorId);
      if (player) {
        console.log('🔄 Cargando sesión para edición - Jugador:', player.name);
        
        const exercisesForContext = SessionService.convertToSessionExercises(
          originalSession.ejercicios,
          originalSession.jugadorId,
          player.name
        );
        
        // Usar loadSessionForEdit que reemplaza todo de una vez
        loadSessionForEdit([player], exercisesForContext);
        
        // Marcar como cargado para evitar re-ejecuciones
        editSessionLoadedRef.current = true;
        
        console.log('✅ Sesión cargada para edición con', exercisesForContext.length, 'ejercicios');
      }
    }
  }, [isEditMode, originalSession?.id, allPlayers, loadSessionForEdit]);

  // ✅ Reset del ref cuando cambie la sesión original
  useEffect(() => {
    if (originalSession?.id) {
      editSessionLoadedRef.current = false;
    }
  }, [originalSession?.id]);

  // Handler para agregar ejercicio
  const handleAddExerciseToSession = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = exerciseForm.validateForm(participantsManager.activePlayerIds);
    
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }
    
    participantsManager.activePlayerIds.forEach(playerId => {
      const player = participants.find(p => p.id === playerId);
      if (player) {
        const newExercise = SessionService.createSessionExercise(
          exerciseForm.currentTipo as any,
          exerciseForm.currentArea as any,
          exerciseForm.currentEjercicio,
          exerciseForm.tiempoCantidad,
          exerciseForm.intensidad,
          player,
          exerciseForm.currentEjercicioEspecifico
        );
        addExercise(newExercise);
      }
    });
    
    exerciseForm.resetForm();
  }, [exerciseForm, participantsManager.activePlayerIds, participants, addExercise]);

  // Handler modificado para encuestas
  const handleSurveySubmit = useCallback(async (playerId: string, responses: any) => {
    await surveysManager.handleSurveySubmit(playerId, responses, addSessionToContext);
  }, [surveysManager, addSessionToContext]);

  // Handler para finalizar entrenamiento - ✅ ACTUALIZADO
  const handleFinishTraining = useCallback(async () => {
    await handleFinishTrainingBase(
      exercises,
      participants,
      addSessionToContext,
      updateSessionInContext,
      allPlayers,
      endSession,
      refreshSessionsInContext,
      refreshPlayers,
      surveysManager.askForSurveys ? surveysManager.startSurveyProcess : undefined,
      sessionDate  // ✅ NUEVO: Pasar sessionDate
    );
    
    // Limpiar localStorage después de guardar
    localStorage.clearSession();
  }, [
    handleFinishTrainingBase,
    exercises,
    participants,
    addSessionToContext,
    updateSessionInContext,
    allPlayers,
    endSession,
    refreshSessionsInContext,
    refreshPlayers,
    surveysManager.askForSurveys,
    surveysManager.startSurveyProcess,
    localStorage,
    sessionDate  // ✅ NUEVO: Agregar a dependencias
  ]);

  // Handler para declinar encuestas
  const handleDeclineSurveys = useCallback(async () => {
    surveysManager.handleDeclineSurveys();
    await saveSessionsDirectly(
      pendingSessionsToSave,
      addSessionToContext,
      endSession,
      refreshSessionsInContext,
      refreshPlayers
    );
    localStorage.clearSession();
  }, [
    surveysManager,
    saveSessionsDirectly,
    pendingSessionsToSave,
    addSessionToContext,
    endSession,
    refreshSessionsInContext,
    refreshPlayers,
    localStorage
  ]);

  return {
    // Estados básicos
    isLoading,
    isEditMode,
    originalSession,
    participants,
    exercises,
    observaciones,
    setObservaciones,
    sessionDate,        // ✅ NUEVO
    setSessionDate,     // ✅ NUEVO
    
    // Desde participantsManager
    ...participantsManager,
    
    // Desde exerciseForm
    ...exerciseForm,
    
    // Desde surveysManager (selectivo)
    isSurveyModalOpen: surveysManager.isSurveyModalOpen,
    currentSurveyPlayerIndex: surveysManager.currentSurveyPlayerIndex,
    pendingSurveyPlayers: surveysManager.pendingSurveyPlayers,
    askForSurveys: surveysManager.askForSurveys,
    enabledSurveyQuestions: surveysManager.enabledSurveyQuestions,
    isSurveyConfirmationModalOpen: surveysManager.isSurveyConfirmationModalOpen,
    isSurveyExitConfirmModalOpen: surveysManager.isSurveyExitConfirmModalOpen,
    setAskForSurveys: surveysManager.setAskForSurveys,
    handleCloseSurveyModal: surveysManager.handleCloseSurveyModal,
    handleConfirmStartSurveys: surveysManager.handleConfirmStartSurveys,
    handleConfirmExitSurveys: surveysManager.handleConfirmExitSurveys,
    handleCancelExitSurveys: surveysManager.handleCancelExitSurveys,
    
    // Handlers principales
    handleAddExerciseToSession,
    handleFinishTraining,
    handleSurveySubmit,
    handleDeclineSurveys,
    
    // Props para componentes
    allPlayers,
    allTournaments,
  };
};