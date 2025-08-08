// utils/validation.ts
import { TipoType, AreaType, getAreasForTipo, getEjerciciosForTipoArea } from '../constants/training';
import { TrainingSession, LoggedExercise, Player } from '../types';

/**
 * Valida si una combinación tipo/área/ejercicio es válida
 * MODIFICADO: Maneja el caso especial de PUNTOS que no requiere ejercicio
 */
export const isValidExerciseCombination = (
  tipo: TipoType,
  area: AreaType,
  ejercicio: string
): boolean => {
  const validAreas = getAreasForTipo(tipo);
  if (!validAreas.includes(area)) {
    return false;
  }
  
  // NUEVO: PUNTOS no requiere ejercicio, es válido sin él
  if (tipo === TipoType.PUNTOS) {
    return true;
  }
  
  const validEjercicios = getEjerciciosForTipoArea(tipo, area);
  return validEjercicios.includes(ejercicio);
};

/**
 * Valida si un ejercicio tiene todos los campos requeridos
 * MODIFICADO: Permite ejercicio vacío para tipo PUNTOS
 */
export const isValidExercise = (exercise: Partial<LoggedExercise>): boolean => {
  // Validaciones básicas que aplican a todos
  if (!exercise.tipo || !exercise.area || !exercise.tiempoCantidad) {
    return false;
  }
  
  if (exercise.intensidad === undefined || exercise.intensidad < 1 || exercise.intensidad > 10) {
    return false;
  }
  
  // NUEVO: Para PUNTOS, no se requiere campo ejercicio
  if (exercise.tipo === TipoType.PUNTOS) {
    return true;
  }
  
  // Para otros tipos, el ejercicio es obligatorio
  return !!exercise.ejercicio;
};

/**
 * Valida si una sesión tiene ejercicios o observaciones
 */
export const isValidSession = (session: Partial<TrainingSession>): boolean => {
  const hasExercises = session.ejercicios && session.ejercicios.length > 0;
  const hasObservations = session.observaciones && session.observaciones.trim().length > 0;
  return !!(hasExercises || hasObservations);
};

/**
 * Valida si hay jugadores seleccionados
 */
export const hasSelectedPlayers = (activePlayerIds: Set<string>): boolean => {
  return activePlayerIds.size > 0;
};

/**
 * Valida campos del formulario de ejercicio
 * MODIFICADO: Maneja validación especial para tipo PUNTOS
 */
export const validateExerciseForm = (
  tipo: string,
  area: string,
  ejercicio: string,
  tiempoCantidad: string,
  activePlayerIds: Set<string>
): { isValid: boolean; error?: string } => {
  // Validaciones básicas
  if (!tipo || !area || !tiempoCantidad) {
    return { 
      isValid: false, 
      error: 'Por favor, completa tipo, área y tiempo' 
    };
  }
  
  // NUEVO: Para tipo PUNTOS, no validar ejercicio
  if (tipo === TipoType.PUNTOS) {
    if (activePlayerIds.size === 0) {
      return { 
        isValid: false, 
        error: 'Por favor, selecciona al menos un jugador' 
      };
    }
    
    // No necesita más validaciones para PUNTOS
    return { isValid: true };
  }
  
  // Para otros tipos, el ejercicio es obligatorio
  if (!ejercicio) {
    return { 
      isValid: false, 
      error: 'Por favor, selecciona un ejercicio' 
    };
  }
  
  if (activePlayerIds.size === 0) {
    return { 
      isValid: false, 
      error: 'Por favor, selecciona al menos un jugador' 
    };
  }
  
  if (!isValidExerciseCombination(tipo as TipoType, area as AreaType, ejercicio)) {
    return { 
      isValid: false, 
      error: 'Combinación de tipo/área/ejercicio inválida' 
    };
  }
  
  return { isValid: true };
};

/**
 * Valida datos de encuesta
 */
export const validateSurveyResponses = (
  responses: Record<string, number | undefined>,
  enabledQuestions: string[]
): boolean => {
  return enabledQuestions.every(question => {
    const value = responses[question];
    return value !== undefined && value >= 1 && value <= 5;
  });
};

/**
 * Valida si un jugador tiene datos suficientes para análisis
 */
export const hasPlayerSufficientData = (
  player: Player,
  sessions: TrainingSession[],
  minSessions: number = 1,
  minExercises: number = 1
): boolean => {
  const playerSessions = sessions.filter(s => s.jugadorId === player.id);
  
  if (playerSessions.length < minSessions) {
    return false;
  }
  
  const totalExercises = playerSessions.reduce(
    (sum, session) => sum + (session.ejercicios?.length || 0),
    0
  );
  
  return totalExercises >= minExercises;
};