// constants/training.ts

import { TrainingArea, TrainingType } from '../types';

// Estructura jerárquica de ejercicios usando directamente los enums
export const EXERCISE_HIERARCHY: Record<TrainingType, Record<TrainingArea, string[] | undefined>> = {
  [TrainingType.CANASTO]: {
    [TrainingArea.JUEGO_DE_BASE]: ["Estático", "Dinámico"],
    [TrainingArea.JUEGO_DE_RED]: ["Volea", "Smash", "Subidas"],
    [TrainingArea.PRIMERAS_PELOTAS]: ["Saque", "Devolución", "Saque + 1", "Devolución + 1"],
    [TrainingArea.PUNTOS]: undefined, // Puntos no aplica a Canasto
  },
  [TrainingType.PELOTEO]: {
    [TrainingArea.JUEGO_DE_BASE]: ["Control", "Movilidad", "Jugadas"],
    [TrainingArea.JUEGO_DE_RED]: ["Volea", "Smash", "Subidas"],
    [TrainingArea.PRIMERAS_PELOTAS]: ["Saque", "Devolución", "Saque + 1", "Devolución + 1"],
    [TrainingArea.PUNTOS]: ["Libres", "Con pautas"],
  }
};

// Niveles de intensidad disponibles (1-10)
export const INTENSITY_LEVELS: number[] = Array.from({ length: 10 }, (_, i) => i + 1);

// Opciones de tipos de entrenamiento
export const TRAINING_TYPES_OPTIONS = Object.values(TrainingType);

// Opciones de áreas de entrenamiento
export const TRAINING_AREAS_OPTIONS = Object.values(TrainingArea);

// Función helper para obtener ejercicios disponibles
export const getAvailableExercises = (tipo: TrainingType, area: TrainingArea): string[] => {
  return EXERCISE_HIERARCHY[tipo]?.[area] || [];
};

// Función helper para verificar si una combinación tipo/área es válida
export const isValidTypeAreaCombination = (tipo: TrainingType, area: TrainingArea): boolean => {
  return EXERCISE_HIERARCHY[tipo]?.[area] !== undefined;
};