// src/utils/recommendations/index.ts

/**
 * Módulo de consolidación jerárquica de recomendaciones
 * 
 * Este módulo proporciona un sistema modular para procesar recomendaciones
 * de entrenamiento, eliminando contradicciones jerárquicas y consolidando
 * duplicados de forma inteligente.
 */

// Tipos principales
export * from './recommendationTypes';

// Funciones de detección y análisis
export { 
  detectHierarchyLevel,
  isValidRecommendation,
  generateRecommendationKey,
  getDisplayName
} from './detectHierarchyLevel';

// Agrupación jerárquica
export {
  groupByHierarchy,
  analyzeHierarchyPresence,
  detectHierarchicalConflicts
} from './groupByHierarchy';

// Selección de nivel dominante
export {
  selectDominantLevel,
  calculateDominanceScore,
  checkForcedLevel,
  type DominantLevelConfig
} from './selectDominantLevel';

// Filtrado
export {
  filterByLevel,
  filterByDifferenceThreshold,
  separateDeficitsAndExcesses,
  limitDeficitRecommendations
} from './filterByLevel';

// Fusión de duplicados
export {
  mergeDuplicates,
  sortConsolidatedRecommendations,
  type MergeConfig
} from './mergeDuplicates';

// Ajustes de tiempo prácticos
export {
  adjustToPracticalTimes,
  groupSmallRecommendations
} from './practicalTimeAdjustments';

// Detección de nivel del plan
export {
  analyzePlanDetail,
  extractPlanElements,
  type PlanDetailLevel
} from './planLevelDetector';

// Recomendaciones detalladas por nivel
export {
  generateDetailedMinuteRecommendations,
  analyzeSessionHistory,
  adjustRecommendationsForHistory
} from './detailedMinuteRecommendations';

// Lógica basada en minutos
export {
  convertToMinuteBasedRecommendations,
  validateMinuteCoherence,
  generateSimpleMinuteRecommendations
} from './minuteBasedLogic';

// Lógica contextual de sesión
export {
  analyzeSessionContext,
  adjustRecommendationsForContext,
  filterContradictoryRecommendations,
  generateContextualMessage
} from './sessionContextLogic';

// Lógica defensiva
export {
  applyDefensiveLogic,
  validateRecommendationsSanity,
  adjustRecommendationsForRealism
} from './defensiveLogic';

// Análisis inteligente de sesiones
export {
  analyzeCurrentSession,
  generateSmartSummary,
  filterRelevantRecommendations
} from './smartRecommendations';

// Funciones de normalización y cálculo
export {
  normalizeKey,
  parseTimeToMinutes
} from './normalizeData';

export {
  calculateStatsFromExercises,
  convertPlanToPercentages
} from './calculateStatistics';

// Función principal de generación de recomendaciones
export {
  generatePlayerRecommendations,
  generateRecommendationsForPlayers
} from './generatePlayerRecommendations';

// Función principal de consolidación
export {
  consolidateHierarchicalRecommendations,
  generateRecommendationsSummary
} from './consolidateHierarchicalRecommendations';

// Funciones para recomendaciones actionables
export {
  generateActionableRecommendations,
  generateActionableSummary
} from './actionableRecommendations';

// Re-exportar la función anterior para compatibilidad
export { consolidateHierarchicalRecommendations as consolidateRecommendations } from './consolidateHierarchicalRecommendations';