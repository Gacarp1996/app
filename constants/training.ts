// constants/training.ts

// Enums con valores que representan exactamente lo que se muestra/guarda
export enum TipoType {
  CANASTO = 'Canasto',
  PELOTEO = 'Peloteo',
  PUNTOS = 'Puntos'  
}

export enum AreaType {
  JUEGO_DE_BASE = 'Juego de base',
  JUEGO_DE_RED = 'Juego de red',
  PRIMERAS_PELOTAS = 'Primeras pelotas',
  PUNTOS_LIBRES = 'Puntos libres',
  PUNTOS_CON_PAUTAS = 'Puntos con pautas'
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
    [AreaType.PRIMERAS_PELOTAS]: Exclude<EjercicioPrimerasPelotas, EjercicioPrimerasPelotas.SAQUE>; // MODIFICADO: Sin Saque
  };
  [TipoType.PUNTOS]: {  // NUEVO
    [AreaType.PUNTOS_LIBRES]: never;  // Sin ejercicios
    [AreaType.PUNTOS_CON_PAUTAS]: never;  // Sin ejercicios
  };
};

// Helper para obtener las áreas disponibles según el tipo
export const getAreasForTipo = (tipo: TipoType): AreaType[] => {
  switch (tipo) {
    case TipoType.CANASTO:
      return [AreaType.JUEGO_DE_BASE, AreaType.JUEGO_DE_RED, AreaType.PRIMERAS_PELOTAS];
    case TipoType.PELOTEO:
      // MODIFICADO: Eliminado PUNTOS como área
      return [AreaType.JUEGO_DE_BASE, AreaType.JUEGO_DE_RED, AreaType.PRIMERAS_PELOTAS];
    case TipoType.PUNTOS:  // NUEVO
      return [AreaType.PUNTOS_LIBRES, AreaType.PUNTOS_CON_PAUTAS];
  }
};

// Helper para obtener ejercicios disponibles según tipo y área
export const getEjerciciosForTipoArea = (tipo: TipoType, area: AreaType): string[] => {
  // ✅ IMPORTANTE: Puntos no tiene ejercicios
  if (tipo === TipoType.PUNTOS) {
    return [];
  }
  
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
        // MODIFICADO: Excluir Saque de PELOTEO
        return [
          EjercicioPrimerasPelotas.DEVOLUCION,
          EjercicioPrimerasPelotas.SAQUE_MAS_UNO,
          EjercicioPrimerasPelotas.DEVOLUCION_MAS_UNO
        ];
      default:
        return [];
    }
  }
  return [];
};

// ✅ NUEVO: Helper para verificar si un tipo requiere ejercicios
export const tipoRequiereEjercicios = (tipo: TipoType): boolean => {
  return tipo !== TipoType.PUNTOS;
};

// Validador para verificar si una combinación tipo/área/ejercicio es válida
export const isValidCombination = (tipo: TipoType, area: AreaType, ejercicio: string): boolean => {
  const validAreas = getAreasForTipo(tipo);
  if (!validAreas.includes(area)) {
    return false;
  }
  
  // NUEVO: Si es tipo PUNTOS, no validar ejercicio (puede ser vacío)
  if (tipo === TipoType.PUNTOS) {
    return true;
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
    [TipoType.PELOTEO]: 'Peloteo',
    [TipoType.PUNTOS]: 'Puntos'  // NUEVO
  },
  AREAS: {
    [AreaType.JUEGO_DE_BASE]: 'Juego de base',
    [AreaType.JUEGO_DE_RED]: 'Juego de red',
    [AreaType.PRIMERAS_PELOTAS]: 'Primeras pelotas',
    [AreaType.PUNTOS_LIBRES]: 'Puntos libres',  // NUEVO
    [AreaType.PUNTOS_CON_PAUTAS]: 'Puntos con pautas'  // NUEVO
  }
} as const;

// Type guards para verificar tipos
export const isTipoType = (value: string): value is TipoType => {
  return Object.values(TipoType).includes(value as TipoType);
};

export const isAreaType = (value: string): value is AreaType => {
  return Object.values(AreaType).includes(value as AreaType);
};