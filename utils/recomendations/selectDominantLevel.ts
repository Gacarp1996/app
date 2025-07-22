// src/utils/recommendations/selectDominantLevel.ts

import { HierarchyPresence, HierarchyLevel } from './recommendationTypes';

/**
 * Configuración para la selección del nivel dominante
 */
export interface DominantLevelConfig {
  minExercisesForDominance: number; // Mínimo de ejercicios para considerarlo dominante (default: 2)
  minSubcategoriesForDominance: number; // Mínimo de subcategorías para considerarlo dominante (default: 2)
  preferSpecificity: boolean; // Si preferir siempre el nivel más específico (default: true)
}

const DEFAULT_CONFIG: DominantLevelConfig = {
  minExercisesForDominance: 3, // 🔧 Aumentado de 2 a 3
  minSubcategoriesForDominance: 2,
  preferSpecificity: true
};

/**
 * Selecciona el nivel dominante basado en la presencia y cantidad de cada nivel
 * @param presence - Estadísticas de presencia de cada nivel
 * @param config - Configuración opcional
 * @param debugMode - Si mostrar logs detallados
 * @returns Nivel dominante seleccionado
 */
export function selectDominantLevel(
  presence: HierarchyPresence,
  config: Partial<DominantLevelConfig> = {},
  debugMode: boolean = false
): HierarchyLevel {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (debugMode) {
    console.log('🎯 Seleccionando nivel dominante...');
    console.log('   Presencia:', {
      exercises: presence.exerciseCount,
      subcategories: presence.subcategoryCount,
      categories: presence.categoryCount
    });
    console.log('   Configuración:', finalConfig);
  }

  // Lógica de decisión principal
  let selectedLevel: HierarchyLevel;
  let reason: string;

  // 1. Si hay suficientes ejercicios específicos, usar ese nivel
  if (presence.hasExercises && presence.exerciseCount >= finalConfig.minExercisesForDominance) {
    selectedLevel = 'exercise';
    reason = `Hay ${presence.exerciseCount} ejercicios (>= ${finalConfig.minExercisesForDominance})`;
  }
  // 2. Si hay suficientes subcategorías pero no ejercicios, usar subcategorías
  else if (presence.hasSubcategories && presence.subcategoryCount >= finalConfig.minSubcategoriesForDominance) {
    selectedLevel = 'subcategory';
    reason = `Hay ${presence.subcategoryCount} subcategorías (>= ${finalConfig.minSubcategoriesForDominance})`;
  }
  // 3. Caso especial: pocos ejercicios pero muchas subcategorías
  else if (presence.hasExercises && 
           presence.exerciseCount === 1 && 
           presence.subcategoryCount > 3) {
    selectedLevel = 'subcategory';
    reason = 'Solo 1 ejercicio pero muchas subcategorías (>3)';
  }
  // 4. 🆕 Si hay ejercicios pero también hay categorías de tipo/área, preferir categorías
  else if (presence.hasExercises && presence.hasCategories && 
           presence.categoryCount >= presence.exerciseCount) {
    selectedLevel = 'category';
    reason = `Hay ${presence.categoryCount} categorías importantes vs ${presence.exerciseCount} ejercicios`;
  }
  // 5. Si preferimos especificidad y hay algún ejercicio, usarlo
  else if (finalConfig.preferSpecificity && presence.hasExercises) {
    selectedLevel = 'exercise';
    reason = `Preferencia por especificidad con ${presence.exerciseCount} ejercicio(s)`;
  }
  // 6. Si hay subcategorías, usarlas
  else if (presence.hasSubcategories) {
    selectedLevel = 'subcategory';
    reason = `Hay ${presence.subcategoryCount} subcategoría(s) disponible(s)`;
  }
  // 7. Por defecto, usar categorías
  else {
    selectedLevel = 'category';
    reason = 'Solo hay categorías disponibles';
  }

  if (debugMode) {
    console.log(`✅ Nivel dominante seleccionado: ${selectedLevel}`);
    console.log(`   Razón: ${reason}`);
  }

  return selectedLevel;
}

/**
 * Evalúa si un nivel es suficientemente dominante sobre los demás
 * @param presence - Estadísticas de presencia
 * @param level - Nivel a evaluar
 * @returns Score de dominancia (0-100)
 */
export function calculateDominanceScore(
  presence: HierarchyPresence, 
  level: HierarchyLevel
): number {
  const total = presence.categoryCount + presence.subcategoryCount + presence.exerciseCount;
  
  if (total === 0) return 0;
  
  let count: number;
  switch (level) {
    case 'exercise':
      count = presence.exerciseCount;
      break;
    case 'subcategory':
      count = presence.subcategoryCount;
      break;
    case 'category':
      count = presence.categoryCount;
      break;
  }
  
  return Math.round((count / total) * 100);
}

/**
 * Determina si debemos forzar un nivel específico basado en reglas de negocio
 * @param presence - Estadísticas de presencia
 * @returns Nivel forzado o null si no hay forzado
 */
export function checkForcedLevel(presence: HierarchyPresence): HierarchyLevel | null {
  // Si SOLO hay un nivel presente, forzar ese nivel
  const levelsPresent = [
    presence.hasCategories,
    presence.hasSubcategories,
    presence.hasExercises
  ].filter(Boolean).length;
  
  if (levelsPresent === 1) {
    if (presence.hasExercises) return 'exercise';
    if (presence.hasSubcategories) return 'subcategory';
    if (presence.hasCategories) return 'category';
  }
  
  // Si hay una diferencia muy grande (90%+ en un nivel), forzar ese nivel
  const exerciseScore = calculateDominanceScore(presence, 'exercise');
  const subcategoryScore = calculateDominanceScore(presence, 'subcategory');
  const categoryScore = calculateDominanceScore(presence, 'category');
  
  if (exerciseScore >= 90) return 'exercise';
  if (subcategoryScore >= 90) return 'subcategory';
  if (categoryScore >= 90) return 'category';
  
  return null;
}