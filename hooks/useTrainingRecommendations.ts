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

      // 2. Obtener las últimas sesiones del jugador
      console.log('🔍 Filtrando sesiones para jugador:', playerId);
      console.log(' Estructura de primera sesión:', sessions[0]);
      
      // Filtrar sesiones del jugador y ordenar por fecha (más recientes primero)
      const playerSessions = sessions.filter(session => {
        const sessionAny = session as any;
        
        // Estructura vieja: session.jugadorId directo (ESTA ES LA CORRECTA)
        if (sessionAny.jugadorId === playerId) {
          return true;
        }
        
        // Estructura nueva: session.participants es array con objetos {playerId: string}
        if (sessionAny.participants && Array.isArray(sessionAny.participants)) {
          return sessionAny.participants.some((p: any) => p.playerId === playerId);
        }
        
        return false;
      }).sort((a: any, b: any) => {
        // Ordenar por fecha más reciente primero
        const dateA = new Date(a.fecha || a.date);
        const dateB = new Date(b.fecha || b.date);
        return dateB.getTime() - dateA.getTime();
      });

      // Tomar solo las últimas N sesiones según el parámetro
      const recentSessions = playerSessions.slice(0, maxSessionsToAnalyze);
      const hasSessions = recentSessions.length > 0;
      
      console.log(`🏃 Últimas ${maxSessionsToAnalyze} sesiones encontradas: ${recentSessions.length}`);
      if (recentSessions.length > 0) {
        const firstSession = recentSessions[0] as any;
        const lastSession = recentSessions[recentSessions.length - 1] as any;
        console.log('📅 Rango de fechas:', {
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
            : `Jugador ${!hasSessions ? 'nuevo' : 'sin entrenamientos recientes'}. Se necesitan al menos ${maxSessionsToAnalyze} sesiones para generar recomendaciones basadas en análisis.`,
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
        summary: generateSummary(recommendations, adaptedPlan, recentSessions.length),
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
    const stats: Record<string, { totalTime: number, count: number }> = {};
    let totalSessionTime = 0;
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
        const type = normalizeKey(ejercicio.tipo);
        const area = normalizeKey(ejercicio.area);
        const exercise = ejercicio.ejercicio;
        const specificExercise = ejercicio.ejercicioEspecifico; // Nuevo campo
        
        // Convertir tiempo a minutos (asumiendo formato "XX minutos" o número)
        const timeInMinutes = parseTimeToMinutes(ejercicio.tiempoCantidad);
        totalSessionTime += timeInMinutes;

        console.log(`     🏃 Ejercicio ${exIndex + 1}: ${type}-${area}-${exercise} (${timeInMinutes}min)`);
        console.log(`       🔧 Original: ${ejercicio.tipo}-${ejercicio.area} → Normalizado: ${type}-${area}`);
        
        // LOGGING ESPECIAL para peloteo
        if (area && area.toLowerCase().includes('peloteo')) {
          console.log(`     🎾 PELOTEO DETECTADO! Detalles completos:`, {
            tipoOriginal: ejercicio.tipo,
            tipoNormalizado: type,
            areaOriginal: ejercicio.area,
            areaNormalizada: area,
            ejercicio: exercise,
            tiempo: timeInMinutes,
            ejercicioCompleto: ejercicio
          });
        }

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

        // Estadísticas por ejercicio específico (si existe)
        if (specificExercise) {
          const specificKey = `especifico.${area}.${exercise}.${specificExercise}`;
          if (!stats[specificKey]) stats[specificKey] = { totalTime: 0, count: 0 };
          stats[specificKey].totalTime += timeInMinutes;
          stats[specificKey].count += 1;
        }

        // Estadísticas por ejercicio general
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

    console.log(`📊 Resumen del análisis:`);
    console.log(`   ⏱️ Tiempo total: ${totalSessionTime} minutos`);
    console.log(`   🏃 Total ejercicios: ${totalExercises}`);
    console.log(`   📈 Categorías analizadas: ${Object.keys(percentages).length}`);
    console.log(`   🎯 Top 3 áreas por tiempo:`, 
      Object.entries(percentages)
        .filter(([key]) => key.startsWith('area.'))
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([key, value]) => `${key.replace('area.', '')}: ${value.toFixed(1)}%`)
    );
    
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
      const difference = plannedPercentage - currentPercentage;
      
      // LOGGING DETALLADO para cada comparación
      console.log(`🔍 Comparando ${key}:`);
      console.log(`   📋 Planificado: ${plannedPercentage.toFixed(2)}%`);
      console.log(`   📊 Real: ${currentPercentage.toFixed(2)}%`);
      console.log(`   📈 Diferencia: ${difference.toFixed(2)}%`);
      console.log(`   🔍 Clave existe en estadísticas reales: ${key in actualStats ? 'SÍ' : 'NO'}`);
      
      if (Math.abs(difference) > 5) { // Solo si la diferencia es significativa
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
        
        recommendations.push({
          category: categoryName,
          subcategory: subcategory,
          exercise: exercise,
          currentPercentage: Math.round(currentPercentage * 10) / 10,
          plannedPercentage: Math.round(plannedPercentage * 10) / 10,
          difference: Math.round(difference * 10) / 10,
          priority: Math.abs(difference) > 15 ? 'high' : Math.abs(difference) > 10 ? 'medium' : 'low',
          recommendation: difference > 0 
            ? `Incrementar ${displayName} en aproximadamente ${Math.round(difference)}%`
            : `Reducir ${displayName} en aproximadamente ${Math.round(Math.abs(difference))}%`
        });
      } else {
        console.log(`   ✅ Dentro del rango aceptable`);
      }
    });

    console.log(`💡 Total de recomendaciones generadas: ${recommendations.length}`);
    
    // Mostrar tanto déficit (necesita aumentar) como excesos importantes (necesita reducir)
    // Priorizar por magnitud absoluta - los desequilibrios más grandes van primero
    return recommendations
      .filter(rec => Math.abs(rec.difference) >= 5) // Solo diferencias significativas
      .sort((a, b) => {
        // Ordenar por magnitud absoluta de la diferencia (más importante primero)
        const absA = Math.abs(a.difference);
        const absB = Math.abs(b.difference);
        
        if (absB !== absA) {
          return absB - absA; // Mayor desequilibrio primero
        }
        
        // En caso de empate, priorizar déficit sobre exceso
        if (a.difference > 0 && b.difference < 0) return -1;
        if (a.difference < 0 && b.difference > 0) return 1;
        
        return 0;
      })
      .slice(0, 3); // Solo las 3 recomendaciones más importantes
  };

  // Función para convertir la estructura de planificación a porcentajes planos
  const convertPlanToPercentages = (plan: TrainingPlan): Record<string, number> => {
    const percentages: Record<string, number> = {};
    
    console.log('🔍 DEBUGGING - Convirtiendo plan a porcentajes...');
    
    Object.entries(plan.planificacion).forEach(([tipo, tipoData]) => {
      // Porcentaje del tipo
      percentages[`tipo.${tipo}`] = tipoData.porcentajeTotal;
      console.log(`   tipo.${tipo}: ${tipoData.porcentajeTotal}%`);
      
      Object.entries(tipoData.areas).forEach(([area, areaData]) => {
        // Porcentaje del área dentro del tipo
        const areaPercentage = (tipoData.porcentajeTotal * areaData.porcentajeDelTotal) / 100;
        percentages[`area.${area}`] = areaPercentage;
        console.log(`   area.${area}: ${areaPercentage.toFixed(2)}%`);
        
        // Porcentajes de ejercicios específicos si existen
        if (areaData.ejercicios) {
          Object.entries(areaData.ejercicios).forEach(([ejercicio, ejercicioData]) => {
            const ejercicioPercentage = (areaPercentage * ejercicioData.porcentajeDelTotal) / 100;
            percentages[`ejercicio.${area}.${ejercicio}`] = ejercicioPercentage;
            console.log(`   ejercicio.${area}.${ejercicio}: ${ejercicioPercentage.toFixed(2)}%`);
          });
        }
      });
    });
    
    console.log('📋 DEBUGGING - Plan convertido:', Object.keys(percentages).length, 'claves generadas');
    
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
