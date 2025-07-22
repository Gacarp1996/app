// src/utils/recommendations/recommendationTypes.ts

/**
 * Nivel jerárquico de una recomendación
 */
export type HierarchyLevel = 'category' | 'subcategory' | 'exercise';

/**
 * Prioridad de una recomendación basada en la magnitud de la diferencia
 */
export type RecommendationPriority = 'high' | 'medium' | 'low';

/**
 * Intensidad para recomendaciones actionables
 */
export type IntensityLevel = 'MUCHO' | 'MODERADAMENTE' | 'LIGERAMENTE';

/**
 * Recomendación base del sistema
 */
export interface RecommendationItem {
  category: string;
  subcategory?: string;
  exercise?: string;
  currentPercentage: number;
  plannedPercentage: number;
  difference: number;
  priority: RecommendationPriority;
  recommendation: string;
}

/**
 * Recomendación consolidada con metadata adicional
 */
export interface ConsolidatedRecommendation extends RecommendationItem {
  consolidatedCount?: number;
  hierarchyLevel: HierarchyLevel;
}

/**
 * Recomendación actionable con información práctica para el usuario
 */
export interface ActionableRecommendation extends ConsolidatedRecommendation {
  actionableText: string;
  intensityLevel: IntensityLevel;
  calculatedMinutes: number;
  alternatives: string[];
}

/**
 * Grupo de recomendaciones organizadas por nivel jerárquico
 */
export interface HierarchyGroup {
  category: RecommendationItem[];
  subcategory: RecommendationItem[];
  exercise: RecommendationItem[];
}

/**
 * Estadísticas de presencia de niveles jerárquicos
 */
export interface HierarchyPresence {
  hasCategories: boolean;
  hasSubcategories: boolean;
  hasExercises: boolean;
  categoryCount: number;
  subcategoryCount: number;
  exerciseCount: number;
}

/**
 * Configuración para el proceso de consolidación
 */
export interface ConsolidationConfig {
  minDifferenceThreshold: number; // Diferencia mínima para considerar una recomendación (default: 5%)
  maxDeficitRecommendations: number; // Máximo de recomendaciones de déficit a mostrar (default: 2)
  debugMode: boolean; // Activar logs detallados
}