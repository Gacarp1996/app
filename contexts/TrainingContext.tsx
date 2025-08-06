import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, SessionExercise } from '../types';
import { useAcademia } from './AcademiaContext';
import useLocalStorage from '../hooks/useLocalStorage';

interface TrainingSessionData {
  participants: Player[];
  exercises: SessionExercise[];
  timestamp?: string;
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
  const navigate = useNavigate();
  const { academiaActual } = useAcademia();
  
  // Usar useLocalStorage para persistencia automática
  const storageKey = academiaActual?.id ? `inProgressTrainingSession_${academiaActual.id}` : null;
  
  const [sessionData, setSessionData] = useLocalStorage<TrainingSessionData | null>(
    storageKey || 'tempTrainingSession',
    null
  );

  // Sincronizar el estado local con localStorage cuando cambie sessionData
  useEffect(() => {
    if (sessionData && sessionData.participants && sessionData.participants.length > 0) {
      setParticipants(sessionData.participants);
      setExercises(sessionData.exercises || []);
      setIsSessionActive(true);
    }
  }, []); // Solo ejecutar al montar

  // Actualizar sessionData cuando cambien participants o exercises
  useEffect(() => {
    if (participants.length > 0 || exercises.length > 0) {
      setSessionData({
        participants,
        exercises,
        timestamp: new Date().toISOString()
      });
      setIsSessionActive(true);
    } else if (participants.length === 0 && exercises.length === 0 && !isSessionActive) {
      setSessionData(null);
    }
  }, [participants, exercises]);

  const loadSession = useCallback(() => {
    if (!sessionData) return false;
    
    try {
      if (sessionData.participants && sessionData.participants.length > 0) {
        setParticipants(sessionData.participants);
        setExercises(sessionData.exercises || []);
        setIsSessionActive(true);
        return true;
      }
    } catch (error) {
      console.error('Error al cargar sesión:', error);
    }
    return false;
  }, [sessionData]);

  const loadSessionForEdit = (players: Player[], exercises: SessionExercise[]) => {
    setParticipants(players);
    setExercises(exercises);
    setIsSessionActive(true);
    setSessionData({
      participants: players,
      exercises: exercises,
      timestamp: new Date().toISOString()
    });
  };

  const startSession = useCallback((players: Player[]) => {
    if (players.length === 0) return;

    setParticipants(players);
    setExercises([]);
    setIsSessionActive(true);
    setSessionData({
      participants: players,
      exercises: [],
      timestamp: new Date().toISOString()
    });

    const playerIds = players.map(p => p.id).join(',');
    navigate(`/training/${playerIds}`);
  }, [navigate, setSessionData]);

  const addExercise = useCallback((exercise: SessionExercise) => {
    setExercises(prev => {
      const newExercises = [...prev, exercise];
      // También actualizar sessionData inmediatamente
      setSessionData(current => current ? {
        ...current,
        exercises: newExercises,
        timestamp: new Date().toISOString()
      } : null);
      return newExercises;
    });
  }, [setSessionData]);

  const endSession = useCallback(() => {
    setParticipants([]);
    setExercises([]);
    setIsSessionActive(false);
    setSessionData(null);
  }, [setSessionData]);

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

export type { SessionExercise } from '../types';