// src/utils/recommendations/minuteBasedLogic.ts

import { RecommendationItem, ConsolidatedRecommendation } from './recommendationTypes';

interface MinuteTarget {
  category: string;
  subcategory?: string;
  exercise?: string;
  targetMinutes: number;
  currentMinutes: number;
  remainingMinutes: number;
}

/**
 * Convierte recomendaciones basadas en porcentajes a minutos objetivo
 */
export function convertToMinuteBasedRecommendations(
  recommendations: ConsolidatedRecommendation[],
  exercises: any[],
  sessionDuration: number = 90,
  debugMode: boolean = false
): ConsolidatedRecommendation[] {
  
  if (debugMode) {
    console.log('⏱️ Convirtiendo a recomendaciones basadas en minutos...');
  }
  
  // Calcular minutos actuales por categoría/área
  const currentMinutesByKey = new Map<string, number>();
  let totalCurrentMinutes = 0;
  
  exercises.forEach(ex => {
    const minutes = parseFloat(ex.tiempoCantidad) || 0;
    totalCurrentMinutes += minutes;
    
    // Acumular por tipo
    const tipoKey = ex.tipo?.toLowerCase();
    currentMinutesByKey.set(tipoKey, (currentMinutesByKey.get(tipoKey) || 0) + minutes);
    
    // Acumular por área
    const areaKey = `area.${ex.area?.toLowerCase()}`;
    currentMinutesByKey.set(areaKey, (currentMinutesByKey.get(areaKey) || 0) + minutes);
    
    // Acumular por ejercicio específico
    if (ex.ejercicio) {
      const exerciseKey = `exercise.${ex.area?.toLowerCase()}.${ex.ejercicio?.toLowerCase()}`;
      currentMinutesByKey.set(exerciseKey, (currentMinutesByKey.get(exerciseKey) || 0) + minutes);
    }
  });
  
  if (debugMode) {
    console.log('   Minutos actuales por categoría:', Object.fromEntries(currentMinutesByKey));
    console.log('   Total minutos actuales:', totalCurrentMinutes);
  }
  
  // Convertir cada recomendación
  return recommendations.map(rec => {
    // Calcular minutos objetivo basados en el porcentaje planificado
    const targetMinutes = Math.round((rec.plannedPercentage / 100) * sessionDuration);
    
    // Obtener minutos actuales
    let currentKey = '';
    if (rec.hierarchyLevel === 'category') {
      currentKey = rec.category.toLowerCase();
    } else if (rec.hierarchyLevel === 'subcategory') {
      currentKey = `area.${rec.subcategory?.toLowerCase()}`;
    } else if (rec.hierarchyLevel === 'exercise') {
      currentKey = `exercise.${rec.subcategory?.toLowerCase()}.${rec.exercise?.toLowerCase()}`;
    }
    
    const currentMinutes = currentMinutesByKey.get(currentKey) || 0;
    const remainingMinutes = targetMinutes - currentMinutes;
    
    if (debugMode) {
      console.log(`   ${rec.category}/${rec.subcategory}/${rec.exercise}:`);
      console.log(`     Objetivo: ${targetMinutes}min, Actual: ${currentMinutes}min, Falta: ${remainingMinutes}min`);
    }
    
    // Crear nueva recomendación basada en minutos
    const newDifference = (remainingMinutes / sessionDuration) * 100;
    
    // Solo mostrar si la diferencia es significativa (más de 5 minutos)
    if (Math.abs(remainingMinutes) < 5) {
      return null;
    }
    
    return {
      ...rec,
      difference: newDifference,
      currentPercentage: (currentMinutes / sessionDuration) * 100,
      recommendation: remainingMinutes > 0
        ? `Agregar ${remainingMinutes} minutos más de ${rec.subcategory || rec.category}`
        : `${rec.subcategory || rec.category} completo (objetivo alcanzado)`,
      // Agregar metadata de minutos
      metadata: {
        targetMinutes,
        currentMinutes,
        remainingMinutes
      }
    } as ConsolidatedRecommendation & { metadata: any };
  }).filter(Boolean) as ConsolidatedRecommendation[];
}

/**
 * Valida que las recomendaciones de minutos sean coherentes
 */
export function validateMinuteCoherence(
  recommendations: ConsolidatedRecommendation[],
  exercises: any[],
  debugMode: boolean = false
): ConsolidatedRecommendation[] {
  
  if (debugMode) {
    console.log('🔍 Validando coherencia de minutos...');
  }
  
  // Si no hay ejercicios, todas las recomendaciones son válidas
  if (exercises.length === 0) {
    return recommendations;
  }
  
  // Filtrar recomendaciones incoherentes
  return recommendations.filter(rec => {
    // No puede "sobrar" algo si es lo único o principal que estamos entrenando
    if (rec.difference < 0) {
      const totalMinutes = exercises.reduce((sum, ex) => sum + (parseFloat(ex.tiempoCantidad) || 0), 0);
      
      // Si tenemos menos de 45 minutos totales, no marcar excesos
      if (totalMinutes < 45) {
        if (debugMode) {
          console.log(`   ❌ Filtrada: ${rec.recommendation} (sesión muy corta para tener excesos)`);
        }
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Genera recomendaciones simples y directas basadas en el plan
 */
export function generateSimpleMinuteRecommendations(
  plan: any,
  exercises: any[],
  sessionDuration: number = 90,
  debugMode: boolean = false
): ConsolidatedRecommendation[] {
  
  const recommendations: ConsolidatedRecommendation[] = [];
  
  // Normalizar nombres de tipos
  const normalizeTypeName = (tipo: string): string => {
    const normalized = tipo.toLowerCase().trim();
    // Mapear variantes comunes
    const mappings: Record<string, string> = {
      'pelota viva': 'peloteo',
      'pelotaviva': 'peloteo',
      'fondo': 'peloteo'
    };
    return mappings[normalized] || normalized;
  };
  
  // Calcular minutos actuales por tipo
  const minutesByType = new Map<string, number>();
  exercises.forEach(ex => {
    const tipoNormalizado = normalizeTypeName(ex.tipo || '');
    const minutes = parseFloat(ex.tiempoCantidad) || 0;
    minutesByType.set(tipoNormalizado, (minutesByType.get(tipoNormalizado) || 0) + minutes);
    
    if (debugMode) {
      console.log(`   Ejercicio: ${ex.tipo} (${tipoNormalizado}) - ${minutes} min`);
    }
  });
  
  if (debugMode && exercises.length > 0) {
    console.log('   Minutos acumulados por tipo:', Object.fromEntries(minutesByType));
  }
  
  // Para cada tipo en el plan
  Object.entries(plan.planificacion).forEach(([tipo, tipoData]: [string, any]) => {
    const tipoNormalizado = normalizeTypeName(tipo);
    const targetMinutes = Math.round((tipoData.porcentajeTotal / 100) * sessionDuration);
    const currentMinutes = minutesByType.get(tipoNormalizado) || 0;
    const remaining = targetMinutes - currentMinutes;
    
    if (debugMode) {
      console.log(`📊 ${tipo}: Objetivo ${targetMinutes}min, Actual ${currentMinutes}min, Falta ${remaining}min`);
    }
    
    // Solo agregar si faltan más de 5 minutos
    if (remaining > 5) {
      recommendations.push({
        category: tipo,
        subcategory: undefined,
        exercise: undefined,
        currentPercentage: (currentMinutes / sessionDuration) * 100,
        plannedPercentage: tipoData.porcentajeTotal,
        difference: (remaining / sessionDuration) * 100,
        priority: remaining > 20 ? 'high' : remaining > 10 ? 'medium' : 'low',
        recommendation: `Agregar ${remaining} minutos de ${tipo}`,
        consolidatedCount: 1,
        hierarchyLevel: 'category'
      });
    }
  });
  
  // Ordenar por cantidad de minutos faltantes
  return recommendations.sort((a, b) => b.difference - a.difference);
}