// hooks/useTrainingRecommendations.ts
import { useState, useEffect, useMemo } from 'react';
import { Player, TrainingSession } from '../types';
import { getPlayerSurveys } from '../Database/FirebaseSurveys';
import { getTrainingPlan, TrainingPlan } from '../Database/FirebaseTrainingPlans';
import { EXERCISE_HIERARCHY, NEW_EXERCISE_HIERARCHY_MAPPING } from '../constants';

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
  type?: 'REDUCIR' | 'INCREMENTAR';
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
  maxSessionsToAnalyze?: number; // Por defecto 7 sesiones
}

export const useTrainingRecommendations = ({
  players,
  sessions,
  academiaId,
  analysisWindowDays = 7,
  maxSessionsToAnalyze = 7
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

      // 2. Obtener las sesiones del jugador de los últimos 7 días
      console.log('🔍 Filtrando sesiones para jugador:', playerId);
      console.log('📅 Analizando sesiones de los últimos', analysisWindowDays, 'días');
      
      // Calcular fecha límite (hace 7 días desde hoy)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - analysisWindowDays);
      console.log('📅 Fecha límite para análisis:', cutoffDate.toISOString().split('T')[0]);
      
      // Filtrar sesiones del jugador dentro del rango de fecha
      const playerSessions = sessions.filter(session => {
        const sessionAny = session as any;
        
        // Verificar si el jugador participó en esta sesión
        let isPlayerInSession = false;
        
        // Estructura vieja: session.jugadorId directo
        if (sessionAny.jugadorId === playerId) {
          isPlayerInSession = true;
        }
        
        // Estructura nueva: session.participants es array con objetos {playerId: string}
        if (sessionAny.participants && Array.isArray(sessionAny.participants)) {
          isPlayerInSession = sessionAny.participants.some((p: any) => p.playerId === playerId);
        }
        
        if (!isPlayerInSession) return false;
        
        // Verificar que la sesión esté dentro de los últimos 7 días
        const sessionDate = new Date(sessionAny.fecha || sessionAny.date);
        const isWithinDateRange = sessionDate >= cutoffDate;
        
        if (!isWithinDateRange) {
          console.log(`⏳ Sesión descartada por fecha: ${sessionDate.toISOString().split('T')[0]} (anterior a ${cutoffDate.toISOString().split('T')[0]})`);
        }
        
        return isWithinDateRange;
      }).sort((a: any, b: any) => {
        // Ordenar por fecha más reciente primero
        const dateA = new Date(a.fecha || a.date);
        const dateB = new Date(b.fecha || b.date);
        return dateB.getTime() - dateA.getTime();
      });

      const hasSessions = playerSessions.length > 0;
      
      console.log(`🏃 Sesiones encontradas en los últimos ${analysisWindowDays} días: ${playerSessions.length}`);
      if (playerSessions.length > 0) {
        const firstSession = playerSessions[0] as any;
        const lastSession = playerSessions[playerSessions.length - 1] as any;
        console.log('📅 Rango de fechas analizadas:', {
          más_reciente: firstSession.fecha || firstSession.date,
          más_antigua: lastSession.fecha || lastSession.date
        });
      }

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
            : `Jugador ${!hasSessions ? 'nuevo' : 'sin entrenamientos recientes'}. Se necesitan entrenamientos de los últimos ${analysisWindowDays} días para generar recomendaciones basadas en análisis.`,
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

      // 4. Calcular estadísticas actuales basadas en las sesiones de los últimos 7 días
      console.log('📊 Calculando estadísticas actuales...');
      const actualStats = calculateActualTrainingStats(playerSessions as any[]);
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
        summary: generateSummary(recommendations, adaptedPlan, playerSessions.length),
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

  // Función auxiliar para normalizar nombres de tipos y áreas
  const normalizeKey = (key: string): string => {
    // Normalizar nombres comunes que pueden variar
    const normalizations: Record<string, string> = {
      // Tipos de entrenamiento
      'Pelota viva': 'Peloteo',
      'pelota viva': 'Peloteo',
      'PELOTA VIVA': 'Peloteo',
      
      // Áreas de entrenamiento
      'Primeras pelotas': 'Primeras pelotas',
      'primeras pelotas': 'Primeras pelotas',
      'PRIMERAS PELOTAS': 'Primeras pelotas',
      'Primeras Pelotas': 'Primeras pelotas', // Con mayúscula inicial
      
      'Canasto': 'Canasto',
      'canasto': 'Canasto',
      'CANASTO': 'Canasto',
      
      'Fondo': 'Juego de base',
      'fondo': 'Juego de base',
      'FONDO': 'Juego de base',
      
      'Juego de base': 'Juego de base',
      'juego de base': 'Juego de base',
      'JUEGO DE BASE': 'Juego de base',
      
      'Juego de red': 'Juego de red',
      'juego de red': 'Juego de red',
      'JUEGO DE RED': 'Juego de red',
      
      'Puntos': 'Puntos',
      'puntos': 'Puntos',
      'PUNTOS': 'Puntos'
    };
    
    const normalized = normalizations[key] || key;
    console.log(`🔧 Normalización: "${key}" → "${normalized}"`);
    return normalized;
  };

  // Función para calcular estadísticas actuales basadas en sesiones de entrenamiento
  const calculateActualTrainingStats = (sessions: any[]) => {
    console.log(`📈 Calculando estadísticas de las últimas ${sessions.length} sesiones`);
    
    if (!sessions.length) return {};

    const stats: Record<string, Record<string, Record<string, number>>> = {};
    let totalMinutes = 0;
    let totalExercises = 0;
    
    sessions.forEach((session, sessionIndex) => {
      console.log(`📝 Procesando sesión ${sessionIndex + 1}:`, session.fecha || session.date);
      
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
      
      console.log(`   📋 ${exercises.length} ejercicios encontrados`);
      totalExercises += exercises.length;
      
      exercises.forEach((ejercicio: any, exIndex) => {
        // Usar la misma lógica de mapeo que usePlanningAnalysis
        const tipoKey = Object.keys(NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP).find(
          key => NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP[key] === ejercicio.tipo
        ) || ejercicio.tipo.toString();
        
        const areaKey = Object.keys(NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP).find(
          key => NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP[key] === ejercicio.area
        ) || ejercicio.area.toString();

        // Convertir tiempo a minutos
        const timeInMinutes = parseTimeToMinutes(ejercicio.tiempoCantidad);
        totalMinutes += timeInMinutes;

        console.log(`     🏃 Ejercicio ${exIndex + 1}: ${tipoKey}-${areaKey}-${ejercicio.ejercicio} (${timeInMinutes}min)`);
        console.log(`       🔧 Original: ${ejercicio.tipo}-${ejercicio.area} → Normalizado: ${tipoKey}-${areaKey}`);

        // Crear estructura jerárquica igual que usePlanningAnalysis
        if (!stats[tipoKey]) stats[tipoKey] = {};
        if (!stats[tipoKey][areaKey]) stats[tipoKey][areaKey] = {};
        if (!stats[tipoKey][areaKey][ejercicio.ejercicio]) {
          stats[tipoKey][areaKey][ejercicio.ejercicio] = 0;
        }

        stats[tipoKey][areaKey][ejercicio.ejercicio] += timeInMinutes;
      });
    });

    // Convertir a porcentajes usando la misma estructura que usePlanningAnalysis
    const percentages: Record<string, number> = {};
    
    if (totalMinutes > 0) {
      Object.keys(stats).forEach(tipo => {
        // Calcular total por tipo
        let tipoTotal = 0;
        Object.keys(stats[tipo]).forEach(area => {
          Object.values(stats[tipo][area]).forEach(ejercicioValue => {
            tipoTotal += ejercicioValue;
          });
        });
        
        percentages[`tipo.${tipo}`] = (tipoTotal / totalMinutes) * 100;
        
        Object.keys(stats[tipo]).forEach(area => {
          // Calcular total por área dentro del tipo
          let areaTotal = 0;
          Object.values(stats[tipo][area]).forEach(ejercicioValue => {
            areaTotal += ejercicioValue;
          });
          
          percentages[`tipo.${tipo}.area.${area}`] = (areaTotal / totalMinutes) * 100;
          
          // Ejercicios específicos
          Object.keys(stats[tipo][area]).forEach(ejercicio => {
            percentages[`tipo.${tipo}.area.${area}.ejercicio.${ejercicio}`] = 
              (stats[tipo][area][ejercicio] / totalMinutes) * 100;
          });
        });
      });
    }

    console.log(`📊 Resumen del análisis:`);
    console.log(`   ⏱️ Tiempo total: ${totalMinutes} minutos`);
    console.log(`   🏃 Total ejercicios: ${totalExercises}`);
    console.log(`   📈 Tipos analizados: ${Object.keys(stats).length}`);
    
    // LOGGING DETALLADO: Mostrar todas las estadísticas calculadas
    console.log(`🔍 DEBUGGING - Estadísticas calculadas:`);
    Object.entries(percentages).forEach(([key, value]) => {
      if (value > 0) {
        console.log(`   ${key}: ${value.toFixed(2)}%`);
      }
    });
    
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

    console.log('🔍 DEBUGGING - Iniciando comparación plan vs realidad...');
    console.log('📊 Estadísticas reales disponibles:', Object.keys(actualStats).length);
    console.log('📋 Estadísticas planificadas disponibles:', Object.keys(plannedStats).length);

    // Comparar estadísticas actuales vs planificadas
    Object.entries(plannedStats).forEach(([key, plannedPercentage]) => {
      const currentPercentage = actualStats[key] || 0;
      const difference = currentPercentage - plannedPercentage; // CORRECCIÓN: real - planificado
      
      // LOGGING DETALLADO para cada comparación
      console.log(`🔍 Comparando ${key}:`);
      console.log(`   📋 Planificado: ${plannedPercentage.toFixed(2)}%`);
      console.log(`   📊 Real: ${currentPercentage.toFixed(2)}%`);
      console.log(`   📈 Diferencia (real - planificado): ${difference.toFixed(2)}%`);
      console.log(`   🔍 Clave existe en estadísticas reales: ${key in actualStats ? 'SÍ' : 'NO'}`);
      
      if (Math.abs(difference) >= 10) { // Solo si la diferencia es significativa (≥10%)
        console.log(`   ⚠️ Diferencia significativa detectada!`);
        
        const [category, subcategory, exercise, specificExercise] = key.split('.');
        
        let displayName = subcategory;
        let categoryName = category === 'tipo' ? 'Tipo' : category === 'area' ? 'Área' : category === 'especifico' ? 'Ejercicio Específico' : 'Ejercicio';
        
        if (exercise) {
          displayName += ` - ${exercise}`;
        }
        if (specificExercise) {
          displayName += ` (${specificExercise})`;
        }
        
        // Solo generar recomendaciones para diferencias significativas (≥10%) y sin prioridad "low"
        if (Math.abs(difference) >= 10) {
          // Determinar el tipo de recomendación basado en si hay exceso o déficit
          let recommendationType: 'REDUCIR' | 'INCREMENTAR';
          let recommendationText: string;
          
          if (difference > 0) {
            // Se está haciendo MÁS de lo planificado (exceso)
            recommendationType = 'REDUCIR';
            recommendationText = `REDUCIR ${displayName} (exceso de ${Math.round(difference)}%)`;
          } else {
            // Se está haciendo MENOS de lo planificado (déficit)
            recommendationType = 'INCREMENTAR';
            recommendationText = `INCREMENTAR ${displayName} (déficit de ${Math.round(Math.abs(difference))}%)`;
          }
          
          console.log(`   📝 Generando recomendación: ${recommendationType} ${displayName}`);
          console.log(`   🎯 Detalles: real=${currentPercentage.toFixed(1)}%, planificado=${plannedPercentage.toFixed(1)}%, diferencia=${difference.toFixed(1)}%`);
          
          recommendations.push({
            category: categoryName,
            subcategory: subcategory,
            exercise: exercise,
            currentPercentage: Math.round(currentPercentage * 10) / 10,
            plannedPercentage: Math.round(plannedPercentage * 10) / 10,
            difference: Math.round(difference * 10) / 10,
            priority: Math.abs(difference) >= 25 ? 'high' : 'medium', // Solo rojo (≥25%) o amarillo (<25%)
            recommendation: recommendationText,
            type: recommendationType
          });
        }
      } else {
        console.log(`   ✅ Dentro del rango aceptable`);
      }
    });

    console.log(`💡 Total de recomendaciones generadas: ${recommendations.length}`);
    
    // Mostrar solo desequilibrios significativos (≥10% de diferencia)
    // Priorizar por magnitud absoluta - los desequilibrios más grandes van primero
    return recommendations
      .filter(rec => Math.abs(rec.difference) >= 10) // Solo diferencias significativas ≥10%
      .sort((a, b) => {
        // Ordenar por magnitud absoluta de la diferencia (más importante primero)
        const absA = Math.abs(a.difference);
        const absB = Math.abs(b.difference);
        
        if (absB !== absA) {
          return absB - absA; // Mayor desequilibrio primero
        }
        
        // En caso de empate, priorizar déficit sobre exceso
        if (a.difference < 0 && b.difference > 0) return -1; // Déficit primero
        if (a.difference > 0 && b.difference < 0) return 1;  // Exceso después
        
        return 0;
      })
      .slice(0, 5); // Permitir hasta 5 recomendaciones para que el filtro de grupos funcione
  };

  // Función para convertir la estructura de planificación a porcentajes planos
  const convertPlanToPercentages = (plan: TrainingPlan): Record<string, number> => {
    const percentages: Record<string, number> = {};
    
    console.log('🔍 DEBUGGING - Convirtiendo plan a porcentajes...');
    console.log('📋 DEBUGGING - Plan estructura:', JSON.stringify(plan.planificacion, null, 2));
    
    Object.entries(plan.planificacion).forEach(([tipo, tipoData]) => {
      console.log(`🔄 DEBUGGING - Procesando tipo ${tipo} (${tipoData.porcentajeTotal}%)`);
      
      // Generar estadísticas por TIPO (igual que el análisis de planificación)
      percentages[`tipo.${tipo}`] = tipoData.porcentajeTotal;
      
      Object.entries(tipoData.areas).forEach(([area, areaData]) => {
        // Generar estadísticas por TIPO+ÁREA (igual que el análisis de planificación)
        const tipoAreaKey = `tipo.${tipo}.area.${area}`;
        percentages[tipoAreaKey] = areaData.porcentajeDelTotal;
        
        console.log(`   ${tipo} -> ${area}: ${areaData.porcentajeDelTotal.toFixed(2)}%`);
        
        // También generar ejercicios específicos si existen
        if (areaData.ejercicios) {
          Object.entries(areaData.ejercicios).forEach(([ejercicio, ejercicioData]) => {
            const ejercicioKey = `tipo.${tipo}.area.${area}.ejercicio.${ejercicio}`;
            percentages[ejercicioKey] = ejercicioData.porcentajeDelTotal;
            
            console.log(`     ${tipo} -> ${area} -> ${ejercicio}: ${ejercicioData.porcentajeDelTotal.toFixed(2)}%`);
          });
        }
      });
    });
    
    console.log('📋 DEBUGGING - Plan convertido final:', percentages);
    
    return percentages;
  };

  // Función para generar resumen de recomendaciones
  const generateSummary = (recommendations: RecommendationItem[], adaptedPlan: boolean = false, sessionsAnalyzed: number = 0): string => {
    const adaptedPrefix = adaptedPlan ? '[Plan Adaptado] ' : '';
    const sessionInfo = sessionsAnalyzed > 0 ? ` (basado en ${sessionsAnalyzed} sesión${sessionsAnalyzed > 1 ? 'es' : ''} reciente${sessionsAnalyzed > 1 ? 's' : ''})` : '';
    
    if (recommendations.length === 0) {
      return adaptedPrefix + `El entrenamiento está bien balanceado según el plan${sessionInfo}. ¡Continúa así!`;
    }

    const highPriority = recommendations.filter(r => r.priority === 'high').length;
    const mediumPriority = recommendations.filter(r => r.priority === 'medium').length;
    
    if (highPriority > 0) {
      return adaptedPrefix + `Análisis de últimas sesiones detectó ${highPriority} área(s) que necesitan atención inmediata y ${mediumPriority} área(s) para ajustar gradualmente${sessionInfo}.`;
    } else if (mediumPriority > 0) {
      return adaptedPrefix + `El plan está mayormente balanceado. Se sugieren ${mediumPriority} ajuste(s) menores para optimizar el entrenamiento${sessionInfo}.`;
    } else {
      return adaptedPrefix + `Pequeños ajustes recomendados para perfeccionar el equilibrio del entrenamiento${sessionInfo}.`;
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
