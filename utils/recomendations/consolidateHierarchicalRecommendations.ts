// src/utils/recommendations/consolidateHierarchicalRecommendations.ts

import { 
  RecommendationItem, 
  ConsolidatedRecommendation,
  ConsolidationConfig 
} from './recommendationTypes';
import { groupByHierarchy, analyzeHierarchyPresence } from './groupByHierarchy';
import { selectDominantLevel, checkForcedLevel } from './selectDominantLevel';
import { filterByLevel, filterByDifferenceThreshold, limitDeficitRecommendations } from './filterByLevel';
import { mergeDuplicates, sortConsolidatedRecommendations } from './mergeDuplicates';

const DEFAULT_CONFIG: ConsolidationConfig = {
  minDifferenceThreshold: 5,
  maxDeficitRecommendations: 2,
  debugMode: false
};

/**
 * Consolida recomendaciones aplicando lógica jerárquica estricta
 * 
 * Proceso:
 * 1. Agrupa por nivel jerárquico
 * 2. Detecta el nivel dominante
 * 3. Filtra solo ese nivel
 * 4. Fusiona duplicados
 * 5. Aplica límites y ordenamiento
 * 
 * @param recommendations - Array de recomendaciones sin procesar
 * @param config - Configuración opcional
 * @returns Array consolidado sin contradicciones jerárquicas
 */
export function consolidateHierarchicalRecommendations(
  recommendations: RecommendationItem[],
  config: Partial<ConsolidationConfig> = {}
): ConsolidatedRecommendation[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (finalConfig.debugMode) {
    console.log('');
    console.log('='.repeat(60));
    console.log('🎯 CONSOLIDACIÓN JERÁRQUICA DE RECOMENDACIONES');
    console.log('='.repeat(60));
    console.log(`📥 Entrada: ${recommendations.length} recomendaciones`);
    console.log(`⚙️ Configuración:`, finalConfig);
  }

  // Validación inicial
  if (!recommendations || recommendations.length === 0) {
    if (finalConfig.debugMode) {
      console.log('⚠️ No hay recomendaciones para procesar');
    }
    return [];
  }

  try {
    // PASO 1: Agrupar por jerarquía
    if (finalConfig.debugMode) {
      console.log('\n📊 PASO 1: Agrupando por jerarquía...');
    }
    const groups = groupByHierarchy(recommendations, finalConfig.debugMode);
    const presence = analyzeHierarchyPresence(groups);

    // PASO 2: Determinar nivel dominante
    if (finalConfig.debugMode) {
      console.log('\n🎯 PASO 2: Determinando nivel dominante...');
    }
    
    // Verificar si hay un nivel forzado
    const forcedLevel = checkForcedLevel(presence);
    const dominantLevel = forcedLevel || selectDominantLevel(presence, {}, finalConfig.debugMode);
    
    if (finalConfig.debugMode && forcedLevel) {
      console.log(`⚡ Nivel forzado detectado: ${forcedLevel}`);
    }

    // PASO 3: Filtrar por nivel dominante
    if (finalConfig.debugMode) {
      console.log(`\n🔽 PASO 3: Filtrando al nivel "${dominantLevel}"...`);
    }
    const filteredByLevel = filterByLevel(recommendations, dominantLevel, finalConfig.debugMode);

    // PASO 4: Fusionar duplicados
    if (finalConfig.debugMode) {
      console.log('\n🔀 PASO 4: Fusionando duplicados...');
    }
    const merged = mergeDuplicates(
      filteredByLevel, 
      dominantLevel,
      {},
      finalConfig.debugMode
    );

    // PASO 5: Aplicar filtros adicionales
    if (finalConfig.debugMode) {
      console.log('\n🔧 PASO 5: Aplicando filtros finales...');
    }
    
    // Filtrar por umbral de diferencia
    const thresholdFiltered = filterByDifferenceThreshold(
      merged,
      finalConfig.minDifferenceThreshold
    );
    
    if (finalConfig.debugMode && thresholdFiltered.length < merged.length) {
      console.log(`   Filtradas ${merged.length - thresholdFiltered.length} recomendaciones con diferencia < ${finalConfig.minDifferenceThreshold}%`);
    }

    // Limitar déficits
    const limited = limitDeficitRecommendations(
      thresholdFiltered,
      finalConfig.maxDeficitRecommendations
    );
    
    if (finalConfig.debugMode && limited.length < thresholdFiltered.length) {
      console.log(`   Limitadas a ${finalConfig.maxDeficitRecommendations} recomendaciones de déficit`);
    }

    // PASO 6: Ordenar resultado final
    if (finalConfig.debugMode) {
      console.log('\n📋 PASO 6: Ordenando resultado final...');
    }
    const sorted = sortConsolidatedRecommendations(limited as ConsolidatedRecommendation[]);

    // Resumen final
    if (finalConfig.debugMode) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ CONSOLIDACIÓN COMPLETADA');
      console.log(`📊 Resultado: ${recommendations.length} → ${sorted.length} recomendaciones`);
      console.log(`🎯 Nivel usado: ${dominantLevel}`);
      
      const deficits = sorted.filter(r => r.difference > 0);
      const excesses = sorted.filter(r => r.difference < 0);
      console.log(`📈 Déficits: ${deficits.length}`);
      console.log(`📉 Excesos: ${excesses.length}`);
      
      if (sorted.length > 0) {
        console.log('\n🎯 Recomendaciones finales:');
        sorted.forEach((rec, idx) => {
          const type = rec.difference > 0 ? 'FALTA' : 'SOBRA';
          const name = rec.exercise || rec.subcategory || rec.category;
          console.log(`   ${idx + 1}. ${type} ${name} (${rec.difference > 0 ? '+' : ''}${rec.difference}%)`);
        });
      }
      console.log('='.repeat(60));
      console.log('');
    }

    return sorted;

  } catch (error) {
    console.error('❌ Error en consolidación jerárquica:', error);
    if (finalConfig.debugMode) {
      console.error('Stack trace:', error);
    }
    // En caso de error, devolver array vacío en lugar de fallar
    return [];
  }
}

/**
 * Genera un resumen de texto para las recomendaciones consolidadas
 * @param recommendations - Recomendaciones consolidadas
 * @param adaptedPlan - Si el plan fue adaptado de otro jugador
 * @returns Texto de resumen
 */
export function generateRecommendationsSummary(
  recommendations: ConsolidatedRecommendation[],
  adaptedPlan: boolean = false
): string {
  if (recommendations.length === 0) {
    return `El entrenamiento está bien balanceado según el plan${adaptedPlan ? ' adaptado' : ''}. ¡Continúa así!`;
  }

  const deficits = recommendations.filter(r => r.difference > 0);
  const excesses = recommendations.filter(r => r.difference < 0);
  
  if (deficits.length > 0 && excesses.length === 0) {
    return deficits.length === 1
      ? `Se detectó 1 área que necesita más tiempo de entrenamiento.`
      : `Enfoque principal: incrementar ${deficits.length} áreas que necesitan más tiempo.`;
  }
  
  if (deficits.length === 0 && excesses.length > 0) {
    return excesses.length === 1
      ? `Se detectó 1 área con exceso de tiempo que podrías reducir.`
      : `Se detectaron ${excesses.length} áreas con exceso de tiempo.`;
  }
  
  return `Se detectaron ${deficits.length} áreas con déficit y ${excesses.length} con exceso de tiempo.`;
}