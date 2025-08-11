// utils/calculations.ts
import { LoggedExercise, TrainingSession, PostTrainingSurvey } from '../types/types';
import { TipoType, AreaType } from '../constants/training';
import { SessionService } from '../services/sessionService';

/**
 * Convierte tiempo en formato string a minutos
 * VERSIÓN MEJORADA que maneja más formatos
 */
export const parseTimeToMinutes = (time: string): number => {
  if (!time) return 0;
  
  const cleanTime = time.trim().toLowerCase();
  
  // Si es un número directo
  const pureNumber = parseFloat(cleanTime);
  if (!isNaN(pureNumber) && cleanTime === pureNumber.toString()) {
    return pureNumber;
  }
  
  // Buscar patrones de minutos
  const minuteMatch = cleanTime.match(/(\d+\.?\d*)\s*(m|min|mins|minuto|minutos)/);
  if (minuteMatch) {
    return parseFloat(minuteMatch[1]);
  }
  
  // Buscar patrones de horas
  const hourMatch = cleanTime.match(/(\d+\.?\d*)\s*(h|hr|hrs|hora|horas)/);
  if (hourMatch) {
    return parseFloat(hourMatch[1]) * 60;
  }
  
  // Buscar formato mixto (ej: "1h 30m" o "1:30")
  const mixedMatch = cleanTime.match(/(\d+)\s*(h|hr|hrs|hora|horas)?\s*:?\s*(\d+)\s*(m|min|mins|minuto|minutos)?/);
  if (mixedMatch) {
    const hours = parseFloat(mixedMatch[1]) || 0;
    const minutes = parseFloat(mixedMatch[3]) || 0;
    return hours * 60 + minutes;
  }
  
  // Fallback: intentar parsear solo números
  const numbers = cleanTime.replace(/[^\d.]/g, '');
  return parseFloat(numbers) || 0;
};

/**
 * Calcula estadísticas de ejercicios por tiempo
 * ACTUALIZADO: Todos los porcentajes son ABSOLUTOS respecto al total
 */
export const calculateExerciseStatsByTime = (exercises: LoggedExercise[]) => {
  const typeStats: Record<string, {
    total: number;
    percentage: number;  // ABSOLUTO: % del total
    areas: Record<string, {
      total: number;
      percentage: number;  // ACTUALIZADO: ABSOLUTO % del total (no del tipo)
      percentageWithinType: number;  // NUEVO: % relativo dentro del tipo (para info adicional)
      exercises: Record<string, number>;
    }>;
  }> = {};
  
  const areaStats: Record<string, {
    total: number;
    percentage: number;  // ABSOLUTO: % del total
  }> = {};
  
  let totalMinutes = 0;
  
  // Primera pasada: calcular totales
  exercises.forEach(exercise => {
    const minutes = parseTimeToMinutes(exercise.tiempoCantidad);
    if (minutes === 0) return; // Ignorar ejercicios sin tiempo
    
    totalMinutes += minutes;
    
    // ✅ CORREGIDO: Normalización consistente con el sistema de planes
    // Tipo: Primera letra mayúscula, resto minúscula
    const tipo = exercise.tipo.trim().charAt(0).toUpperCase() + 
                 exercise.tipo.trim().slice(1).toLowerCase();
    
    // Área: Solo capitalizar la primera letra de la primera palabra
    // "juego de red" → "Juego de red" ✅
    // "CONTROL" → "Control" ✅
    const areaLower = exercise.area.trim().toLowerCase();
    const area = areaLower.charAt(0).toUpperCase() + areaLower.slice(1);
    
    const ejercicioName = exercise.ejercicio || exercise.ejercicioEspecifico || "Sin nombre";
    
    // Estadísticas por tipo
    if (!typeStats[tipo]) {
      typeStats[tipo] = {
        total: 0,
        percentage: 0,
        areas: {}
      };
    }
    typeStats[tipo].total += minutes;
    
    // Estadísticas por área dentro del tipo
    if (!typeStats[tipo].areas[area]) {
      typeStats[tipo].areas[area] = {
        total: 0,
        percentage: 0,
        percentageWithinType: 0,
        exercises: {}
      };
    }
    typeStats[tipo].areas[area].total += minutes;
    
    // Estadísticas por ejercicio específico
    if (!typeStats[tipo].areas[area].exercises[ejercicioName]) {
      typeStats[tipo].areas[area].exercises[ejercicioName] = 0;
    }
    typeStats[tipo].areas[area].exercises[ejercicioName] += minutes;
    
    // Estadísticas generales por área
    if (!areaStats[area]) {
      areaStats[area] = {
        total: 0,
        percentage: 0
      };
    }
    areaStats[area].total += minutes;
  });
  
  // Segunda pasada: calcular porcentajes ABSOLUTOS
  if (totalMinutes > 0) {
    Object.keys(typeStats).forEach(tipo => {
      // Porcentaje absoluto del tipo
      typeStats[tipo].percentage = (typeStats[tipo].total / totalMinutes) * 100;
      
      // Porcentajes de áreas
      const tipoTotal = typeStats[tipo].total;
      Object.keys(typeStats[tipo].areas).forEach(area => {
        // CAMBIO CLAVE: Porcentaje ABSOLUTO respecto al total
        typeStats[tipo].areas[area].percentage = 
          (typeStats[tipo].areas[area].total / totalMinutes) * 100;  // ABSOLUTO
        
        // Mantener también el porcentaje relativo dentro del tipo (para referencia)
        if (tipoTotal > 0) {
          typeStats[tipo].areas[area].percentageWithinType = 
            (typeStats[tipo].areas[area].total / tipoTotal) * 100;
        }
      });
    });
    
    // Porcentajes absolutos para estadísticas generales de área
    Object.keys(areaStats).forEach(area => {
      areaStats[area].percentage = (areaStats[area].total / totalMinutes) * 100;
    });
  }
  
  return {
    totalMinutes,
    typeStats,
    areaStats
  };
};

/**
 * DEPRECADO: Usar SessionService.sessionExercisesToLogged() en su lugar
 * Mantenido temporalmente para compatibilidad
 */
export const sessionExercisesToLogged = (
  exercises: any[], 
  playerId: string
): LoggedExercise[] => {
  // Delegar a la función centralizada
  return SessionService.sessionExercisesToLogged(exercises, playerId);
};

/**
 * Calcula el promedio de intensidad de ejercicios
 */
export const calculateAverageIntensity = (exercises: LoggedExercise[]): number => {
  if (exercises.length === 0) return 0;
  
  const sum = exercises.reduce((total, ex) => total + ex.intensidad, 0);
  return sum / exercises.length;
};

/**
 * Calcula estadísticas de intensidad por tipo/área
 */
export const calculateIntensityStats = (
  exercises: LoggedExercise[],
  filterType?: TipoType,
  filterArea?: AreaType
) => {
  let filteredExercises = exercises;
  
  if (filterType) {
    filteredExercises = filteredExercises.filter(ex => ex.tipo === filterType);
  }
  
  if (filterArea) {
    filteredExercises = filteredExercises.filter(ex => ex.area === filterArea);
  }
  
  return {
    average: calculateAverageIntensity(filteredExercises),
    min: filteredExercises.length > 0 
      ? Math.min(...filteredExercises.map(ex => ex.intensidad))
      : 0,
    max: filteredExercises.length > 0
      ? Math.max(...filteredExercises.map(ex => ex.intensidad))
      : 0,
    count: filteredExercises.length
  };
};

/**
 * Calcula promedios de encuestas
 */
export const calculateSurveyAverages = (surveys: PostTrainingSurvey[]) => {
  if (surveys.length === 0) {
    return {
      cansancioFisico: 0,
      concentracion: 0,
      actitudMental: 0,
      sensacionesTenisticas: 0
    };
  }
  
  const totals = surveys.reduce((acc, survey) => ({
    cansancioFisico: acc.cansancioFisico + (survey.cansancioFisico || 0),
    concentracion: acc.concentracion + (survey.concentracion || 0),
    actitudMental: acc.actitudMental + (survey.actitudMental || 0),
    sensacionesTenisticas: acc.sensacionesTenisticas + (survey.sensacionesTenisticas || 0)
  }), {
    cansancioFisico: 0,
    concentracion: 0,
    actitudMental: 0,
    sensacionesTenisticas: 0
  });
  
  const count = surveys.length;
  
  return {
    cansancioFisico: totals.cansancioFisico / count,
    concentracion: totals.concentracion / count,
    actitudMental: totals.actitudMental / count,
    sensacionesTenisticas: totals.sensacionesTenisticas / count
  };
};

/**
 * Agrupa y promedia valores por día
 */
export function calculateDailyAverages<T>(
  items: T[],
  dateExtractor: (item: T) => string | Date,
  valueExtractor: (item: T) => number,
  timeZone?: string
): Array<{ date: string; value: number; count: number }> {
  const groups: Record<string, { sum: number; count: number; firstDate: Date }> = {};
  
  items.forEach(item => {
    const date = dateExtractor(item);
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const dateKey = dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      timeZone
    });
    
    if (!groups[dateKey]) {
      groups[dateKey] = { sum: 0, count: 0, firstDate: dateObj };
    }
    
    groups[dateKey].sum += valueExtractor(item);
    groups[dateKey].count++;
  });
  
  return Object.entries(groups)
    .map(([dateKey, data]) => ({
      date: data.firstDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        timeZone
      }),
      value: parseFloat((data.sum / data.count).toFixed(1)),
      count: data.count
    }))
    .sort((a, b) => {
      const dateA = new Date(groups[Object.keys(groups).find(k => 
        groups[k].firstDate.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          timeZone
        }) === a.date
      )!].firstDate);
      const dateB = new Date(groups[Object.keys(groups).find(k => 
        groups[k].firstDate.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          timeZone
        }) === b.date
      )!].firstDate);
      
      return dateA.getTime() - dateB.getTime();
    });
}