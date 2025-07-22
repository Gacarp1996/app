// src/utils/recommendations/calculateStatistics.ts

import { TrainingPlan } from '@/Database/FirebaseTrainingPlans';
import { normalizeKey, parseTimeToMinutes } from './normalizeData';

interface ExerciseData {
  tipo: string;
  area: string;
  ejercicio?: string;
  tiempoCantidad: string | number;
}

interface TimeStats {
  [key: string]: {
    totalTime: number;
    count: number;
  };
}

/**
 * Calcula estadísticas de tiempo por tipo/área/ejercicio
 */
export function calculateStatsFromExercises(exercises: ExerciseData[]): Record<string, number> {
  if (!exercises || exercises.length === 0) {
    console.log('📊 Sin ejercicios para calcular estadísticas');
    return {};
  }

  console.log('📊 Calculando estadísticas de ejercicios:', {
    count: exercises.length,
    exercises: exercises.map(ex => ({ 
      tipo: ex.tipo, 
      area: ex.area, 
      tiempo: ex.tiempoCantidad,
      ejercicio: ex.ejercicio 
    }))
  });
  
  const stats: TimeStats = {};
  let totalTime = 0;

  exercises.forEach((ejercicio, index) => {
    const type = normalizeKey(ejercicio.tipo);
    const area = normalizeKey(ejercicio.area);
    const exercise = ejercicio.ejercicio;
    const timeInMinutes = parseTimeToMinutes(ejercicio.tiempoCantidad);
    
    totalTime += timeInMinutes;

    console.log(`  📝 Ejercicio ${index + 1}: ${type} > ${area} > ${exercise} (${timeInMinutes}min)`);

    // Estadísticas por tipo
    const typeKey = `tipo.${type}`;
    if (!stats[typeKey]) stats[typeKey] = { totalTime: 0, count: 0 };
    stats[typeKey].totalTime += timeInMinutes;
    stats[typeKey].count += 1;

    // Estadísticas por área
    const areaKey = `area.${area}`;
    if (!stats[areaKey]) stats[areaKey] = { totalTime: 0, count: 0 };
    stats[areaKey].totalTime += timeInMinutes;
    stats[areaKey].count += 1;

    // Estadísticas por ejercicio específico
    if (exercise) {
      const exerciseKey = `ejercicio.${area}.${exercise}`;
      if (!stats[exerciseKey]) stats[exerciseKey] = { totalTime: 0, count: 0 };
      stats[exerciseKey].totalTime += timeInMinutes;
      stats[exerciseKey].count += 1;
    }
  });

  // Convertir a porcentajes
  const percentages: Record<string, number> = {};
  if (totalTime > 0) {
    Object.entries(stats).forEach(([key, value]) => {
      percentages[key] = (value.totalTime / totalTime) * 100;
    });
  }

  console.log('📈 Estadísticas calculadas:', {
    totalTime,
    stats: Object.entries(percentages).map(([k, v]) => `${k}: ${v.toFixed(1)}%`)
  });

  return percentages;
}

/**
 * Convierte un plan de entrenamiento a porcentajes por nivel
 */
export function convertPlanToPercentages(plan: TrainingPlan): Record<string, number> {
  const percentages: Record<string, number> = {};
  
  console.log('🔍 Convirtiendo plan a porcentajes...');
  
  Object.entries(plan.planificacion).forEach(([tipo, tipoData]) => {
    percentages[`tipo.${tipo}`] = tipoData.porcentajeTotal;
    
    Object.entries(tipoData.areas).forEach(([area, areaData]) => {
      const areaPercentage = (tipoData.porcentajeTotal * areaData.porcentajeDelTotal) / 100;
      percentages[`area.${area}`] = areaPercentage;
      
      if (areaData.ejercicios) {
        Object.entries(areaData.ejercicios).forEach(([ejercicio, ejercicioData]) => {
          const ejercicioPercentage = (areaPercentage * ejercicioData.porcentajeDelTotal) / 100;
          percentages[`ejercicio.${area}.${ejercicio}`] = ejercicioPercentage;
        });
      }
    });
  });
  
  return percentages;
}