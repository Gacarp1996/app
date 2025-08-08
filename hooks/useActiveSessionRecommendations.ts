// hooks/useActiveSessionRecommendations.ts
import { useState, useEffect, useCallback } from 'react';
import { TrainingPlan } from '../Database/FirebaseTrainingPlans';
import { useAcademia } from '../contexts/AcademiaContext';
import { useSession } from '../contexts/SessionContext';
import { SessionService } from '../services/sessionService';
import { RecommendationService, PlayerAnalysis, GroupRecommendations } from '../services/recommendationService';
import { TrainingAnalysisService, DataPreview } from '../services/trainingAnalysisService';
import { getDefaultDateRange } from '../utils/dateHelpers';

interface Participant {
  id: string;
  name: string;
}

interface UseActiveSessionRecommendationsProps {
  participants: Participant[];
}

export const useActiveSessionRecommendations = ({
  participants
}: UseActiveSessionRecommendationsProps) => {
  const { academiaActual } = useAcademia();
  const { getSessionsByPlayer, refreshSessions: refreshSessionsFromContext } = useSession();
  
  const academiaId = academiaActual?.id || '';
  
  // Estados
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [trainingPlans, setTrainingPlans] = useState<{[playerId: string]: TrainingPlan}>({});
  const [recommendationsGenerated, setRecommendationsGenerated] = useState(false);
  const [individualRecommendations, setIndividualRecommendations] = useState<any>(null);
  const [groupRecommendations, setGroupRecommendations] = useState<GroupRecommendations | null>(null);
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);

  // Analizar ejercicios de un jugador
  const analyzePlayerExercises = useCallback((playerId: string) => {
    const player = participants.find(p => p.id === playerId);
    if (!player) {
      return { 
        recommendations: [], 
        totalExercises: 0, 
        totalMinutes: 0,
        typeStats: {}, 
        areaStats: {},
        sessionsAnalyzed: 0,
        planUsed: 'default' as const
      };
    }

    const dateRange = getDefaultDateRange(30);
    const playerSessions = getSessionsByPlayer(playerId, { 
      start: new Date(dateRange.start), 
      end: new Date(dateRange.end) 
    });

    const allExercises = SessionService.extractExercisesFromSessions(playerSessions);
    if (allExercises.length === 0) {
      return { 
        recommendations: [], 
        totalExercises: 0, 
        totalMinutes: 0,
        typeStats: {}, 
        areaStats: {},
        sessionsAnalyzed: 0,
        planUsed: 'default' as const
      };
    }

    const analysis = RecommendationService.analyzePlayerExercises(
      allExercises, 
      trainingPlans[playerId]
    );
    
    return { ...analysis, sessionsAnalyzed: playerSessions.length };
  }, [participants, getSessionsByPlayer, trainingPlans]);

  // Analizar sesiones de un jugador
  const analyzePlayerSessions = useCallback((playerId: string) => {
    const dateRange = getDefaultDateRange(30);
    const playerSessions = getSessionsByPlayer(playerId, { 
      start: new Date(dateRange.start), 
      end: new Date(dateRange.end) 
    });

    if (playerSessions.length === 0) {
      return { totalSessions: 0, dateRange: null };
    }

    const dates = playerSessions.map(s => new Date(s.fecha));
    const formattedRange = TrainingAnalysisService.formatDateRange(dates);

    return { totalSessions: playerSessions.length, dateRange: formattedRange };
  }, [getSessionsByPlayer]);

  // Generar recomendaciones
  const generateRecommendations = async () => {
    setRecommendationsLoading(true);
    
    try {
      // Recomendaciones individuales
      const firstPlayerId = participants[0]?.id;
      if (firstPlayerId) {
        const analysis = analyzePlayerExercises(firstPlayerId);
        setIndividualRecommendations(analysis);
      }
      
      // Recomendaciones grupales
      if (participants.length > 1) {
        const participantsAnalysis: PlayerAnalysis[] = participants.map(p => ({
          playerId: p.id,
          playerName: p.name,
          analysis: analyzePlayerExercises(p.id),
          sessions: analyzePlayerSessions(p.id)
        }));
        
        const groupAnalysis = RecommendationService.generateGroupRecommendations(participantsAnalysis);
        setGroupRecommendations(groupAnalysis);
      }
      
      setRecommendationsGenerated(true);
    } catch (error) {
      console.error('Error generando recomendaciones:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Actualizar recomendaciones individuales
  const updateIndividualRecommendations = useCallback((playerId: string) => {
    if (!playerId || !recommendationsGenerated) return;
    
    const analysis = analyzePlayerExercises(playerId);
    setIndividualRecommendations(analysis);
  }, [recommendationsGenerated, analyzePlayerExercises]);

  // Refrescar recomendaciones
  const refreshRecommendations = async () => {
    setRecommendationsGenerated(false);
    setRecommendationsLoading(true);

    try {
      await refreshSessionsFromContext();
      const plans = await TrainingAnalysisService.loadTrainingPlansWithAdaptation(academiaId, participants);
      setTrainingPlans(plans);
      await generateRecommendations();
    } catch (error) {
      console.error('Error recargando:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Generar preview de datos
  const updateDataPreview = useCallback(() => {
    const dateRange = getDefaultDateRange(30);
    const sessionData = participants.map(p => {
      const sessions = getSessionsByPlayer(p.id, {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      });
      return SessionService.countPlayerSessions(sessions, p.id);
    });

    const preview = TrainingAnalysisService.generateDataPreview(
      participants,
      sessionData.map((data, i) => ({ ...data, playerId: participants[i].id })),
      trainingPlans
    );
    
    setDataPreview(preview);
  }, [participants, getSessionsByPlayer, trainingPlans]);

  // Cargar planes cuando cambien participantes
  useEffect(() => {
    if (academiaId && participants.length > 0) {
      TrainingAnalysisService.loadTrainingPlansWithAdaptation(academiaId, participants)
        .then(plans => {
          setTrainingPlans(plans);
          updateDataPreview();
        });
    }
  }, [academiaId, participants.map(p => p.id).join(',')]);

  // Actualizar preview cuando cambien los planes
  useEffect(() => {
    if (Object.keys(trainingPlans).length > 0) {
      updateDataPreview();
    }
  }, [trainingPlans, updateDataPreview]);

  return {
    // Estados
    recommendationsGenerated,
    individualRecommendations,
    groupRecommendations,
    dataPreview,
    recommendationsLoading,
    trainingPlans,
    
    // Funciones
    generateRecommendations,
    refreshRecommendations,
    updateIndividualRecommendations,
    analyzePlayerExercises,     // ✅ AGREGADA
    analyzePlayerSessions,       // ✅ AGREGADA
    
    // Helpers (usando servicios)
    getIdealPercentageForType: (type: string, playerId: string) => 
      TrainingAnalysisService.getIdealPercentageForType(type, trainingPlans[playerId]),
    getIdealPercentageForAreaInType: (area: string, type: string, playerId: string) =>
      TrainingAnalysisService.getIdealPercentageForAreaInType(area, type, trainingPlans[playerId])
  };
};