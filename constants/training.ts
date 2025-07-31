// constants/training.ts

import { TrainingArea, TrainingType } from '../types';

// Existing hierarchical structure for exercises (used by charts, older data)
export const EXERCISE_HIERARCHY: Record<TrainingType, Record<TrainingArea, string[] | undefined>> = {
  [TrainingType.CANASTO]: {
    [TrainingArea.JUEGO_DE_BASE]: ["Desde el lugar", "Dinámico"],
    [TrainingArea.RED]: ["Desde el lugar", "Dinámico"],
    [TrainingArea.PRIMERAS_PELOTAS]: ["Saque", "Saque + Devolución + 1"],
    [TrainingArea.PUNTOS]: undefined, // Puntos no aplica a Canasto
  },
  [TrainingType.PELOTA_VIVA]: {
    [TrainingArea.JUEGO_DE_BASE]: ["Control", "Movilidad", "Jugadas"],
    [TrainingArea.RED]: ["Volea", "Subida", "Smash"],
    [TrainingArea.PRIMERAS_PELOTAS]: ["Saque", "Saque y devolución", "Saque + 1", "Saque + 1 devolución + 1"],
    [TrainingArea.PUNTOS]: ["Libres", "Con pautas"],
  }
};

// New exercise hierarchy specifically for the TrainingSessionPage form
export const NEW_EXERCISE_HIERARCHY_CONST: Record<string, Record<string, string[]>> = {
  "Canasto": {
    "Juego de base": ["Estatico", "Dinamico"],
    "Juego de red": ["Volea", "Smash", "Subidas"],
    "Primeras pelotas": ["Saque", "Devolucion", "Saque + 1", "Devolucion + 1"]
  },
  "Peloteo": {
    "Juego de base": ["Control", "Movilidad", "Jugadas"],
    "Juego de red": ["Volea", "Smash", "Subidas"],
    "Primeras pelotas": ["Saque", "Devolucion", "Saque + 1", "Devolucion + 1"],
    "Puntos": ["Libres", "Con pautas"]
  }
};

// Mapping from new hierarchy keys/display names to internal enum values
export const NEW_EXERCISE_HIERARCHY_MAPPING = {
  TYPE_MAP: {
    "Canasto": TrainingType.CANASTO,
    "Peloteo": TrainingType.PELOTA_VIVA,
  } as Record<string, TrainingType>,
  AREA_MAP: {
    "Juego de base": TrainingArea.JUEGO_DE_BASE,
    "Red": TrainingArea.RED,          // ✅ AGREGAR: Para datos guardados como "Red"
    "Juego de red": TrainingArea.RED,  // Para datos nuevos como "Juego de red"
    "Primeras pelotas": TrainingArea.PRIMERAS_PELOTAS,
    "Puntos": TrainingArea.PUNTOS,
  } as Record<string, TrainingArea>
};

export const INTENSITY_LEVELS: number[] = Array.from({ length: 10 }, (_, i) => i + 1);

// This might be deprecated for the new form but kept for other potential uses
export const TRAINING_TYPES_OPTIONS = Object.values(TrainingType);