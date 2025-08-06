// utils/trainingCalculations.ts
import { LoggedExercise } from '../types';

export interface ExerciseStats {
  totalMinutes: number;
  typeStats: Record<string, {
    total: number;
    percentage: number;
    areas: Record<string, {
      total: number;
      percentage: number;
      exercises: Record<string, number>;
    }>;
  }>;
  areaStats: Record<string, {
    total: number;
    percentage: number;
  }>;
}

/**
 * Calcula estadísticas de ejercicios basándose en TIEMPO (minutos)
 * Esta es la función unificada que deben usar TODOS los componentes
 */
export const calculateExerciseStatsByTime = (exercises: LoggedExercise[]): ExerciseStats => {
  const stats: Record<string, Record<string, Record<string, number>>> = {};
  let totalMinutes = 0;

  // Procesar cada ejercicio
  exercises.forEach(ejercicio => {
    // IMPORTANTE: Usar el mismo método de parsing en todos lados
    const tiempo = parseFloat(ejercicio.tiempoCantidad.replace(/[^\d.]/g, '')) || 0;
    
    if (tiempo === 0) return; // Ignorar ejercicios sin tiempo
    
    totalMinutes += tiempo;

    // Normalizar nombres para consistencia
    const tipoKey = ejercicio.tipo.charAt(0).toUpperCase() + ejercicio.tipo.slice(1).toLowerCase();
    const areaKey = ejercicio.area.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    const ejercicioKey = ejercicio.ejercicio || ejercicio.ejercicioEspecifico || "Sin nombre";

    // Acumular tiempo por tipo/área/ejercicio
    if (!stats[tipoKey]) stats[tipoKey] = {};
    if (!stats[tipoKey][areaKey]) stats[tipoKey][areaKey] = {};
    if (!stats[tipoKey][areaKey][ejercicioKey]) {
      stats[tipoKey][areaKey][ejercicioKey] = 0;
    }
    stats[tipoKey][areaKey][ejercicioKey] += tiempo;
  });

  // Convertir a estructura con porcentajes
  const typeStats: ExerciseStats['typeStats'] = {};
  const areaStats: ExerciseStats['areaStats'] = {};

  Object.keys(stats).forEach(tipo => {
    let tipoTotal = 0;
    const areas: ExerciseStats['typeStats'][string]['areas'] = {};

    Object.keys(stats[tipo]).forEach(area => {
      let areaTotal = 0;
      const exercises: Record<string, number> = {};

      Object.keys(stats[tipo][area]).forEach(ejercicio => {
        const tiempo = stats[tipo][area][ejercicio];
        areaTotal += tiempo;
        exercises[ejercicio] = tiempo;
      });

      tipoTotal += areaTotal;
      
      // Stats por área dentro del tipo
      areas[area] = {
        total: areaTotal,
        percentage: totalMinutes > 0 ? (areaTotal / totalMinutes) * 100 : 0,
        exercises
      };

      // Stats globales por área
      if (!areaStats[area]) {
        areaStats[area] = { total: 0, percentage: 0 };
      }
      areaStats[area].total += areaTotal;
    });

    // Stats por tipo
    typeStats[tipo] = {
      total: tipoTotal,
      percentage: totalMinutes > 0 ? (tipoTotal / totalMinutes) * 100 : 0,
      areas
    };
  });

  // Actualizar porcentajes globales de áreas
  Object.keys(areaStats).forEach(area => {
    areaStats[area].percentage = totalMinutes > 0 
      ? (areaStats[area].total / totalMinutes) * 100 
      : 0;
  });

  return {
    totalMinutes,
    typeStats,
    areaStats
  };
};

/**
 * Convierte ejercicios de sesión a formato LoggedExercise
 */
export const sessionExercisesToLogged = (
  exercises: any[], 
  playerId: string
): LoggedExercise[] => {
  return exercises
    .filter(ex => ex.loggedForPlayerId === playerId)
    .map(ex => ({
      id: ex.id,
      tipo: ex.tipo,
      area: ex.area,
      ejercicio: ex.ejercicio || ex.ejercicioEspecifico || "Sin nombre",
      ejercicioEspecifico: ex.ejercicioEspecifico,
      tiempoCantidad: ex.tiempoCantidad,
      intensidad: ex.intensidad
    }));
};