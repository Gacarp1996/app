// src/utils/recommendations/filterByLevel.ts

import { RecommendationItem, HierarchyLevel } from './recommendationTypes';
import { detectHierarchyLevel } from './detectHierarchyLevel';

/**
 * Filtra las recomendaciones manteniendo solo las del nivel especificado
 * @param recommendations - Array completo de recomendaciones
 * @param targetLevel - Nivel a mantener
 * @param debugMode - Si mostrar logs detallados
 * @returns Array filtrado con solo las recomendaciones del nivel objetivo
 */
export function filterByLevel(
  recommendations: RecommendationItem[],
  targetLevel: HierarchyLevel,
  debugMode: boolean = false
): RecommendationItem[] {
  if (debugMode) {
    console.log(`🔽 Filtrando recomendaciones al nivel: ${targetLevel}`);
    console.log(`   Total antes de filtrar: ${recommendations.length}`);
  }

  const filtered = recommendations.filter(rec => {
    const level = detectHierarchyLevel(rec);
    const matches = level === targetLevel;
    
    if (debugMode && !matches) {
      console.log(`   ❌ Descartada (nivel ${level}): ${rec.category} > ${rec.subcategory || '-'} > ${rec.exercise || '-'}`);
    }
    
    return matches;
  });

  if (debugMode) {
    console.log(`✅ Total después de filtrar: ${filtered.length}`);
    filtered.forEach((rec, idx) => {
      console.log(`   [${idx}] ${rec.category} > ${rec.subcategory || '-'} > ${rec.exercise || '-'}`);
    });
  }

  return filtered;
}

/**
 * Filtra recomendaciones manteniendo solo las que cumplen un umbral de diferencia
 * @param recommendations - Recomendaciones a filtrar
 * @param minDifference - Diferencia mínima absoluta para mantener (default: 5)
 * @returns Recomendaciones filtradas
 */
export function filterByDifferenceThreshold(
  recommendations: RecommendationItem[],
  minDifference: number = 5
): RecommendationItem[] {
  return recommendations.filter(rec => Math.abs(rec.difference) >= minDifference);
}

/**
 * Separa las recomendaciones en déficits y excesos
 * @param recommendations - Recomendaciones a separar
 * @returns Objeto con arrays separados
 */
export function separateDeficitsAndExcesses(
  recommendations: RecommendationItem[]
): {
  deficits: RecommendationItem[];
  excesses: RecommendationItem[];
} {
  const deficits = recommendations.filter(rec => rec.difference > 0);
  const excesses = recommendations.filter(rec => rec.difference < 0);
  
  return { deficits, excesses };
}

/**
 * Limita el número de recomendaciones de déficit
 * @param recommendations - Recomendaciones a limitar
 * @param maxDeficits - Máximo de déficits a mantener (default: 2)
 * @param keepAllExcesses - Si mantener todos los excesos (default: true)
 * @returns Recomendaciones limitadas
 */
export function limitDeficitRecommendations(
  recommendations: RecommendationItem[],
  maxDeficits: number = 2,
  keepAllExcesses: boolean = true
): RecommendationItem[] {
  const { deficits, excesses } = separateDeficitsAndExcesses(recommendations);
  
  // Ordenar déficits por magnitud (mayor primero)
  const sortedDeficits = deficits.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  
  // Tomar solo los N déficits más importantes
  const limitedDeficits = sortedDeficits.slice(0, maxDeficits);
  
  // Combinar con excesos según configuración
  if (keepAllExcesses) {
    return [...limitedDeficits, ...excesses];
  } else {
    // También limitar excesos si se requiere
    const sortedExcesses = excesses.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
    return [...limitedDeficits, ...sortedExcesses.slice(0, maxDeficits)];
  }
}