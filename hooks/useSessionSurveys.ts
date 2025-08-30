// hooks/useSessionSurveys.ts
import { useState, useCallback, useEffect } from 'react';
import { Player, TrainingSession } from '../types/types';
import { addPostTrainingSurvey } from '../Database/FirebaseSurveys';
import { getEnabledSurveyQuestions } from '../Database/FirebaseAcademiaConfig';
import { toast } from 'sonner';
// ✅ AGREGADO: Importar funciones de roles para registro
import { getUserRoleInAcademia, addUserToAcademia, UserRole } from '../Database/FirebaseRoles';
import { obtenerAcademiaPorId } from '../Database/FirebaseAcademias';

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

  // ✅ CRÍTICO: Guardar respuesta de encuesta SIN registro duplicado
  const handleSurveySubmit = useCallback(async (
    playerId: string, 
    responses: SurveyResponses,
    addSessionToContext: (session: Omit<TrainingSession, 'id'>) => Promise<string>
  ) => {
    try {
      if (!currentUser || !academiaId) {
        throw new Error('Error: No se puede identificar al entrenador.');
      }

      // Obtener la fecha de la sesión del jugador
      const playerSession = pendingSessionsToSave.find(
        session => session.jugadorId === playerId
      );
      
      if (!playerSession || !playerSession.fecha) {
        console.error('Session no encontrada para jugador:', playerId, 'Sessions disponibles:', pendingSessionsToSave);
        throw new Error(`No se encontró sesión para el jugador: ${playerId}`);
      }
      
      const surveyDate = playerSession.fecha;
      console.log('Usando fecha de sesión para encuesta:', surveyDate);

      let currentSessionIds = sessionIds;
      
      // Si es la primera encuesta, guardar todas las sesiones
      if (currentSessionIds.size === 0) {
        console.log(`Guardando ${pendingSessionsToSave.length} sesiones SECUENCIALMENTE para evitar race conditions...`);

        // ✅ CRÍTICO: Guardar sesiones SECUENCIALMENTE en lugar de en paralelo
        const sessionIdsMap = new Map<string, string>();
        
        for (const session of pendingSessionsToSave) {
          const sessionWithTrainer = {
            ...session,
            entrenadorId: currentUser.uid
          };
          
          try {
            // Guardar una por una con pequeña pausa entre cada una
            const sessionId = await addSessionToContext(sessionWithTrainer);
            sessionIdsMap.set(session.jugadorId, sessionId);
            console.log(`Sesión guardada exitosamente para jugador ${session.jugadorId}: ${sessionId}`);
            
            // ✅ Pequeña pausa para evitar race conditions
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            console.error('Error guardando sesión individual:', error);
            // Continuar con la siguiente sesión
          }
        }
        
        setSessionIds(sessionIdsMap);
        currentSessionIds = sessionIdsMap;
        onSessionsSaved(sessionIdsMap);
        
        console.log(`Completado: ${sessionIdsMap.size} sesiones guardadas exitosamente`);
      }

      // Guardar encuesta con la fecha correcta
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

      // Usar surveyDate (fecha de la sesión) en lugar de new Date().toISOString()
      await addPostTrainingSurvey(academiaId, {
        jugadorId: playerId,
        sessionId: sessionId,
        fecha: surveyDate,
        ...validResponses
      });
      
      console.log('Encuesta guardada exitosamente para jugador:', playerId);
      
      // Avanzar al siguiente jugador o finalizar
      if (currentSurveyPlayerIndex < pendingSurveyPlayers.length - 1) {
        setCurrentSurveyPlayerIndex(prev => prev + 1);
      } else {
        setIsSurveyModalOpen(false);
        onSurveysComplete();
      }
    } catch (error) {
      console.error('Error en handleSurveySubmit:', error);
      toast.error('Error al guardar la encuesta. Intenta de nuevo.');
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