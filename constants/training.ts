// constants/training.ts

// Enums con valores que representan exactamente lo que se muestra/guarda
export enum TipoType {
  CANASTO = 'Canasto',
  PELOTEO = 'Peloteo'
}

export enum AreaType {
  JUEGO_DE_BASE = 'Juego de base',
  JUEGO_DE_RED = 'Juego de red',
  PRIMERAS_PELOTAS = 'Primeras pelotas',
  PUNTOS = 'Puntos'
}

// Tipos de ejercicios específicos por área
export enum EjercicioJuegoBase {
  // Para canasto
  ESTATICO = 'Estático',
  DINAMICO = 'Dinámico',
  // Para peloteo
  CONTROL = 'Control',
  MOVILIDAD = 'Movilidad',
  JUGADAS = 'Jugadas'
}

export enum EjercicioJuegoRed {
  VOLEAS = 'Voleas',
  SUBIDAS = 'Subidas',
  SMASH = 'Smash'
}

export enum EjercicioPrimerasPelotas {
  SAQUE = 'Saque',
  DEVOLUCION = 'Devolución',
  SAQUE_MAS_UNO = 'Saque + 1',
  DEVOLUCION_MAS_UNO = 'Devolución + 1'
}

export enum EjercicioPuntos {
  PUNTOS_LIBRES = 'Puntos libres',
  PUNTOS_CON_PAUTAS = 'Puntos con pautas'
}

// Estructura jerárquica completa con tipos fuertes
export type ExerciseHierarchy = {
  [TipoType.CANASTO]: {
    [AreaType.JUEGO_DE_BASE]: EjercicioJuegoBase.ESTATICO | EjercicioJuegoBase.DINAMICO;
    [AreaType.JUEGO_DE_RED]: EjercicioJuegoRed;
    [AreaType.PRIMERAS_PELOTAS]: EjercicioPrimerasPelotas;
  };
  [TipoType.PELOTEO]: {
    [AreaType.JUEGO_DE_BASE]: EjercicioJuegoBase.CONTROL | EjercicioJuegoBase.MOVILIDAD | EjercicioJuegoBase.JUGADAS;
    [AreaType.JUEGO_DE_RED]: EjercicioJuegoRed;
    [AreaType.PRIMERAS_PELOTAS]: EjercicioPrimerasPelotas;
    [AreaType.PUNTOS]: EjercicioPuntos;
  };
};

// Helper para obtener las áreas disponibles según el tipo
export const getAreasForTipo = (tipo: TipoType): AreaType[] => {
  switch (tipo) {
    case TipoType.CANASTO:
      return [AreaType.JUEGO_DE_BASE, AreaType.JUEGO_DE_RED, AreaType.PRIMERAS_PELOTAS];
    case TipoType.PELOTEO:
      return [AreaType.JUEGO_DE_BASE, AreaType.JUEGO_DE_RED, AreaType.PRIMERAS_PELOTAS, AreaType.PUNTOS];
  }
};

// Helper para obtener ejercicios disponibles según tipo y área
export const getEjerciciosForTipoArea = (tipo: TipoType, area: AreaType): string[] => {
  if (tipo === TipoType.CANASTO) {
    switch (area) {
      case AreaType.JUEGO_DE_BASE:
        return [EjercicioJuegoBase.ESTATICO, EjercicioJuegoBase.DINAMICO];
      case AreaType.JUEGO_DE_RED:
        return Object.values(EjercicioJuegoRed);
      case AreaType.PRIMERAS_PELOTAS:
        return Object.values(EjercicioPrimerasPelotas);
      default:
        return [];
    }
  } else if (tipo === TipoType.PELOTEO) {
    switch (area) {
      case AreaType.JUEGO_DE_BASE:
        return [EjercicioJuegoBase.CONTROL, EjercicioJuegoBase.MOVILIDAD, EjercicioJuegoBase.JUGADAS];
      case AreaType.JUEGO_DE_RED:
        return Object.values(EjercicioJuegoRed);
      case AreaType.PRIMERAS_PELOTAS:
        return Object.values(EjercicioPrimerasPelotas);
      case AreaType.PUNTOS:
        return Object.values(EjercicioPuntos);
      default:
        return [];
    }
  }
  return [];
};

// Validador para verificar si una combinación tipo/área/ejercicio es válida
export const isValidCombination = (tipo: TipoType, area: AreaType, ejercicio: string): boolean => {
  const validAreas = getAreasForTipo(tipo);
  if (!validAreas.includes(area)) {
    return false;
  }
  
  const validEjercicios = getEjerciciosForTipoArea(tipo, area);
  return validEjercicios.includes(ejercicio);
};

// Niveles de intensidad (sin cambios)
export const INTENSITY_LEVELS: number[] = Array.from({ length: 10 }, (_, i) => i + 1);

// Labels para UI (opcional, si necesitas mostrar nombres más formales)
export const UI_LABELS = {
  TIPOS: {
    [TipoType.CANASTO]: 'Canasto',
    [TipoType.PELOTEO]: 'Peloteo'
  },
  AREAS: {
    [AreaType.JUEGO_DE_BASE]: 'Juego de base',
    [AreaType.JUEGO_DE_RED]: 'Juego de red',
    [AreaType.PRIMERAS_PELOTAS]: 'Primeras pelotas',
    [AreaType.PUNTOS]: 'Puntos'
  }
} as const;

// Type guards para verificar tipos
export const isTipoType = (value: string): value is TipoType => {
  return Object.values(TipoType).includes(value as TipoType);
};

export const isAreaType = (value: string): value is AreaType => {
  return Object.values(AreaType).includes(value as AreaType);
};