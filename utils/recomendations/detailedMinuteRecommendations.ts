// src/utils/recommendations/detailedMinuteRecommendations.ts

import { ConsolidatedRecommendation } from './recommendationTypes';
import { TrainingPlan } from '@/Database/FirebaseTrainingPlans';
import { analyzePlanDetail, extractPlanElements } from './planLevelDetector';
import { adjustToPracticalTimes, groupSmallRecommendations } from './practicalTimeAdjustments';

interface DetailedRecommendation extends ConsolidatedRecommendation {
  detailLevel: 'exercise' | 'subcategory' | 'type';
  parentCategory?: string;
}

/**
 * Genera recomendaciones detalladas basadas en el nivel de detalle del plan
 */
export function generateDetailedMinuteRecommendations(
  plan: TrainingPlan,
  exercises: any[],
  sessionDuration: number = 90,
  debugMode: boolean = false
): DetailedRecommendation[] {
  
  // 1. Analizar el nivel de detalle del plan
  const planAnalysis = analyzePlanDetail(plan);
  
  if (debugMode) {
    console.log('📊 Análisis del plan:', planAnalysis);
  }
  
  // 2. Extraer elementos según el nivel dominante
  const planElements = extractPlanElements(plan, planAnalysis.dominantLevel);
  
  if (debugMode) {
    console.log('📋 Elementos del plan a trackear:', planElements.map(e => 
      `${e.name} (${e.targetMinutes}min)`
    ));
  }
  
  // 3. Calcular minutos actuales para cada elemento
  const currentMinutesByKey = calculateCurrentMinutes(
    exercises, 
    planAnalysis.dominantLevel,
    debugMode
  );
  
  // 4. Generar recomendaciones comparando plan vs actual
  const recommendations: DetailedRecommendation[] = [];
  
  planElements.forEach(element => {
    const currentMinutes = currentMinutesByKey.get(element.key) || 0;
    const remainingMinutes = element.targetMinutes - currentMinutes;
    
    if (debugMode) {
      console.log(`🎯 ${element.name}: Objetivo ${element.targetMinutes}min, Actual ${currentMinutes}min, Falta ${remainingMinutes}min`);
    }
    
    // Solo agregar si faltan más de 5 minutos
    if (remainingMinutes > 5) {
      let displayName = element.name;
      let recommendation = '';
      
      // Personalizar el mensaje según el nivel
      switch (planAnalysis.dominantLevel) {
        case 'exercise':
          displayName = `${element.subcategory} - ${element.exercise}`;
          recommendation = `Trabajar ${remainingMinutes} minutos de ${element.exercise} (${element.subcategory})`;
          break;
        case 'subcategory':
          displayName = element.subcategory || element.name;
          recommendation = `Dedicar ${remainingMinutes} minutos a ${displayName}`;
          break;
        case 'type':
          recommendation = `Agregar ${remainingMinutes} minutos de ${element.type}`;
          break;
      }
      
      recommendations.push({
        category: element.type,
        subcategory: element.subcategory,
        exercise: element.exercise,
        currentPercentage: (currentMinutes / sessionDuration) * 100,
        plannedPercentage: element.targetPercentage,
        difference: (remainingMinutes / sessionDuration) * 100,
        priority: remainingMinutes > 20 ? 'high' : remainingMinutes > 10 ? 'medium' : 'low',
        recommendation,
        consolidatedCount: 1,
        hierarchyLevel: planAnalysis.dominantLevel === 'type' ? 'category' : 
                       planAnalysis.dominantLevel === 'subcategory' ? 'subcategory' : 'exercise',
        detailLevel: planAnalysis.dominantLevel,
        parentCategory: element.type
      });
    }
  });
  
  // 5. Ordenar por prioridad (más minutos faltantes primero)
  const sortedRecommendations = recommendations.sort((a, b) => b.difference - a.difference);
  
  // 6. 🆕 Ajustar a tiempos prácticos para tenis
  const practicalRecommendations = adjustToPracticalTimes(
    sortedRecommendations,
    sessionDuration,
    debugMode
  );
  
  // 7. 🆕 Opcionalmente, agrupar recomendaciones pequeñas
  if (planAnalysis.dominantLevel === 'exercise' && practicalRecommendations.length > 3) {
    return groupSmallRecommendations(practicalRecommendations, sessionDuration, debugMode);
  }
  
  return practicalRecommendations;
}

/**
 * Calcula los minutos actuales agrupados según el nivel de detalle
 */
function calculateCurrentMinutes(
  exercises: any[], 
  level: 'exercise' | 'subcategory' | 'type',
  debugMode: boolean
): Map<string, number> {
  
  const minutesByKey = new Map<string, number>();
  
  // Normalizar nombres
  const normalize = (str: string): string => {
    return str?.toLowerCase().trim() || '';
  };
  
  // Mapeos de tipos
  const typeNormalizations: Record<string, string> = {
    'pelota viva': 'peloteo',
    'pelotaviva': 'peloteo',
    'fondo': 'peloteo'
  };
  
  exercises.forEach(ex => {
    const minutes = parseFloat(ex.tiempoCantidad) || 0;
    const normalizedType = typeNormalizations[normalize(ex.tipo)] || normalize(ex.tipo);
    const normalizedArea = normalize(ex.area);
    const normalizedExercise = normalize(ex.ejercicio || '');
    
    let key = '';
    
    switch (level) {
      case 'type':
        key = normalizedType;
        break;
      case 'subcategory':
        key = `${normalizedType}.${normalizedArea}`;
        break;
      case 'exercise':
        if (normalizedExercise) {
          key = `${normalizedType}.${normalizedArea}.${normalizedExercise}`;
        } else {
          // Si no tiene ejercicio específico, acumularlo en el área
          key = `${normalizedType}.${normalizedArea}`;
        }
        break;
    }
    
    if (key) {
      minutesByKey.set(key, (minutesByKey.get(key) || 0) + minutes);
      
      if (debugMode) {
        console.log(`   📝 Acumulando: ${key} + ${minutes}min = ${minutesByKey.get(key)}min`);
      }
    }
  });
  
  return minutesByKey;
}

/**
 * Analiza el historial de sesiones para rotar recomendaciones
 */
export function analyzeSessionHistory(
  sessions: any[],
  playerId: string,
  daysToAnalyze: number = 7
): Map<string, number> {
  
  const recentMinutesByKey = new Map<string, number>();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToAnalyze);
  
  // Filtrar sesiones recientes del jugador
  const recentSessions = sessions.filter(s => 
    s.jugadorId === playerId && 
    new Date(s.fecha) >= cutoffDate
  );
  
  // Acumular minutos de sesiones recientes
  recentSessions.forEach(session => {
    if (session.ejercicios) {
      const minutesByKey = calculateCurrentMinutes(
        session.ejercicios,
        'exercise', // Usar el nivel más detallado
        false
      );
      
      minutesByKey.forEach((minutes, key) => {
        recentMinutesByKey.set(key, (recentMinutesByKey.get(key) || 0) + minutes);
      });
    }
  });
  
  return recentMinutesByKey;
}

/**
 * Ajusta las recomendaciones basándose en el historial reciente
 */
export function adjustRecommendationsForHistory(
  recommendations: DetailedRecommendation[],
  recentHistory: Map<string, number>,
  debugMode: boolean = false
): DetailedRecommendation[] {
  
  if (debugMode) {
    console.log('📅 Ajustando por historial reciente...');
  }
  
  return recommendations.map(rec => {
    let key = '';
    
    // Construir la clave según el nivel
    if (rec.exercise) {
      key = `${rec.category.toLowerCase()}.${rec.subcategory?.toLowerCase()}.${rec.exercise.toLowerCase()}`;
    } else if (rec.subcategory) {
      key = `${rec.category.toLowerCase()}.${rec.subcategory.toLowerCase()}`;
    } else {
      key = rec.category.toLowerCase();
    }
    
    const recentMinutes = recentHistory.get(key) || 0;
    
    if (recentMinutes > 0 && debugMode) {
      console.log(`   📊 ${rec.subcategory || rec.category}: ${recentMinutes}min en últimos 7 días`);
    }
    
    // Si se ha entrenado mucho recientemente, bajar la prioridad
    if (recentMinutes > 120) { // Más de 2 horas en la semana
      return {
        ...rec,
        priority: 'low' as const,
        recommendation: rec.recommendation + ' (trabajado recientemente)'
      };
    }
    
    // Si no se ha entrenado nada, subir la prioridad
    if (recentMinutes === 0 && rec.priority !== 'high') {
      return {
        ...rec,
        priority: 'high' as const,
        recommendation: rec.recommendation + ' (no trabajado esta semana)'
      };
    }
    
    return rec;
  });
}