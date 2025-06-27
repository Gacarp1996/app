import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '../types';
import { useAcademia } from './AcademiaContext';

export interface SessionExercise {
  id: string;
  tipo: any;
  area: any;
  ejercicio: string;
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
  startSession: (players: Player[]) => void;
  addExercise: (exercise: SessionExercise) => void;
  endSession: () => void;
  loadSession: () => boolean;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export const TrainingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [participants, setParticipants] = useState<Player[]>([]);
  const [exercises, setExercises] = useState<SessionExercise[]>([]);
  const navigate = useNavigate();
  const { academiaActual } = useAcademia();

  // Generar clave dinámica basada en la academia
  const getStorageKey = useCallback(() => {
    if (!academiaActual?.id) return null;
    return `inProgressTrainingSession_${academiaActual.id}`;
  }, [academiaActual]);

  // Al cargar la app por primera vez, solo revisamos si hay algo en localStorage para esa academia
  useEffect(() => {
    const storageKey = getStorageKey();
    if (!storageKey) return;
    
    const savedSession = localStorage.getItem(storageKey);
    if (savedSession) {
      setIsSessionActive(true);
    }
  }, [getStorageKey]);

  // Guardamos el estado en localStorage CADA VEZ que los participantes o ejercicios cambian
  useEffect(() => {
    const storageKey = getStorageKey();
    // Si no hay participantes o no hay key, no hay sesión activa, así que no guardamos nada
    if (!storageKey || participants.length === 0) return;
    
    const sessionData = JSON.stringify({ participants, exercises });
    localStorage.setItem(storageKey, sessionData);
  }, [participants, exercises, getStorageKey]);

  const loadSession = useCallback(() => {
    const storageKey = getStorageKey();
    if (!storageKey) return false;
    
    const savedSession = localStorage.getItem(storageKey);
    if (savedSession) {
      const { participants: savedParticipants, exercises: savedExercises } = JSON.parse(savedSession);
      if (savedParticipants && savedParticipants.length > 0) {
        setParticipants(savedParticipants);
        setExercises(savedExercises || []);
        setIsSessionActive(true);
        return true;
      }
    }
    return false;
  }, [getStorageKey]);

  const startSession = useCallback((players: Player[]) => {
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
      startSession, 
      addExercise, 
      endSession, 
      loadSession 
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