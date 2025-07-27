// components/training/helpers.ts
import { TrainingSession, TrainingType, TrainingArea, LoggedExercise } from '@/types';

// ========== FORMATEO DE FECHAS ==========
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatDateLocal = (
  dateString: string, 
  timeZone: string = 'America/Argentina/Buenos_Aires'
): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone
  });
};

export const formatDateShort = (date: Date): string => {
  return date.toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'short' 
  });
};

// ========== FILTRADO DE SESIONES ==========
export const filterSessionsByDateRange = (
  sessions: TrainingSession[],
  playerId: string,
  daysBack: number = 30
): TrainingSession[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  return sessions.filter(session => {
    const sessionDate = new Date(session.fecha);
    return session.jugadorId === playerId && sessionDate >= cutoffDate;
  });
};

export const getSessionDateRange = (sessions: TrainingSession[]) => {
  if (sessions.length === 0) return null;
  
  const dates = sessions
    .map(session => new Date(session.fecha))
    .sort((a, b) => a.getTime() - b.getTime());
    
  return {
    from: formatDateShort(dates[0]),
    to: formatDateShort(dates[dates.length - 1])
  };
};

// ========== NORMALIZACIÓN DE DATOS ==========
export const normalizeTrainingType = (tipo: TrainingType | string): string => {
  const tipoStr = String(tipo);
  if (tipoStr === String(TrainingType.CANASTO) || tipoStr.toLowerCase().includes("canasto")) {
    return "Canasto";
  }
  return "Peloteo";
};

export const normalizeTrainingArea = (area: TrainingArea | string): string => {
  const areaStr = String(area);
  
  // Mapeo unificado
  if (areaStr === String(TrainingArea.RED) || areaStr === "Red" || areaStr === "Juego de red") {
    return "Juego de red";
  }
  if (areaStr === String(TrainingArea.PRIMERAS_PELOTAS) || areaStr === "Primeras Pelotas" || areaStr === "Primeras pelotas") {
    return "Primeras pelotas";
  }
  if (areaStr === String(TrainingArea.JUEGO_DE_BASE) || areaStr === "Juego de base") {
    return "Juego de base";
  }
  if (areaStr === String(TrainingArea.PUNTOS) || areaStr === "Puntos") {
    return "Puntos";
  }
  
  return areaStr;
};

export interface NormalizedExercise {
  tipo: string;
  area: string;
  ejercicio: string;
  repeticiones: number;
}

export const normalizeExercises = (exercises: LoggedExercise[]): NormalizedExercise[] => {
  return exercises.map(exercise => {
    const tipoString = normalizeTrainingType(exercise.tipo);
    const areaNormalizada = normalizeTrainingArea(exercise.area);
    
    // Calcular repeticiones basado en tiempo/cantidad
    let repeticiones = 1;
    if (exercise.tiempoCantidad) {
      const match = exercise.tiempoCantidad.toLowerCase().match(/(\d+)/);
      if (match) {
        repeticiones = Math.max(1, parseInt(match[1]) / 5);
      }
    }
    
    return {
      tipo: tipoString,
      area: areaNormalizada,
      ejercicio: exercise.ejercicio || exercise.ejercicioEspecifico || "Ejercicio sin nombre",
      repeticiones: Math.round(repeticiones)
    };
  });
};

// ========== CÁLCULOS DE TOTALES ==========
export const calculateTotalMinutes = (exercises: { tiempoCantidad: string }[]): number => {
  return exercises.reduce((total, ex) => {
    const minutes = parseInt(ex.tiempoCantidad) || 0;
    return total + minutes;
  }, 0);
};

export interface ExerciseStats {
  total: number;
  typeStats: Record<string, { 
    total: number; 
    percentage: number;
    areas: Record<string, {
      total: number;
      percentage: number;
      exercises: Record<string, number>;
    }>;
  }>;
  areaStats: Record<string, { total: number; percentage: number }>;
}

export const calculateExerciseStats = (exercises: NormalizedExercise[]): ExerciseStats => {
  const total = exercises.reduce((sum, ex) => sum + ex.repeticiones, 0);
  const typeStats: ExerciseStats['typeStats'] = {};
  const areaStats: ExerciseStats['areaStats'] = {};
  
  exercises.forEach(exercise => {
    // Stats por tipo
    if (!typeStats[exercise.tipo]) {
      typeStats[exercise.tipo] = { 
        total: 0, 
        percentage: 0,
        areas: {}
      };
    }
    typeStats[exercise.tipo].total += exercise.repeticiones;
    
    // Stats por área dentro del tipo
    if (!typeStats[exercise.tipo].areas[exercise.area]) {
      typeStats[exercise.tipo].areas[exercise.area] = {
        total: 0,
        percentage: 0,
        exercises: {}
      };
    }
    typeStats[exercise.tipo].areas[exercise.area].total += exercise.repeticiones;
    
    // Contar ejercicios específicos
    if (!typeStats[exercise.tipo].areas[exercise.area].exercises[exercise.ejercicio]) {
      typeStats[exercise.tipo].areas[exercise.area].exercises[exercise.ejercicio] = 0;
    }
    typeStats[exercise.tipo].areas[exercise.area].exercises[exercise.ejercicio] += exercise.repeticiones;
    
    // Stats por área global
    if (!areaStats[exercise.area]) {
      areaStats[exercise.area] = { total: 0, percentage: 0 };
    }
    areaStats[exercise.area].total += exercise.repeticiones;
  });
  
  // Calcular porcentajes
  Object.keys(typeStats).forEach(tipo => {
    typeStats[tipo].percentage = Math.round((typeStats[tipo].total / total) * 100);
    Object.keys(typeStats[tipo].areas).forEach(area => {
      typeStats[tipo].areas[area].percentage = Math.round(
        (typeStats[tipo].areas[area].total / total) * 100
      );
    });
  });
  
  Object.keys(areaStats).forEach(area => {
    areaStats[area].percentage = Math.round((areaStats[area].total / total) * 100);
  });
  
  return { total, typeStats, areaStats };
};

// ========== PORCENTAJES IDEALES ==========
interface IdealPercentages {
  [type: string]: {
    [area: string]: number;
  };
}

const DEFAULT_IDEAL_PERCENTAGES: IdealPercentages = {
  'Canasto': {
    'Juego de base': 17,
    'Juego de red': 17,
    'Primeras pelotas': 16
  },
  'Peloteo': {
    'Juego de base': 15,
    'Juego de red': 10,
    'Puntos': 15,
    'Primeras pelotas': 10
  }
};

export const getDefaultPercentageForType = (): number => 50;

export const getDefaultPercentageForAreaInType = (
  area: string, 
  type: string
): number => {
  return DEFAULT_IDEAL_PERCENTAGES[type]?.[area] || 15;
};