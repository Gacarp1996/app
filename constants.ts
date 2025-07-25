import { Player, TrainingArea, TrainingType, ObjectiveEstado, Objective, TrainingSession, Tournament, TournamentImportance } from './types';

export const MAX_ACTIVE_OBJECTIVES = 5;
export const MAX_PLAYERS_PER_SESSION = 4; // Max selectable at start, session can grow

export const OBJECTIVE_ESTADOS: Record<ObjectiveEstado, string> = {
  'actual-progreso': 'Actual/En Progreso',
  'consolidacion': 'En Consolidación',
  'incorporado': 'Incorporado',
};


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
    "Juego de red": TrainingArea.RED,
    "Primeras pelotas": TrainingArea.PRIMERAS_PELOTAS,
    "Puntos": TrainingArea.PUNTOS,
  } as Record<string, TrainingArea>
};


export const INTENSITY_LEVELS: number[] = Array.from({ length: 10 }, (_, i) => i + 1);

// This might be deprecated for the new form but kept for other potential uses
export const TRAINING_TYPES_OPTIONS = Object.values(TrainingType);

export const INITIAL_PLAYERS_DATA: Player[] = [
  { id: '1', name: 'Ana Pérez', estado: 'activo' },
  { id: '2', name: 'Carlos López', estado: 'activo' },
  { id: '3', name: 'Laura Gómez', estado: 'activo' },
  { id: '4', name: 'Sofía Martín', estado: 'activo' },
  { id: '5', name: 'David García', estado: 'activo' },
];

// --- CORREGIDO ---
// Se ha eliminado el error de tipeo "id:g:" en el objetivo con id 'o4'.
export const INITIAL_OBJECTIVES_DATA: Objective[] = [
    {id: 'o1', jugadorId: '1', textoObjetivo: 'Mejorar consistencia en el revés cruzado.', estado: 'actual-progreso', cuerpoObjetivo: 'Enfocarse en la preparación temprana y el punto de impacto adelante. Realizar 50 repeticiones de revés cruzado en canasto y 20 en pelota viva por sesión.'},
    {id: 'o2', jugadorId: '1', textoObjetivo: 'Aumentar porcentaje de primeros saques al 60%.', estado: 'actual-progreso', cuerpoObjetivo: 'Trabajar la regularidad del lanzamiento de pelota y la mecánica completa del saque. Medir porcentaje en cada entrenamiento de puntos.'},
    {id: 'o3', jugadorId: '1', textoObjetivo: 'Trabajar la volea de definición.', estado: 'consolidacion', cuerpoObjetivo: 'Buscar cerrar los puntos en la red con voleas anguladas o profundas. Practicar ejercicios de volea con intención de definición.'},
    {id: 'o4', jugadorId: '2', textoObjetivo: 'Desarrollar un saque con más efecto (slice).', estado: 'actual-progreso'},
    {id: 'o5', jugadorId: '2', textoObjetivo: 'Mejorar la movilidad lateral en el fondo de la pista.', estado: 'actual-progreso', cuerpoObjetivo: 'Realizar ejercicios específicos de desplazamientos laterales, con y sin pelota. Incorporar conos y piques cortos.'},
    {id: 'o6', jugadorId: '1', textoObjetivo: 'Leer mejor el saque del oponente.', estado: 'incorporado'},
];

export const INITIAL_SESSIONS_DATA: TrainingSession[] = [
    {
        id: 's1',
        jugadorId: '1',
        fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        ejercicios: [
            {id: 'e1s1', tipo: TrainingType.CANASTO, area: TrainingArea.JUEGO_DE_BASE, ejercicio: 'Desde el lugar', tiempoCantidad: '20m', intensidad: 7},
            {id: 'e2s1', tipo: TrainingType.PELOTA_VIVA, area: TrainingArea.RED, ejercicio: 'Volea', tiempoCantidad: '15m', intensidad: 6},
        ]
    },
    {
        id: 's2',
        jugadorId: '1',
        fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        ejercicios: [
            {id: 'e1s2', tipo: TrainingType.CANASTO, area: TrainingArea.JUEGO_DE_BASE, ejercicio: 'Dinámico', tiempoCantidad: '25m', intensidad: 8},
            {id: 'e2s2', tipo: TrainingType.PELOTA_VIVA, area: TrainingArea.PRIMERAS_PELOTAS, ejercicio: 'Saque + 1', tiempoCantidad: '30 reps', intensidad: 7},
        ]
    },
    {
        id: 's3',
        jugadorId: '2',
        fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        ejercicios: [
            {id: 'e1s3', tipo: TrainingType.PELOTA_VIVA, area: TrainingArea.JUEGO_DE_BASE, ejercicio: 'Control', tiempoCantidad: '30m', intensidad: 6},
        ]
    }
];

export const TOURNAMENT_IMPORTANCE_LEVELS: TournamentImportance[] = [
  'Muy importante',
  'Importante',
  'Importancia media',
  'Poco importante',
  'Nada importante',
];

export const INITIAL_TOURNAMENTS_DATA: Tournament[] = [];