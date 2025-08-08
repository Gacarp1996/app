// hooks/useActiveSessionRecommendations.ts
import { useState, useEffect, useCallback } from 'react';
import { TrainingSession, Player } from '../types';
import { TipoType, AreaType } from '../constants/training';
import { getTrainingPlan, TrainingPlan } from '../Database/FirebaseTrainingPlans';
import { useAcademia } from '../contexts/AcademiaContext';
import { useSession } from '../contexts/SessionContext';
import { StatisticsService } from '../services/statisticsService';
import { SessionService } from '../services/sessionService';
import { TrainingStructureService } from '../services/trainingStructure';
import { getDefaultDateRange } from '../utils/dateHelpers';

interface Recommendation {
  level: 'TIPO' | 'AREA' | 'EJERCICIO';
  type: 'INCREMENTAR' | 'REDUCIR';
  area: string;
  parentType?: string;
  currentPercentage: number;
  plannedPercentage: number;
  difference: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  basedOnExercises: number;
  parentArea?: string;
  isStatus?: boolean;
  details?: any;
}

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
  const { 
    getSessionsByPlayer,
    getSessionsByDateRange,
    refreshSessions: refreshSessionsFromContext 
  } = useSession();
  
  const academiaId = academiaActual?.id || '';
  
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [trainingPlans, setTrainingPlans] = useState<{[playerId: string]: TrainingPlan}>({});
  const [recommendationsGenerated, setRecommendationsGenerated] = useState(false);
  const [individualRecommendations, setIndividualRecommendations] = useState<any>(null);
  const [groupRecommendations, setGroupRecommendations] = useState<any>(null);
  const [dataPreview, setDataPreview] = useState<any>(null);

  // Función principal para generar recomendaciones
  const generateRecommendations = async () => {
    setRecommendationsLoading(true);
    
    try {
      // Generar recomendaciones individuales para el primer jugador
      const firstPlayerId = participants[0]?.id;
      if (firstPlayerId) {
        const individualAnalysis = analyzePlayerExercises(firstPlayerId);
        setIndividualRecommendations(individualAnalysis);
      }
      
      // Generar recomendaciones grupales si hay más de un participante
      if (participants.length > 1) {
        const groupAnalysis = generateGroupRecommendations();
        setGroupRecommendations(groupAnalysis);
      }
      
      setRecommendationsGenerated(true);
    } catch (error) {
      console.error('Error generando recomendaciones:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Actualizar recomendaciones individuales cuando cambia el jugador
  const updateIndividualRecommendations = useCallback((playerId: string) => {
    if (!playerId || !recommendationsGenerated) return;
    
    try {
      const individualAnalysis = analyzePlayerExercises(playerId);
      setIndividualRecommendations(individualAnalysis);
    } catch (error) {
      console.error('Error actualizando recomendaciones individuales:', error);
    }
  }, [recommendationsGenerated, participants, trainingPlans]); // Dependencies will be fixed below

  // Función para refrescar recomendaciones
  const refreshRecommendations = async () => {
    setRecommendationsGenerated(false);
    setIndividualRecommendations(null);
    setGroupRecommendations(null);
    setRecommendationsLoading(true);

    try {
      await refreshSessionsFromContext();

      // Recargar planes de entrenamiento
      const plansMap = await loadTrainingPlans();
      setTrainingPlans(plansMap);

      // Generar preview de datos
      generateDataPreview(plansMap);

      // Generar recomendaciones con los datos recargados
      await generateRecommendations();
    } catch (error) {
      console.error('Error recargando datos:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Cargar planes de entrenamiento con adaptación
  const loadTrainingPlans = async (): Promise<{[playerId: string]: TrainingPlan}> => {
    const plansMap: {[playerId: string]: TrainingPlan} = {};
    
    for (const participant of participants) {
      try {
        const plan = await getTrainingPlan(academiaId, participant.id);
        if (plan) {
          plansMap[participant.id] = plan;
        } else if (participants.length > 1) {
          // Adaptar plan de otro jugador si no tiene plan propio
          for (const otherParticipant of participants) {
            if (otherParticipant.id !== participant.id) {
              const otherPlan = await getTrainingPlan(academiaId, otherParticipant.id);
              if (otherPlan) {
                console.log(`Adaptando plan de ${otherParticipant.name} para ${participant.name}`);
                plansMap[participant.id] = otherPlan;
                break;
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error cargando plan para ${participant.name}:`, error);
      }
    }
    
    return plansMap;
  };

  // Cargar planes cuando cambien los participantes
  useEffect(() => {
    const loadRealData = async () => {
      if (academiaId && participants.length > 0) {
        try {
          const plansMap = await loadTrainingPlans();
          setTrainingPlans(plansMap);
          generateDataPreview(plansMap);
        } catch (error) {
          console.error('Error cargando datos reales:', error);
        }
      }
    };

    // Limpiar estados
    setRecommendationsGenerated(false);
    setIndividualRecommendations(null);
    setGroupRecommendations(null);
    setDataPreview(null);
    setTrainingPlans({});
    
    if (academiaId && participants.length > 0) {
      loadRealData();
    }
  }, [participants, academiaId]);

  // Regenerar recomendaciones cuando cambien los participantes después de generar
  useEffect(() => {
    if (recommendationsGenerated && participants.length > 0) {
      console.log('Regenerando recomendaciones para:', participants.map(p => p.name));
      const timer = setTimeout(() => {
        generateRecommendations();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [participants.map(p => p.id).sort().join(',')]);

  // Generar preview de datos disponibles
  const generateDataPreview = (plans: {[playerId: string]: TrainingPlan}) => {
    const dateRange = getDefaultDateRange(30);
    const thirtyDaysAgo = new Date(dateRange.start);
    const today = new Date(dateRange.end);
    
    const participantsPreviews = participants.map(participant => {
      const playerSessions = getSessionsByPlayer(participant.id, { 
        start: thirtyDaysAgo, 
        end: today 
      });
      
      const statsData = SessionService.countPlayerSessions(playerSessions, participant.id);
      const hasPlan = !!plans[participant.id];
      
      return {
        playerId: participant.id,
        playerName: participant.name,
        sessionsCount: statsData.sessionsCount,
        exercisesCount: statsData.exercisesCount,
        hasPlan,
        hasData: statsData.exercisesCount > 0
      };
    });
    
    const playersWithData = participantsPreviews.filter(p => p.hasData);
    const totalSessions = playersWithData.reduce((sum, p) => sum + p.sessionsCount, 0);
    const totalExercises = playersWithData.reduce((sum, p) => sum + p.exercisesCount, 0);
    const playersWithPlans = playersWithData.filter(p => p.hasPlan).length;
    
    setDataPreview({
      totalParticipants: participants.length,
      playersWithData: playersWithData.length,
      playersWithPlans,
      totalSessions,
      totalExercises,
      participantsPreviews,
      canGenerateRecommendations: playersWithData.length > 0
    });
  };

  // Analizar ejercicios de un jugador específico
  const analyzePlayerExercises = useCallback((playerId: string) => {
    const player = participants.find(p => p.id === playerId);
    if (!player) {
      return { recommendations: [], totalExercises: 0, typeStats: {}, areaStats: {} };
    }

    const dateRange = getDefaultDateRange(30);
    const thirtyDaysAgo = new Date(dateRange.start);
    const today = new Date(dateRange.end);
    
    const playerSessions = getSessionsByPlayer(playerId, { 
      start: thirtyDaysAgo, 
      end: today 
    });

    // Extraer todos los ejercicios
    const allExercises = SessionService.extractExercisesFromSessions(playerSessions);

    if (allExercises.length === 0) {
      return { recommendations: [], totalExercises: 0, typeStats: {}, areaStats: {} };
    }

    // Usar servicio de estadísticas
    const playerPlan = trainingPlans[playerId];
    const analysis = StatisticsService.analyzePlayerExercises(allExercises, playerPlan);
    
    return {
      ...analysis,
      sessionsAnalyzed: playerSessions.length
    };
  }, [participants, getSessionsByPlayer, trainingPlans]);

  // Analizar sesiones de un jugador
  const analyzePlayerSessions = useCallback((playerId: string) => {
    const player = participants.find(p => p.id === playerId);
    if (!player) {
      return { totalSessions: 0, dateRange: null };
    }

    const dateRange = getDefaultDateRange(30);
    const thirtyDaysAgo = new Date(dateRange.start);
    const today = new Date(dateRange.end);
    
    const playerSessions = getSessionsByPlayer(playerId, { 
      start: thirtyDaysAgo, 
      end: today 
    });

    if (playerSessions.length === 0) {
      return { totalSessions: 0, dateRange: null };
    }

    const dates = playerSessions.map(session => new Date(session.fecha)).sort((a, b) => a.getTime() - b.getTime());
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    return {
      totalSessions: playerSessions.length,
      dateRange: {
        from: formatDate(firstDate),
        to: formatDate(lastDate)
      }
    };
  }, [participants, getSessionsByPlayer]);

  // Obtener porcentaje ideal para tipo
  const getIdealPercentageForType = useCallback((type: string, playerId: string) => {
    const playerPlan = trainingPlans[playerId];
    if (playerPlan?.planificacion?.[type as TipoType]) {
      return playerPlan.planificacion[type as TipoType].porcentajeTotal;
    }
    return TrainingStructureService.getDefaultTypePercentages()[type as TipoType] || 50;
  }, [trainingPlans]);

  // Obtener porcentaje ideal para área en tipo
  const getIdealPercentageForAreaInType = useCallback((area: string, type: string, playerId: string) => {
    const playerPlan = trainingPlans[playerId];
    if (playerPlan?.planificacion?.[type as TipoType]?.areas?.[area as AreaType]) {
      return playerPlan.planificacion[type as TipoType].areas[area as AreaType].porcentajeDelTotal;
    }
    
    const defaultPercentages = TrainingStructureService.getDefaultAreaPercentages();
    return defaultPercentages[type as TipoType]?.[area as AreaType] || 15;
  }, [trainingPlans]);

  // Generar recomendaciones grupales
  const generateGroupRecommendations = useCallback(() => {
    if (participants.length < 2) return null;
    
    // Analizar todos los participantes
    const participantsAnalysis = participants.map(participant => {
      const analysis = analyzePlayerExercises(participant.id);
      const sessions = analyzePlayerSessions(participant.id);
      return {
        playerId: participant.id,
        playerName: participant.name,
        analysis,
        sessions
      };
    });

    // Filtrar participantes que tienen datos
    const participantsWithData = participantsAnalysis.filter(p => p.analysis.totalExercises > 0);
    
    if (participantsWithData.length === 0) {
      return null;
    }

    // Generar el análisis grupal
    return summarizeGroupRecommendations(participantsWithData);
  }, [participants, analyzePlayerExercises, analyzePlayerSessions]);

  // Detectar coincidencias grupales
  const getGroupCoincidences = (allRecommendations: any[]) => {
    const coincidencesMap = new Map();
    
    // Agrupar recomendaciones por área y tipo
    allRecommendations.forEach(rec => {
      rec.recommendations.forEach((recommendation: any) => {
        const key = `${recommendation.level}-${recommendation.type}-${recommendation.area}`;
        
        if (!coincidencesMap.has(key)) {
          coincidencesMap.set(key, {
            level: recommendation.level,
            type: recommendation.type,
            area: recommendation.area,
            parentType: recommendation.parentType,
            players: [],
            totalDiferencia: 0,
            diferencias: []
          });
        }
        
        const coincidence = coincidencesMap.get(key);
        coincidence.players.push({
          name: rec.playerName,
          diferencia: recommendation.difference,
          currentPercentage: recommendation.currentPercentage,
          plannedPercentage: recommendation.plannedPercentage
        });
        coincidence.totalDiferencia += recommendation.difference;
        coincidence.diferencias.push(recommendation.difference);
      });
    });
    
    // Filtrar coincidencias significativas
    const significantCoincidences = Array.from(coincidencesMap.values())
      .filter(coincidence => coincidence.players.length >= 2)
      .map(coincidence => ({
        ...coincidence,
        playerCount: coincidence.players.length,
        promedioDiferencia: Math.round(coincidence.totalDiferencia / coincidence.players.length * 10) / 10,
        priority: coincidence.players.length >= 3 ? 'high' : 'medium'
      }))
      .sort((a, b) => {
        if (b.playerCount !== a.playerCount) {
          return b.playerCount - a.playerCount;
        }
        return b.promedioDiferencia - a.promedioDiferencia;
      });
    
    return significantCoincidences;
  };

  // Obtener déficits principales por jugador
  const getTopDeficitsPerPlayer = (allRecommendations: any[]) => {
    return allRecommendations.map(rec => ({
      playerName: rec.playerName,
      playerId: rec.playerId,
      deficits: rec.recommendations
        .filter((r: any) => r.type === 'INCREMENTAR')
        .sort((a: any, b: any) => b.difference - a.difference)
        .slice(0, 2)
        .map((r: any) => ({
          area: r.area,
          level: r.level,
          parentType: r.parentType,
          diferencia: r.difference,
          currentPercentage: r.currentPercentage,
          plannedPercentage: r.plannedPercentage
        })),
      excesos: rec.recommendations
        .filter((r: any) => r.type === 'REDUCIR')
        .sort((a: any, b: any) => b.difference - a.difference)
        .slice(0, 1)
        .map((r: any) => ({
          area: r.area,
          level: r.level,
          parentType: r.parentType,
          diferencia: r.difference,
          currentPercentage: r.currentPercentage,
          plannedPercentage: r.plannedPercentage
        }))
    })).filter(player => player.deficits.length > 0 || player.excesos.length > 0);
  };

  // Resumir recomendaciones grupales
  const summarizeGroupRecommendations = (participantsWithData: any[]) => {
    // Generar recomendaciones individuales para cada jugador
    const allRecommendations = participantsWithData.map(participant => ({
      playerId: participant.playerId,
      playerName: participant.playerName,
      recommendations: participant.analysis.recommendations || [],
      totalExercises: participant.analysis.totalExercises,
      totalMinutes: participant.analysis.totalMinutes || 0,
      sessionsCount: participant.sessions.totalSessions,
      planUsed: participant.analysis.planUsed
    }));

    // Detectar coincidencias grupales
    const coincidencias = getGroupCoincidences(allRecommendations);
    
    // Obtener déficits individuales
    const individuales = getTopDeficitsPerPlayer(allRecommendations);

    // Calcular estadísticas grupales
    const totalSessions = participantsWithData.reduce((sum, p) => sum + p.sessions.totalSessions, 0);
    const avgSessionsPerPlayer = Math.round(totalSessions / participantsWithData.length);

    // Calcular promedio de tipos para el grupo
    const groupTypeStats: { [key: string]: { totalPercentage: number; count: number } } = {};
    
    participantsWithData.forEach(participant => {
      Object.entries(participant.analysis.typeStats || {}).forEach(([tipo, stats]: [string, any]) => {
        if (!groupTypeStats[tipo]) {
          groupTypeStats[tipo] = { totalPercentage: 0, count: 0 };
        }
        groupTypeStats[tipo].totalPercentage += stats.percentage;
        groupTypeStats[tipo].count += 1;
      });
    });

    // Calcular promedios
    const groupAverages: { [key: string]: number } = {};
    Object.entries(groupTypeStats).forEach(([tipo, data]) => {
      groupAverages[tipo] = Math.round(data.totalPercentage / data.count);
    });

    return {
      analyzedPlayers: participantsWithData.length,
      totalPlayers: participants.length,
      sessionAnalysis: {
        totalSessionsAnalyzed: totalSessions,
        averageSessionsPerPlayer: avgSessionsPerPlayer,
        playersWithSessions: participantsWithData.length,
        sessionsPerPlayer: participantsWithData.map(p => ({
          playerName: p.playerName,
          sessionCount: p.sessions.totalSessions,
          dateRange: p.sessions.dateRange ? `${p.sessions.dateRange.from} - ${p.sessions.dateRange.to}` : "Sin datos"
        }))
      },
      groupAverages,
      participantsWithData: participantsWithData.map(p => ({
        playerName: p.playerName,
        totalExercises: p.analysis.totalExercises,
        totalMinutes: p.analysis.totalMinutes || 0,
        sessionsCount: p.sessions.totalSessions,
        planUsed: p.analysis.planUsed
      })),
      coincidencias,
      individuales,
      hasStrongCoincidences: coincidencias.length > 0,
      recommendation: generateGroupRecommendationText(coincidencias, individuales)
    };
  };

  // Generar texto de recomendación grupal
  const generateGroupRecommendationText = (coincidencias: any[], individuales: any[]) => {
    if (coincidencias.length > 0) {
      const topCoincidence = coincidencias[0];
      const action = topCoincidence.type === 'INCREMENTAR' ? 'incrementar' : 'reducir';
      const area = topCoincidence.area;
      const parentType = topCoincidence.parentType || '';

      if (topCoincidence.type === 'REDUCIR') {
        let alternativo = '';
        
        if (parentType === TipoType.PELOTEO) {
          alternativo = TipoType.CANASTO;
        } else if (parentType === TipoType.CANASTO) {
          alternativo = TipoType.PELOTEO;
        } else {
          alternativo = 'otro tipo de ejercicio';
        }
        
        return `Sugerencia: Hay un exceso de ${area}. Inicia la sesión con ejercicios de ${alternativo} para balancear el entrenamiento. (${topCoincidence.playerCount} jugadores, diferencia promedio de ${topCoincidence.promedioDiferencia}%)`;
      } else {
        return `Sugerencia: Iniciar con ejercicios de "${area}" (${action}) que afecta a ${topCoincidence.playerCount} jugadores con una diferencia promedio de ${topCoincidence.promedioDiferencia}%.`;
      }
    } else if (individuales.length > 0) {
      const playersWithDeficits = individuales.filter(p => p.deficits.length > 0);
      if (playersWithDeficits.length > 0) {
        return `Sugerencia: Alternar entre ejercicios según déficits individuales. ${playersWithDeficits.length} jugadores necesitan trabajo específico.`;
      }
    }
    return "El grupo está balanceado. Mantener variedad en los ejercicios.";
  };

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
    analyzePlayerExercises,
    analyzePlayerSessions,
    updateIndividualRecommendations,
    
    // Helpers
    getIdealPercentageForType,
    getIdealPercentageForAreaInType
  };
};