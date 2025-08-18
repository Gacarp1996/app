// hooks/useSessionSave.ts
import { useCallback, useState, useEffect } from 'react';
import { TrainingSession, Player, SessionExercise, SpecificExercise } from '../types/types';
import { SessionService } from '../services/sessionService';
import { useNavigate } from 'react-router-dom';
import { useNotification } from './useNotification'; // ✅ NUEVO IMPORT

interface UseSessionSaveProps {
  academiaId: string;
  currentUser: any;
  originalSession?: TrainingSession | null;
  isEditMode: boolean;
  sessionDate?: string;
}

export const useSessionSave = ({
  academiaId,
  currentUser,
  originalSession,
  isEditMode,
  sessionDate = new Date().toLocaleDateString('en-CA')
}: UseSessionSaveProps) => {
  const navigate = useNavigate();
  const notification = useNotification(); // ✅ USAR HOOK DE NOTIFICACIONES
  const [observaciones, setObservaciones] = useState(originalSession?.observaciones || '');
  const [specificExercises, setSpecificExercises] = useState<SpecificExercise[]>([]);
  const [pendingSessionsToSave, setPendingSessionsToSave] = useState<Omit<TrainingSession, 'id'>[]>([]);

  useEffect(() => {
    if (!academiaId) return;
    
    const savedSpecificExercises = localStorage.getItem(`specificExercises_${academiaId}`);
    if (savedSpecificExercises) {
      try {
        setSpecificExercises(JSON.parse(savedSpecificExercises));
      } catch (error) {
        console.error('Error loading specific exercises:', error);
      }
    }
  }, [academiaId]);

  useEffect(() => {
    if (specificExercises.length > 0 && academiaId) {
      localStorage.setItem(`specificExercises_${academiaId}`, JSON.stringify(specificExercises));
    }
  }, [specificExercises, academiaId]);

  const createSessionsToSave = useCallback((
    participants: Player[],
    exercises: SessionExercise[]
  ): Omit<TrainingSession, 'id'>[] => {
    if (!currentUser) {
      throw new Error('No se puede identificar al entrenador');
    }

    return SessionService.createSessionsForPlayers(
      participants,
      exercises,
      currentUser.uid,
      sessionDate,
      observaciones
    );
  }, [currentUser, observaciones, sessionDate]);

  // ✅ MIGRADO: Guardar sesiones directamente
  const saveSessionsDirectly = useCallback(async (
    sessionsToSave: Omit<TrainingSession, 'id'>[],
    addSessionToContext: (session: Omit<TrainingSession, 'id'>) => Promise<string>,
    endSession: () => void,
    refreshSessions: () => Promise<void>,
    refreshPlayers: () => Promise<void>
  ) => {
    if (!currentUser) {
      // MIGRADO: alert → notification.error
      notification.error('Error: No se puede identificar al entrenador.');
      return;
    }

    const sessionPromises = sessionsToSave.map(async (session) => {
      const sessionWithTrainer = {
        ...session,
        entrenadorId: currentUser.uid
      };
      
      try {
        const sessionId = await addSessionToContext(sessionWithTrainer);
        return { playerId: session.jugadorId, sessionId };
      } catch (error) {
        console.error('Error guardando sesión:', error);
        return null;
      }
    });

    const results = await Promise.all(sessionPromises);
    
    const sessionIdsMap = new Map<string, string>();
    results.forEach(result => {
      if (result?.sessionId) {
        sessionIdsMap.set(result.playerId, result.sessionId);
      }
    });
    
    // MIGRADO: alert → notification.success
    notification.success(
      `Entrenamiento finalizado y guardado para ${sessionsToSave.length} jugador(es)`,
      'Redirigiendo a la lista de jugadores...'
    );
    
    endSession();
    navigate('/players');
    
    setTimeout(async () => {
      await refreshSessions();
      await refreshPlayers();
    }, 100);
    
    return sessionIdsMap;
  }, [currentUser, navigate, notification]);

  // ✅ MIGRADO: Actualizar sesión existente
  const handleUpdateExistingSession = useCallback(async (
    exercises: SessionExercise[],
    updateSessionInContext: (id: string, updates: Partial<TrainingSession>) => Promise<void>,
    allPlayers: Player[],
    endSession: () => void,
    refreshSessions: () => Promise<void>,
    refreshPlayers: () => Promise<void>,
    sessionDate?: string
  ) => {
    if (!originalSession || !currentUser) {
      // MIGRADO: alert → notification.error
      notification.error('Error: Faltan datos necesarios para actualizar la sesión.');
      return;
    }

    try {
      const updatedExercises = SessionService.prepareExercisesForUpdate(
        exercises,
        originalSession.jugadorId
      );

      const updatedSession: Partial<Omit<TrainingSession, "id">> = {
        ejercicios: updatedExercises,
        observaciones: observaciones.trim(),
        entrenadorId: currentUser.uid,
        ...(sessionDate && sessionDate !== new Date(originalSession.fecha).toLocaleDateString('en-CA') 
          ? { 
              // ✅ MEJORADO: Usar hora actual en lugar de 12:00 hardcodeado
              fecha: (() => {
                const now = new Date();
                const sessionDateTime = sessionDate + 'T' + now.toTimeString().substring(0, 8);
                return new Date(sessionDateTime).toISOString();
              })()
            }
          : {})
      };

      await updateSessionInContext(originalSession.id, updatedSession);
      
      // MIGRADO: alert → notification.success
      notification.success('Entrenamiento actualizado exitosamente');
      
      endSession();
      
      const player = allPlayers.find(p => p.id === originalSession.jugadorId);
      navigate(player ? `/player/${player.id}` : '/players');
      
      setTimeout(async () => {
        await refreshSessions();
        await refreshPlayers();
      }, 100);
      
    } catch (error) {
      console.error('Error actualizando sesión:', error);
      // MIGRADO: alert → notification.error
      notification.error('Error al actualizar el entrenamiento');
    }
  }, [originalSession, currentUser, observaciones, navigate, notification]);

  // ✅ MIGRADO: Handler principal para finalizar entrenamiento
  const handleFinishTraining = useCallback(async (
    exercises: SessionExercise[],
    participants: Player[],
    addSessionToContext: (session: Omit<TrainingSession, 'id'>) => Promise<string>,
    updateSessionInContext: (id: string, updates: Partial<TrainingSession>) => Promise<void>,
    allPlayers: Player[],
    endSession: () => void,
    refreshSessions: () => Promise<void>,
    refreshPlayers: () => Promise<void>,
    startSurveyProcess?: (players: Player[]) => boolean,
    sessionDate?: string
  ) => {
    // MIGRADO: window.confirm → notification.confirm
    if (exercises.length === 0) {
      const confirmed = await notification.confirm({
        title: 'Entrenamiento sin ejercicios',
        message: 'No has registrado ningún ejercicio. ¿Deseas finalizar de todas formas?',
        type: 'warning',
        confirmText: 'Sí, finalizar',
        cancelText: 'Continuar agregando'
      });
      
      if (!confirmed) return;
    }
    
    if (!currentUser) {
      // MIGRADO: alert → notification.error
      notification.error(
        'Error: No se puede identificar al entrenador',
        'Por favor, inicia sesión nuevamente.'
      );
      return;
    }

    if (isEditMode && originalSession) {
      await handleUpdateExistingSession(
        exercises,
        updateSessionInContext,
        allPlayers,
        endSession,
        refreshSessions,
        refreshPlayers,
        sessionDate
      );
    } else {
      const sessionsToSave = createSessionsToSave(participants, exercises);
      setPendingSessionsToSave(sessionsToSave);

      if (sessionsToSave.length > 0) {
        const playersWithSessions = participants.filter(p => 
          sessionsToSave.some(session => session.jugadorId === p.id)
        );
        
        const surveysStarted = startSurveyProcess?.(playersWithSessions) || false;
        
        if (!surveysStarted) {
          await saveSessionsDirectly(
            sessionsToSave,
            addSessionToContext,
            endSession,
            refreshSessions,
            refreshPlayers
          );
        }
      } else {
        // MIGRADO: alert → notification.info
        notification.info("Entrenamiento finalizado", "No se guardaron datos nuevos.");
        navigate('/players');
      }
    }
  }, [
    currentUser,
    isEditMode,
    originalSession,
    handleUpdateExistingSession,
    createSessionsToSave,
    saveSessionsDirectly,
    navigate,
    notification
  ]);

  return {
    observaciones,
    specificExercises,
    pendingSessionsToSave,
    setObservaciones,
    setSpecificExercises,
    setPendingSessionsToSave,
    handleFinishTraining,
    saveSessionsDirectly,
    createSessionsToSave
  };
};