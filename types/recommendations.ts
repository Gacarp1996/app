// types/recommendations.ts
import { TipoType, AreaType } from '../constants/training';
import { GapAction, Priority, RecLevel } from '../constants/recommendationThresholds';
import { LoggedExercise, SessionExercise } from '../types/types';

/**
 * Item de recomendación con gap con signo
 */
export interface RecItem {
  level: RecLevel;
  parentType?: TipoType;
  area: string;  // Puede ser tipo, área o ejercicio según el nivel
  currentPercentage: number;      // Real ejecutado
  plannedPercentage: number;      // Meta del plan
  gap: number;                    // plan - real (CON SIGNO)
  action: GapAction;              // INCREMENTAR | REDUCIR | OPTIMO
  priority: Priority;             // high | medium | low
  reason: string;
  basedOn: {
    exercises: number;
    minutes: number;
    sessions?: number;
  };
  isDefault?: boolean;            // Si usa valores por defecto
}

/**
 * Salida del motor de recomendaciones
 */
export interface EngineOutput {
  individual: Record<string, {     // playerId -> análisis
    items: RecItem[];
    summary: {
      totalExercises: number;
      totalMinutes: number;
      sessionsAnalyzed: number;
      planUsed: 'real' | 'default';
      dateRange?: { from: string; to: string };
    };
  }>;
  group: {
    items: RecItem[];
    analyzedPlayers: number;
    totalPlayers: number;
    averages: Record<TipoType, number>;  // Promedios grupales por tipo
    recommendation: string;               // Texto de recomendación grupal
    strongCoincidences: Array<{
      area: string;
      level: RecLevel;
      action: GapAction;
      playerCount: number;
      averageGap: number;
    }>;
    // NUEVO: Campos opcionales para reportar jugadores bloqueados
    blocked?: Array<{
      playerId: string;
      playerName: string;
      reasons: string[];
    }>;
    warnings?: string[];
  };
}

/**
 * Entrada para el motor de recomendaciones
 */
export interface EngineInput {
  players: Array<{
    id: string;
    name: string;
  }>;
  
  // Sesiones históricas del SessionContext
  historicalSessions: Array<{
    playerId: string;
    sessions: any[];  // TrainingSession[]
  }>;
  
  // Ejercicios de la sesión actual (no persistidos)
  currentSessionExercises?: SessionExercise[];
  
  // Planes de entrenamiento (any por ahora, TrainingPlan cuando esté disponible)
  plans: Record<string, any>;
  
  // Configuración
  config: {
    rangeDays: number;          // Días a analizar (default: 30)
    timeZone?: string;          // Default: 'America/Santiago'
    includeCurrentSession: boolean;
  };
}

/**
 * Estadísticas intermedias para cálculo
 */
export interface PlayerStats {
  playerId: string;
  playerName: string;
  exercises: LoggedExercise[];
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
  sessionsCount: number;
}

/**
 * Tipos de análisis legacy (para compatibilidad)
 */
export interface PlayerAnalysis {
  playerId: string;
  playerName: string;
  analysis: {
    recommendations: any[];  // Migrar a RecItem[]
    totalExercises: number;
    totalMinutes: number;
    typeStats: any;
    areaStats: any;
    sessionsAnalyzed: number;
    planUsed: 'real' | 'default';
  };
  sessions: {
    totalSessions: number;
    dateRange: { from: string; to: string } | null;
  };
}