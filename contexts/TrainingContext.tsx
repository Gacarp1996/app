import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '../types';
import { useAcademia } from './AcademiaContext';

export interface SessionExercise {
  id: string;
  tipo: any;
  area: any;
  ejercicio: string;
  ejercicioEspecifico?: string;
  tiempoCantidad: string;
  intensidad: number;
  loggedForPlayerId: string;
  loggedForPlayerName: string;
}

interface TrainingContextType {
  isSessionActive: boolean;
  participants: Player[];
  exercises: SessionExercise[];
  setParticipants: React.Dispatch<React.SetStateAction<Player[]>>;
  setExercises: React.Dispatch<React.SetStateAction<SessionExercise[]>>;
  startSession: (players: Player[]) => void;
  addExercise: (exercise: SessionExercise) => void;
  endSession: () => void;
  loadSession: () => boolean;
  loadSessionForEdit: (players: Player[], exercises: SessionExercise[]) => void;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export const TrainingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [participants, setParticipants] = useState<Player[]>([]);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();
  const { academiaActual } = useAcademia();

  const getStorageKey = useCallback(() => {
    if (!academiaActual?.id) return null;
    return `inProgressTrainingSession_${academiaActual.id}`;
  }, [academiaActual]);

  useEffect(() => {
    if (!isInitialized && academiaActual) {
      const storageKey = getStorageKey();
      if (storageKey) {
        const savedSession = localStorage.getItem(storageKey);
        if (savedSession) {
          try {
            const parsedSession = JSON.parse(savedSession);
            if (parsedSession.participants && Array.isArray(parsedSession.participants) && parsedSession.participants.length > 0) {
              setIsSessionActive(true);
            }
          } catch (error) {
            console.error('Error al verificar sesión guardada:', error);
            localStorage.removeItem(storageKey);
          }
        }
      }
      setIsInitialized(true);
    }
  }, [academiaActual, getStorageKey, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;

    const storageKey = getStorageKey();
    if (!storageKey) return;

    if (participants.length > 0 || exercises.length > 0) {
      const sessionData = JSON.stringify({ participants, exercises });
      localStorage.setItem(storageKey, sessionData);
    } else if (participants.length === 0 && exercises.length === 0 && !isSessionActive) {
      localStorage.removeItem(storageKey);
    }
  }, [participants, exercises, getStorageKey, isInitialized, isSessionActive]);

  const loadSession = useCallback(() => {
    const storageKey = getStorageKey();
    if (!storageKey) return false;

    try {
      const savedSession = localStorage.getItem(storageKey);
      if (savedSession) {
        const { participants: savedParticipants, exercises: savedExercises } = JSON.parse(savedSession);
        if (savedParticipants && Array.isArray(savedParticipants) && savedParticipants.length > 0) {
          setParticipants(savedParticipants);
          setExercises(savedExercises || []);
          setIsSessionActive(true);
          return true;
        }
      }
    } catch (error) {
      console.error('Error al cargar sesión:', error);
      const storageKey = getStorageKey();
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    }
    return false;
  }, [getStorageKey]);

  const loadSessionForEdit = (players: Player[], exercises: SessionExercise[]) => {
    setParticipants(players);
    setExercises(exercises);
    setIsSessionActive(true);
  };

  const startSession = useCallback((players: Player[]) => {
    if (players.length === 0) return;

    setParticipants(players);
    setExercises([]);
    setIsSessionActive(true);

    const playerIds = players.map(p => p.id).join(',');
    navigate(`/training/${playerIds}`);
  }, [navigate]);

  const addExercise = useCallback((exercise: SessionExercise) => {
    setExercises(prev => [...prev, exercise]);
  }, []);

  const endSession = useCallback(() => {
    const storageKey = getStorageKey();
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    setParticipants([]);
    setExercises([]);
    setIsSessionActive(false);
  }, [getStorageKey]);

  return (
    <TrainingContext.Provider value={{ 
      isSessionActive, 
      participants, 
      exercises, 
      setParticipants, 
      setExercises,
      startSession, 
      addExercise, 
      endSession, 
      loadSession, 
      loadSessionForEdit
    }}>
      {children}
    </TrainingContext.Provider>
  );
};

export const useTraining = (): TrainingContextType => {
  const context = useContext(TrainingContext);
  if (!context) throw new Error('useTraining debe ser usado dentro de un TrainingProvider');
  return context;
};
