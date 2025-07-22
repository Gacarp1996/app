// src/utils/recommendations/generatePlayerRecommendations.ts

import { TrainingPlan } from '@/Database/FirebaseTrainingPlans';
import { RecommendationItem, ConsolidatedRecommendation } from './recommendationTypes';
import { calculateStatsFromExercises, convertPlanToPercentages } from './calculateStatistics';
import { consolidateHierarchicalRecommendations } from './consolidateHierarchicalRecommendations';
import { generateRecommendationsSummary } from './consolidateHierarchicalRecommendations';
import { analyzeCurrentSession, generateSmartSummary, filterRelevantRecommendations } from './smartRecommendations';
import { applyDefensiveLogic, adjustRecommendationsForRealism } from './defensiveLogic';
import { adjustRecommendationsForContext, filterContradictoryRecommendations, generateContextualMessage } from './sessionContextLogic';
import { generateSimpleMinuteRecommendations, validateMinuteCoherence } from './minuteBasedLogic';
import { generateDetailedMinuteRecommendations, analyzeSessionHistory, adjustRecommendationsForHistory } from './detailedMinuteRecommendations';

interface ExerciseData {
  tipo: string;
  area: string;
  ejercicio?: string;
  tiempoCantidad: string | number;
}

interface PlayerRecommendationResult {
  recommendations: ConsolidatedRecommendation[];
  summary: string;
  stats: {
    totalRecommendations: number;
    deficits: number;
    excesses: number;
  };
}

/**
 * Genera recomendaciones para un jugador comparando plan vs ejercicios realizados
 */
export function generatePlayerRecommendations(
  plan: TrainingPlan,
  exercises: ExerciseData[],
  options: {
    adaptedPlan?: boolean;
    maxDeficitRecommendations?: number;
    minDifferenceThreshold?: number;
    debugMode?: boolean;
    sessions?: any[]; // 🆕 Para analizar historial
    playerId?: string; // 🆕 Para filtrar historial
  } = {}
): PlayerRecommendationResult {
  
  const {
    adaptedPlan = false,
    maxDeficitRecommendations = 2,
    minDifferenceThreshold = 5,
    debugMode = false,
    sessions = [],
    playerId = ''
  } = options;

  if (debugMode) {
    console.log('🎯 Generando recomendaciones para jugador...');
    console.log('📝 Ejercicios recibidos:', exercises.map(ex => ({
      tipo: ex.tipo,
      area: ex.area,
      tiempo: ex.tiempoCantidad
    })));
  }

  // 🆕 USAR LÓGICA DETALLADA: Detecta automáticamente el nivel del plan
  const detailedRecommendations = generateDetailedMinuteRecommendations(
    plan,
    exercises,
    90, // duración objetivo de sesión
    debugMode
  );
  
  // 🆕 Analizar historial si está disponible
  let adjustedRecommendations = detailedRecommendations;
  if (sessions.length > 0 && playerId) {
    const recentHistory = analyzeSessionHistory(sessions, playerId, 7);
    adjustedRecommendations = adjustRecommendationsForHistory(
      detailedRecommendations,
      recentHistory,
      debugMode
    );
  }
  
  // Validar coherencia
  const validatedRecommendations = validateMinuteCoherence(
    adjustedRecommendations as ConsolidatedRecommendation[],
    exercises,
    debugMode
  );
  
  // Limitar a las más importantes
  const topRecommendations = validatedRecommendations
    .slice(0, maxDeficitRecommendations);
  
  // Generar resumen inteligente
  const summary = generateSmartSummaryForDetailedPlan(
    topRecommendations,
    detailedRecommendations
  );
  
  // Calcular estadísticas
  const deficits = topRecommendations.filter((r: ConsolidatedRecommendation) => r.difference > 0);
  const excesses = topRecommendations.filter((r: ConsolidatedRecommendation) => r.difference < 0);
  
  return {
    recommendations: topRecommendations,
    summary,
    stats: {
      totalRecommendations: topRecommendations.length,
      deficits: deficits.length,
      excesses: excesses.length
    }
  };
}

/**
 * Genera un resumen inteligente para planes detallados
 */
function generateSmartSummaryForDetailedPlan(
  recommendations: ConsolidatedRecommendation[],
  allRecommendations: any[]
): string {
  if (recommendations.length === 0) {
    return "✅ Sesión perfectamente balanceada según el plan detallado";
  }
  
  // Detectar el nivel de las recomendaciones
  const hasExercises = recommendations.some(r => r.exercise);
  const hasSubcategories = recommendations.some(r => r.subcategory && !r.exercise);
  
  if (hasExercises) {
    const exercises = recommendations
      .filter(r => r.exercise)
      .map(r => r.exercise)
      .slice(0, 2);
    return `Enfócate en: ${exercises.join(' y ')} para optimizar la sesión`;
  }
  
  if (hasSubcategories) {
    const areas = recommendations
      .filter(r => r.subcategory)
      .map(r => r.subcategory)
      .slice(0, 2);
    return `Trabaja ${areas.join(' y ')} para mantener el balance del plan`;
  }
  
  // Fallback para tipos generales
  return recommendations.length === 1
    ? `Falta agregar ${recommendations[0].category} para completar la sesión`
    : `Faltan ${recommendations.map(r => r.category).join(' y ')} para completar la sesión`;
}

/**
 * Compara estadísticas planificadas vs actuales y genera recomendaciones
 */
function compareStatsAndGenerateRecommendations(
  plannedStats: Record<string, number>,
  actualStats: Record<string, number>,
  debugMode: boolean
): RecommendationItem[] {
  
  if (debugMode) {
    console.log('🔍 Comparando plan vs realidad...');
    console.log('📊 Estadísticas actuales:', actualStats);
    console.log('📋 Estadísticas planificadas:', plannedStats);
  }

  const recommendations: RecommendationItem[] = [];

  // Comparar cada elemento del plan
  Object.entries(plannedStats).forEach(([key, plannedPercentage]) => {
    const currentPercentage = actualStats[key] || 0;
    const difference = plannedPercentage - currentPercentage;
    
    // Solo considerar diferencias significativas
    if (Math.abs(difference) > 5) {
      const [level, subcategory, exercise] = key.split('.');
      
      let categoryName: string;
      let actualCategory: string;
      let actualSubcategory: string | undefined;
      let actualExercise: string | undefined;
      
      // 🔧 Mapear correctamente los niveles
      if (level === 'tipo') {
        categoryName = subcategory; // El tipo real (ej: "Canasto", "Peloteo")
        actualCategory = subcategory;
        actualSubcategory = undefined;
        actualExercise = undefined;
      } else if (level === 'area') {
        categoryName = 'Área';
        actualCategory = 'Área';
        actualSubcategory = subcategory; // El área real (ej: "Juego de base")
        actualExercise = undefined;
      } else if (level === 'ejercicio') {
        categoryName = 'Ejercicio';
        actualCategory = 'Ejercicio';
        actualSubcategory = subcategory;
        actualExercise = exercise;
      } else {
        // Fallback
        categoryName = level;
        actualCategory = level;
        actualSubcategory = subcategory;
        actualExercise = exercise;
      }
      
      let displayName = actualSubcategory || actualCategory;
      if (actualExercise) {
        displayName = `${actualSubcategory} - ${actualExercise}`;
      }
      
      recommendations.push({
        category: actualCategory,
        subcategory: actualSubcategory,
        exercise: actualExercise,
        currentPercentage: Math.round(currentPercentage * 10) / 10,
        plannedPercentage: Math.round(plannedPercentage * 10) / 10,
        difference: Math.round(difference * 10) / 10,
        priority: Math.abs(difference) > 15 ? 'high' : Math.abs(difference) > 10 ? 'medium' : 'low',
        recommendation: difference > 0 
          ? `Incrementar ${displayName} en aproximadamente ${Math.round(difference)}%`
          : `Reducir ${displayName} en aproximadamente ${Math.round(Math.abs(difference))}%`
      });
    }
  });

  if (debugMode) {
    console.log(`📝 Generadas ${recommendations.length} recomendaciones brutas`);
  }

  return recommendations;
}

/**
 * Genera recomendaciones para múltiples jugadores
 */
export async function generateRecommendationsForPlayers(
  players: Array<{
    id: string;
    name: string;
    plan: TrainingPlan | null;
  }>,
  exercises: ExerciseData[],
  options: Parameters<typeof generatePlayerRecommendations>[2] = {}
): Promise<Record<string, PlayerRecommendationResult & { playerName: string; adaptedFrom?: string }>> {
  
  const results: Record<string, PlayerRecommendationResult & { playerName: string; adaptedFrom?: string }> = {};

  for (const player of players) {
    let plan = player.plan;
    let adaptedFrom: string | undefined;

    // Si no tiene plan, buscar de otro jugador
    if (!plan && players.length > 1) {
      const playerWithPlan = players.find(p => p.id !== player.id && p.plan);
      if (playerWithPlan && playerWithPlan.plan) {
        plan = playerWithPlan.plan;
        adaptedFrom = playerWithPlan.name;
      }
    }

    if (!plan) {
      // Sin plan disponible
      results[player.id] = {
        playerName: player.name,
        recommendations: [],
        summary: 'El jugador no tiene un plan de entrenamiento definido.',
        stats: {
          totalRecommendations: 0,
          deficits: 0,
          excesses: 0
        }
      };
      continue;
    }

    // Generar recomendaciones
    const result = generatePlayerRecommendations(plan, exercises, {
      ...options,
      adaptedPlan: !!adaptedFrom
    });

    results[player.id] = {
      ...result,
      playerName: player.name,
      adaptedFrom
    };
  }

  return results;
}