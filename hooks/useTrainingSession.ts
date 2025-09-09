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
import { useNotification } from './useNotification';

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
  const notification = useNotification();
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia(); // ✅ Obtener academia completa
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
    removeExercise,
    endSession, 
    loadSession,
    loadSessionForEdit
  } = useTraining();
  
  const academiaId = academiaActual?.id || '';
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode] = useState(!!editSessionId);
  
  const editSessionLoadedRef = useRef(false);
  
  const [sessionDate, setSessionDate] = useState<string>(() => {
    if (isEditMode && originalSession) {
      const originalDate = new Date(originalSession.fecha);
      return originalDate.toLocaleDateString('en-CA');
    }
    return new Date().toLocaleDateString('en-CA');
  });

  const localStorage = useSessionPersistence(academiaId);

  // ✅ CRÍTICO: Pasar academiaActual completa a useSessionSave
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
    sessionDate,
    academiaData: academiaActual // ✅ AGREGADO: Pasar datos completos de academia
  });

  const exerciseForm = useExerciseForm({
    specificExercises,
    setSpecificExercises
  });

  const participantsManager = useSessionParticipants({
    participants,
    setParticipants,
    allObjectives,
    isEditMode
  });

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

  useEffect(() => {
    if (participants.length > 0 || exercises.length > 0) {
      localStorage.saveSession(participants, exercises);
    }
  }, [participants, exercises, localStorage]);

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

  useEffect(() => {
    if (
      isEditMode && 
      originalSession && 
      originalSession.ejercicios.length > 0 && 
      !editSessionLoadedRef.current &&
      allPlayers.length > 0
    ) {
      const player = allPlayers.find(p => p.id === originalSession.jugadorId);
      if (player) {
        console.log('Cargando sesión para edición:', originalSession.id);
        
        const exercisesForContext = SessionService.convertToSessionExercises(
          originalSession.ejercicios,
          originalSession.jugadorId,
          player.name
        );
        
        loadSessionForEdit([player], exercisesForContext);
        editSessionLoadedRef.current = true;
        
        console.log('Sesión cargada exitosamente para edición');
      }
    }
  }, [isEditMode, originalSession?.id, allPlayers, loadSessionForEdit]);

  useEffect(() => {
    if (originalSession?.id) {
      editSessionLoadedRef.current = false;
    }
  }, [originalSession?.id]);

  const handleAddExerciseToSession = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = exerciseForm.validateForm(participantsManager.activePlayerIds);
    
    if (!validation.isValid) {
      notification.error(validation.error || 'Error en el formulario');
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
  }, [exerciseForm, participantsManager.activePlayerIds, participants, addExercise, notification]);

  const handleRemoveExercise = useCallback(async (exerciseIndex: number, exerciseName: string, playerName: string) => {
    const confirmed = await notification.confirm({
      title: 'Eliminar Ejercicio',
      message: `¿Estás seguro de que quieres eliminar el ejercicio "${exerciseName}" de ${playerName}?`,
      type: 'warning',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });
    
    if (confirmed) {
      removeExercise(exerciseIndex);
      notification.success('Ejercicio eliminado', 'El ejercicio fue eliminado correctamente');
    }
  }, [removeExercise, notification]);

  const handleSurveySubmit = useCallback(async (playerId: string, responses: any) => {
    await surveysManager.handleSurveySubmit(playerId, responses, addSessionToContext);
  }, [surveysManager, addSessionToContext]);

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
      sessionDate
    );
    
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
    sessionDate
  ]);

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
    isLoading,
    isEditMode,
    originalSession,
    participants,
    exercises,
    observaciones,
    setObservaciones,
    sessionDate,
    setSessionDate,
    
    ...participantsManager,
    ...exerciseForm,
    
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
    
    handleAddExerciseToSession,
    handleRemoveExercise,
    handleFinishTraining,
    handleSurveySubmit,
    handleDeclineSurveys,
    
    allPlayers,
    allObjectives,
    allTournaments,
  };
};