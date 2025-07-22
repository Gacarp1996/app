// src/utils/recommendations/sessionContextLogic.ts

import { ConsolidatedRecommendation } from './recommendationTypes';

interface SessionContext {
  totalMinutes: number;
  isJustStarting: boolean;
  isSingleCategory: boolean;
  dominantCategory: string | null;
}

/**
 * Analiza el contexto de la sesión para ajustar recomendaciones
 */
export function analyzeSessionContext(exercises: any[]): SessionContext {
  const totalMinutes = exercises.reduce((sum, ex) => {
    return sum + (parseFloat(ex.tiempoCantidad) || 0);
  }, 0);
  
  // Identificar categorías únicas
  const categories = new Set(exercises.map(ex => ex.tipo));
  const areas = new Set(exercises.map(ex => ex.area));
  
  // Encontrar categoría dominante
  const categoryCount = new Map<string, number>();
  exercises.forEach(ex => {
    const count = categoryCount.get(ex.tipo) || 0;
    categoryCount.set(ex.tipo, count + 1);
  });
  
  let dominantCategory = null;
  let maxCount = 0;
  categoryCount.forEach((count, category) => {
    if (count > maxCount) {
      maxCount = count;
      dominantCategory = category;
    }
  });
  
  return {
    totalMinutes,
    isJustStarting: totalMinutes < 40, // Menos de 40 min = recién empezando
    isSingleCategory: categories.size === 1,
    dominantCategory
  };
}

/**
 * Ajusta recomendaciones basándose en el contexto de la sesión
 */
export function adjustRecommendationsForContext(
  recommendations: ConsolidatedRecommendation[],
  exercises: any[],
  sessionDuration: number = 90
): ConsolidatedRecommendation[] {
  
  const context = analyzeSessionContext(exercises);
  
  console.log('🎯 Contexto de sesión:', {
    totalMinutes: context.totalMinutes,
    isJustStarting: context.isJustStarting,
    isSingleCategory: context.isSingleCategory,
    dominantCategory: context.dominantCategory
  });
  
  return recommendations.map(rec => {
    // REGLA 1: Si recién empezamos y es un déficit, no puede ser también un exceso
    if (context.isJustStarting && context.isSingleCategory) {
      // Si la recomendación es sobre la categoría que estamos entrenando
      if (rec.category === context.dominantCategory || 
          rec.subcategory?.toLowerCase() === context.dominantCategory?.toLowerCase()) {
        
        // Si dice que sobra pero recién empezamos, es incorrecto
        if (rec.difference < 0 && Math.abs(rec.difference) < 30) {
          console.log(`🔄 Ajustando: "${rec.category}" no puede sobrar si recién empezamos`);
          
          // Convertir a sugerencia de continuar
          return {
            ...rec,
            difference: 0,
            recommendation: `Continúa agregando ejercicios de ${rec.category} hasta alcanzar el balance deseado`,
            priority: 'low' as const
          };
        }
      }
    }
    
    // REGLA 2: Si el plan espera mucho de una categoría (>50%), no marcar exceso temprano
    if (rec.plannedPercentage > 50 && context.totalMinutes < sessionDuration * 0.6) {
      if (rec.difference < 0) {
        console.log(`🔄 Ajustando: "${rec.category}" es prioritario (${rec.plannedPercentage}%), no marcar exceso aún`);
        
        return {
          ...rec,
          difference: 0,
          recommendation: `${rec.category} está bien encaminado. Agrega ejercicios de otras áreas para balancear`,
          priority: 'low' as const
        };
      }
    }
    
    // REGLA 3: Ajustar mensajes para déficits cuando recién empezamos
    if (context.isJustStarting && rec.difference > 0) {
      const minutosRecomendados = Math.round((rec.plannedPercentage / 100) * sessionDuration);
      
      return {
        ...rec,
        recommendation: `Agrega ${minutosRecomendados} minutos de ${rec.subcategory || rec.category} para alcanzar el objetivo`
      };
    }
    
    return rec;
  });
}

/**
 * Filtra recomendaciones contradictorias en sesiones tempranas
 */
export function filterContradictoryRecommendations(
  recommendations: ConsolidatedRecommendation[],
  exercises: any[]
): ConsolidatedRecommendation[] {
  
  const context = analyzeSessionContext(exercises);
  
  // Si recién empezamos, no mostrar excesos de la categoría principal
  if (context.isJustStarting && context.dominantCategory) {
    return recommendations.filter(rec => {
      // Filtrar excesos de la categoría dominante
      if (rec.difference < 0 && 
          (rec.category === context.dominantCategory || 
           rec.subcategory === context.dominantCategory)) {
        console.log(`❌ Filtrando recomendación contradictoria: ${rec.recommendation}`);
        return false;
      }
      return true;
    });
  }
  
  return recommendations;
}

/**
 * Genera un mensaje contextual para la sesión
 */
export function generateContextualMessage(
  exercises: any[],
  recommendations: ConsolidatedRecommendation[]
): string {
  const context = analyzeSessionContext(exercises);
  
  if (exercises.length === 0) {
    return "Comienza agregando ejercicios según tu plan de entrenamiento";
  }
  
  if (context.isJustStarting && context.isSingleCategory) {
    const deficits = recommendations.filter(r => r.difference > 0);
    if (deficits.length > 0) {
      const mainDeficit = deficits[0];
      return `Buen comienzo con ${context.dominantCategory}. Continúa y agrega ${mainDeficit.subcategory || mainDeficit.category} para diversificar`;
    }
    return `Buen comienzo. Continúa agregando ejercicios para completar la sesión`;
  }
  
  if (context.totalMinutes > 60 && recommendations.length > 0) {
    const deficits = recommendations.filter(r => r.difference > 0);
    if (deficits.length > 0) {
      return `Sesión avanzada. Enfócate en agregar ${deficits[0].subcategory || deficits[0].category} para completar el balance`;
    }
  }
  
  return "Continúa construyendo tu sesión de entrenamiento";
}