// src/utils/recommendations/practicalTimeAdjustments.ts

import { ConsolidatedRecommendation } from './recommendationTypes';

interface TimeThresholds {
  exercise: { min: number; increment: number };
  subcategory: { min: number; increment: number };
  category: { min: number; increment: number };
}

// Umbrales mínimos prácticos para tenis
const PRACTICAL_THRESHOLDS: TimeThresholds = {
  exercise: { min: 15, increment: 5 },     // Mínimo 15 min, incrementos de 5
  subcategory: { min: 20, increment: 10 }, // Mínimo 20 min, incrementos de 10
  category: { min: 30, increment: 15 }     // Mínimo 30 min, incrementos de 15
};

/**
 * Ajusta los tiempos recomendados a valores prácticos para una sesión de tenis
 * Acepta cualquier tipo que extienda ConsolidatedRecommendation
 */
export function adjustToPracticalTimes<T extends ConsolidatedRecommendation>(
  recommendations: T[],
  sessionDuration: number = 90,
  debugMode: boolean = false
): T[] {
  
  if (debugMode) {
    console.log('⏱️ Ajustando tiempos a valores prácticos...');
  }
  
  return recommendations.map(rec => {
    // Calcular minutos originales
    const originalMinutes = Math.round((rec.difference / 100) * sessionDuration);
    
    // Determinar el tipo de recomendación
    let thresholds: { min: number; increment: number };
    let recType: string;
    
    if (rec.hierarchyLevel === 'exercise' || rec.exercise) {
      thresholds = PRACTICAL_THRESHOLDS.exercise;
      recType = 'ejercicio';
    } else if (rec.hierarchyLevel === 'subcategory' || rec.subcategory) {
      thresholds = PRACTICAL_THRESHOLDS.subcategory;
      recType = 'subcategoría';
    } else {
      thresholds = PRACTICAL_THRESHOLDS.category;
      recType = 'categoría';
    }
    
    // Si es menor al mínimo, ajustar
    let adjustedMinutes = originalMinutes;
    
    if (originalMinutes < thresholds.min && originalMinutes > 5) {
      // Si faltan entre 5 y el mínimo, redondear al mínimo
      adjustedMinutes = thresholds.min;
    } else if (originalMinutes >= thresholds.min) {
      // Redondear al incremento más cercano
      adjustedMinutes = Math.round(originalMinutes / thresholds.increment) * thresholds.increment;
      // Asegurar que no baje del mínimo
      adjustedMinutes = Math.max(adjustedMinutes, thresholds.min);
    } else if (originalMinutes <= 5) {
      // Si faltan 5 minutos o menos, ignorar la recomendación
      if (debugMode) {
        console.log(`   ❌ Ignorando ${rec.subcategory || rec.category}: solo faltan ${originalMinutes} min`);
      }
      return null;
    }
    
    if (debugMode && originalMinutes !== adjustedMinutes) {
      console.log(`   📏 ${rec.subcategory || rec.category}: ${originalMinutes}min → ${adjustedMinutes}min (${recType})`);
    }
    
    // Actualizar la recomendación con el tiempo ajustado
    const newDifference = (adjustedMinutes / sessionDuration) * 100;
    
    return {
      ...rec,
      difference: newDifference,
      recommendation: generatePracticalRecommendation(rec, adjustedMinutes)
    } as T;
  }).filter(Boolean) as T[];
}

/**
 * Genera mensajes de recomendación prácticos
 */
function generatePracticalRecommendation(
  rec: ConsolidatedRecommendation,
  minutes: number
): string {
  // Para ejercicios específicos
  if (rec.exercise) {
    return `Trabajar ${minutes} minutos de ${rec.exercise} en ${rec.subcategory}`;
  }
  
  // Para subcategorías
  if (rec.subcategory && !rec.exercise) {
    return `Dedicar ${minutes} minutos a ${rec.subcategory}`;
  }
  
  // Para categorías generales
  return `Agregar ${minutes} minutos de ${rec.category}`;
}

/**
 * Agrupa recomendaciones pequeñas en una sesión combinada
 * Acepta cualquier tipo que extienda ConsolidatedRecommendation
 */
export function groupSmallRecommendations<T extends ConsolidatedRecommendation>(
  recommendations: T[],
  sessionDuration: number = 90,
  debugMode: boolean = false
): T[] {
  
  // Separar recomendaciones grandes y pequeñas
  const largeRecs: T[] = [];
  const smallRecs: T[] = [];
  
  recommendations.forEach(rec => {
    const minutes = Math.round((rec.difference / 100) * sessionDuration);
    if (minutes < 15) {
      smallRecs.push(rec);
    } else {
      largeRecs.push(rec);
    }
  });
  
  // Si hay varias recomendaciones pequeñas del mismo tipo, agruparlas
  if (smallRecs.length >= 2) {
    const groupedByCategory = new Map<string, T[]>();
    
    smallRecs.forEach(rec => {
      const key = rec.category;
      if (!groupedByCategory.has(key)) {
        groupedByCategory.set(key, []);
      }
      groupedByCategory.get(key)!.push(rec);
    });
    
    // Crear recomendaciones agrupadas
    groupedByCategory.forEach((recs, category) => {
      if (recs.length >= 2) {
        const totalMinutes = recs.reduce((sum, rec) => {
          return sum + Math.round((rec.difference / 100) * sessionDuration);
        }, 0);
        
        const subcategories = [...new Set(recs.map(r => r.subcategory).filter(Boolean))];
        
        if (totalMinutes >= 20) {
          if (debugMode) {
            console.log(`   🔄 Agrupando ${recs.length} ejercicios de ${category}: ${totalMinutes} min total`);
          }
          
          // Crear una recomendación agrupada manteniendo las propiedades del tipo original
          const groupedRec = {
            ...recs[0], // Copiar todas las propiedades del primer elemento
            subcategory: subcategories.join(' + '),
            exercise: undefined,
            plannedPercentage: recs.reduce((sum, r) => sum + r.plannedPercentage, 0),
            difference: (totalMinutes / sessionDuration) * 100,
            priority: 'medium' as const,
            recommendation: `Sesión combinada de ${totalMinutes} minutos: ${subcategories.join(' y ')}`,
            consolidatedCount: recs.length,
            hierarchyLevel: 'subcategory' as const
          } as T;
          
          largeRecs.push(groupedRec);
        }
      }
    });
  }
  
  return largeRecs;
}