// utils/validation.ts
import { TipoType, AreaType, getAreasForTipo, getEjerciciosForTipoArea } from '../constants/training';
import { TrainingSession, LoggedExercise, Player } from '../types';

/**
 * Valida si una combinación tipo/área/ejercicio es válida
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
  
  const validEjercicios = getEjerciciosForTipoArea(tipo, area);
  return validEjercicios.includes(ejercicio);
};

/**
 * Valida si un ejercicio tiene todos los campos requeridos
 */
export const isValidExercise = (exercise: Partial<LoggedExercise>): boolean => {
  return !!(
    exercise.tipo &&
    exercise.area &&
    exercise.ejercicio &&
    exercise.tiempoCantidad &&
    exercise.intensidad !== undefined &&
    exercise.intensidad >= 1 &&
    exercise.intensidad <= 10
  );
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
 */
export const validateExerciseForm = (
  tipo: string,
  area: string,
  ejercicio: string,
  tiempoCantidad: string,
  activePlayerIds: Set<string>
): { isValid: boolean; error?: string } => {
  if (!tipo || !area || !ejercicio || !tiempoCantidad) {
    return { isValid: false, error: 'Por favor, completa todos los campos' };
  }
  
  if (activePlayerIds.size === 0) {
    return { isValid: false, error: 'Por favor, selecciona al menos un jugador' };
  }
  
  if (!isValidExerciseCombination(tipo as TipoType, area as AreaType, ejercicio)) {
    return { isValid: false, error: 'Combinación de tipo/área/ejercicio inválida' };
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