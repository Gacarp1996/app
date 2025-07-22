// src/utils/recommendations/detectHierarchyLevel.ts

import { RecommendationItem, HierarchyLevel } from './recommendationTypes';

/**
 * Detecta el nivel jerárquico de una recomendación
 * @param recommendation - Recomendación a analizar
 * @returns Nivel jerárquico detectado
 */
export function detectHierarchyLevel(recommendation: RecommendationItem): HierarchyLevel {
  // Verificar de más específico a más general
  if (recommendation.exercise && recommendation.exercise.trim() !== '') {
    return 'exercise';
  }
  
  if (recommendation.subcategory && recommendation.subcategory.trim() !== '') {
    return 'subcategory';
  }
  
  return 'category';
}

/**
 * Valida que una recomendación tenga los campos mínimos requeridos
 * @param recommendation - Recomendación a validar
 * @returns true si es válida, false si no
 */
export function isValidRecommendation(recommendation: RecommendationItem): boolean {
  // Debe tener al menos una categoría
  if (!recommendation.category || recommendation.category.trim() === '') {
    console.warn('⚠️ Recomendación inválida: falta categoría', recommendation);
    return false;
  }
  
  // Debe tener porcentajes válidos
  if (typeof recommendation.currentPercentage !== 'number' || 
      typeof recommendation.plannedPercentage !== 'number' ||
      typeof recommendation.difference !== 'number') {
    console.warn('⚠️ Recomendación inválida: porcentajes incorrectos', recommendation);
    return false;
  }
  
  // Si tiene ejercicio, debe tener subcategoría
  if (recommendation.exercise && !recommendation.subcategory) {
    console.warn('⚠️ Recomendación inválida: ejercicio sin subcategoría', recommendation);
    return false;
  }
  
  return true;
}

/**
 * Genera una clave única para identificar recomendaciones duplicadas
 * @param recommendation - Recomendación
 * @param level - Nivel jerárquico a usar para la clave
 * @returns Clave única normalizada
 */
export function generateRecommendationKey(
  recommendation: RecommendationItem, 
  level: HierarchyLevel
): string {
  const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');
  
  switch (level) {
    case 'exercise':
      return `${normalize(recommendation.category)}.${normalize(recommendation.subcategory || '')}.${normalize(recommendation.exercise || '')}`;
    
    case 'subcategory':
      return `${normalize(recommendation.category)}.${normalize(recommendation.subcategory || '')}`;
    
    case 'category':
      return normalize(recommendation.category);
    
    default:
      return normalize(recommendation.category);
  }
}

/**
 * Extrae el nombre display de una recomendación según su nivel
 * @param recommendation - Recomendación
 * @param level - Nivel jerárquico
 * @returns Nombre para mostrar al usuario
 */
export function getDisplayName(
  recommendation: RecommendationItem, 
  level: HierarchyLevel
): string {
  switch (level) {
    case 'exercise':
      return recommendation.exercise 
        ? `${recommendation.subcategory || recommendation.category} - ${recommendation.exercise}`
        : recommendation.subcategory || recommendation.category;
    
    case 'subcategory':
      return recommendation.subcategory || recommendation.category;
    
    case 'category':
      return recommendation.category;
    
    default:
      return recommendation.category;
  }
}