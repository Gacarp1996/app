// src/utils/recommendations/smartRecommendations.ts

import { ConsolidatedRecommendation } from './recommendationTypes';

interface SessionAnalysis {
  dominantActivity: string;
  missingCategories: string[];
  overrepresentedAreas: string[];
  balanceScore: number; // 0-100
  primarySuggestion: string;
}

/**
 * Analiza la sesión actual y proporciona un contexto más inteligente
 */
export function analyzeCurrentSession(
  exercises: any[],
  recommendations: ConsolidatedRecommendation[]
): SessionAnalysis {
  
  // Identificar qué se está haciendo actualmente
  const currentActivities = new Map<string, number>();
  let totalTime = 0;
  
  exercises.forEach(ex => {
    const key = `${ex.tipo} - ${ex.area}`;
    const time = parseFloat(ex.tiempoCantidad) || 0;
    currentActivities.set(key, (currentActivities.get(key) || 0) + time);
    totalTime += time;
  });
  
  // Encontrar actividad dominante
  let dominantActivity = 'Sin ejercicios';
  let maxTime = 0;
  currentActivities.forEach((time, activity) => {
    if (time > maxTime) {
      maxTime = time;
      dominantActivity = activity;
    }
  });
  
  // Identificar categorías faltantes basándose en las recomendaciones
  const missingCategories = recommendations
    .filter(r => r.difference > 0)
    .map(r => r.subcategory || r.category)
    .filter((v, i, a) => a.indexOf(v) === i); // unique
  
  // Identificar áreas sobrerepresentadas
  const overrepresentedAreas = recommendations
    .filter(r => r.difference < 0)
    .map(r => r.subcategory || r.category)
    .filter((v, i, a) => a.indexOf(v) === i);
  
  // Calcular score de balance (100 = perfectamente balanceado)
  const totalImbalance = recommendations.reduce((sum, r) => sum + Math.abs(r.difference), 0);
  const balanceScore = Math.max(0, 100 - totalImbalance);
  
  // Generar sugerencia principal
  let primarySuggestion = '';
  
  if (exercises.length === 0) {
    primarySuggestion = 'Comienza agregando ejercicios variados de diferentes categorías';
  } else if (missingCategories.length > 0) {
    primarySuggestion = `Agrega ejercicios de ${missingCategories.slice(0, 2).join(' y ')} para balancear la sesión`;
  } else if (overrepresentedAreas.length > 0 && balanceScore < 70) {
    primarySuggestion = `Reduce el tiempo de ${overrepresentedAreas[0]} y distribuye en otras áreas`;
  } else if (balanceScore > 85) {
    primarySuggestion = '¡Excelente balance! La sesión está bien estructurada';
  } else {
    primarySuggestion = 'Ajusta los tiempos según las recomendaciones para optimizar';
  }
  
  return {
    dominantActivity,
    missingCategories,
    overrepresentedAreas,
    balanceScore,
    primarySuggestion
  };
}

/**
 * Genera un resumen más inteligente basado en el análisis
 */
export function generateSmartSummary(
  analysis: SessionAnalysis,
  recommendations: ConsolidatedRecommendation[]
): string {
  
  // Si no hay ejercicios
  if (analysis.dominantActivity === 'Sin ejercicios') {
    return '💡 Agrega ejercicios para comenzar el análisis de la sesión.';
  }
  
  // Si el balance es muy bueno
  if (analysis.balanceScore > 85) {
    return '✅ Sesión bien balanceada. El entrenamiento sigue el plan correctamente.';
  }
  
  // Si todos los ejercicios son de una sola área/tipo
  const allExcess = recommendations.every(r => r.difference < 0);
  const allFromSameArea = recommendations.every(r => 
    r.subcategory === recommendations[0].subcategory || 
    r.category === recommendations[0].category
  );
  
  if (allExcess && allFromSameArea && recommendations.length > 0) {
    const area = recommendations[0].subcategory || recommendations[0].category;
    return `⚠️ Todos los ejercicios son de ${area}. Agrega ejercicios de otras áreas para balancear la sesión.`;
  }
  
  // Si faltan muchas categorías
  if (analysis.missingCategories.length > 2) {
    return `🔴 Faltan varias áreas importantes: ${analysis.missingCategories.slice(0, 3).join(', ')}. La sesión necesita más variedad.`;
  }
  
  // Si hay excesos sin déficits
  if (analysis.missingCategories.length === 0 && analysis.overrepresentedAreas.length > 0) {
    return `⚠️ Demasiado énfasis en ${analysis.overrepresentedAreas[0]}. Diversifica con otros ejercicios.`;
  }
  
  // Caso general
  const deficit = recommendations.filter(r => r.difference > 0).length;
  const excess = recommendations.filter(r => r.difference < 0).length;
  
  if (deficit > 0 && excess > 0) {
    return `⚖️ Rebalancea: reduce ${analysis.overrepresentedAreas[0]} y aumenta ${analysis.missingCategories[0]}.`;
  }
  
  return analysis.primarySuggestion;
}

/**
 * Filtra recomendaciones para mostrar las más relevantes según el contexto
 */
export function filterRelevantRecommendations(
  recommendations: ConsolidatedRecommendation[],
  maxCount: number = 3
): ConsolidatedRecommendation[] {
  
  // Separar déficits y excesos
  const deficits = recommendations.filter(r => r.difference > 0);
  const excesses = recommendations.filter(r => r.difference < 0);
  
  // Ordenar por impacto (magnitud * prioridad)
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  
  deficits.sort((a, b) => {
    const scoreA = Math.abs(a.difference) * priorityWeight[a.priority];
    const scoreB = Math.abs(b.difference) * priorityWeight[b.priority];
    return scoreB - scoreA;
  });
  
  excesses.sort((a, b) => {
    const scoreA = Math.abs(a.difference) * priorityWeight[a.priority];
    const scoreB = Math.abs(b.difference) * priorityWeight[b.priority];
    return scoreB - scoreA;
  });
  
  // Tomar los más importantes de cada tipo
  const result: ConsolidatedRecommendation[] = [];
  
  // Priorizar déficits
  result.push(...deficits.slice(0, Math.min(2, maxCount)));
  
  // Agregar excesos si hay espacio
  const remaining = maxCount - result.length;
  if (remaining > 0) {
    result.push(...excesses.slice(0, remaining));
  }
  
  return result;
}