import React, { useState, useEffect, useMemo } from 'react';
import { TrainingSession, TrainingType, TrainingArea, LoggedExercise } from '../../types';
import { getSessions } from '../../Database/FirebaseSessions';
import { getTrainingPlan, TrainingPlan } from '../../Database/FirebaseTrainingPlans';
import { RecommendationLegend } from './RecommendationLegend';
//esta es la version de rama gabi
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
  // Clave para forzar refresco de efectos y componentes
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(participants[0]?.id || '');
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [individualLoading, setIndividualLoading] = useState(false);
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<string>>(new Set());
  const [trainingPlans, setTrainingPlans] = useState<{[playerId: string]: TrainingPlan}>({});
  const [realSessions, setRealSessions] = useState<TrainingSession[]>([]);
  
  // Estados para generar recomendaciones bajo demanda
  const [recommendationsGenerated, setRecommendationsGenerated] = useState(false);
  const [individualRecommendations, setIndividualRecommendations] = useState<any>(null);
  const [groupRecommendations, setGroupRecommendations] = useState<any>(null);
  const [dataPreview, setDataPreview] = useState<any>(null);
  
  // Estado para mostrar/ocultar la leyenda de colores
  const [showLegend, setShowLegend] = useState(false);

  // 🎨 FUNCIÓN HELPER: Formatear información del área con tipo padre
  const formatAreaWithParent = (area: string, parentType: string | undefined, level: string) => {
    if (!parentType) return area;
    
    // Si es una recomendación de TIPO, no necesitamos mostrar parentType porque es redundante
    if (level === 'TIPO') return area;
    
    // Para áreas específicas, mostrar el contexto del tipo padre
    return `${area} (${parentType})`;
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
  // Refrescar recomendaciones y recargar datos reales y planes
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
    if (recommendationsGenerated && selectedPlayerId) {
      const individualAnalysis = analyzePlayerExercises(selectedPlayerId);
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
    // Forzar refreshKey para que todos los efectos y componentes dependientes se reinicialicen
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
    // ✅ CORREGIDO: Usar 30 días como en usePlanningAnalysis
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

    // ✅ CORREGIDO: Usar 30 días como en usePlanningAnalysis
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

    // Mapear ejercicios a estructura normalizada para análisis
    const normalizedExercises = allExercises.map(exercise => {
      // Normalizar tipo: TrainingType enum -> string
      let tipoString: string;
      if (exercise.tipo === TrainingType.CANASTO) {
        tipoString = "Canasto";
      } else if (exercise.tipo === TrainingType.PELOTA_VIVA) {
        tipoString = "Peloteo";
      } else {
        // Si es un string, intentar mapear
        const tipoStr = String(exercise.tipo);
        if (tipoStr.includes("Canasto") || tipoStr === "Canasto") {
          tipoString = "Canasto";
        } else {
          tipoString = "Peloteo";
        }
      }

      // Normalizar área: TrainingArea enum -> string
      let areaNormalizada: string;
      if (exercise.area === TrainingArea.RED) {
        areaNormalizada = "Juego de red";
      } else if (exercise.area === TrainingArea.PRIMERAS_PELOTAS) {
        areaNormalizada = "Primeras pelotas";
      } else if (exercise.area === TrainingArea.JUEGO_DE_BASE) {
        areaNormalizada = "Juego de base";
      } else if (exercise.area === TrainingArea.PUNTOS) {
        areaNormalizada = "Puntos";
      } else {
        // Si es un string, usarlo directamente con normalización
        const areaStr = String(exercise.area);
        if (areaStr === "Red" || areaStr === "Juego de red") {
          areaNormalizada = "Juego de red";
        } else if (areaStr === "Primeras Pelotas" || areaStr === "Primeras pelotas") {
          areaNormalizada = "Primeras pelotas";
        } else if (areaStr === "Juego de base") {
          areaNormalizada = "Juego de base";
        } else if (areaStr === "Puntos") {
          areaNormalizada = "Puntos";
        } else {
          areaNormalizada = areaStr; // Usar el valor original
        }
      }

      // Calcular repeticiones basado en tiempo/cantidad
      let repeticiones = 1; // Por defecto 1 repetición por ejercicio
      if (exercise.tiempoCantidad) {
        const timeStr = exercise.tiempoCantidad.toLowerCase();
        // Extraer número del string de tiempo/cantidad
        const match = timeStr.match(/(\d+)/);
        if (match) {
          repeticiones = Math.max(1, parseInt(match[1]) / 5); // Dividir por 5 para normalizar (ej: 20 min = 4 repeticiones)
        }
      }

      return {
        tipo: tipoString,
        area: areaNormalizada,
        ejercicio: exercise.ejercicio || exercise.ejercicioEspecifico || "Ejercicio sin nombre",
        repeticiones: Math.round(repeticiones)
      };
    });

    const totalExercises = normalizedExercises.length;

    // Calcular estadísticas por tipos
    const typeStats: any = {};
    const areaStats: any = {};

    normalizedExercises.forEach(exercise => {
      // Stats por tipo
      if (!typeStats[exercise.tipo]) {
        typeStats[exercise.tipo] = { total: 0, percentage: 0, areas: {} };
      }
      typeStats[exercise.tipo].total += 1;
      
      // Stats por área dentro del tipo
      if (!typeStats[exercise.tipo].areas[exercise.area]) {
        typeStats[exercise.tipo].areas[exercise.area] = { total: 0, percentage: 0, exercises: {} };
      }
      typeStats[exercise.tipo].areas[exercise.area].total += 1;
      
      // Contar ejercicios específicos
      if (!typeStats[exercise.tipo].areas[exercise.area].exercises[exercise.ejercicio]) {
        typeStats[exercise.tipo].areas[exercise.area].exercises[exercise.ejercicio] = 0;
      }
      typeStats[exercise.tipo].areas[exercise.area].exercises[exercise.ejercicio] += 1;

      // Stats por área global
      if (!areaStats[exercise.area]) {
        areaStats[exercise.area] = { total: 0, percentage: 0 };
      }
      areaStats[exercise.area].total += 1;
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

    // Generar recomendaciones basadas en el plan de entrenamiento real del jugador
    const recommendations: Recommendation[] = [];
    const playerPlan = trainingPlans[playerId];
    
    if (playerPlan && playerPlan.planificacion) {
      // Recomendaciones por tipo basadas en el plan real
      Object.entries(typeStats).forEach(([tipo, stats]: [string, any]) => {
        const plannedType = playerPlan.planificacion[tipo];
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
              const plannedArea = plannedType.areas[area];
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
      // Si no hay plan, usar valores por defecto (fallback a la lógica anterior)
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
    if (playerPlan && playerPlan.planificacion && playerPlan.planificacion[type]) {
      return playerPlan.planificacion[type].porcentajeTotal;
    }
    return 50; // Meta por defecto: 50/50 entre Canasto y Peloteo
  };

  const getIdealPercentageForAreaInType = (area: string, type: string, playerId: string) => {
    const playerPlan = trainingPlans[playerId];
    if (playerPlan && playerPlan.planificacion && playerPlan.planificacion[type] && playerPlan.planificacion[type].areas && playerPlan.planificacion[type].areas[area]) {
      return playerPlan.planificacion[type].areas[area].porcentajeDelTotal;
    }
    
    // Porcentajes ideales por defecto por área dentro de cada tipo (basado en áreas reales de la DB)
    const idealPercentages: { [key: string]: { [key: string]: number } } = {
      'Canasto': {
        'Juego de base': 17,    // ~17% del total
        'Juego de red': 17,     // ~17% del total
        'Primeras pelotas': 16  // ~16% del total (total Canasto: ~50%)
      },
      'Peloteo': {
        'Juego de base': 15,    // ~15% del total
        'Juego de red': 10,     // ~10% del total
        'Puntos': 15,           // ~15% del total
        'Primeras pelotas': 10  // ~10% del total (total Peloteo: ~50%)
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
            parentType: recommendation.parentType, // Agregar tipo padre
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
        .filter((r: any) => r.type === 'INCREMENTAR') // Solo déficits
        .sort((a: any, b: any) => b.difference - a.difference) // Por diferencia descendente
        .slice(0, 2) // Top 2
        .map((r: any) => ({
          area: r.area,
          level: r.level,
          parentType: r.parentType, // Tipo padre (Peloteo/Canasto)
          diferencia: r.difference,
          currentPercentage: r.currentPercentage,
          plannedPercentage: r.plannedPercentage
        })),
      excesos: rec.recommendations
        .filter((r: any) => r.type === 'REDUCIR') // Solo excesos
        .sort((a: any, b: any) => b.difference - a.difference) // Por diferencia descendente
        .slice(0, 1) // Top 1 exceso
        .map((r: any) => ({
          area: r.area,
          level: r.level,
          parentType: r.parentType, // Tipo padre (Peloteo/Canasto)
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
      
      // 🎯 NUEVAS FUNCIONALIDADES GRUPALES
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
      let area = topCoincidence.area;
      let parentType = topCoincidence.parentType || '';

      // Si la recomendación es reducir (exceso), sugerir el tipo alternativo
      if (topCoincidence.type === 'REDUCIR') {
        // Lógica simple: si el parentType es 'Peloteo', sugerir 'Canasto', y viceversa
        let alternativo = '';
        if (parentType.toLowerCase().includes('peloteo') || area.toLowerCase().includes('juego de base')) {
          alternativo = 'Canasto';
        } else if (parentType.toLowerCase().includes('canasto')) {
          alternativo = 'Peloteo';
        } else {
          // fallback: si no se puede determinar, sugerir "otro tipo de ejercicio"
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
          
          {/* Mostrar tabs solo si hay más de un participante */}
          {participants.length > 1 ? (
            /* Vista grupal para múltiples participantes */
            activeTab === 'group' ? (
              <div className="space-y-4">
                {(() => {
                  const groupRecs = groupRecommendations;
                  
                  if (!groupRecs) {
                    return (
                      <div className="bg-gradient-to-r from-gray-800/30 to-gray-700/30 border-2 border-gray-600/40 rounded-xl p-6 text-center">
                        <div className="bg-gray-600/30 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                          <span className="text-gray-400 text-2xl">📊</span>
                        </div>
                        <p className="text-gray-400 font-semibold text-base mb-2">Sin datos suficientes</p>
                        <p className="text-gray-500 text-sm">Necesitas sesiones previas para generar recomendaciones grupales</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Header para recomendaciones grupales */}
                      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2 border-purple-400/30 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-500/20 rounded-full p-3">
                            <span className="text-purple-400 text-xl">👥</span>
                          </div>
                          <div>
                            <h3 className="text-purple-400 font-bold text-lg">Análisis Grupal Inteligente</h3>
                            <p className="text-purple-300 text-sm">
                              {groupRecs.analyzedPlayers} jugadores analizados • {groupRecs.sessionAnalysis.totalSessionsAnalyzed} sesiones
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 🎯 COINCIDENCIAS GRUPALES */}
                      {groupRecs.hasStrongCoincidences ? (
                        <div className="space-y-4">
                          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-2 border-green-400/30 rounded-xl p-4">
                            <h4 className="text-green-400 font-bold text-base mb-3 flex items-center gap-2">
                              🎯 Coincidencias Grupales Detectadas
                            </h4>
                            <p className="text-green-300 text-sm mb-4">
                              Múltiples jugadores comparten déficits similares. Prioriza estos ejercicios:
                            </p>
                            
                            <div className="space-y-3">
                              {groupRecs.coincidencias.slice(0, 3).map((coincidencia: any, index: number) => (
                                <div key={index} className={`p-3 rounded-lg border ${
                                  coincidencia.type === 'INCREMENTAR' ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20'
                                }`}>
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                      <span className="text-lg">
                                        {coincidencia.type === 'INCREMENTAR' ? '📈' : '📉'}
                                      </span>
                                      <div>
                                        <h5 className={`font-semibold ${
                                          coincidencia.type === 'INCREMENTAR' ? 'text-red-400' : 'text-yellow-400'
                                        }`}>
                                          {formatAreaWithParent(coincidencia.area, coincidencia.parentType, coincidencia.level)} ({coincidencia.type === 'INCREMENTAR' ? '↑' : '↓'})
                                        </h5>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-400">
                                            {coincidencia.level === 'TIPO' ? 'Tipo de entrenamiento' : 'Área específica'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className={`text-sm font-bold ${
                                        coincidencia.type === 'INCREMENTAR' ? 'text-red-400' : 'text-yellow-400'
                                      }`}>
                                        {coincidencia.playerCount} jugadores
                                      </div>
                                      <div className="text-xs text-gray-400">
                                        Dif. prom: {coincidencia.promedioDiferencia}%
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Lista de jugadores afectados */}
                                  <div className="flex flex-wrap gap-2">
                                    {coincidencia.players.map((player: any, pidx: number) => (
                                      <span key={pidx} className="text-xs px-2 py-1 bg-gray-700/50 text-gray-300 rounded">
                                        {player.name} ({player.diferencia.toFixed(1)}%)
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Sugerencia práctica */}
                          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <span className="text-blue-400 text-lg">💡</span>
                              <div>
                                <h5 className="text-blue-400 font-semibold text-sm mb-1">Sugerencia del Sistema:</h5>
                                <p className="text-blue-300 text-sm">{groupRecs.recommendation}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* 📋 VISTA INDIVIDUAL COMPACTA */
                        <div className="space-y-4">
                          <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-2 border-orange-400/30 rounded-xl p-4">
                            <h4 className="text-orange-400 font-bold text-base mb-3 flex items-center gap-2">
                              📋 Déficits Individuales
                            </h4>
                            <p className="text-orange-300 text-sm mb-4">
                              No hay coincidencias grupales fuertes. Aquí están los principales déficits por jugador:
                            </p>

                            {/* Tabla compacta de déficits */}
                            <div className="space-y-3">
                              {groupRecs.individuales.map((player: any, index: number) => (
                                <div key={index} className="bg-gray-800/50 border border-gray-600/30 rounded-lg p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-white font-medium">{player.playerName}</h5>
                                    <span className="text-xs text-gray-400">
                                      {player.deficits.length} déficit(s) • {player.excesos.length} exceso(s)
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {/* Déficits (incrementar) */}
                                    {player.deficits.slice(0, 2).map((deficit: any, didx: number) => (
                                      <div key={`deficit-${didx}`} className="flex flex-col p-2 bg-red-500/10 border border-red-500/20 rounded text-xs">
                                        <div className="flex items-center justify-between">
                                          <div className="flex flex-col">
                                            <span className="text-red-400 font-medium">
                                              {formatAreaWithParent(deficit.area, deficit.parentType, deficit.level)} ↑
                                            </span>
                                            <span className="text-xs text-red-300/70 mt-0.5">
                                              {deficit.level === 'TIPO'
                                                ? 'Tipo de entrenamiento'
                                                : deficit.parentType
                                                  ? `Ejercicio de ${deficit.parentType}`
                                                  : ''}
                                            </span>
                                          </div>
                                          <span className="text-red-300 font-bold">{deficit.diferencia.toFixed(1)}%</span>
                                        </div>
                                      </div>
                                    ))}
                                    
                                    {/* Excesos (reducir) */}
                                    {player.excesos.slice(0, 1).map((exceso: any, eidx: number) => (
                                      <div key={`exceso-${eidx}`} className="flex flex-col p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
                                        <div className="flex items-center justify-between">
                                          <div className="flex flex-col">
                                            <span className="text-yellow-400 font-medium">
                                              {formatAreaWithParent(exceso.area, exceso.parentType, exceso.level)} ↓
                                            </span>
                                            <span className="text-xs text-yellow-300/70 mt-0.5">
                                              {exceso.level === 'TIPO' ? 'Tipo de entrenamiento' : 'Área específica'}
                                            </span>
                                          </div>
                                          <span className="text-yellow-300 font-bold">{exceso.diferencia.toFixed(1)}%</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Sugerencia para casos individuales */}
                          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <span className="text-blue-400 text-lg">💡</span>
                              <div>
                                <h5 className="text-blue-400 font-semibold text-sm mb-1">Sugerencia del Sistema:</h5>
                                <p className="text-blue-300 text-sm">{groupRecs.recommendation}</p>
                                <p className="text-blue-300 text-xs mt-2">
                                  Tip: Alterna ejercicios durante la sesión para cubrir diferentes déficits según el contexto y prioridades.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Información adicional de sesiones */}
                      <div className="bg-gray-800/30 border border-gray-600/30 rounded-lg p-3">
                        <h5 className="text-gray-400 font-medium text-sm mb-2">Datos del análisis:</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div className="text-center">
                            <div className="text-purple-400 font-bold">{groupRecs.sessionAnalysis.totalSessionsAnalyzed}</div>
                            <div className="text-gray-400">Sesiones</div>
                          </div>
                          <div className="text-center">
                            <div className="text-purple-400 font-bold">{groupRecs.sessionAnalysis.averageSessionsPerPlayer}</div>
                            <div className="text-gray-400">Prom/jugador</div>
                          </div>
                          <div className="text-center">
                            <div className="text-purple-400 font-bold">{groupRecs.coincidencias.length}</div>
                            <div className="text-gray-400">Coincidencias</div>
                          </div>
                          <div className="text-center">
                            <div className="text-purple-400 font-bold">{groupRecs.individuales.length}</div>
                            <div className="text-gray-400">Con déficits</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Vista individual dentro de múltiples participantes */
              <div className="space-y-4">
                {/* Selector de jugador mejorado */}
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2 border-purple-400/30 rounded-xl p-4">
                  <label className="text-purple-400 font-semibold text-base mb-3 flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    Seleccionar jugador:
                  </label>
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="w-full bg-gray-800 border-2 border-purple-400/40 rounded-lg px-4 py-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all"
                  >
                    {participants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Mostrar recomendaciones individuales */}
                {individualRecommendations ? (
                  <div className="space-y-4">
                    {/* Análisis de sesiones del jugador seleccionado */}
                    {(() => {
                      const playerAnalysis = analyzePlayerSessions(selectedPlayerId);
                      const realAnalysis = individualRecommendations;
                      
                      return (
                        <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="bg-purple-500/20 rounded-full p-2">
                              <span className="text-purple-400 text-lg">📊</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-purple-400 text-base">
                                Análisis Real de Datos {realAnalysis.planUsed === 'real' ? '🎯' : '⚠️'}
                              </h4>
                              <p className="text-purple-300 text-sm">
                                Basado en {realAnalysis.totalExercises} ejercicios de {playerAnalysis.totalSessions} sesiones reales
                                {realAnalysis.planUsed === 'real' ? ' con plan personalizado' : ' con valores por defecto'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div className="text-center bg-purple-500/10 rounded-lg p-3">
                              <div className="text-lg font-bold text-purple-400">{playerAnalysis.totalSessions}</div>
                              <div className="text-xs text-purple-300">Sesiones</div>
                            </div>
                            <div className="text-center bg-purple-500/10 rounded-lg p-3">
                              <div className="text-lg font-bold text-purple-400">{realAnalysis.totalExercises}</div>
                              <div className="text-xs text-purple-300">Ejercicios</div>
                            </div>
                            <div className="text-center bg-purple-500/10 rounded-lg p-3">
                              <div className="text-lg font-bold text-purple-400">{Object.keys(realAnalysis.typeStats).length}</div>
                              <div className="text-xs text-purple-300">Tipos</div>
                            </div>
                          </div>
                          
                          {/* Indicador de fuente de datos */}
                          <div className="mt-3 p-2 rounded border">
                            {realAnalysis.totalExercises > 0 ? (
                              <div className={`text-xs ${realAnalysis.planUsed === 'real' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'}`}>
                                {realAnalysis.planUsed === 'real' ? 
                                  '✅ Usando plan de entrenamiento personalizado del jugador' : 
                                  '⚠️ Plan no encontrado, usando valores por defecto'
                                }
                              </div>
                            ) : (
                              <div className="text-xs text-red-400 bg-red-500/10 border-red-500/20">
                                ❌ No se encontraron ejercicios recientes para este jugador
                              </div>
                            )}
                          </div>
                          
                          {playerAnalysis.dateRange && (
                            <div className="mt-3 text-center">
                              <div className="text-xs text-purple-400">
                                Período: {playerAnalysis.dateRange.from} - {playerAnalysis.dateRange.to}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Recomendaciones jerárquicas por tipo (Canasto/Peloteo) */}
                    {(() => {
                      const realAnalysis = individualRecommendations;
                      const typeRecommendations: { [key: string]: any[] } = {};
                      const mainTypes = ['Canasto', 'Peloteo'];
                      
                      realAnalysis.recommendations.forEach((rec: any) => {
                        if (rec.level === 'TIPO' && mainTypes.includes(rec.area)) {
                          if (!typeRecommendations[rec.area]) {
                            typeRecommendations[rec.area] = [];
                          }
                          typeRecommendations[rec.area].push(rec);
                        } else if (rec.parentType && mainTypes.includes(rec.parentType)) {
                          if (!typeRecommendations[rec.parentType]) {
                            typeRecommendations[rec.parentType] = [];
                          }
                          typeRecommendations[rec.parentType].push(rec);
                        }
                      });

                      // Agregar estadísticas de tipos sin recomendaciones para mostrar el estado
                      mainTypes.forEach(tipo => {
                        const typeStats = realAnalysis.typeStats as { [key: string]: { total: number; percentage: number; areas: { [key: string]: { total: number; percentage: number; exercises: { [key: string]: number } } } } };
                        if (!typeRecommendations[tipo] && typeStats && typeStats[tipo]) {
                          const stats = typeStats[tipo];
                          const plannedPercentage = getIdealPercentageForType(tipo, selectedPlayerId);
                          const difference = Math.abs(stats.percentage - plannedPercentage);
                          
                          if (!typeRecommendations[tipo]) {
                            typeRecommendations[tipo] = [];
                          }
                          
                          typeRecommendations[tipo].unshift({
                            level: 'TIPO',
                            type: stats.percentage < plannedPercentage ? 'INCREMENTAR' : 'REDUCIR',
                            area: tipo,
                            currentPercentage: stats.percentage,
                            plannedPercentage: plannedPercentage,
                            difference: difference,
                            priority: difference > 15 ? 'high' : difference > 10 ? 'medium' : 'low',
                            reason: `${stats.percentage < plannedPercentage ? 'Déficit' : 'Exceso'} en tipo ${tipo}: ${stats.percentage}% actual vs ${plannedPercentage}% planificado`,
                            basedOnExercises: stats.total,
                            details: stats,
                            isStatus: difference <= 5
                          });
                        }
                      });

                      return (
                        <div className="space-y-3">
                          {mainTypes.filter(tipo => {
                            const typeStatsTyped = realAnalysis.typeStats as { [key: string]: { total: number; percentage: number; areas: { [key: string]: { total: number; percentage: number; exercises: { [key: string]: number } } } } };
                            const hasStats = typeStatsTyped && typeStatsTyped[tipo] && typeStatsTyped[tipo].total > 0;
                            const hasRecommendations = typeRecommendations[tipo] && typeRecommendations[tipo].length > 0;
                            return hasStats || hasRecommendations;
                          }).map((tipo) => {
                            const recommendations = typeRecommendations[tipo] || [];
                            const typeStatsTyped = realAnalysis.typeStats as { [key: string]: { total: number; percentage: number; areas: { [key: string]: { total: number; percentage: number; exercises: { [key: string]: number } } } } };
                            const typeStats = typeStatsTyped ? typeStatsTyped[tipo] : null;
                            const plannedPercentage = getIdealPercentageForType(tipo, selectedPlayerId);
                            const currentPercentage = typeStats ? typeStats.percentage : 0;
                            const isDeficit = currentPercentage < plannedPercentage;
                            const difference = Math.abs(currentPercentage - plannedPercentage);
                            
                            return (
                              <div key={tipo} className="bg-gray-800/50 border border-gray-600/50 rounded-xl overflow-hidden">
                                {/* Encabezado del tipo */}
                                <div 
                                  className={`cursor-pointer p-4 transition-all duration-300 ${
                                    difference > 5 ? (isDeficit ? 'bg-red-500/20 border-red-500/30' : 'bg-yellow-500/20 border-yellow-500/30') : 'bg-blue-500/20 border-blue-500/30'
                                  } hover:bg-opacity-80`}
                                  onClick={() => {
                                    const newExpanded = new Set(expandedRecommendations);
                                    const typeKey = `type-${tipo}`;
                                    if (newExpanded.has(typeKey as any)) {
                                      newExpanded.delete(typeKey as any);
                                    } else {
                                      newExpanded.add(typeKey as any);
                                    }
                                    setExpandedRecommendations(newExpanded);
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`rounded-full p-3 ${
                                        difference > 5 ? (isDeficit ? 'bg-red-500/30' : 'bg-yellow-500/30') : 'bg-blue-500/30'
                                      }`}>
                                        <span className="text-xl">
                                          {tipo === 'Canasto' ? '🧺' : '🎾'}
                                          {difference > 5 ? (isDeficit ? '📈' : '📉') : '✅'}
                                        </span>
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className={`font-bold text-xl ${
                                            difference > 5 ? (isDeficit ? 'text-red-300' : 'text-yellow-300') : 'text-blue-300'
                                          }`}>
                                            {tipo}
                                          </span>
                                          <span className="text-xs px-2 py-1 bg-gray-600/50 text-gray-300 rounded font-medium">
                                            {typeStats ? typeStats.total : 0} ejercicios
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                          <span className="text-sm text-gray-300">
                                            Actual: <strong className={difference > 5 ? (isDeficit ? 'text-red-400' : 'text-yellow-400') : 'text-blue-400'}>{currentPercentage}%</strong>
                                          </span>
                                          <span className="text-sm text-gray-300">
                                            Meta: <strong>{plannedPercentage}%</strong>
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {difference > 5 && (
                                        <span className={`text-xl font-bold ${isDeficit ? 'text-red-400' : 'text-yellow-400'}`}>
                                          {isDeficit ? '+' : '-'}{difference.toFixed(1)}%
                                        </span>
                                      )}
                                      <svg 
                                        className={`w-5 h-5 transition-transform ${
                                          expandedRecommendations.has(`type-${tipo}` as any) ? 'rotate-180' : ''
                                        } ${difference > 5 ? (isDeficit ? 'text-red-300' : 'text-yellow-300') : 'text-blue-300'}`}
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        strokeWidth={2} 
                                        stroke="currentColor"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>

                                {/* Contenido expandible del tipo */}
                                {expandedRecommendations.has(`type-${tipo}` as any) && (
                                  <div className="p-4 bg-gray-900/30 border-t border-gray-600/30">
                                    {/* Recomendación principal del tipo */}
                                    {recommendations.filter(rec => rec.level === 'TIPO').map((rec: any, index: number) => (
                                      <div key={`tipo-${index}`} className={`mb-4 p-3 rounded-lg border ${
                                        rec.isStatus ? 'bg-blue-500/10 border-blue-500/20' :
                                        rec.type === 'INCREMENTAR' ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20'
                                      }`}>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg">🎯</span>
                                            <span className={`font-semibold ${
                                              rec.isStatus ? 'text-blue-400' :
                                              rec.type === 'INCREMENTAR' ? 'text-red-400' : 'text-yellow-400'
                                            }`}>
                                              {rec.isStatus ? 'Estado Óptimo' : 
                                               rec.type === 'INCREMENTAR' ? 'INCREMENTAR' : 'REDUCIR'} {tipo}
                                            </span>
                                          </div>
                                          {!rec.isStatus && (
                                            <span className={`font-bold ${rec.type === 'INCREMENTAR' ? 'text-red-400' : 'text-yellow-400'}`}>
                                              {rec.type === 'INCREMENTAR' ? '+' : '-'}{rec.difference.toFixed(1)}%
                                            </span>
                                          )}
                                        </div>
                                        <p className={`text-sm mt-1 ${
                                          rec.isStatus ? 'text-blue-300' :
                                          rec.type === 'INCREMENTAR' ? 'text-red-300' : 'text-yellow-300'
                                        }`}>
                                          {rec.reason}
                                        </p>
                                      </div>
                                    ))}

                                    {/* Áreas organizadas verticalmente - TODAS las áreas */}
                                    {(() => {
                                      // Definir todas las áreas reales de la base de datos para cada tipo
                                      const allAreas = {
                                        'Canasto': ['Juego de base', 'Juego de red', 'Primeras pelotas'],
                                        'Peloteo': ['Juego de base', 'Juego de red', 'Puntos', 'Primeras pelotas']
                                      };
                                      
                                      const areasForType = allAreas[tipo as keyof typeof allAreas] || [];
                                      
                                      return areasForType.length > 0 ? (
                                        <div className="mb-4">
                                          <h5 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                                            <span>📍</span> Áreas de {tipo}
                                          </h5>
                                          <div className="space-y-2">
                                            {areasForType.map((area) => {
                                              // Buscar estadísticas del área
                                              const areaStats = typeStats?.areas?.[area];
                                              const currentPercentage = areaStats?.percentage || 0;
                                              const totalExercises = areaStats?.total || 0;
                                              const plannedPercentage = getIdealPercentageForAreaInType(area, tipo, selectedPlayerId);
                                              const difference = Math.abs(currentPercentage - plannedPercentage);
                                              const isDeficit = currentPercentage < plannedPercentage;
                                              
                                              // Determinar estado y colores
                                              let bgColor, borderColor, textColor, statusText, statusIcon;
                                              
                                              if (totalExercises === 0) {
                                                // Sin datos - usar mismo diseño que incrementar
                                                bgColor = 'bg-red-500/10';
                                                borderColor = 'border-red-500/30';
                                                textColor = 'text-red-400';
                                                statusText = 'Incrementar';
                                                statusIcon = '📈';
                                              } else if (difference <= 5) {
                                                // Óptimo
                                                bgColor = 'bg-blue-500/10';
                                                borderColor = 'border-blue-500/30';
                                                textColor = 'text-blue-400';
                                                statusText = 'Óptimo';
                                                statusIcon = '✅';
                                              } else if (isDeficit) {
                                                // Déficit - necesita incrementar
                                                bgColor = 'bg-red-500/10';
                                                borderColor = 'border-red-500/30';
                                                textColor = 'text-red-400';
                                                statusText = 'Incrementar';
                                                statusIcon = '📈';
                                              } else {
                                                // Exceso - necesita reducir - cambio de verde a amarillo
                                                bgColor = 'bg-yellow-500/10';
                                                borderColor = 'border-yellow-500/30';
                                                textColor = 'text-yellow-400';
                                                statusText = 'Reducir';
                                                statusIcon = '📉';
                                              }
                                              
                                              return (
                                                <div key={area} className={`p-3 rounded-lg border ${bgColor} ${borderColor}`}>
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                      <span className="text-lg">{statusIcon}</span>
                                                      <div>
                                                        <div className="flex items-center gap-2">
                                                          <span className={`font-medium ${textColor}`}>{area}</span>
                                                          {totalExercises > 0 && (
                                                            <span className="text-xs px-2 py-1 bg-gray-600/50 text-gray-300 rounded">
                                                              {totalExercises} ejercicios
                                                            </span>
                                                          )}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1">
                                                          <span className="text-xs text-gray-400">
                                                            Actual: <span className={textColor}>{currentPercentage}%</span>
                                                          </span>
                                                          <span className="text-xs text-gray-400">
                                                            Meta: <span className="text-gray-300">{plannedPercentage}%</span>
                                                          </span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <div className="text-right">
                                                      <div className={`text-sm font-semibold ${textColor}`}>
                                                        {statusText}
                                                      </div>
                                                      {difference > 5 && totalExercises > 0 && (
                                                        <div className={`text-xs ${textColor}`}>
                                                          {isDeficit ? '+' : '-'}{difference.toFixed(1)}%
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                  
                                                  {/* Mostrar ejercicios específicos si existen */}
                                                  {areaStats && Object.keys(areaStats.exercises).length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-gray-600/30">
                                                      <div className="text-xs text-gray-400 mb-1">Ejercicios:</div>
                                                      <div className="flex flex-wrap gap-1">
                                                        {Object.entries(areaStats.exercises).map(([ejercicio, repeticiones]) => (
                                                          <span key={ejercicio} className="text-xs px-2 py-1 bg-gray-700/50 text-gray-300 rounded">
                                                            {ejercicio} ({repeticiones})
                                                          </span>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      ) : null;
                                    })()}

                                    {/* Recomendaciones por ejercicios */}
                                    {(() => {
                                      const exerciseRecs = recommendations.filter(rec => rec.level === 'EJERCICIO');
                                      return exerciseRecs.length > 0 ? (
                                        <div>
                                          <h5 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                                            <span>🔧</span> Recomendaciones por Ejercicios
                                          </h5>
                                          <div className="space-y-2">
                                            {exerciseRecs.slice(0, 3).map((rec: any, index: number) => (
                                              <div key={`exercise-${index}`} className={`p-2 rounded border ${
                                                rec.type === 'INCREMENTAR' ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20'
                                              }`}>
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                    <span>🔧</span>
                                                    <span className={`text-sm font-medium ${rec.type === 'INCREMENTAR' ? 'text-red-400' : 'text-yellow-400'}`}>
                                                      {rec.area}
                                                    </span>
                                                    {rec.parentArea && (
                                                      <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                                                        {rec.parentArea}
                                                      </span>
                                                    )}
                                                  </div>
                                                  <span className={`text-sm font-bold ${rec.type === 'INCREMENTAR' ? 'text-red-400' : 'text-yellow-400'}`}>
                                                    {rec.basedOnExercises} veces
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                            {exerciseRecs.length > 3 && (
                                              <div className="text-center text-xs text-gray-400 py-2">
                                                +{exerciseRecs.length - 3} ejercicios más...
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : null;
                                    })()}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-gray-800/30 to-gray-700/30 border-2 border-gray-600/40 rounded-xl p-6 text-center">
                    <div className="bg-gray-600/30 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <span className="text-gray-400 text-2xl">📊</span>
                    </div>
                    <p className="text-gray-400 font-semibold text-base mb-2">Sin datos de entrenamientos</p>
                    <p className="text-gray-500 text-sm">
                      No se encontraron ejercicios en las sesiones recientes para este jugador
                    </p>
                  </div>
                )}
              </div>
            )
          ) : (
            /* Vista individual para un solo participante */
            <div className="space-y-4">
              {individualRecommendations ? (
                <div className="space-y-4">
                  {/* Análisis del único jugador */}
                  {(() => {
                    const playerAnalysis = analyzePlayerSessions(selectedPlayerId);
                    const realAnalysis = individualRecommendations;
                    
                    return (
                      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-purple-500/20 rounded-full p-2">
                            <span className="text-purple-400 text-lg">📊</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-purple-400 text-base">
                              Análisis Real de Datos {realAnalysis.planUsed === 'real' ? '🎯' : '⚠️'}
                            </h4>
                            <p className="text-purple-300 text-sm">
                              Basado en {realAnalysis.totalExercises} ejercicios de {playerAnalysis.totalSessions} sesiones reales
                              {realAnalysis.planUsed === 'real' ? ' con plan personalizado' : ' con valores por defecto'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center bg-purple-500/10 rounded-lg p-3">
                            <div className="text-lg font-bold text-purple-400">{playerAnalysis.totalSessions}</div>
                            <div className="text-xs text-purple-300">Sesiones</div>
                          </div>
                          <div className="text-center bg-purple-500/10 rounded-lg p-3">
                            <div className="text-lg font-bold text-purple-400">{realAnalysis.totalExercises}</div>
                            <div className="text-xs text-purple-300">Ejercicios</div>
                          </div>
                          <div className="text-center bg-purple-500/10 rounded-lg p-3">
                            <div className="text-lg font-bold text-purple-400">{Object.keys(realAnalysis.typeStats).length}</div>
                            <div className="text-xs text-purple-300">Tipos</div>
                          </div>
                        </div>
                        
                        {/* Indicador de fuente de datos */}
                        <div className="mt-3 p-2 rounded border">
                          {realAnalysis.totalExercises > 0 ? (
                            <div className={`text-xs ${realAnalysis.planUsed === 'real' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'}`}>
                              {realAnalysis.planUsed === 'real' ? 
                                '✅ Usando plan de entrenamiento personalizado del jugador' : 
                                '⚠️ Plan no encontrado, usando valores por defecto'
                              }
                            </div>
                          ) : (
                            <div className="text-xs text-red-400 bg-red-500/10 border-red-500/20">
                              ❌ No se encontraron ejercicios recientes para este jugador
                            </div>
                          )}
                        </div>
                        
                        {playerAnalysis.dateRange && (
                          <div className="mt-3 text-center">
                            <div className="text-xs text-purple-400">
                              Período: {playerAnalysis.dateRange.from} - {playerAnalysis.dateRange.to}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Recomendaciones del único jugador - misma lógica que antes */}
                  {(() => {
                    const realAnalysis = individualRecommendations;
                    const typeRecommendations: { [key: string]: any[] } = {};
                    const mainTypes = ['Canasto', 'Peloteo'];
                    
                    realAnalysis.recommendations.forEach((rec: any) => {
                      if (rec.level === 'TIPO' && mainTypes.includes(rec.area)) {
                        if (!typeRecommendations[rec.area]) {
                          typeRecommendations[rec.area] = [];
                        }
                        typeRecommendations[rec.area].push(rec);
                      } else if (rec.parentType && mainTypes.includes(rec.parentType)) {
                        if (!typeRecommendations[rec.parentType]) {
                          typeRecommendations[rec.parentType] = [];
                        }
                        typeRecommendations[rec.parentType].push(rec);
                      }
                    });

                    // Agregar estadísticas de tipos sin recomendaciones
                    mainTypes.forEach(tipo => {
                      const typeStats = realAnalysis.typeStats as { [key: string]: { total: number; percentage: number; areas: { [key: string]: { total: number; percentage: number; exercises: { [key: string]: number } } } } };
                      if (!typeRecommendations[tipo] && typeStats && typeStats[tipo]) {
                        const stats = typeStats[tipo];
                        const plannedPercentage = getIdealPercentageForType(tipo, selectedPlayerId);
                        const difference = Math.abs(stats.percentage - plannedPercentage);
                        
                        if (!typeRecommendations[tipo]) {
                          typeRecommendations[tipo] = [];
                        }
                        
                        typeRecommendations[tipo].unshift({
                          level: 'TIPO',
                          type: stats.percentage < plannedPercentage ? 'INCREMENTAR' : 'REDUCIR',
                          area: tipo,
                          currentPercentage: stats.percentage,
                          plannedPercentage: plannedPercentage,
                          difference: difference,
                          priority: difference > 15 ? 'high' : difference > 10 ? 'medium' : 'low',
                          reason: `${stats.percentage < plannedPercentage ? 'Déficit' : 'Exceso'} en tipo ${tipo}: ${stats.percentage}% actual vs ${plannedPercentage}% planificado`,
                          basedOnExercises: stats.total,
                          details: stats,
                          isStatus: difference <= 5
                        });
                      }
                    });

                    return (
                      <div className="space-y-3">
                        {mainTypes.filter(tipo => {
                          const typeStatsTyped = realAnalysis.typeStats as { [key: string]: { total: number; percentage: number; areas: { [key: string]: { total: number; percentage: number; exercises: { [key: string]: number } } } } };
                          const hasStats = typeStatsTyped && typeStatsTyped[tipo] && typeStatsTyped[tipo].total > 0;
                          const hasRecommendations = typeRecommendations[tipo] && typeRecommendations[tipo].length > 0;
                          return hasStats || hasRecommendations;
                        }).map((tipo) => {
                          const recommendations = typeRecommendations[tipo] || [];
                          const typeStatsTyped = realAnalysis.typeStats as { [key: string]: { total: number; percentage: number; areas: { [key: string]: { total: number; percentage: number; exercises: { [key: string]: number } } } } };
                          const typeStats = typeStatsTyped ? typeStatsTyped[tipo] : null;
                          const plannedPercentage = getIdealPercentageForType(tipo, selectedPlayerId);
                          const currentPercentage = typeStats ? typeStats.percentage : 0;
                          const isDeficit = currentPercentage < plannedPercentage;
                          const difference = Math.abs(currentPercentage - plannedPercentage);
                          
                          return (
                            <div key={tipo} className="bg-gray-800/50 border border-gray-600/50 rounded-xl overflow-hidden">
                              <div 
                                className={`cursor-pointer p-4 transition-all duration-300 ${
                                  difference > 5 ? (isDeficit ? 'bg-red-500/20 border-red-500/30' : 'bg-yellow-500/20 border-yellow-500/30') : 'bg-blue-500/20 border-blue-500/30'
                                } hover:bg-opacity-80`}
                                onClick={() => {
                                  const newExpanded = new Set(expandedRecommendations);
                                  const typeKey = `type-${tipo}`;
                                  if (newExpanded.has(typeKey as any)) {
                                    newExpanded.delete(typeKey as any);
                                  } else {
                                    newExpanded.add(typeKey as any);
                                  }
                                  setExpandedRecommendations(newExpanded);
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className={`rounded-full p-3 ${
                                      difference > 5 ? (isDeficit ? 'bg-red-500/30' : 'bg-yellow-500/30') : 'bg-blue-500/30'
                                    }`}>
                                      <span className="text-xl">
                                        {tipo === 'Canasto' ? '🧺' : '🎾'}
                                        {difference > 5 ? (isDeficit ? '📈' : '📉') : '✅'}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`font-bold text-xl ${
                                          difference > 5 ? (isDeficit ? 'text-red-300' : 'text-yellow-300') : 'text-blue-300'
                                        }`}>
                                          {tipo}
                                        </span>
                                        <span className="text-xs px-2 py-1 bg-gray-600/50 text-gray-300 rounded font-medium">
                                          {typeStats ? typeStats.total : 0} ejercicios
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 mt-1">
                                        <span className="text-sm text-gray-300">
                                          Actual: <strong className={difference > 5 ? (isDeficit ? 'text-red-400' : 'text-yellow-400') : 'text-blue-400'}>{currentPercentage}%</strong>
                                        </span>
                                        <span className="text-sm text-gray-300">
                                          Meta: <strong>{plannedPercentage}%</strong>
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {difference > 5 && (
                                      <span className={`text-xl font-bold ${isDeficit ? 'text-red-400' : 'text-yellow-400'}`}>
                                        {isDeficit ? '+' : '-'}{difference.toFixed(1)}%
                                      </span>
                                    )}
                                    <svg 
                                      className={`w-5 h-5 transition-transform ${
                                        expandedRecommendations.has(`type-${tipo}` as any) ? 'rotate-180' : ''
                                      } ${difference > 5 ? (isDeficit ? 'text-red-300' : 'text-yellow-300') : 'text-blue-300'}`}
                                      fill="none" 
                                      viewBox="0 0 24 24" 
                                      strokeWidth={2} 
                                      stroke="currentColor"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </div>
                              </div>

                              {expandedRecommendations.has(`type-${tipo}` as any) && (
                                <div className="p-4 bg-gray-900/30 border-t border-gray-600/30">
                                  {recommendations.filter(rec => rec.level === 'TIPO').map((rec: any, index: number) => (
                                    <div key={`tipo-${index}`} className={`mb-4 p-3 rounded-lg border ${
                                      rec.isStatus ? 'bg-blue-500/10 border-blue-500/20' :
                                      rec.type === 'INCREMENTAR' ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20'
                                    }`}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg">🎯</span>
                                          <span className={`font-semibold ${
                                            rec.isStatus ? 'text-blue-400' :
                                            rec.type === 'INCREMENTAR' ? 'text-red-400' : 'text-yellow-400'
                                          }`}>
                                            {rec.isStatus ? 'Estado Óptimo' : 
                                             rec.type === 'INCREMENTAR' ? 'INCREMENTAR' : 'REDUCIR'} {tipo}
                                          </span>
                                        </div>
                                        {!rec.isStatus && (
                                          <span className={`font-bold ${rec.type === 'INCREMENTAR' ? 'text-red-400' : 'text-yellow-400'}`}>
                                            {rec.type === 'INCREMENTAR' ? '+' : '-'}{rec.difference.toFixed(1)}%
                                          </span>
                                        )}
                                      </div>
                                      <p className={`text-sm mt-1 ${
                                        rec.isStatus ? 'text-blue-300' :
                                        rec.type === 'INCREMENTAR' ? 'text-red-300' : 'text-yellow-300'
                                      }`}>
                                        {rec.reason}
                                      </p>
                                    </div>
                                  ))}

                                  {/* Áreas organizadas verticalmente - TODAS las áreas */}
                                  {(() => {
                                    // Definir todas las áreas reales de la base de datos para cada tipo
                                    const allAreas = {
                                      'Canasto': ['Juego de base', 'Juego de red', 'Primeras pelotas'],
                                      'Peloteo': ['Juego de base', 'Juego de red', 'Puntos', 'Primeras pelotas']
                                    };
                                    
                                    const areasForType = allAreas[tipo as keyof typeof allAreas] || [];
                                    
                                    return areasForType.length > 0 ? (
                                      <div className="mb-4">
                                        <h5 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                                          <span>📍</span> Áreas de {tipo}
                                        </h5>
                                        <div className="space-y-2">
                                          {areasForType.map((area) => {
                                            // Buscar estadísticas del área
                                            const areaStats = typeStats?.areas?.[area];
                                            const currentPercentage = areaStats?.percentage || 0;
                                            const totalExercises = areaStats?.total || 0;
                                            const plannedPercentage = getIdealPercentageForAreaInType(area, tipo, selectedPlayerId);
                                            const difference = Math.abs(currentPercentage - plannedPercentage);
                                            const isDeficit = currentPercentage < plannedPercentage;
                                            
                                            // Determinar estado y colores
                                            let bgColor, borderColor, textColor, statusText, statusIcon;
                                            
                                            if (totalExercises === 0) {
                                              // Sin datos - usar mismo diseño que incrementar
                                              bgColor = 'bg-red-500/10';
                                              borderColor = 'border-red-500/30';
                                              textColor = 'text-red-400';
                                              statusText = 'Incrementar';
                                              statusIcon = '📈';
                                            } else if (difference <= 5) {
                                              // Óptimo
                                              bgColor = 'bg-blue-500/10';
                                              borderColor = 'border-blue-500/30';
                                              textColor = 'text-blue-400';
                                              statusText = 'Óptimo';
                                              statusIcon = '✅';
                                            } else if (isDeficit) {
                                              // Déficit - necesita incrementar
                                              bgColor = 'bg-red-500/10';
                                              borderColor = 'border-red-500/30';
                                              textColor = 'text-red-400';
                                              statusText = 'Incrementar';
                                              statusIcon = '📈';
                                            } else {
                                              // Exceso - necesita reducir - cambio de verde a amarillo
                                              bgColor = 'bg-yellow-500/10';
                                              borderColor = 'border-yellow-500/30';
                                              textColor = 'text-yellow-400';
                                              statusText = 'Reducir';
                                              statusIcon = '📉';
                                            }
                                            
                                            return (
                                              <div key={area} className={`p-3 rounded-lg border ${bgColor} ${borderColor}`}>
                                                <div className="flex items-center justify-between">
                                                  <div className="flex items-center gap-3">
                                                    <span className="text-lg">{statusIcon}</span>
                                                    <div>
                                                      <div className="flex items-center gap-2">
                                                        <span className={`font-medium ${textColor}`}>{area}</span>
                                                        {totalExercises > 0 && (
                                                          <span className="text-xs px-2 py-1 bg-gray-600/50 text-gray-300 rounded">
                                                            {totalExercises} ejercicios
                                                          </span>
                                                        )}
                                                      </div>
                                                      <div className="flex items-center gap-3 mt-1">
                                                        <span className="text-xs text-gray-400">
                                                          Actual: <span className={textColor}>{currentPercentage}%</span>
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                          Meta: <span className="text-gray-300">{plannedPercentage}%</span>
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="text-right">
                                                    <div className={`text-sm font-semibold ${textColor}`}>
                                                      {statusText}
                                                    </div>
                                                    {difference > 5 && totalExercises > 0 && (
                                                      <div className={`text-xs ${textColor}`}>
                                                        {isDeficit ? '+' : '-'}{difference.toFixed(1)}%
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                                
                                                {/* Mostrar ejercicios específicos si existen */}
                                                {areaStats && Object.keys(areaStats.exercises).length > 0 && (
                                                  <div className="mt-2 pt-2 border-t border-gray-600/30">
                                                    <div className="text-xs text-gray-400 mb-1">Ejercicios:</div>
                                                    <div className="flex flex-wrap gap-1">
                                                      {Object.entries(areaStats.exercises).map(([ejercicio, repeticiones]) => (
                                                        <span key={ejercicio} className="text-xs px-2 py-1 bg-gray-700/50 text-gray-300 rounded">
                                                          {ejercicio} ({repeticiones})
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    ) : null;
                                  })()}

                                  {/* Recomendaciones por ejercicios */}
                                  {(() => {
                                    const exerciseRecs = recommendations.filter(rec => rec.level === 'EJERCICIO');
                                    return exerciseRecs.length > 0 ? (
                                      <div>
                                        <h5 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                                          <span>🔧</span> Recomendaciones por Ejercicios
                                        </h5>
                                        <div className="space-y-2">
                                          {exerciseRecs.slice(0, 3).map((rec: any, index: number) => (
                                            <div key={`exercise-${index}`} className={`p-2 rounded border ${
                                              rec.type === 'INCREMENTAR' ? 'bg-red-500/10 border-red-500/20' : 'bg-yellow-500/10 border-yellow-500/20'
                                            }`}>
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <span>🔧</span>
                                                  <span className={`text-sm font-medium ${rec.type === 'INCREMENTAR' ? 'text-red-400' : 'text-yellow-400'}`}>
                                                    {rec.area}
                                                  </span>
                                                  {rec.parentArea && (
                                                    <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                                                      {rec.parentArea}
                                                    </span>
                                                  )}
                                                </div>
                                                <span className={`text-sm font-bold ${rec.type === 'INCREMENTAR' ? 'text-red-400' : 'text-yellow-400'}`}>
                                                  {rec.basedOnExercises} veces
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                          {exerciseRecs.length > 3 && (
                                            <div className="text-center text-xs text-gray-400 py-2">
                                              +{exerciseRecs.length - 3} ejercicios más...
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-2 border-red-400/40 rounded-xl p-6 text-center">
                  <div className="bg-red-600/30 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-red-400 text-2xl">❌</span>
                  </div>
                  <p className="text-red-400 font-semibold text-base mb-2">Sin datos de entrenamientos</p>
                  <p className="text-red-300 text-sm mb-4">
                    No se encontraron ejercicios en las sesiones de los últimos 30 días para este jugador
                  </p>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-left">
                    <p className="text-red-300 text-xs">
                      💡 <strong>Posibles causas:</strong><br/>
                      • El jugador no tiene sesiones registradas recientemente<br/>
                      • Las sesiones no tienen ejercicios cargados<br/>
                      • Los ejercicios están fuera del período de 30 días<br/>
                      • Error en la carga de datos desde Firebase
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActiveSessionRecommendations;
