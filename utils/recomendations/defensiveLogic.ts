// src/utils/recommendations/defensiveLogic.ts

import { RecommendationItem, ConsolidatedRecommendation } from './recommendationTypes';

/**
 * Aplica lógica defensiva para evitar recomendaciones contradictorias
 * @param recommendations - Recomendaciones a validar
 * @param exercises - Ejercicios actuales de la sesión
 * @param debugMode - Si mostrar logs
 * @returns Recomendaciones filtradas sin contradicciones
 */
export function applyDefensiveLogic(
  recommendations: ConsolidatedRecommendation[],
  exercises: any[],
  debugMode: boolean = false
): ConsolidatedRecommendation[] {
  
  if (debugMode) {
    console.log('🛡️ Aplicando lógica defensiva...');
  }
  
  // 1. Identificar qué ejercicios/áreas se están entrenando
  const trainedExercises = new Set<string>();
  const trainedAreas = new Set<string>();
  const trainedTypes = new Set<string>();
  
  exercises.forEach(ex => {
    // Normalizar nombres para comparación consistente
    const normalizedArea = ex.area?.toLowerCase().trim() || '';
    const normalizedTipo = ex.tipo?.toLowerCase().trim() || '';
    const normalizedExercise = ex.ejercicio?.toLowerCase().trim() || '';
    
    if (normalizedExercise) {
      trainedExercises.add(`${normalizedArea}.${normalizedExercise}`);
    }
    if (normalizedArea) {
      trainedAreas.add(normalizedArea);
    }
    if (normalizedTipo) {
      trainedTypes.add(normalizedTipo);
    }
  });
  
  if (debugMode) {
    console.log('   Ejercicios entrenados:', Array.from(trainedExercises));
    console.log('   Áreas entrenadas:', Array.from(trainedAreas));
    console.log('   Tipos entrenados:', Array.from(trainedTypes));
  }
  
  // 2. Filtrar recomendaciones aplicando reglas defensivas
  const filtered = recommendations.filter(rec => {
    // Regla 1: Si es el ÚNICO ejercicio/área/tipo entrenado, no puede tener exceso
    if (rec.difference < 0) { // Es un exceso
      
      // Verificar si es el único ejercicio del área
      if (rec.exercise && trainedAreas.size === 1) {
        const recArea = rec.subcategory?.toLowerCase().trim() || '';
        // Si solo entrenamos una área y es la misma que la recomendación
        if (Array.from(trainedAreas).some(area => 
          area === recArea || area === 'fondo' && recArea === 'juego de base' || 
          area === 'juego de base' && recArea === 'fondo'
        )) {
          if (debugMode) {
            console.log(`   ❌ Omitiendo exceso de "${rec.exercise}" - todos los ejercicios son de la misma área`);
          }
          return false;
        }
      }
      
      // Verificar si es la única área entrenada
      if (rec.subcategory && trainedAreas.size === 1 && trainedAreas.has(rec.subcategory)) {
        if (debugMode) {
          console.log(`   ❌ Omitiendo exceso de área "${rec.subcategory}" - es la única área entrenada`);
        }
        return false;
      }
      
      // Verificar si es el único tipo entrenado
      if (rec.category && trainedTypes.size === 1 && trainedTypes.has(rec.category)) {
        if (debugMode) {
          console.log(`   ❌ Omitiendo exceso de tipo "${rec.category}" - es el único tipo entrenado`);
        }
        return false;
      }
      
      // Regla 2: Si el exceso es mayor al 90%, probablemente es porque es lo único que se entrena
      if (Math.abs(rec.difference) > 90) {
        if (debugMode) {
          console.log(`   ❌ Omitiendo exceso extremo (${rec.difference}%) - probablemente es lo único entrenado`);
        }
        return false;
      }
    }
    
    return true; // Mantener la recomendación
  });
  
  if (debugMode) {
    console.log(`✅ Lógica defensiva aplicada: ${recommendations.length} → ${filtered.length} recomendaciones`);
  }
  
  return filtered;
}

/**
 * Valida si las recomendaciones tienen sentido en el contexto de la sesión
 * @param recommendations - Recomendaciones a validar
 * @param sessionDuration - Duración total de la sesión en minutos
 * @returns true si las recomendaciones son válidas
 */
export function validateRecommendationsSanity(
  recommendations: ConsolidatedRecommendation[],
  sessionDuration: number
): boolean {
  
  // Verificar que la suma de déficits no exceda el tiempo disponible
  const totalDeficitTime = recommendations
    .filter(r => r.difference > 0)
    .reduce((sum, r) => sum + (r.difference * sessionDuration / 100), 0);
  
  if (totalDeficitTime > sessionDuration * 1.5) {
    console.warn('⚠️ Las recomendaciones de déficit exceden el tiempo disponible');
    return false;
  }
  
  // Verificar que no haya contradicciones (déficit y exceso del mismo elemento)
  const elements = new Set<string>();
  for (const rec of recommendations) {
    const key = `${rec.category}.${rec.subcategory || ''}.${rec.exercise || ''}`;
    if (elements.has(key)) {
      console.warn('⚠️ Recomendación duplicada o contradictoria:', key);
      return false;
    }
    elements.add(key);
  }
  
  return true;
}

/**
 * Ajusta las recomendaciones para que sean más realistas
 * @param recommendations - Recomendaciones a ajustar
 * @param currentExercises - Ejercicios actuales
 * @returns Recomendaciones ajustadas
 */
export function adjustRecommendationsForRealism(
  recommendations: ConsolidatedRecommendation[],
  currentExercises: any[]
): ConsolidatedRecommendation[] {
  
  // Si no hay ejercicios, mantener las recomendaciones originales
  if (currentExercises.length === 0) {
    return recommendations;
  }
  
  // Calcular el tiempo total actual
  const totalCurrentTime = currentExercises.reduce((sum, ex) => {
    const time = parseFloat(ex.tiempoCantidad) || 0;
    return sum + time;
  }, 0);
  
  return recommendations.map(rec => {
    // Para déficits muy grandes cuando hay poco tiempo total
    if (rec.difference > 50 && totalCurrentTime < 30) {
      return {
        ...rec,
        recommendation: rec.recommendation.replace(
          /en aproximadamente \d+%/,
          'significativamente - comienza agregando ejercicios de esta área'
        )
      };
    }
    
    // Para excesos cuando es el elemento principal
    if (rec.difference < -50 && currentExercises.length <= 2) {
      return {
        ...rec,
        recommendation: rec.recommendation.replace(
          /Reducir/,
          'Balancear agregando otros ejercicios en lugar de reducir'
        )
      };
    }
    
    return rec;
  });
}