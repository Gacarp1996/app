// hooks/useActiveSessionRecommendations.ts
import { useState, useEffect, useCallback } from 'react';
import { TrainingSession, LoggedExercise } from '../types';
import { TipoType, AreaType } from '../constants/training';
import { getTrainingPlan, TrainingPlan } from '../Database/FirebaseTrainingPlans';
import { useAcademia } from '../contexts/AcademiaContext';
import { useSession } from '../contexts/SessionContext';
import { calculateExerciseStatsByTime } from '../utils/trainingCalculations';

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

interface TypeStats {
  total: number;
  percentage: number;
  areas: {
    [key: string]: {
      total: number;
      percentage: number;
      exercises: { [key: string]: number };
    };
  };
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

  // Función principal para generar recomendaciones bajo demanda
  const generateRecommendations = async () => {
    setRecommendationsLoading(true);
    
    try {
      // Generar recomendaciones individuales para el primer jugador por defecto
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

  // ✅ NUEVA FUNCIÓN: Actualizar recomendaciones individuales cuando cambia el jugador
  const updateIndividualRecommendations = useCallback((playerId: string) => {
    if (!playerId || !recommendationsGenerated) return;
    
    try {
      const individualAnalysis = analyzePlayerExercises(playerId);
      setIndividualRecommendations(individualAnalysis);
    } catch (error) {
      console.error('Error actualizando recomendaciones individuales:', error);
    }
  }, [recommendationsGenerated]); // Dependencias actualizadas abajo después de definir analyzePlayerExercises

  // Función para refrescar recomendaciones
  const refreshRecommendations = async () => {
    setRecommendationsGenerated(false);
    setIndividualRecommendations(null);
    setGroupRecommendations(null);
    setRecommendationsLoading(true);

    try {
      await refreshSessionsFromContext();

      // Recargar planes de entrenamiento
      const plansMap: {[playerId: string]: TrainingPlan} = {};
      for (const participant of participants) {
        try {
          const plan = await getTrainingPlan(academiaId, participant.id);
          if (plan) {
            plansMap[participant.id] = plan;
          } else if (participants.length > 1) {
            // Lógica de adaptación: Si no tiene plan, intentar usar el de otro jugador
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

  // Cargar planes de entrenamiento cuando cambien los participantes
  useEffect(() => {
    const loadRealData = async () => {
      if (academiaId && participants.length > 0) {
        try {
          // Cargar planes de entrenamiento para cada participante con lógica de adaptación
          const plansMap: {[playerId: string]: TrainingPlan} = {};
          for (const participant of participants) {
            try {
              const plan = await getTrainingPlan(academiaId, participant.id);
              if (plan) {
                plansMap[participant.id] = plan;
              } else if (participants.length > 1) {
                // Si no tiene plan propio, intentar adaptar el de otro jugador del grupo
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
          setTrainingPlans(plansMap);
          
          // Generar preview de datos sin procesar recomendaciones
          generateDataPreview(plansMap);
        } catch (error) {
          console.error('Error cargando datos reales:', error);
        }
      }
    };

    // Limpiar todos los estados dependientes de participantes
    setRecommendationsGenerated(false);
    setIndividualRecommendations(null);
    setGroupRecommendations(null);
    setDataPreview(null);
    setTrainingPlans({});
    
    if (academiaId && participants.length > 0) {
      loadRealData();
    }
  }, [participants, academiaId]);


  // ✅ AGREGAR ESTE NUEVO useEffect DESPUÉS del anterior (alrededor de línea 200-210)
useEffect(() => {
  // Solo ejecutar si ya hay recomendaciones generadas
  if (recommendationsGenerated && participants.length > 0) {
    console.log('🔄 Participantes cambiaron después de generar recomendaciones');
    
    // Forzar regeneración
    const timer = setTimeout(() => {
      console.log('Regenerando recomendaciones para:', participants.map(p => p.name));
      generateRecommendations();
    }, 100);
    
    return () => clearTimeout(timer);
  }
}, [participants.map(p => p.id).sort().join(',')]); // Detectar cambios en IDs

  // Función para generar preview de datos disponibles
  const generateDataPreview = (plans: {[playerId: string]: TrainingPlan}) => {
    const analysisWindowDays = 30;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - analysisWindowDays);
    const today = new Date();
    
    const participantsPreviews = participants.map(participant => {
      const playerSessions = getSessionsByPlayer(participant.id, { 
        start: thirtyDaysAgo, 
        end: today 
      });
      
      const totalExercises = playerSessions.reduce((sum, session) => {
        return sum + (session.ejercicios?.length || 0);
      }, 0);
      
      const hasPlan = !!plans[participant.id];
      
      return {
        playerId: participant.id,
        playerName: participant.name,
        sessionsCount: playerSessions.length,
        exercisesCount: totalExercises,
        hasPlan,
        hasData: totalExercises > 0
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

  // Función para analizar ejercicios de un jugador específico
  const analyzePlayerExercises = useCallback((playerId: string) => {
    const player = participants.find(p => p.id === playerId);
    if (!player) {
      return { recommendations: [], totalExercises: 0, typeStats: {}, areaStats: {} };
    }

    const analysisWindowDays = 30;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - analysisWindowDays);
    const today = new Date();
    
    const playerSessions = getSessionsByPlayer(playerId, { 
      start: thirtyDaysAgo, 
      end: today 
    });

    // Extraer todos los ejercicios
    const allExercises: LoggedExercise[] = [];
    playerSessions.forEach(session => {
      if (session.ejercicios && Array.isArray(session.ejercicios)) {
        allExercises.push(...session.ejercicios);
      }
    });

    if (allExercises.length === 0) {
      return { recommendations: [], totalExercises: 0, typeStats: {}, areaStats: {} };
    }

    // Usar función centralizada
    const stats = calculateExerciseStatsByTime(allExercises);
    
    // Convertir al formato esperado por el componente
    const typeStats: any = {};
    const areaStats: any = {};
    
    Object.keys(stats.typeStats).forEach(tipo => {
      typeStats[tipo] = {
        total: Math.round(stats.typeStats[tipo].total), // Total en minutos
        percentage: Math.round(stats.typeStats[tipo].percentage),
        areas: {}
      };
      
      Object.keys(stats.typeStats[tipo].areas).forEach(area => {
        const areaData = stats.typeStats[tipo].areas[area];
        typeStats[tipo].areas[area] = {
          total: Math.round(areaData.total), // Total en minutos
          percentage: Math.round(areaData.percentage),
          exercises: areaData.exercises
        };
      });
    });
    
    Object.keys(stats.areaStats).forEach(area => {
      areaStats[area] = {
        total: Math.round(stats.areaStats[area].total), // Total en minutos
        percentage: Math.round(stats.areaStats[area].percentage)
      };
    });
    
    // Generar recomendaciones basadas en el plan
    const recommendations: Recommendation[] = [];
    const playerPlan = trainingPlans[playerId];
    
    if (playerPlan && playerPlan.planificacion) {
      // Comparar con el plan usando los mismos porcentajes
      Object.entries(typeStats).forEach(([tipo, stats]: [string, any]) => {
        const plannedType = playerPlan.planificacion[tipo as TipoType];
        
        if (plannedType) {
          const plannedPercentage = plannedType.porcentajeTotal;
          const difference = Math.abs(stats.percentage - plannedPercentage);
        
          if (difference > 5) {
            recommendations.push({
              level: 'TIPO',
              type: stats.percentage < plannedPercentage ? 'INCREMENTAR' : 'REDUCIR',
              area: tipo,
              parentType: tipo,
              currentPercentage: stats.percentage,
              plannedPercentage: plannedPercentage,
              difference: difference,
              priority: difference > 15 ? 'high' : difference > 10 ? 'medium' : 'low',
              reason: `${stats.percentage < plannedPercentage ? 'Déficit' : 'Exceso'} en tipo ${tipo}: ${stats.percentage}% actual vs ${plannedPercentage}% planificado`,
              basedOnExercises: allExercises.length // Cantidad total de ejercicios
            });
          }
          
          // Recomendaciones por áreas
          if (plannedType.areas) {
            Object.entries(stats.areas).forEach(([area, areaStats]: [string, any]) => {
              const plannedArea = plannedType.areas[area as AreaType];
              if (plannedArea) {
                const plannedAreaPercentage = plannedArea.porcentajeDelTotal;
                const areaDifference = Math.abs(areaStats.percentage - plannedAreaPercentage);
                
                if (areaDifference > 8) {
                  recommendations.push({
                    level: 'AREA',
                    type: areaStats.percentage < plannedAreaPercentage ? 'INCREMENTAR' : 'REDUCIR',
                    area: area,
                    parentType: tipo,
                    currentPercentage: areaStats.percentage,
                    plannedPercentage: plannedAreaPercentage,
                    difference: areaDifference,
                    priority: areaDifference > 15 ? 'high' : areaDifference > 10 ? 'medium' : 'low',
                    reason: `${areaStats.percentage < plannedAreaPercentage ? 'Déficit' : 'Exceso'} en ${area}: ${areaStats.percentage}% actual vs ${plannedAreaPercentage}% planificado`,
                    basedOnExercises: areaStats.total, // Total de minutos en esta área
                    parentArea: area
                  });
                }
              }
            });
          }
        }
      });
    } else {
      // Si no hay plan, usar valores por defecto
      Object.entries(typeStats).forEach(([tipo, stats]: [string, any]) => {
        const plannedPercentage = getIdealPercentageForType(tipo, playerId);
        const difference = Math.abs(stats.percentage - plannedPercentage);
        
        if (difference > 5) {
          recommendations.push({
            level: 'TIPO',
            type: stats.percentage < plannedPercentage ? 'INCREMENTAR' : 'REDUCIR',
            area: tipo,
            parentType: tipo,
            currentPercentage: stats.percentage,
            plannedPercentage: plannedPercentage,
            difference: difference,
            priority: difference > 15 ? 'high' : difference > 10 ? 'medium' : 'low',
            reason: `${stats.percentage < plannedPercentage ? 'Déficit' : 'Exceso'} en tipo ${tipo}: ${stats.percentage}% actual vs ${plannedPercentage}% planificado (valores por defecto)`,
            basedOnExercises: allExercises.length
          });
        }

        // Recomendaciones por áreas usando valores por defecto
        Object.entries(stats.areas).forEach(([area, areaStats]: [string, any]) => {
          const plannedAreaPercentage = getIdealPercentageForAreaInType(area, tipo, playerId);
          const areaDifference = Math.abs(areaStats.percentage - plannedAreaPercentage);
          
          if (areaDifference > 8) {
            recommendations.push({
              level: 'AREA',
              type: areaStats.percentage < plannedAreaPercentage ? 'INCREMENTAR' : 'REDUCIR',
              area: area,
              parentType: tipo,
              currentPercentage: areaStats.percentage,
              plannedPercentage: plannedAreaPercentage,
              difference: areaDifference,
              priority: areaDifference > 15 ? 'high' : areaDifference > 10 ? 'medium' : 'low',
              reason: `${areaStats.percentage < plannedAreaPercentage ? 'Déficit' : 'Exceso'} en ${area}: ${areaStats.percentage}% actual vs ${plannedAreaPercentage}% planificado (valores por defecto)`,
              basedOnExercises: areaStats.total,
              parentArea: area
            });
          }
        });
      });
    }

    return {
      recommendations,
      totalExercises: allExercises.length,
      totalMinutes: Math.round(stats.totalMinutes),
      typeStats,
      areaStats,
      sessionsAnalyzed: playerSessions.length,
      planUsed: playerPlan ? 'real' : 'default'
    };
  }, [participants, getSessionsByPlayer, trainingPlans]);

  // Actualizar la dependencia de updateIndividualRecommendations
  useEffect(() => {
    // Re-crear la función cuando cambie analyzePlayerExercises
  }, [analyzePlayerExercises]);

  // Función para analizar sesiones de un jugador
  const analyzePlayerSessions = useCallback((playerId: string) => {
    const player = participants.find(p => p.id === playerId);
    if (!player) {
      return { totalSessions: 0, dateRange: null };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const today = new Date();
    
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

  const getIdealPercentageForType = useCallback((type: string, playerId: string) => {
    const playerPlan = trainingPlans[playerId];
    if (playerPlan && playerPlan.planificacion && playerPlan.planificacion[type as TipoType]) {
      return playerPlan.planificacion[type as TipoType].porcentajeTotal;
    }
    return 50; // Meta por defecto: 50/50 entre Canasto y Peloteo
  }, [trainingPlans]);

  const getIdealPercentageForAreaInType = useCallback((area: string, type: string, playerId: string) => {
    const playerPlan = trainingPlans[playerId];
    if (playerPlan && playerPlan.planificacion && playerPlan.planificacion[type as TipoType] && 
        playerPlan.planificacion[type as TipoType].areas && 
        playerPlan.planificacion[type as TipoType].areas[area as AreaType]) {
      return playerPlan.planificacion[type as TipoType].areas[area as AreaType].porcentajeDelTotal;
    }
    
    // Porcentajes ideales por defecto por área dentro de cada tipo
    const idealPercentages: { [key: string]: { [key: string]: number } } = {
      [TipoType.CANASTO]: {
        [AreaType.JUEGO_DE_BASE]: 17,
        [AreaType.JUEGO_DE_RED]: 17,
        [AreaType.PRIMERAS_PELOTAS]: 16
      },
      [TipoType.PELOTEO]: {
        [AreaType.JUEGO_DE_BASE]: 15,
        [AreaType.JUEGO_DE_RED]: 10,
        [AreaType.PUNTOS]: 15,
        [AreaType.PRIMERAS_PELOTAS]: 10
      }
    };
    
    return idealPercentages[type]?.[area] || 15;
  }, [trainingPlans]);

  // Función para generar recomendaciones grupales
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

    // Generar el análisis grupal basado en coincidencias
    return summarizeGroupRecommendations(participantsWithData);
  }, [participants, analyzePlayerExercises, analyzePlayerSessions]);

  // Detectar coincidencias grupales
  const getGroupCoincidences = (allRecommendations: any[]) => {
    const coincidencesMap = new Map();
    
    // Agrupar recomendaciones por área y tipo de acción
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
    
    // Filtrar solo coincidencias de 2+ jugadores y calcular promedio
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

  // Obtener top déficits por jugador
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

  // Función principal: Orquestar análisis grupal
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

    // Calcular estadísticas grupales adicionales
    const totalSessions = participantsWithData.reduce((sum, p) => sum + p.sessions.totalSessions, 0);
    const avgSessionsPerPlayer = Math.round(totalSessions / participantsWithData.length);

    // Calcular promedio de tipos para el grupo
    const groupTypeStats: { [key: string]: { totalPercentage: number; count: number } } = {};
    
    participantsWithData.forEach(participant => {
      Object.entries(participant.analysis.typeStats).forEach(([tipo, stats]: [string, any]) => {
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

  // Generar texto de recomendación
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

  // ✅ Actualizar updateIndividualRecommendations con las dependencias correctas
  const updateIndividualRecommendationsFinal = useCallback((playerId: string) => {
    if (!playerId || !recommendationsGenerated) return;
    
    try {
      const individualAnalysis = analyzePlayerExercises(playerId);
      setIndividualRecommendations(individualAnalysis);
    } catch (error) {
      console.error('Error actualizando recomendaciones individuales:', error);
    }
  }, [recommendationsGenerated, analyzePlayerExercises]);

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
    updateIndividualRecommendations: updateIndividualRecommendationsFinal, // ✅ EXPORTAR LA FUNCIÓN
    
    // Helpers
    getIdealPercentageForType,
    getIdealPercentageForAreaInType
  };
};