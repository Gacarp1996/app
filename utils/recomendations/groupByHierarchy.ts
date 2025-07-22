// src/utils/recommendations/groupByHierarchy.ts

import { RecommendationItem, HierarchyGroup, HierarchyPresence } from './recommendationTypes';
import { detectHierarchyLevel, isValidRecommendation } from './detectHierarchyLevel';

/**
 * Agrupa las recomendaciones por su nivel jerárquico
 * @param recommendations - Array de recomendaciones a agrupar
 * @param debugMode - Si activar logs detallados
 * @returns Objeto con las recomendaciones agrupadas por nivel
 */
export function groupByHierarchy(
  recommendations: RecommendationItem[], 
  debugMode: boolean = false
): HierarchyGroup {
  const groups: HierarchyGroup = {
    category: [],
    subcategory: [],
    exercise: []
  };

  if (debugMode) {
    console.log('📊 Agrupando recomendaciones por jerarquía...');
    console.log(`   Total a procesar: ${recommendations.length}`);
  }

  // Filtrar recomendaciones válidas y agrupar
  const validRecommendations = recommendations.filter(isValidRecommendation);
  
  if (debugMode && validRecommendations.length < recommendations.length) {
    console.warn(`⚠️ Se descartaron ${recommendations.length - validRecommendations.length} recomendaciones inválidas`);
  }

  validRecommendations.forEach((rec, index) => {
    const level = detectHierarchyLevel(rec);
    groups[level].push(rec);
    
    if (debugMode) {
      console.log(`   [${index}] ${rec.category} > ${rec.subcategory || '-'} > ${rec.exercise || '-'} → Nivel: ${level}`);
    }
  });

  if (debugMode) {
    console.log('📊 Resultado de agrupación:', {
      category: groups.category.length,
      subcategory: groups.subcategory.length,
      exercise: groups.exercise.length
    });
  }

  return groups;
}

/**
 * Analiza la presencia de cada nivel jerárquico en las recomendaciones
 * @param groups - Grupos de recomendaciones ya organizados
 * @returns Estadísticas de presencia
 */
export function analyzeHierarchyPresence(groups: HierarchyGroup): HierarchyPresence {
  return {
    hasCategories: groups.category.length > 0,
    hasSubcategories: groups.subcategory.length > 0,
    hasExercises: groups.exercise.length > 0,
    categoryCount: groups.category.length,
    subcategoryCount: groups.subcategory.length,
    exerciseCount: groups.exercise.length
  };
}

/**
 * Detecta si hay conflictos jerárquicos (mismo elemento en diferentes niveles)
 * @param groups - Grupos de recomendaciones
 * @param debugMode - Si mostrar logs
 * @returns Array de conflictos detectados
 */
export function detectHierarchicalConflicts(
  groups: HierarchyGroup, 
  debugMode: boolean = false
): Array<{
  type: 'category-subcategory' | 'subcategory-exercise';
  generalLevel: string;
  specificLevel: string;
  conflict: string;
}> {
  const conflicts: Array<{
    type: 'category-subcategory' | 'subcategory-exercise';
    generalLevel: string;
    specificLevel: string;
    conflict: string;
  }> = [];

  if (debugMode) {
    console.log('🔍 Detectando conflictos jerárquicos...');
  }

  // Mapeos conocidos de jerarquías
  const categoryMappings: Record<string, string[]> = {
    'área': ['peloteo', 'juego de base', 'juego de red', 'puntos', 'saque', 'primeras pelotas'],
    'juego de base': ['peloteo', 'fondo'],
    'técnica': ['saque', 'servicio'],
    'físico': ['preparación física'],
    'juego de red': ['voleas']
  };

  // Verificar conflictos categoría vs subcategoría
  groups.category.forEach(catRec => {
    const catName = catRec.category.toLowerCase().trim();
    
    groups.subcategory.forEach(subRec => {
      const subName = (subRec.subcategory || '').toLowerCase().trim();
      
      // Verificar si la subcategoría pertenece a esta categoría
      if (categoryMappings[catName]?.includes(subName) || 
          catRec.category === subRec.category) {
        conflicts.push({
          type: 'category-subcategory',
          generalLevel: 'category',
          specificLevel: 'subcategory',
          conflict: `"${catRec.category}" vs "${subRec.subcategory || subRec.category}"`
        });
        
        if (debugMode) {
          console.log(`   ⚠️ Conflicto categoria-subcategoria: ${catRec.category} → ${subRec.subcategory}`);
        }
      }
    });
  });

  // Verificar conflictos subcategoría vs ejercicio
  groups.subcategory.forEach(subRec => {
    groups.exercise.forEach(exRec => {
      if (subRec.category === exRec.category && 
          subRec.subcategory === exRec.subcategory) {
        conflicts.push({
          type: 'subcategory-exercise',
          generalLevel: 'subcategory',
          specificLevel: 'exercise',
          conflict: `"${subRec.subcategory}" vs "${exRec.exercise}"`
        });
        
        if (debugMode) {
          console.log(`   ⚠️ Conflicto subcategoria-ejercicio: ${subRec.subcategory} → ${exRec.exercise}`);
        }
      }
    });
  });

  if (debugMode) {
    console.log(`🔍 Total conflictos detectados: ${conflicts.length}`);
  }

  return conflicts;
}