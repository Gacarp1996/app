import React, { useState, useEffect, useMemo } from 'react';
import { TrainingSession, LoggedExercise } from '../../types';
import { TipoType, AreaType, UI_LABELS } from '../../constants/training';
import { getSessions } from '../../Database/FirebaseSessions';
import { getTrainingPlan, TrainingPlan } from '../../Database/FirebaseTrainingPlans';
import { RecommendationLegend } from './RecommendationLegend';

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

interface ActiveSessionRecommendationsProps {
  participants: Participant[];
  academiaId: string;
  sessions: TrainingSession[];
}

const ActiveSessionRecommendations: React.FC<ActiveSessionRecommendationsProps> = ({ 
  participants, 
  academiaId, 
  sessions 
}) => {
  const [activeTab, setActiveTab] = useState<'individual' | 'group'>('individual');
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(participants[0]?.id || '');
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [individualLoading, setIndividualLoading] = useState(false);
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<string>>(new Set());
  const [trainingPlans, setTrainingPlans] = useState<{[playerId: string]: TrainingPlan}>({});
  const [realSessions, setRealSessions] = useState<TrainingSession[]>([]);
  
  const [recommendationsGenerated, setRecommendationsGenerated] = useState(false);
  const [individualRecommendations, setIndividualRecommendations] = useState<any>(null);
  const [groupRecommendations, setGroupRecommendations] = useState<any>(null);
  const [dataPreview, setDataPreview] = useState<any>(null);
  
  const [showLegend, setShowLegend] = useState(false);

  // 🎨 FUNCIÓN HELPER: Formatear información del área con tipo padre
  const formatAreaWithParent = (area: string, parentType: string | undefined, level: string) => {
    if (!parentType) return area;
    
    // Si es una recomendación de TIPO, no necesitamos mostrar parentType porque es redundante
    if (level === 'TIPO') return area;
    
    // Para áreas específicas, mostrar el contexto del tipo padre
    return `${area} (${parentType})`;
  };

  // Función para obtener el label UI para mostrar (capitalizado)
  const getUILabel = (value: string, type: 'tipo' | 'area'): string => {
    if (type === 'tipo' && value in UI_LABELS.TIPOS) {
      return UI_LABELS.TIPOS[value as TipoType];
    }
    if (type === 'area' && value in UI_LABELS.AREAS) {
      return UI_LABELS.AREAS[value as AreaType];
    }
    // Fallback: capitalizar la primera letra
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  // Función principal para generar recomendaciones bajo demanda
  const generateRecommendations = async () => {
    console.log('🚀 [DEBUG] Generando recomendaciones...');
    console.log('🚀 [DEBUG] Participantes:', participants);
    console.log('🚀 [DEBUG] Sesiones reales disponibles:', realSessions.length);
    console.log('🚀 [DEBUG] Planes de entrenamiento:', Object.keys(trainingPlans));
    
    setRecommendationsLoading(true);
    
    try {
      // Generar recomendaciones individuales para el jugador seleccionado
      console.log('📊 [DEBUG] Analizando jugador:', selectedPlayerId);
      const individualAnalysis = analyzePlayerExercises(selectedPlayerId);
      console.log('📊 [DEBUG] Análisis individual:', individualAnalysis);
      setIndividualRecommendations(individualAnalysis);
      
      // Generar recomendaciones grupales si hay más de un participante
      if (participants.length > 1) {
        console.log('👥 [DEBUG] Generando análisis grupal...');
        const groupAnalysis = generateGroupRecommendations();
        console.log('👥 [DEBUG] Análisis grupal:', groupAnalysis);
        setGroupRecommendations(groupAnalysis);
      }
      
      setRecommendationsGenerated(true);
      console.log('✅ [DEBUG] Recomendaciones generadas exitosamente');
    } catch (error) {
      console.error('❌ Error generando recomendaciones:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Función para refrescar recomendaciones (regenerar)
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
          }
        } catch (error) {
          console.error(`Error recargando plan para ${participant.name}:`, error);
        }
      }
      setTrainingPlans(plansMap);

      // Generar preview de datos
      generateDataPreview(realSessionsData, plansMap);

      // Generar recomendaciones con los datos recargados
      await generateRecommendations();
    } catch (error) {
      console.error('❌ Error recargando datos para regenerar recomendaciones:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Regenerar recomendaciones cuando cambie el jugador seleccionado
  useEffect(() => {
    console.log('🔄 [EFFECT] selectedPlayerId cambió:', {
      selectedPlayerId,
      recommendationsGenerated,
      hasRecommendations: individualRecommendations?.recommendations?.length > 0
    });
    
    if (recommendationsGenerated && selectedPlayerId) {
      console.log('🔄 [EFFECT] Regenerando análisis para jugador:', selectedPlayerId);
      const individualAnalysis = analyzePlayerExercises(selectedPlayerId);
      console.log('🔄 [EFFECT] Nuevo análisis individual:', individualAnalysis);
      setIndividualRecommendations(individualAnalysis);
    }
  }, [selectedPlayerId, recommendationsGenerated]);

  // Configurar jugador seleccionado por defecto
  useEffect(() => {
    if (participants.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(participants[0].id);
    }
  }, [participants, selectedPlayerId]);

  // Cargar planes de entrenamiento y sesiones reales
  useEffect(() => {
    setRefreshKey(Date.now());
    const loadRealData = async () => {
      if (academiaId && participants.length > 0) {
        try {
          // Cargar sesiones reales desde Firebase
          const realSessionsData = await getSessions(academiaId);
          setRealSessions(realSessionsData);
          // Cargar planes de entrenamiento para cada participante
          const plansMap: {[playerId: string]: TrainingPlan} = {};
          for (const participant of participants) {
            try {
              const plan = await getTrainingPlan(academiaId, participant.id);
              if (plan) {
                plansMap[participant.id] = plan;
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
        return session.jugadorId === participant.id && sessionDate >= thirtyDaysAgo;
      });
      
      const totalExercises = playerSessions.reduce((sum, session) => {
        return sum + (session.ejercicios?.length || 0);
      }, 0);
      
      const hasPlan = !!plans[participant.id];
      
      console.log(`🔍 [ACTIVE_SESSION] Participante ${participant.name}: ${playerSessions.length} sesiones, ${totalExercises} ejercicios en últimos ${analysisWindowDays} días`);
      
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

  // Función para analizar ejercicios de un jugador específico usando datos reales
  const analyzePlayerExercises = (playerId: string) => {
    console.log('🔍 [DEBUG] analyzePlayerExercises - playerId:', playerId);
    
    const player = participants.find(p => p.id === playerId);
    if (!player) {
      console.log('❌ [DEBUG] Jugador no encontrado:', playerId);
      return { recommendations: [], totalExercises: 0, typeStats: {}, areaStats: {} };
    }

    console.log('👤 [DEBUG] Jugador encontrado:', player.name);

    const analysisWindowDays = 30;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - analysisWindowDays);
    
    console.log('📅 [DEBUG] Ventana de análisis:', {
      days: analysisWindowDays,
      from: thirtyDaysAgo.toLocaleDateString(),
      to: new Date().toLocaleDateString()
    });
    
    const playerSessions = realSessions.filter(session => {
      const sessionDate = new Date(session.fecha);
      return session.jugadorId === playerId && sessionDate >= thirtyDaysAgo;
    });

    
    console.log('📊 [DEBUG] Sesiones del jugador encontradas:', playerSessions.length);
    console.log('📊 [DEBUG] Total de sesiones reales disponibles:', realSessions.length);
    console.log('📊 [DEBUG] Sesiones del jugador:', playerSessions);
    console.log('📊 [DEBUG] Primera sesión (si existe):', playerSessions[0]);


    // Extraer todos los ejercicios de las sesiones del jugador
    const allExercises: LoggedExercise[] = [];
    playerSessions.forEach(session => {
      if (session.ejercicios && Array.isArray(session.ejercicios)) {
        console.log('🏃 [DEBUG] Sesión con ejercicios:', session.fecha, '- Ejercicios:', session.ejercicios.length);
        allExercises.push(...session.ejercicios);
      } else {
        console.log('⚠️ [DEBUG] Sesión sin ejercicios:', session.fecha);
      }
    });

    console.log('🏃 [DEBUG] Total ejercicios extraídos:', allExercises.length);

    if (allExercises.length === 0) {
      console.log('❌ [DEBUG] No hay ejercicios para analizar');
      return { recommendations: [], totalExercises: 0, typeStats: {}, areaStats: {} };
    }

    console.log('🔍 [DEBUG] Primer ejercicio completo:', allExercises[0]);
    console.log('🔍 [DEBUG] Tipos encontrados:', [...new Set(allExercises.map(e => e.tipo))]);
    console.log('🔍 [DEBUG] Áreas encontradas:', [...new Set(allExercises.map(e => e.area))]);

    // No normalizar aquí - los datos ya deben venir correctos de la DB
    const normalizedExercises = allExercises.map(exercise => ({
      tipo: exercise.tipo,
      area: exercise.area,
      ejercicio: exercise.ejercicio || exercise.ejercicioEspecifico || "Ejercicio sin nombre",
      repeticiones: 1 // Simplificado
    }));

    const totalExercises = normalizedExercises.length;

    // Calcular estadísticas por tipos - SIN NORMALIZACIÓN
    const typeStats: any = {};
    const areaStats: any = {};

    normalizedExercises.forEach(exercise => {
      // Normalizar tipo para que coincida con el plan (Primera letra mayúscula)
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
    
    console.log('📊 [DEBUG] typeStats calculados:', typeStats);
    console.log('📊 [DEBUG] areaStats calculados:', areaStats);
    
    // Generar recomendaciones basadas en el plan de entrenamiento real del jugador
    const recommendations: Recommendation[] = [];
    const playerPlan = trainingPlans[playerId];

    console.log('📋 [DEBUG] Plan del jugador:', playerPlan);
    console.log('📋 [DEBUG] Estructura del plan.planificacion:', JSON.stringify(playerPlan?.planificacion, null, 2));
    
    if (playerPlan && playerPlan.planificacion) {
      // Recomendaciones por tipo basadas en el plan real
      Object.entries(typeStats).forEach(([tipo, stats]: [string, any]) => {
        console.log(`🎯 [DEBUG] Comparando tipo "${tipo}" con plan`);
        const plannedType = playerPlan.planificacion[tipo as TipoType];
        console.log(`🎯 [DEBUG] plannedType encontrado:`, plannedType);
        
        if (plannedType) {
          const plannedPercentage = plannedType.porcentajeTotal;
          const difference = Math.abs(stats.percentage - plannedPercentage);
        
          console.log(`🎯 [DEBUG] Tipo ${tipo}: actual=${stats.percentage}%, planificado=${plannedPercentage}%, diferencia=${difference}%`);

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
      
      console.log('💡 [DEBUG] Recomendaciones generadas:', recommendations);
      console.log('💡 [DEBUG] Total de recomendaciones:', recommendations.length);
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

  // Función para analizar sesiones de un jugador usando datos reales
  const analyzePlayerSessions = (playerId: string) => {
    const player = participants.find(p => p.id === playerId);
    if (!player) {
      return { totalSessions: 0, dateRange: null };
    }

    // Obtener sesiones reales del jugador de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const playerSessions = realSessions.filter(session => {
      const sessionDate = new Date(session.fecha);
      return session.jugadorId === playerId && sessionDate >= thirtyDaysAgo;
    });

    if (playerSessions.length === 0) {
      return { totalSessions: 0, dateRange: null };
    }

    // Calcular rango de fechas
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
    
    return idealPercentages[type]?.[area] || 15; // Default 15% si no se encuentra
  };

  // Función para generar recomendaciones grupales usando datos reales
  const generateGroupRecommendations = () => {
    if (participants.length < 2) return null;
    
    // Analizar todos los participantes usando datos reales
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
      return null; // No hay datos suficientes
    }

    // Generar el análisis grupal basado en coincidencias
    return summarizeGroupRecommendations(participantsWithData);
  };

  // 🧩 FUNCIÓN: Detectar coincidencias grupales
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
        // Priorizar por cantidad de jugadores afectados, luego por diferencia promedio
        if (b.playerCount !== a.playerCount) {
          return b.playerCount - a.playerCount;
        }
        return b.promedioDiferencia - a.promedioDiferencia;
      });
    
    return significantCoincidences;
  };

  // 🎯 FUNCIÓN: Obtener top déficits por jugador
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

  // 🎯 FUNCIÓN PRINCIPAL: Orquestar análisis grupal
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
      // Datos básicos
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
      
      // NUEVAS FUNCIONALIDADES GRUPALES
      coincidencias,
      individuales,
      hasStrongCoincidences: coincidencias.length > 0,
      recommendation: generateGroupRecommendationText(coincidencias, individuales)
    };
  };

  // 💬 FUNCIÓN: Generar texto de recomendación
  const generateGroupRecommendationText = (coincidencias: any[], individuales: any[]) => {
    if (coincidencias.length > 0) {
      const topCoincidence = coincidencias[0];
      let action = topCoincidence.type === 'INCREMENTAR' ? 'incrementar' : 'reducir';
      let area = getUILabel(topCoincidence.area, topCoincidence.level === 'TIPO' ? 'tipo' : 'area');
      let parentType = topCoincidence.parentType || '';

      // Si la recomendación es reducir (exceso), sugerir el tipo alternativo
      if (topCoincidence.type === 'REDUCIR') {
        let alternativo = '';
        
        // Comparar con valores de enum exactos
        if (parentType === TipoType.PELOTEO) {
          alternativo = getUILabel(TipoType.CANASTO, 'tipo');
        } else if (parentType === TipoType.CANASTO) {
          alternativo = getUILabel(TipoType.PELOTEO, 'tipo');
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

  // LOG DE RENDERIZADO
  console.log('🎨 [RENDER] ActiveSessionRecommendations', {
    recommendationsGenerated,
    recommendationsLoading,
    individualRecommendations,
    groupRecommendations,
    dataPreview,
    activeTab,
    selectedPlayerId,
    'individualRecommendations?.recommendations': individualRecommendations?.recommendations,
    'individualRecommendations?.recommendations?.length': individualRecommendations?.recommendations?.length
  });

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <h4 className="text-lg font-semibold text-white">Recomendaciones</h4>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshRecommendations}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Actualizar recomendaciones"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
          
          {/* Botón de ayuda para mostrar leyenda */}
          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md border-2 border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400
              ${showLegend ? 'bg-indigo-700 text-white scale-105' : 'bg-indigo-500/80 text-white animate-pulse'}
              hover:bg-indigo-600 hover:scale-105`}
            title="Guía de colores: ¿Qué significa cada color?"
            style={{ minWidth: 0 }}
          >
            <svg className="w-5 h-5 mr-1 text-yellow-300 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="#facc15" />
              <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#1e293b" fontWeight="bold">?</text>
            </svg>
            <span>Guía de colores</span>
          </button>
        </div>
      </div>

      {/* Leyenda de colores (mostrar/ocultar) */}
      {showLegend && (
        <RecommendationLegend className="mb-4" />
      )}

      {/* Loading state */}
      {(recommendationsLoading || individualLoading) && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
          <span className="ml-3 text-gray-400">Analizando recomendaciones...</span>
        </div>
      )}

      {/* Contenido según tab activo */}
      {/* Placeholder para cuando no hay recomendaciones generadas ni están cargando */}
      {!recommendationsLoading && !recommendationsGenerated && !dataPreview && (
        <div className="bg-gray-800/30 border border-gray-600/30 rounded-xl p-6 text-center">
          <span className="text-gray-400 text-2xl block mb-2">📊</span>
          <p className="text-gray-400 font-medium">Listo para generar recomendaciones</p>
          <p className="text-gray-500 text-sm mt-1">
            Los datos se cargarán cuando presiones el botón de análisis
          </p>
        </div>
      )}

      {/* Preview de datos y botón para generar recomendaciones */}
      {!recommendationsLoading && !recommendationsGenerated && dataPreview && (
        <div className="space-y-4">
          {/* Preview de datos disponibles */}
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-400/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-500/20 rounded-full p-3">
                <span className="text-blue-400 text-xl">📊</span>
              </div>
              <div>
                <h4 className="font-semibold text-blue-400 text-base">Datos Disponibles para Análisis</h4>
                <p className="text-blue-300 text-sm">
                  Revisión previa antes de generar recomendaciones
                </p>
              </div>
            </div>
            
            {/* Estadísticas generales */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center bg-blue-500/10 rounded-lg p-3">
                <div className="text-lg font-bold text-blue-400">{dataPreview.totalParticipants}</div>
                <div className="text-xs text-blue-300">Participantes</div>
              </div>
              <div className="text-center bg-blue-500/10 rounded-lg p-3">
                <div className="text-lg font-bold text-green-400">{dataPreview.playersWithData}</div>
                <div className="text-xs text-blue-300">Con Datos</div>
              </div>
              <div className="text-center bg-blue-500/10 rounded-lg p-3">
                <div className="text-lg font-bold text-purple-400">{dataPreview.totalSessions}</div>
                <div className="text-xs text-blue-300">Sesiones</div>
              </div>
              <div className="text-center bg-blue-500/10 rounded-lg p-3">
                <div className="text-lg font-bold text-cyan-400">{dataPreview.totalExercises}</div>
                <div className="text-xs text-blue-300">Ejercicios</div>
              </div>
            </div>
            
            {/* Detalles por jugador */}
            <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/20">
              <h5 className="text-xs font-semibold text-blue-400 mb-2">Detalle por jugador:</h5>
              <div className="space-y-2">
                {dataPreview.participantsPreviews.map((participant: any, index: number) => (
                  <div key={index} className={`flex items-center justify-between text-xs p-2 rounded ${
                    participant.hasData ? 'bg-green-500/10 border border-green-500/20' : 'bg-gray-500/10 border border-gray-500/20'
                  }`}>
                    <span className={participant.hasData ? 'text-green-300' : 'text-gray-400'}>
                      {participant.playerName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={participant.hasData ? 'text-green-400' : 'text-gray-400'}>
                        {participant.sessionsCount} sesiones
                      </span>
                      <span className={participant.hasData ? 'text-green-400' : 'text-gray-400'}>
                        {participant.exercisesCount} ejercicios
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        participant.hasPlan ? 'bg-purple-500/20 text-purple-300' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {participant.hasPlan ? 'Plan' : 'Default'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Estado y advertencias */}
            {dataPreview.playersWithData === 0 && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-red-400">⚠️</span>
                  <span className="text-red-400 text-sm font-medium">Sin datos suficientes</span>
                </div>
                <p className="text-red-300 text-xs mt-1">
                  No se encontraron sesiones de entrenamiento en los últimos 30 días
                </p>
              </div>
            )}
            
            {dataPreview.playersWithPlans < dataPreview.playersWithData && (
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">💡</span>
                  <span className="text-yellow-400 text-sm font-medium">Planes de entrenamiento</span>
                </div>
                <p className="text-yellow-300 text-xs mt-1">
                  {dataPreview.playersWithData - dataPreview.playersWithPlans} jugador(es) usarán valores por defecto
                </p>
              </div>
            )}
          </div>
          
          {/* Botón para generar recomendaciones */}
          <div className="text-center">
            <button
              onClick={generateRecommendations}
              disabled={!dataPreview.canGenerateRecommendations}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                dataPreview.canGenerateRecommendations
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 shadow-lg hover:shadow-xl'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {dataPreview.canGenerateRecommendations ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">🎯</span>
                  <span>Generar Recomendaciones</span>
                  <span className="text-sm opacity-80">
                    ({dataPreview.playersWithData} jugador{dataPreview.playersWithData !== 1 ? 'es' : ''})
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">❌</span>
                  <span>Sin datos para analizar</span>
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Contenido de recomendaciones generadas */}
      {!recommendationsLoading && recommendationsGenerated && (
        <div className="space-y-4">
          {(() => {
            console.log('🎯 [RENDER] Mostrando recomendaciones generadas');
            return null;
          })()}
          
          {/* DEBUG: Mostrar estado actual */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-xs">
            <p className="text-purple-400 font-bold mb-2">🐛 DEBUG - Estado Actual:</p>
            <div className="text-purple-300 space-y-1">
              <p>• recommendationsGenerated: {String(recommendationsGenerated)}</p>
              <p>• activeTab: {activeTab}</p>
              <p>• individualRecommendations: {individualRecommendations ? 'Cargado' : 'null'}</p>
              <p>• recommendations.length: {individualRecommendations?.recommendations?.length || 0}</p>
              <p>• selectedPlayerId: {selectedPlayerId}</p>
            </div>
          </div>
          
          {/* Botón para volver a generar (único) */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-green-400 text-lg">✅</span>
            <span className="text-green-400 font-semibold">Recomendaciones Generadas</span>
            <button
              onClick={refreshRecommendations}
              className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              🔄 Regenerar
            </button>
          </div>
          
          {/* Tabs para alternar entre vista individual y grupal (solo si hay recomendaciones) */}
          {participants.length > 1 && (
            <div className="flex mb-4 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('individual')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'individual'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Individual
              </button>
              <button
                onClick={() => setActiveTab('group')}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'group'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Grupal
              </button>
            </div>
          )}
          
          {/* CONTENIDO DE RECOMENDACIONES */}
          {activeTab === 'individual' && individualRecommendations && (
            <div className="space-y-4">
              {(() => {
                console.log('📊 [RENDER] Mostrando recomendaciones individuales:', individualRecommendations);
                return null;
              })()}
              
              {/* Selector de jugador para vista individual */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-400">Jugador:</label>
                <select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  {participants.map(participant => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resumen del análisis */}
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h5 className="text-white font-semibold mb-2">Resumen del Análisis</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Sesiones analizadas:</span>
                    <span className="text-white ml-2 font-medium">{individualRecommendations.sessionsAnalyzed || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Total ejercicios:</span>
                    <span className="text-white ml-2 font-medium">{individualRecommendations.totalExercises || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Plan usado:</span>
                    <span className="text-white ml-2 font-medium">{individualRecommendations.planUsed === 'real' ? 'Personalizado' : 'Por defecto'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Recomendaciones:</span>
                    <span className="text-white ml-2 font-medium">{individualRecommendations.recommendations?.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* Lista de recomendaciones */}
              {individualRecommendations.recommendations && individualRecommendations.recommendations.length > 0 ? (
                <div className="space-y-3">
                  <h5 className="text-white font-semibold">Ajustes Recomendados</h5>
                  {individualRecommendations.recommendations.map((rec: Recommendation, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        rec.type === 'INCREMENTAR' 
                          ? 'bg-red-500/10 border-red-500/30' 
                          : 'bg-yellow-500/10 border-yellow-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-semibold ${
                              rec.type === 'INCREMENTAR' ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                              {rec.type === 'INCREMENTAR' ? '🔴 Incrementar' : '🟡 Reducir'}
                            </span>
                            <span className="text-white">
                              {rec.level === 'TIPO' ? 'Tipo' : 'Área'}: {rec.area}
                            </span>
                          </div>
                          <p className="text-gray-300 text-sm mb-2">{rec.reason}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <span>Actual: {rec.currentPercentage}%</span>
                            <span>Plan: {rec.plannedPercentage}%</span>
                            <span>Diferencia: {rec.difference}%</span>
                            <span className={`px-2 py-1 rounded-full ${
                              rec.priority === 'high' 
                                ? 'bg-red-500/20 text-red-400' 
                                : rec.priority === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {rec.priority === 'high' ? 'Alta' : rec.priority === 'medium' ? 'Media' : 'Baja'} prioridad
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-400">
                    ¡Excelente! El entrenamiento está bien balanceado según el plan.
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Vista grupal */}
          {activeTab === 'group' && groupRecommendations && (
            <div className="space-y-4">
              {(() => {
                console.log('👥 [RENDER] Mostrando recomendaciones grupales:', groupRecommendations);
                return null;
              })()}
              
              {/* Recomendación principal */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-300 text-lg font-medium">{groupRecommendations.recommendation}</p>
              </div>

              {/* CASO A: Si hay coincidencias grupales */}
              {groupRecommendations.hasStrongCoincidences && groupRecommendations.coincidencias.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span>🎯</span>
                    Coincidencias grupales detectadas:
                  </h5>
                  <div className="space-y-2">
                    {groupRecommendations.coincidencias.map((coincidencia: any, index: number) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {coincidencia.level === 'TIPO' ? '🎾' : '🎯'}
                          </span>
                          <span className="text-white font-medium">
                            {coincidencia.area}
                          </span>
                          <span className={`text-sm ${
                            coincidencia.type === 'INCREMENTAR' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            ({coincidencia.type === 'INCREMENTAR' ? '↑' : '↓'})
                          </span>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-gray-300">
                            Afecta a <span className="font-semibold text-white">{coincidencia.playerCount} jugadores</span>
                          </div>
                          <div className="text-gray-400">
                            (prom. {coincidencia.promedioDiferencia}% de gap)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Sugerencia opcional */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400 italic">
                      💬 Podés iniciar la sesión con ejercicios de "{groupRecommendations.coincidencias[0].area}" 
                      que afecta a varios jugadores y luego alternar con tareas específicas.
                    </p>
                  </div>
                </div>
              )}

              {/* CASO B: Si NO hay coincidencias claras - Tabla de déficits individuales */}
              {(!groupRecommendations.hasStrongCoincidences || groupRecommendations.coincidencias.length === 0) && 
               groupRecommendations.individuales.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h5 className="text-white font-semibold mb-3">
                    📊 Déficits individuales destacados
                  </h5>
                  <p className="text-gray-400 text-sm mb-4">
                    No hay coincidencias grupales fuertes. Aquí están los principales déficits por jugador:
                  </p>
                  
                  {/* Tabla compacta */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Jugador</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Déficit Principal</th>
                          <th className="text-center py-2 px-3 text-gray-400 font-medium">Gap</th>
                          <th className="text-left py-2 px-3 text-gray-400 font-medium">Segundo Déficit</th>
                          <th className="text-center py-2 px-3 text-gray-400 font-medium">Gap</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupRecommendations.individuales.map((jugador: any) => (
                          <tr key={jugador.playerId} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                            <td className="py-2 px-3 text-green-400 font-medium">{jugador.playerName}</td>
                            
                            {/* Déficit principal */}
                            {jugador.deficits[0] ? (
                              <>
                                <td className="py-2 px-3 text-white">
                                  {jugador.deficits[0].area} 
                                  <span className="text-red-400 ml-1">(↑)</span>
                                </td>
                                <td className="py-2 px-3 text-center text-red-400 font-medium">
                                  {jugador.deficits[0].diferencia}%
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-3 text-gray-500">-</td>
                                <td className="py-2 px-3 text-center text-gray-500">-</td>
                              </>
                            )}
                            
                            {/* Segundo déficit */}
                            {jugador.deficits[1] ? (
                              <>
                                <td className="py-2 px-3 text-white">
                                  {jugador.deficits[1].area}
                                  <span className="text-red-400 ml-1">(↑)</span>
                                </td>
                                <td className="py-2 px-3 text-center text-red-400 font-medium">
                                  {jugador.deficits[1].diferencia}%
                                </td>
                              </>
                            ) : jugador.excesos[0] ? (
                              <>
                                <td className="py-2 px-3 text-white">
                                  {jugador.excesos[0].area}
                                  <span className="text-yellow-400 ml-1">(↓)</span>
                                </td>
                                <td className="py-2 px-3 text-center text-yellow-400 font-medium">
                                  {jugador.excesos[0].diferencia}%
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-3 text-gray-500">-</td>
                                <td className="py-2 px-3 text-center text-gray-500">-</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Sugerencia opcional */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400 italic">
                      💬 Podés alternar ejercicios dentro de la sesión para cubrir los diferentes déficits individuales,
                      adaptando según contexto, nivel y prioridades del grupo.
                    </p>
                  </div>
                </div>
              )}

              {/* Información adicional minimalista */}
              <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>
                    Análisis basado en {groupRecommendations.sessionAnalysis.totalSessionsAnalyzed} sesiones 
                    de los últimos 30 días
                  </span>
                  <span>
                    {groupRecommendations.analyzedPlayers} jugadores analizados
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActiveSessionRecommendations;