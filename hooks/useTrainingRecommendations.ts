// hooks/useTrainingRecommendations.ts
import { useState, useEffect, useMemo } from 'react';
import { Player, TrainingSession } from '../types';
import { getPlayerSurveys } from '../Database/FirebaseSurveys';
import { getTrainingPlan, TrainingPlan } from '../Database/FirebaseTrainingPlans';
import { EXERCISE_HIERARCHY } from '../constants';

// Tipo flexible para sesiones que puede manejar ambas estructuras
type FlexibleSession = TrainingSession | {
  id: string;
  date: string;
  participants: Array<{ playerId: string }>;
  exercises?: any[];
  [key: string]: any;
};

interface RecommendationItem {
  category: string;
  subcategory?: string;
  exercise?: string;
  currentPercentage: number;
  plannedPercentage: number;
  difference: number;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
}

interface TrainingRecommendations {
  isNewPlayer: boolean;
  hasActivePlan: boolean;
  hasSessions: boolean;
  recommendations: RecommendationItem[];
  summary: string;
  loading: boolean;
  error: string | null;
}

interface UseTrainingRecommendationsProps {
  players: Player[];
  sessions: FlexibleSession[];
  academiaId: string;
  analysisWindowDays?: number; // Por defecto 7 días
}

export const useTrainingRecommendations = ({
  players,
  sessions,
  academiaId,
  analysisWindowDays = 7
}: UseTrainingRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<Record<string, TrainingRecommendations>>({});
  const [loading, setLoading] = useState(false);

  // Función para calcular recomendaciones para un jugador específico
  const getRecommendationsForPlayer = async (playerId: string): Promise<TrainingRecommendations> => {
    console.log('🔍 Analizando recomendaciones para jugador:', playerId);
    console.log('📊 Total de sesiones disponibles:', sessions.length);
    
    const player = players.find(p => p.id === playerId);
    
    if (!player) {
      console.log('❌ Jugador no encontrado:', playerId);
      const notFoundResult = {
        isNewPlayer: true,
        hasActivePlan: false,
        hasSessions: false,
        recommendations: [],
        summary: 'Jugador no encontrado',
        loading: false,
        error: 'Jugador no encontrado'
      };
      
      // GUARDAR en el estado inmediatamente
      setRecommendations(prev => ({
        ...prev,
        [playerId]: notFoundResult
      }));
      
      return notFoundResult;
    }

    console.log('✅ Jugador encontrado:', player.name);

    try {
      // 1. Verificar si el jugador tiene un plan de entrenamiento activo
      let trainingPlan = await getTrainingPlan(academiaId, playerId);
      let hasActivePlan = trainingPlan !== null;
      let adaptedPlan = false;
      
      // Si no tiene plan, intentar adaptar usando el plan de otro jugador de la sesión
      if (!hasActivePlan && players.length > 1) {
        console.log('🔄 Jugador sin plan, intentando adaptar de otros jugadores...');
        
        for (const otherPlayer of players) {
          if (otherPlayer.id !== playerId) {
            const otherPlan = await getTrainingPlan(academiaId, otherPlayer.id);
            if (otherPlan) {
              console.log(`✅ Adaptando plan de ${otherPlayer.name} para ${player.name}`);
              trainingPlan = otherPlan;
              hasActivePlan = true;
              adaptedPlan = true;
              break;
            }
          }
        }
      }
      
      console.log('📋 Plan de entrenamiento:', hasActivePlan ? (adaptedPlan ? 'ADAPTADO' : 'PROPIO') : 'NO');

      // 2. Obtener sesiones del jugador en la ventana de análisis
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - analysisWindowDays);
      
      console.log('🔍 Filtrando sesiones para jugador:', playerId);
      console.log('📅 Fecha límite:', cutoffDate);
      console.log('📊 Estructura de primera sesión:', sessions[0]);
      
      // Filtrar sesiones - manejar tanto estructura nueva como vieja
      const recentSessions = sessions.filter(session => {
        const sessionAny = session as any;
        
        // Estructura vieja: session.jugadorId directo (ESTA ES LA CORRECTA)
        if (sessionAny.jugadorId === playerId) {
          const sessionDate = new Date(sessionAny.fecha);
          const isRecent = sessionDate >= cutoffDate;
          console.log(`📝 Sesión ${session.id}: jugador=${sessionAny.jugadorId === playerId}, fecha=${sessionDate.toLocaleDateString()}, reciente=${isRecent}`);
          return isRecent;
        }
        
        // Estructura nueva: session.participants es array con objetos {playerId: string}
        if (sessionAny.participants && Array.isArray(sessionAny.participants)) {
          const hasPlayer = sessionAny.participants.some((p: any) => p.playerId === playerId);
          const sessionDate = new Date(sessionAny.date);
          const isRecent = sessionDate >= cutoffDate;
          console.log(`📝 Sesión ${session.id}: jugador=${hasPlayer}, fecha=${sessionDate.toLocaleDateString()}, reciente=${isRecent}`);
          return hasPlayer && isRecent;
        }
        
        return false;
      });

      const hasSessions = recentSessions.length > 0;
      console.log('🏃 Sesiones recientes encontradas:', recentSessions.length);

      // 3. Si es jugador nuevo (sin plan o sin sesiones), retornar indicación básica
      if (!hasActivePlan || !hasSessions) {
        console.log('⚠️ Retornando estado básico:', { hasActivePlan, hasSessions });
        const basicResult = {
          isNewPlayer: !hasSessions,
          hasActivePlan,
          hasSessions,
          recommendations: [],
          summary: !hasActivePlan 
            ? 'El jugador no tiene un plan de entrenamiento definido. Se recomienda crear uno antes de comenzar.'
            : 'Jugador nuevo o sin entrenamientos recientes. Comenzar con evaluación inicial.',
          loading: false,
          error: null
        };
        
        // GUARDAR en el estado inmediatamente
        setRecommendations(prev => ({
          ...prev,
          [playerId]: basicResult
        }));
        
        return basicResult;
      }

      console.log('✅ Generando recomendaciones...');

      // 4. Calcular estadísticas actuales basadas en las sesiones de entrenamiento
      console.log('📊 Calculando estadísticas actuales...');
      const actualStats = calculateActualTrainingStats(recentSessions as any[]);
      console.log('📊 Estadísticas actuales:', actualStats);
      
      // 5. Comparar con el plan y generar recomendaciones (trainingPlan ya no puede ser null aquí)
      console.log('🔄 Comparando con plan de entrenamiento...');
      console.log('📋 Plan a usar:', trainingPlan);
      const recommendations = generateRecommendations(trainingPlan!, actualStats);
      console.log('💡 Recomendaciones generadas:', recommendations);

      const result = {
        isNewPlayer: false,
        hasActivePlan,
        hasSessions,
        recommendations,
        summary: generateSummary(recommendations, adaptedPlan),
        loading: false,
        error: null
      };

      console.log('✅ Resultado final:', { 
        recommendationsCount: result.recommendations.length,
        summary: result.summary 
      });
      
      // GUARDAR en el estado inmediatamente
      setRecommendations(prev => ({
        ...prev,
        [playerId]: result
      }));
      
      return result;

    } catch (error) {
      console.error('Error generando recomendaciones:', error);
      const errorResult = {
        isNewPlayer: false,
        hasActivePlan: false,
        hasSessions: false,
        recommendations: [],
        summary: 'Error al generar recomendaciones',
        loading: false,
        error: 'Error al analizar el historial de entrenamientos'
      };
      
      // GUARDAR en el estado inmediatamente
      setRecommendations(prev => ({
        ...prev,
        [playerId]: errorResult
      }));
      
      return errorResult;
    }
  };

  // Función para calcular estadísticas actuales basadas en sesiones de entrenamiento
  const calculateActualTrainingStats = (sessions: any[]) => {
    console.log('📈 Calculando estadísticas de', sessions.length, 'sesiones');
    const stats: Record<string, { totalTime: number, count: number }> = {};
    let totalSessionTime = 0;
    
    sessions.forEach((session, sessionIndex) => {
      // Manejar tanto estructura nueva como vieja
      let exercises: any[] = [];
      
      if (session.ejercicios && Array.isArray(session.ejercicios)) {
        // Estructura vieja: session.ejercicios
        exercises = session.ejercicios;
      } else if (session.exercises && Array.isArray(session.exercises)) {
        // Estructura nueva: session.exercises
        exercises = session.exercises;
      }
      
      if (!exercises || exercises.length === 0) {
        console.log('⚠️ Sesión sin ejercicios válidos');
        return;
      }
      
      exercises.forEach((ejercicio: any) => {
        const type = ejercicio.tipo;
        const area = ejercicio.area;
        const exercise = ejercicio.ejercicio;
        
        // Convertir tiempo a minutos (asumiendo formato "XX minutos" o número)
        const timeInMinutes = parseTimeToMinutes(ejercicio.tiempoCantidad);
        totalSessionTime += timeInMinutes;

        // Estadísticas por tipo
        const typeKey = `tipo.${type}`;
        if (!stats[typeKey]) stats[typeKey] = { totalTime: 0, count: 0 };
        stats[typeKey].totalTime += timeInMinutes;
        stats[typeKey].count += 1;

        // Estadísticas por área
        const areaKey = `area.${area}`;
        if (!stats[areaKey]) stats[areaKey] = { totalTime: 0, count: 0 };
        stats[areaKey].totalTime += timeInMinutes;
        stats[areaKey].count += 1;

        // Estadísticas por ejercicio específico
        const exerciseKey = `ejercicio.${area}.${exercise}`;
        if (!stats[exerciseKey]) stats[exerciseKey] = { totalTime: 0, count: 0 };
        stats[exerciseKey].totalTime += timeInMinutes;
        stats[exerciseKey].count += 1;
      });
    });

    // Convertir a porcentajes basados en el tiempo total
    const percentages: Record<string, number> = {};
    if (totalSessionTime > 0) {
      Object.entries(stats).forEach(([key, value]) => {
        percentages[key] = (value.totalTime / totalSessionTime) * 100;
      });
    }

    console.log('📊 Tiempo total:', totalSessionTime, 'min, Categorías:', Object.keys(percentages).length);
    return percentages;
  };

  // Función auxiliar para convertir tiempo a minutos
  const parseTimeToMinutes = (timeString: string): number => {
    if (typeof timeString === 'number') {
      return timeString;
    }
    
    const str = timeString.toLowerCase().trim();
    
    // Buscar números en el string
    const numberMatch = str.match(/(\d+(?:\.\d+)?)/);
    if (!numberMatch) return 0;
    
    const number = parseFloat(numberMatch[1]);
    
    // Detectar unidad
    if (str.includes('hora') || str.includes('hr')) {
      return number * 60;
    } else if (str.includes('minuto') || str.includes('min') || !str.includes('seg')) {
      return number;
    } else if (str.includes('segundo') || str.includes('seg')) {
      return number / 60;
    }
    
    // Por defecto asumir minutos
    return number;
  };

  // Función para generar recomendaciones comparando plan vs realidad
  const generateRecommendations = (
    plan: TrainingPlan, 
    actualStats: Record<string, number>
  ): RecommendationItem[] => {
    const recommendations: RecommendationItem[] = [];

    // Convertir la estructura de planificación a porcentajes planos para comparación
    const plannedStats = convertPlanToPercentages(plan);

    // Comparar estadísticas actuales vs planificadas
    Object.entries(plannedStats).forEach(([key, plannedPercentage]) => {
      const currentPercentage = actualStats[key] || 0;
      const difference = plannedPercentage - currentPercentage;
      
      if (Math.abs(difference) > 5) { // Solo si la diferencia es significativa
        const [category, subcategory, exercise] = key.split('.');
        
        recommendations.push({
          category: category === 'tipo' ? 'Tipo' : category === 'area' ? 'Área' : 'Ejercicio',
          subcategory: subcategory,
          exercise: exercise,
          currentPercentage: Math.round(currentPercentage * 10) / 10,
          plannedPercentage: Math.round(plannedPercentage * 10) / 10,
          difference: Math.round(difference * 10) / 10,
          priority: Math.abs(difference) > 15 ? 'high' : Math.abs(difference) > 10 ? 'medium' : 'low',
          recommendation: difference > 0 
            ? `Incrementar ${subcategory}${exercise ? ` (${exercise})` : ''} en aproximadamente ${Math.round(difference)}%`
            : `Reducir ${subcategory}${exercise ? ` (${exercise})` : ''} en aproximadamente ${Math.round(Math.abs(difference))}%`
        });
      }
    });

    // Ordenar por prioridad
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  // Función para convertir la estructura de planificación a porcentajes planos
  const convertPlanToPercentages = (plan: TrainingPlan): Record<string, number> => {
    const percentages: Record<string, number> = {};
    
    Object.entries(plan.planificacion).forEach(([tipo, tipoData]) => {
      // Porcentaje del tipo
      percentages[`tipo.${tipo}`] = tipoData.porcentajeTotal;
      
      Object.entries(tipoData.areas).forEach(([area, areaData]) => {
        // Porcentaje del área dentro del tipo
        const areaPercentage = (tipoData.porcentajeTotal * areaData.porcentajeDelTotal) / 100;
        percentages[`area.${area}`] = areaPercentage;
        
        // Porcentajes de ejercicios específicos si existen
        if (areaData.ejercicios) {
          Object.entries(areaData.ejercicios).forEach(([ejercicio, ejercicioData]) => {
            const ejercicioPercentage = (areaPercentage * ejercicioData.porcentajeDelTotal) / 100;
            percentages[`ejercicio.${area}.${ejercicio}`] = ejercicioPercentage;
          });
        }
      });
    });
    
    return percentages;
  };

  // Función para generar resumen de recomendaciones
  const generateSummary = (recommendations: RecommendationItem[], adaptedPlan: boolean = false): string => {
    const adaptedPrefix = adaptedPlan ? '[Plan Adaptado] ' : '';
    
    if (recommendations.length === 0) {
      return adaptedPrefix + 'El entrenamiento está bien balanceado según el plan. ¡Continúa así!';
    }

    const highPriority = recommendations.filter(r => r.priority === 'high').length;
    const mediumPriority = recommendations.filter(r => r.priority === 'medium').length;
    
    if (highPriority > 0) {
      return adaptedPrefix + `Se detectaron ${highPriority} área(s) que necesitan atención inmediata y ${mediumPriority} área(s) para ajustar gradualmente.`;
    } else if (mediumPriority > 0) {
      return adaptedPrefix + `El plan está mayormente balanceado. Se sugieren ${mediumPriority} ajuste(s) menores para optimizar el entrenamiento.`;
    } else {
      return adaptedPrefix + `Pequeños ajustes recomendados para perfeccionar el equilibrio del entrenamiento.`;
    }
  };

  // Función para obtener recomendaciones para múltiples jugadores
  const getRecommendationsForPlayers = async (playerIds: string[]) => {
    setLoading(true);
    const newRecommendations: Record<string, TrainingRecommendations> = {};

    for (const playerId of playerIds) {
      newRecommendations[playerId] = await getRecommendationsForPlayer(playerId);
    }

    setRecommendations((prev: Record<string, TrainingRecommendations>) => ({ ...prev, ...newRecommendations }));
    setLoading(false);
  };

  return {
    recommendations,
    loading,
    getRecommendationsForPlayer,
    getRecommendationsForPlayers,
    clearRecommendations: () => setRecommendations({})
  };
};
