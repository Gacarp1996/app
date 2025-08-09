// hooks/useActiveSessionRecommendations.ts
import { useState, useEffect, useCallback } from 'react';
import { useAcademia } from '../contexts/AcademiaContext';
import { useSession } from '../contexts/SessionContext';
import { TrainingAnalysisService, DataPreview } from '../services/trainingAnalysisService';
import { SessionService } from '../services/sessionService';
import { RecommendationEngine } from '../services/recommendationEngine';
import { EngineInput, EngineOutput } from '../types/recommendations';
import { getDefaultDateRange } from '../utils/dateHelpers';
import { SessionExercise } from '../contexts/TrainingContext';

interface Participant {
  id: string;
  name: string;
}

interface UseActiveSessionRecommendationsProps {
  participants: Participant[];
  currentSessionExercises?: SessionExercise[];  // NUEVO: Ejercicios de sesión actual
}

export const useActiveSessionRecommendations = ({
  participants,
  currentSessionExercises = []  // NUEVO: Recibir ejercicios actuales
}: UseActiveSessionRecommendationsProps) => {
  const { academiaActual } = useAcademia();
  const { getSessionsByPlayer, refreshSessions: refreshSessionsFromContext } = useSession();
  
  const academiaId = academiaActual?.id || '';
  
  // Estados
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [trainingPlans, setTrainingPlans] = useState<{[playerId: string]: any}>({});
  const [recommendationsGenerated, setRecommendationsGenerated] = useState(false);
  const [engineOutput, setEngineOutput] = useState<EngineOutput | null>(null);
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);

  // Generar recomendaciones usando el motor único
  const generateRecommendations = async () => {
    setRecommendationsLoading(true);
    
    try {
      // 1. Cargar planes de entrenamiento
      const plans = await TrainingAnalysisService.loadTrainingPlansWithAdaptation(
        academiaId,
        participants
      );
      setTrainingPlans(plans);
      
      // 2. Obtener sesiones históricas para cada jugador
      const dateRange = getDefaultDateRange(30);
      const historicalSessions = participants.map(p => ({
        playerId: p.id,
        sessions: getSessionsByPlayer(p.id, {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end)
        })
      }));
      
      // 3. Preparar input para el motor
      const engineInput: EngineInput = {
        players: participants,
        historicalSessions,
        currentSessionExercises,  // Incluir ejercicios de sesión actual
        plans,
        config: {
          rangeDays: 30,
          timeZone: 'America/Santiago',
          includeCurrentSession: currentSessionExercises.length > 0
        }
      };
      
      // 4. Ejecutar motor de recomendaciones
      const output = RecommendationEngine.buildRecommendations(engineInput);
      setEngineOutput(output);
      setRecommendationsGenerated(true);
      
    } catch (error) {
      console.error('Error generando recomendaciones:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Refrescar recomendaciones
  const refreshRecommendations = async () => {
    setRecommendationsGenerated(false);
    setRecommendationsLoading(true);

    try {
      await refreshSessionsFromContext();
      await generateRecommendations();
    } catch (error) {
      console.error('Error recargando:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Actualizar recomendaciones individuales cuando cambia el jugador seleccionado
  const updateIndividualRecommendations = useCallback((playerId: string) => {
    if (!engineOutput || !playerId) return engineOutput?.individual[playerId];
    return engineOutput.individual[playerId];
  }, [engineOutput]);

  // Analizar ejercicios de un jugador (para compatibilidad)
  const analyzePlayerExercises = useCallback((playerId: string) => {
    if (!engineOutput) {
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

    const playerData = engineOutput.individual[playerId];
    if (!playerData) {
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

    // Convertir RecItem[] al formato legacy para compatibilidad
    const recommendations = playerData.items.map(item => ({
      level: item.level,
      type: item.action === 'INCREMENTAR' ? 'INCREMENTAR' : item.action === 'REDUCIR' ? 'REDUCIR' : 'OPTIMO',
      area: item.area,
      parentType: item.parentType,
      currentPercentage: item.currentPercentage,
      plannedPercentage: item.plannedPercentage,
      difference: Math.abs(item.gap),  // Compatibilidad: usar abs
      priority: item.priority,
      reason: item.reason,
      basedOnExercises: item.basedOn.exercises,
      isStatus: item.action === 'OPTIMO'
    }));

    return {
      recommendations,
      totalExercises: playerData.summary.totalExercises,
      totalMinutes: playerData.summary.totalMinutes,
      typeStats: {}, // TODO: Extraer de engineOutput si es necesario
      areaStats: {}, // TODO: Extraer de engineOutput si es necesario
      sessionsAnalyzed: playerData.summary.sessionsAnalyzed,
      planUsed: playerData.summary.planUsed
    };
  }, [engineOutput]);

  // Analizar sesiones de un jugador (para compatibilidad)
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

  // Re-generar cuando cambien los ejercicios de sesión actual
  useEffect(() => {
    if (recommendationsGenerated && currentSessionExercises.length > 0) {
      generateRecommendations();
    }
  }, [currentSessionExercises]);

  // Helpers para compatibilidad con componentes existentes
  const getIdealPercentageForType = (type: string, playerId: string) => {
    return TrainingAnalysisService.getIdealPercentageForType(type, trainingPlans[playerId]);
  };

  const getIdealPercentageForAreaInType = (area: string, type: string, playerId: string) => {
    return TrainingAnalysisService.getIdealPercentageForAreaInType(area, type, trainingPlans[playerId]);
  };

  return {
    // Estados
    recommendationsGenerated,
    recommendationsLoading,
    trainingPlans,
    dataPreview,
    
    // Datos del motor
    engineOutput,
    individualRecommendations: engineOutput?.individual[participants[0]?.id] || null,
    groupRecommendations: engineOutput?.group || null,
    
    // Funciones
    generateRecommendations,
    refreshRecommendations,
    updateIndividualRecommendations,
    
    // Compatibilidad con componentes existentes
    analyzePlayerExercises,
    analyzePlayerSessions,
    getIdealPercentageForType,
    getIdealPercentageForAreaInType
  };
};