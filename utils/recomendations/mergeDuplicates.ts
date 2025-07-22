// src/utils/recommendations/mergeDuplicates.ts

import { RecommendationItem, HierarchyLevel, ConsolidatedRecommendation } from './recommendationTypes';
import { generateRecommendationKey, detectHierarchyLevel, getDisplayName } from './detectHierarchyLevel';

/**
 * Configuración para la fusión de duplicados
 */
export interface MergeConfig {
  cancelThreshold: number; // Si déficit y exceso se cancelan con diferencia menor a esto, omitir (default: 5)
  useWeightedAverage: boolean; // Usar promedio ponderado vs simple (default: true)
}

const DEFAULT_MERGE_CONFIG: MergeConfig = {
  cancelThreshold: 5,
  useWeightedAverage: true
};

/**
 * Fusiona recomendaciones duplicadas dentro del mismo nivel
 * @param recommendations - Recomendaciones del mismo nivel
 * @param level - Nivel jerárquico de las recomendaciones
 * @param config - Configuración de fusión
 * @param debugMode - Si mostrar logs
 * @returns Array consolidado sin duplicados
 */
export function mergeDuplicates(
  recommendations: RecommendationItem[],
  level: HierarchyLevel,
  config: Partial<MergeConfig> = {},
  debugMode: boolean = false
): ConsolidatedRecommendation[] {
  const finalConfig = { ...DEFAULT_MERGE_CONFIG, ...config };
  
  if (debugMode) {
    console.log(`🔀 Fusionando duplicados en nivel: ${level}`);
    console.log(`   Total a procesar: ${recommendations.length}`);
  }

  // Agrupar por clave única
  const groups = new Map<string, RecommendationItem[]>();
  
  recommendations.forEach(rec => {
    const key = generateRecommendationKey(rec, level);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(rec);
  });

  if (debugMode) {
    console.log(`   Grupos únicos encontrados: ${groups.size}`);
  }

  // Procesar cada grupo
  const consolidated: ConsolidatedRecommendation[] = [];
  
  groups.forEach((group, key) => {
    if (group.length === 1) {
      // No hay duplicados, convertir directamente
      consolidated.push({
        ...group[0],
        consolidatedCount: 1,
        hierarchyLevel: level
      });
      
      if (debugMode) {
        console.log(`   ✅ Sin duplicados: ${key}`);
      }
    } else {
      // Fusionar múltiples recomendaciones
      if (debugMode) {
        console.log(`   🔄 Fusionando ${group.length} duplicados para: ${key}`);
      }
      
      const merged = mergeGroup(group, level, finalConfig, debugMode);
      
      if (merged) { // null significa que se cancelaron
        consolidated.push({
          ...merged,
          consolidatedCount: group.length,
          hierarchyLevel: level
        });
      }
    }
  });

  if (debugMode) {
    console.log(`✅ Resultado: ${recommendations.length} → ${consolidated.length} recomendaciones`);
  }

  return consolidated;
}

/**
 * Fusiona un grupo de recomendaciones similares
 * @returns Recomendación fusionada o null si se cancelan
 */
function mergeGroup(
  group: RecommendationItem[],
  level: HierarchyLevel,
  config: MergeConfig,
  debugMode: boolean
): RecommendationItem | null {
  // Separar déficits y excesos
  const deficits = group.filter(r => r.difference > 0);
  const excesses = group.filter(r => r.difference < 0);
  
  // Verificar si se cancelan mutuamente
  if (deficits.length > 0 && excesses.length > 0) {
    const totalDeficit = deficits.reduce((sum, r) => sum + r.difference, 0);
    const totalExcess = Math.abs(excesses.reduce((sum, r) => sum + r.difference, 0));
    const netDifference = totalDeficit - totalExcess;
    
    if (debugMode) {
      console.log(`      Balance: +${totalDeficit.toFixed(1)} -${totalExcess.toFixed(1)} = ${netDifference.toFixed(1)}`);
    }
    
    if (Math.abs(netDifference) < config.cancelThreshold) {
      if (debugMode) {
        console.log(`      ❌ Se cancelan mutuamente (diferencia < ${config.cancelThreshold})`);
      }
      return null;
    }
  }
  
  // Calcular valores fusionados
  let mergedDifference: number;
  let mergedCurrent: number;
  let mergedPlanned: number;
  
  if (config.useWeightedAverage) {
    // Promedio ponderado por magnitud
    const totalWeight = group.reduce((sum, rec) => sum + Math.abs(rec.difference), 0);
    
    mergedDifference = 0;
    mergedCurrent = 0;
    mergedPlanned = 0;
    
    group.forEach(rec => {
      const weight = Math.abs(rec.difference) / totalWeight;
      mergedDifference += rec.difference * weight;
      mergedCurrent += rec.currentPercentage * weight;
      mergedPlanned += rec.plannedPercentage * weight;
    });
  } else {
    // Promedio simple
    mergedDifference = group.reduce((sum, r) => sum + r.difference, 0) / group.length;
    mergedCurrent = group.reduce((sum, r) => sum + r.currentPercentage, 0) / group.length;
    mergedPlanned = group.reduce((sum, r) => sum + r.plannedPercentage, 0) / group.length;
  }
  
  // Redondear valores
  mergedDifference = Math.round(mergedDifference * 10) / 10;
  mergedCurrent = Math.round(mergedCurrent * 10) / 10;
  mergedPlanned = Math.round(mergedPlanned * 10) / 10;
  
  // Seleccionar el elemento más representativo como base
  const base = selectMostRepresentative(group);
  
  // Determinar prioridad basada en la diferencia fusionada
  const priority = determinePriority(Math.abs(mergedDifference));
  
  // Generar texto de recomendación
  const displayName = getDisplayName(base, level);
  const action = mergedDifference > 0 ? 'Incrementar' : 'Reducir';
  const recommendation = `${action} ${displayName} en aproximadamente ${Math.round(Math.abs(mergedDifference))}%`;
  
  return {
    ...base,
    difference: mergedDifference,
    currentPercentage: mergedCurrent,
    plannedPercentage: mergedPlanned,
    priority,
    recommendation
  };
}

/**
 * Selecciona el elemento más representativo de un grupo
 */
function selectMostRepresentative(group: RecommendationItem[]): RecommendationItem {
  // Criterios de selección:
  // 1. Mayor especificidad (más campos llenos)
  // 2. Mayor diferencia absoluta
  // 3. Prioridad más alta
  
  return group.reduce((best, current) => {
    // Calcular score de especificidad
    const currentSpecificity = 
      (current.exercise ? 3 : 0) +
      (current.subcategory ? 2 : 0) +
      (current.category ? 1 : 0);
    
    const bestSpecificity = 
      (best.exercise ? 3 : 0) +
      (best.subcategory ? 2 : 0) +
      (best.category ? 1 : 0);
    
    // Comparar especificidad
    if (currentSpecificity > bestSpecificity) return current;
    if (currentSpecificity < bestSpecificity) return best;
    
    // Si igual especificidad, comparar diferencia
    if (Math.abs(current.difference) > Math.abs(best.difference)) return current;
    if (Math.abs(current.difference) < Math.abs(best.difference)) return best;
    
    // Si igual diferencia, comparar prioridad
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[current.priority] > priorityOrder[best.priority]) return current;
    
    return best;
  });
}

/**
 * Determina la prioridad basada en la magnitud de diferencia
 */
function determinePriority(magnitude: number): 'high' | 'medium' | 'low' {
  if (magnitude > 15) return 'high';
  if (magnitude > 10) return 'medium';
  return 'low';
}

/**
 * Ordena las recomendaciones consolidadas por prioridad
 * @param recommendations - Recomendaciones a ordenar
 * @param deficitsFirst - Si poner déficits primero (default: true)
 * @returns Array ordenado
 */
export function sortConsolidatedRecommendations(
  recommendations: ConsolidatedRecommendation[],
  deficitsFirst: boolean = true
): ConsolidatedRecommendation[] {
  return recommendations.sort((a, b) => {
    // Separar por tipo si se requiere
    if (deficitsFirst) {
      if (a.difference > 0 && b.difference <= 0) return -1;
      if (a.difference <= 0 && b.difference > 0) return 1;
    }
    
    // Dentro del mismo tipo, ordenar por:
    // 1. Prioridad
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    // 2. Magnitud de diferencia
    return Math.abs(b.difference) - Math.abs(a.difference);
  });
}