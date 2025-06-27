// hooks/useSessionPersistence.ts
import { useCallback } from 'react';
import { Player } from '../types';
import { SessionExercise } from '../contexts/TrainingContext';

interface SessionData {
  participants: Player[];
  exercises: SessionExercise[];
  timestamp: number;
}

const SESSION_EXPIRY_HOURS = 24; // Las sesiones expiran después de 24 horas

export const useSessionPersistence = (academiaId: string | undefined) => {
  const getStorageKey = useCallback(() => {
    if (!academiaId) return null;
    return `inProgressTrainingSession_${academiaId}`;
  }, [academiaId]);

  const saveSession = useCallback((participants: Player[], exercises: SessionExercise[]) => {
    const key = getStorageKey();
    if (!key) return false;

    try {
      const sessionData: SessionData = {
        participants,
        exercises,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(sessionData));
      return true;
    } catch (error) {
      console.error('Error guardando sesión:', error);
      return false;
    }
  }, [getStorageKey]);

  const loadSession = useCallback((): SessionData | null => {
    const key = getStorageKey();
    if (!key) return null;

    try {
      const savedData = localStorage.getItem(key);
      if (!savedData) return null;

      const sessionData: SessionData = JSON.parse(savedData);
      
      // Verificar que la sesión no haya expirado
      const hoursElapsed = (Date.now() - sessionData.timestamp) / (1000 * 60 * 60);
      if (hoursElapsed > SESSION_EXPIRY_HOURS) {
        localStorage.removeItem(key);
        return null;
      }

      // Validar estructura de datos
      if (!Array.isArray(sessionData.participants) || 
          !Array.isArray(sessionData.exercises) ||
          sessionData.participants.length === 0) {
        localStorage.removeItem(key);
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error('Error cargando sesión:', error);
      const key = getStorageKey();
      if (key) localStorage.removeItem(key);
      return null;
    }
  }, [getStorageKey]);

  const clearSession = useCallback(() => {
    const key = getStorageKey();
    if (key) {
      localStorage.removeItem(key);
    }
  }, [getStorageKey]);

  const hasActiveSession = useCallback((): boolean => {
    const key = getStorageKey();
    if (!key) return false;
    return localStorage.getItem(key) !== null;
  }, [getStorageKey]);

  return {
    saveSession,
    loadSession,
    clearSession,
    hasActiveSession
  };
};