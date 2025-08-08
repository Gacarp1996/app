// hooks/useSessionSave.ts
import { useCallback, useState, useEffect } from 'react';
import { TrainingSession, Player, SessionExercise, SpecificExercise } from '../types';
import { SessionService } from '../services/sessionService';
import { useNavigate } from 'react-router-dom';

interface UseSessionSaveProps {
  academiaId: string;
  currentUser: any;
  originalSession?: TrainingSession | null;
  isEditMode: boolean;
}

export const useSessionSave = ({
  academiaId,
  currentUser,
  originalSession,
  isEditMode
}: UseSessionSaveProps) => {
  const navigate = useNavigate();
  const [observaciones, setObservaciones] = useState(originalSession?.observaciones || '');
  const [specificExercises, setSpecificExercises] = useState<SpecificExercise[]>([]);
  const [pendingSessionsToSave, setPendingSessionsToSave] = useState<Omit<TrainingSession, 'id'>[]>([]);

  // Cargar ejercicios específicos del localStorage
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

  // Guardar ejercicios específicos en localStorage
  useEffect(() => {
    if (specificExercises.length > 0 && academiaId) {
      localStorage.setItem(`specificExercises_${academiaId}`, JSON.stringify(specificExercises));
    }
  }, [specificExercises, academiaId]);

  // Crear sesiones para guardar
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
      observaciones
    );
  }, [currentUser, observaciones]);

  // Guardar sesiones directamente
  const saveSessionsDirectly = useCallback(async (
    sessionsToSave: Omit<TrainingSession, 'id'>[],
    addSessionToContext: (session: Omit<TrainingSession, 'id'>) => Promise<string>,
    endSession: () => void,
    refreshSessions: () => Promise<void>,
    refreshPlayers: () => Promise<void>
  ) => {
    if (!currentUser) {
      alert('Error: No se puede identificar al entrenador.');
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
    
    alert(`Entrenamiento finalizado y guardado para ${sessionsToSave.length} jugador(es).`);
    endSession();
    navigate('/players');
    
    setTimeout(async () => {
      await refreshSessions();
      await refreshPlayers();
    }, 100);
    
    return sessionIdsMap;
  }, [currentUser, navigate]);

  // Actualizar sesión existente
  const handleUpdateExistingSession = useCallback(async (
    exercises: SessionExercise[],
    updateSessionInContext: (id: string, updates: Partial<TrainingSession>) => Promise<void>,
    allPlayers: Player[],
    endSession: () => void,
    refreshSessions: () => Promise<void>,
    refreshPlayers: () => Promise<void>
  ) => {
    if (!originalSession || !currentUser) {
      alert('Error: Faltan datos necesarios para actualizar la sesión.');
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
        entrenadorId: currentUser.uid
      };

      await updateSessionInContext(originalSession.id, updatedSession);
      alert('Entrenamiento actualizado exitosamente');
      endSession();
      
      const player = allPlayers.find(p => p.id === originalSession.jugadorId);
      navigate(player ? `/player/${player.id}` : '/players');
      
      setTimeout(async () => {
        await refreshSessions();
        await refreshPlayers();
      }, 100);
      
    } catch (error) {
      console.error('Error actualizando sesión:', error);
      alert('Error al actualizar el entrenamiento');
    }
  }, [originalSession, currentUser, observaciones, navigate]);

  // Handler principal para finalizar entrenamiento
  const handleFinishTraining = useCallback(async (
    exercises: SessionExercise[],
    participants: Player[],
    addSessionToContext: (session: Omit<TrainingSession, 'id'>) => Promise<string>,
    updateSessionInContext: (id: string, updates: Partial<TrainingSession>) => Promise<void>,
    allPlayers: Player[],
    endSession: () => void,
    refreshSessions: () => Promise<void>,
    refreshPlayers: () => Promise<void>,
    startSurveyProcess?: (players: Player[]) => boolean
  ) => {
    if (exercises.length === 0 && !window.confirm("No has registrado ningún ejercicio. ¿Deseas finalizar de todas formas?")) {
      return;
    }
    
    if (!currentUser) {
      alert('Error: No se puede identificar al entrenador. Por favor, inicia sesión nuevamente.');
      return;
    }

    if (isEditMode && originalSession) {
      await handleUpdateExistingSession(
        exercises,
        updateSessionInContext,
        allPlayers,
        endSession,
        refreshSessions,
        refreshPlayers
      );
    } else {
      const sessionsToSave = createSessionsToSave(participants, exercises);
      setPendingSessionsToSave(sessionsToSave);

      if (sessionsToSave.length > 0) {
        // Intentar iniciar encuestas si está disponible
        const playersWithSessions = participants.filter(p => 
          sessionsToSave.some(session => session.jugadorId === p.id)
        );
        
        const surveysStarted = startSurveyProcess?.(playersWithSessions) || false;
        
        if (!surveysStarted) {
          // Si no hay encuestas, guardar directamente
          await saveSessionsDirectly(
            sessionsToSave,
            addSessionToContext,
            endSession,
            refreshSessions,
            refreshPlayers
          );
        }
      } else {
        alert("Entrenamiento finalizado. No se guardaron datos nuevos.");
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
    navigate
  ]);

  return {
    // Estados
    observaciones,
    specificExercises,
    pendingSessionsToSave,
    
    // Setters
    setObservaciones,
    setSpecificExercises,
    setPendingSessionsToSave,
    
    // Handlers
    handleFinishTraining,
    saveSessionsDirectly,
    createSessionsToSave
  };
};