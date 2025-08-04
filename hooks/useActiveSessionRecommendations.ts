// hooks/useActiveSessionRecommendations.ts
import { useState, useEffect } from 'react';
import { TrainingSession, LoggedExercise } from '../types';
import { TipoType, AreaType } from '../constants/training';
import { getSessions } from '../Database/FirebaseSessions';
import { getTrainingPlan, TrainingPlan } from '../Database/FirebaseTrainingPlans';
import { useAcademia } from '../contexts/AcademiaContext'; // ✅ NUEVO IMPORT

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

// ✅ INTERFACE SIMPLIFICADA - SIN academiaId
interface UseActiveSessionRecommendationsProps {
  participants: Participant[];
}

export const useActiveSessionRecommendations = ({
  participants
}: UseActiveSessionRecommendationsProps) => {
  // ✅ USAR CONTEXTO PARA OBTENER academiaId
  const { academiaActual } = useAcademia();
  const academiaId = academiaActual?.id || '';
  
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [trainingPlans, setTrainingPlans] = useState<{[playerId: string]: TrainingPlan}>({});
  const [realSessions, setRealSessions] = useState<TrainingSession[]>([]);
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

  // Función para refrescar recomendaciones
  const refreshRecommendations = async () => {
    setRecommendationsGenerated(false);
    setIndividualRecommendations(null);
    setGroupRecommendations(null);
    setRecommendationsLoading(true);

    try {
      // Recargar sesiones reales
      const realSessionsData = await getSessions(academiaId);
      setRealSessions(realSessionsData);

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
      generateDataPreview(realSessionsData, plansMap);

      // Generar recomendaciones con los datos recargados
      await generateRecommendations();
    } catch (error) {
      console.error('Error recargando datos:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Cargar planes de entrenamiento y sesiones reales cuando cambien los participantes
  useEffect(() => {
    const loadRealData = async () => {
      if (academiaId && participants.length > 0) {
        try {
          // Cargar sesiones reales desde Firebase
          const realSessionsData = await getSessions(academiaId);
          setRealSessions(realSessionsData);
          
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
          generateDataPreview(realSessionsData, plansMap);
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
    setRealSessions([]);
    setTrainingPlans({});
    
    if (academiaId && participants.length > 0) {
      loadRealData();
    }
  }, [participants, academiaId]);

  // Función para generar preview de datos disponibles
  const generateDataPreview = (sessions: TrainingSession[], plans: {[playerId: string]: TrainingPlan}) => {
    const analysisWindowDays = 30;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - analysisWindowDays);
    
    const participantsPreviews = participants.map(participant => {
      const playerSessions = sessions.filter(session => {
        const sessionDate = new Date(session.fecha);
        
        // Manejo flexible de estructuras (vieja y nueva)
        let isPlayerInSession = false;
        
        // Estructura vieja: session.jugadorId
        if ((session as any).jugadorId === participant.id) {
          isPlayerInSession = true;
        }
        
        // Estructura nueva: session.participants
        if ((session as any).participants && Array.isArray((session as any).participants)) {
          isPlayerInSession = (session as any).participants.some((p: any) => p.playerId === participant.id);
        }
        
        return isPlayerInSession && sessionDate >= thirtyDaysAgo;
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
  const analyzePlayerExercises = (playerId: string) => {
    const player = participants.find(p => p.id === playerId);
    if (!player) {
      return { recommendations: [], totalExercises: 0, typeStats: {}, areaStats: {} };
    }

    const analysisWindowDays = 30;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - analysisWindowDays);
    
    const playerSessions = realSessions.filter(session => {
      const sessionDate = new Date(session.fecha);
      
      // Manejo flexible de estructuras
      let isPlayerInSession = false;
      
      // Estructura vieja: session.jugadorId
      if ((session as any).jugadorId === playerId) {
        isPlayerInSession = true;
      }
      
      // Estructura nueva: session.participants
      if ((session as any).participants && Array.isArray((session as any).participants)) {
        isPlayerInSession = (session as any).participants.some((p: any) => p.playerId === playerId);
      }
      
      return isPlayerInSession && sessionDate >= thirtyDaysAgo;
    });

    // Extraer todos los ejercicios de las sesiones del jugador
    const allExercises: LoggedExercise[] = [];
    playerSessions.forEach(session => {
      if (session.ejercicios && Array.isArray(session.ejercicios)) {
        allExercises.push(...session.ejercicios);
      }
    });

    if (allExercises.length === 0) {
      return { recommendations: [], totalExercises: 0, typeStats: {}, areaStats: {} };
    }

    const normalizedExercises = allExercises.map(exercise => ({
      tipo: exercise.tipo,
      area: exercise.area,
      ejercicio: exercise.ejercicio || exercise.ejercicioEspecifico || "Ejercicio sin nombre",
      repeticiones: 1
    }));

    const totalExercises = normalizedExercises.length;

    // Calcular estadísticas por tipos
    const typeStats: any = {};
    const areaStats: any = {};

    normalizedExercises.forEach(exercise => {
      // Normalizar tipo para que coincida con el plan
      const tipo = exercise.tipo.charAt(0).toUpperCase() + exercise.tipo.slice(1).toLowerCase();
      
      // Normalizar área para que coincida con el plan
      const area = exercise.area.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      
      // Stats por tipo
      if (!typeStats[tipo]) {
        typeStats[tipo] = { total: 0, percentage: 0, areas: {} };
      }
      typeStats[tipo].total += 1;
      
      // Stats por área dentro del tipo
      if (!typeStats[tipo].areas[area]) {
        typeStats[tipo].areas[area] = { total: 0, percentage: 0, exercises: {} };
      }
      typeStats[tipo].areas[area].total += 1;
      
      // Contar ejercicios específicos
      if (!typeStats[tipo].areas[area].exercises[exercise.ejercicio]) {
        typeStats[tipo].areas[area].exercises[exercise.ejercicio] = 0;
      }
      typeStats[tipo].areas[area].exercises[exercise.ejercicio] += 1;

      // Stats por área global
      if (!areaStats[area]) {
        areaStats[area] = { total: 0, percentage: 0 };
      }
      areaStats[area].total += 1;
    });

    // Calcular porcentajes
    Object.keys(typeStats).forEach(tipo => {
      typeStats[tipo].percentage = Math.round((typeStats[tipo].total / totalExercises) * 100);
      Object.keys(typeStats[tipo].areas).forEach(area => {
        typeStats[tipo].areas[area].percentage = Math.round((typeStats[tipo].areas[area].total / totalExercises) * 100);
      });
    });

    Object.keys(areaStats).forEach(area => {
      areaStats[area].percentage = Math.round((areaStats[area].total / totalExercises) * 100);
    });
    
    // Generar recomendaciones basadas en el plan de entrenamiento
    const recommendations: Recommendation[] = [];
    const playerPlan = trainingPlans[playerId];
    
    if (playerPlan && playerPlan.planificacion) {
      // Recomendaciones por tipo basadas en el plan real
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
              basedOnExercises: stats.total
            });
          }
          
          // Recomendaciones por áreas dentro del tipo basadas en el plan real
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
                    basedOnExercises: areaStats.total,
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
            basedOnExercises: stats.total
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
      totalExercises,
      typeStats,
      areaStats,
      sessionsAnalyzed: playerSessions.length,
      planUsed: playerPlan ? 'real' : 'default'
    };
  };

  // Función para analizar sesiones de un jugador
  const analyzePlayerSessions = (playerId: string) => {
    const player = participants.find(p => p.id === playerId);
    if (!player) {
      return { totalSessions: 0, dateRange: null };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const playerSessions = realSessions.filter(session => {
      const sessionDate = new Date(session.fecha);
      
      // Manejo flexible de estructuras
      let isPlayerInSession = false;
      
      if ((session as any).jugadorId === playerId) {
        isPlayerInSession = true;
      }
      
      if ((session as any).participants && Array.isArray((session as any).participants)) {
        isPlayerInSession = (session as any).participants.some((p: any) => p.playerId === playerId);
      }
      
      return isPlayerInSession && sessionDate >= thirtyDaysAgo;
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
  };

  const getIdealPercentageForType = (type: string, playerId: string) => {
    const playerPlan = trainingPlans[playerId];
    if (playerPlan && playerPlan.planificacion && playerPlan.planificacion[type as TipoType]) {
      return playerPlan.planificacion[type as TipoType].porcentajeTotal;
    }
    return 50; // Meta por defecto: 50/50 entre Canasto y Peloteo
  };

  const getIdealPercentageForAreaInType = (area: string, type: string, playerId: string) => {
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
  };

  // Función para generar recomendaciones grupales
  const generateGroupRecommendations = () => {
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
  };

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
    
    // Helpers
    getIdealPercentageForType,
    getIdealPercentageForAreaInType
  };
};