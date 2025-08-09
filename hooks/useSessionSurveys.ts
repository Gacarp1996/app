// hooks/useSessionSurveys.ts
import { useState, useCallback, useEffect } from 'react';
import { Player, TrainingSession } from '../types/types';
import { addPostTrainingSurvey } from '../Database/FirebaseSurveys';
import { getEnabledSurveyQuestions } from '../Database/FirebaseAcademiaConfig';

interface UseSessionSurveysProps {
  academiaId: string;
  currentUser: any;
  pendingSessionsToSave: Omit<TrainingSession, 'id'>[];
  onSurveysComplete: () => void;
  onSessionsSaved: (sessionIds: Map<string, string>) => void;
}

interface SurveyResponses {
  cansancioFisico?: number;
  concentracion?: number;
  actitudMental?: number;
  sensacionesTenisticas?: number;
}

export const useSessionSurveys = ({
  academiaId,
  currentUser,
  pendingSessionsToSave,
  onSurveysComplete,
  onSessionsSaved
}: UseSessionSurveysProps) => {
  // Estados principales
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [currentSurveyPlayerIndex, setCurrentSurveyPlayerIndex] = useState(0);
  const [pendingSurveyPlayers, setPendingSurveyPlayers] = useState<Player[]>([]);
  const [sessionIds, setSessionIds] = useState<Map<string, string>>(new Map());
  const [askForSurveys, setAskForSurveys] = useState(true);
  const [enabledSurveyQuestions, setEnabledSurveyQuestions] = useState<string[]>([
    'cansancioFisico', 
    'concentracion', 
    'actitudMental', 
    'sensacionesTenisticas'
  ]);
  
  // Estados de confirmación
  const [isSurveyConfirmationModalOpen, setIsSurveyConfirmationModalOpen] = useState(false);
  const [isSurveyExitConfirmModalOpen, setIsSurveyExitConfirmModalOpen] = useState(false);

  // Cargar preguntas habilitadas
  useEffect(() => {
    const loadEnabledQuestions = async () => {
      if (!academiaId) return;
      
      try {
        const questions = await getEnabledSurveyQuestions(academiaId);
        setEnabledSurveyQuestions(questions);
      } catch (error) {
        console.error('Error cargando preguntas habilitadas:', error);
      }
    };

    loadEnabledQuestions();
  }, [academiaId]);

  // Iniciar proceso de encuestas
  const startSurveyProcess = useCallback((players: Player[]) => {
    if (!askForSurveys || players.length === 0) {
      return false;
    }
    
    setPendingSurveyPlayers(players);
    setCurrentSurveyPlayerIndex(0);
    setIsSurveyConfirmationModalOpen(true);
    return true;
  }, [askForSurveys]);

  // Guardar respuesta de encuesta
  const handleSurveySubmit = useCallback(async (
    playerId: string, 
    responses: SurveyResponses,
    addSessionToContext: (session: Omit<TrainingSession, 'id'>) => Promise<string>
  ) => {
    try {
      if (!currentUser || !academiaId) {
        throw new Error('Error: No se puede identificar al entrenador.');
      }

      let currentSessionIds = sessionIds;
      
      // Si es la primera encuesta, guardar todas las sesiones
      if (currentSessionIds.size === 0) {
        const sessionPromises = pendingSessionsToSave.map(async (session) => {
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
        
        setSessionIds(sessionIdsMap);
        currentSessionIds = sessionIdsMap;
        onSessionsSaved(sessionIdsMap);
      }

      // Guardar encuesta
      const sessionId = currentSessionIds.get(playerId);
      if (!sessionId) {
        throw new Error(`No se encontró sessionId para el jugador: ${playerId}`);
      }

      const validResponses: any = {};
      Object.entries(responses).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          validResponses[key] = value;
        }
      });

      await addPostTrainingSurvey(academiaId, {
        jugadorId: playerId,
        sessionId: sessionId,
        fecha: new Date().toISOString(),
        ...validResponses
      });
      
      // Avanzar al siguiente jugador o finalizar
      if (currentSurveyPlayerIndex < pendingSurveyPlayers.length - 1) {
        setCurrentSurveyPlayerIndex(prev => prev + 1);
      } else {
        setIsSurveyModalOpen(false);
        onSurveysComplete();
      }
    } catch (error) {
      console.error('Error guardando encuesta:', error);
      alert('Error al guardar la encuesta. Intenta de nuevo.');
    }
  }, [
    currentUser, 
    academiaId, 
    sessionIds, 
    pendingSessionsToSave, 
    currentSurveyPlayerIndex, 
    pendingSurveyPlayers.length,
    onSurveysComplete,
    onSessionsSaved
  ]);

  // Handlers de modales
  const handleCloseSurveyModal = useCallback(() => {
    setIsSurveyExitConfirmModalOpen(true);
  }, []);

  const handleConfirmStartSurveys = useCallback(() => {
    setIsSurveyConfirmationModalOpen(false);
    setIsSurveyModalOpen(true);
  }, []);

  const handleDeclineSurveys = useCallback(() => {
    setIsSurveyConfirmationModalOpen(false);
    setSessionIds(new Map());
    onSurveysComplete();
  }, [onSurveysComplete]);

  const handleConfirmExitSurveys = useCallback(() => {
    setIsSurveyExitConfirmModalOpen(false);
    setIsSurveyModalOpen(false);
    onSurveysComplete();
  }, [onSurveysComplete]);

  const handleCancelExitSurveys = useCallback(() => {
    setIsSurveyExitConfirmModalOpen(false);
  }, []);

  // Reset estados
  const resetSurveyState = useCallback(() => {
    setIsSurveyModalOpen(false);
    setCurrentSurveyPlayerIndex(0);
    setPendingSurveyPlayers([]);
    setSessionIds(new Map());
    setIsSurveyConfirmationModalOpen(false);
    setIsSurveyExitConfirmModalOpen(false);
  }, []);

  return {
    // Estados
    isSurveyModalOpen,
    currentSurveyPlayerIndex,
    pendingSurveyPlayers,
    askForSurveys,
    enabledSurveyQuestions,
    isSurveyConfirmationModalOpen,
    isSurveyExitConfirmModalOpen,
    sessionIds,
    
    // Setters
    setAskForSurveys,
    setPendingSurveyPlayers,
    
    // Handlers
    startSurveyProcess,
    handleSurveySubmit,
    handleCloseSurveyModal,
    handleConfirmStartSurveys,
    handleDeclineSurveys,
    handleConfirmExitSurveys,
    handleCancelExitSurveys,
    resetSurveyState
  };
};