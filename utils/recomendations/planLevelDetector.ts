// src/utils/recommendations/planLevelDetector.ts

import { TrainingPlan } from '@/Database/FirebaseTrainingPlans';

export type PlanDetailLevel = 'exercise' | 'subcategory' | 'type';

interface PlanAnalysis {
  dominantLevel: PlanDetailLevel;
  hasExercises: boolean;
  hasSubcategories: boolean;
  exerciseCount: number;
  subcategoryCount: number;
  typeCount: number;
}

/**
 * Analiza un plan de entrenamiento para determinar su nivel de detalle
 */
export function analyzePlanDetail(plan: TrainingPlan): PlanAnalysis {
  let exerciseCount = 0;
  let subcategoryCount = 0;
  let typeCount = 0;
  let hasExercises = false;
  let hasSubcategories = false;

  // Recorrer la estructura del plan
  Object.entries(plan.planificacion).forEach(([tipo, tipoData]) => {
    if (tipoData.porcentajeTotal > 0) {
      typeCount++;
    }

    // Revisar áreas/subcategorías
    if (tipoData.areas) {
      Object.entries(tipoData.areas).forEach(([area, areaData]) => {
        if (areaData.porcentajeDelTotal > 0) {
          subcategoryCount++;
          hasSubcategories = true;
        }

        // Revisar ejercicios específicos
        if (areaData.ejercicios) {
          Object.entries(areaData.ejercicios).forEach(([ejercicio, ejercicioData]) => {
            if (ejercicioData.porcentajeDelTotal > 0) {
              exerciseCount++;
              hasExercises = true;
            }
          });
        }
      });
    }
  });

  // Determinar el nivel dominante
  let dominantLevel: PlanDetailLevel = 'type';
  
  if (hasExercises && exerciseCount >= 4) {
    // Si hay al menos 4 ejercicios definidos, usar ese nivel
    dominantLevel = 'exercise';
  } else if (hasSubcategories && subcategoryCount >= 3) {
    // Si hay al menos 3 subcategorías, usar ese nivel
    dominantLevel = 'subcategory';
  }

  return {
    dominantLevel,
    hasExercises,
    hasSubcategories,
    exerciseCount,
    subcategoryCount,
    typeCount
  };
}

/**
 * Extrae los elementos del plan según el nivel especificado
 */
export function extractPlanElements(
  plan: TrainingPlan, 
  level: PlanDetailLevel
): Array<{
  key: string;
  name: string;
  type: string;
  subcategory?: string;
  exercise?: string;
  targetPercentage: number;
  targetMinutes: number;
}> {
  const elements: Array<any> = [];
  const sessionDuration = 90; // Duración estándar

  Object.entries(plan.planificacion).forEach(([tipo, tipoData]) => {
    if (level === 'type') {
      // Solo extraer tipos
      if (tipoData.porcentajeTotal > 0) {
        elements.push({
          key: tipo.toLowerCase(),
          name: tipo,
          type: tipo,
          targetPercentage: tipoData.porcentajeTotal,
          targetMinutes: Math.round((tipoData.porcentajeTotal / 100) * sessionDuration)
        });
      }
    } else if (tipoData.areas) {
      Object.entries(tipoData.areas).forEach(([area, areaData]) => {
        const areaPercentage = (tipoData.porcentajeTotal * areaData.porcentajeDelTotal) / 100;
        
        if (level === 'subcategory') {
          // Extraer subcategorías
          if (areaPercentage > 0) {
            elements.push({
              key: `${tipo.toLowerCase()}.${area.toLowerCase()}`,
              name: area,
              type: tipo,
              subcategory: area,
              targetPercentage: areaPercentage,
              targetMinutes: Math.round((areaPercentage / 100) * sessionDuration)
            });
          }
        } else if (level === 'exercise' && areaData.ejercicios) {
          // Extraer ejercicios específicos
          Object.entries(areaData.ejercicios).forEach(([ejercicio, ejercicioData]) => {
            const exercisePercentage = (areaPercentage * ejercicioData.porcentajeDelTotal) / 100;
            
            if (exercisePercentage > 0) {
              elements.push({
                key: `${tipo.toLowerCase()}.${area.toLowerCase()}.${ejercicio.toLowerCase()}`,
                name: ejercicio,
                type: tipo,
                subcategory: area,
                exercise: ejercicio,
                targetPercentage: exercisePercentage,
                targetMinutes: Math.round((exercisePercentage / 100) * sessionDuration)
              });
            }
          });
        }
      });
    }
  });

  return elements.sort((a, b) => b.targetMinutes - a.targetMinutes);
}