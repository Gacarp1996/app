// constants/initial-data.ts
// Este archivo contiene datos iniciales de ejemplo - probablemente no lo necesites si usas Firebase

import { Player, Objective, TrainingSession, Tournament, TrainingType, TrainingArea } from '../types';

export const INITIAL_PLAYERS_DATA: Player[] = [
  { id: '1', name: 'Ana Pérez', estado: 'activo' },
  { id: '2', name: 'Carlos López', estado: 'activo' },
  { id: '3', name: 'Laura Gómez', estado: 'activo' },
  { id: '4', name: 'Sofía Martín', estado: 'activo' },
  { id: '5', name: 'David García', estado: 'activo' },
];

export const INITIAL_OBJECTIVES_DATA: Objective[] = [
  {
    id: 'o1', 
    jugadorId: '1', 
    textoObjetivo: 'Mejorar consistencia en el revés cruzado.', 
    estado: 'actual-progreso', 
    cuerpoObjetivo: 'Enfocarse en la preparación temprana y el punto de impacto adelante. Realizar 50 repeticiones de revés cruzado en canasto y 20 en pelota viva por sesión.'
  },
  {
    id: 'o2', 
    jugadorId: '1', 
    textoObjetivo: 'Aumentar porcentaje de primeros saques al 60%.', 
    estado: 'actual-progreso', 
    cuerpoObjetivo: 'Trabajar la regularidad del lanzamiento de pelota y la mecánica completa del saque. Medir porcentaje en cada entrenamiento de puntos.'
  },
  {
    id: 'o3', 
    jugadorId: '1', 
    textoObjetivo: 'Trabajar la volea de definición.', 
    estado: 'consolidacion', 
    cuerpoObjetivo: 'Buscar cerrar los puntos en la red con voleas anguladas o profundas. Practicar ejercicios de volea con intención de definición.'
  },
  {
    id: 'o4', 
    jugadorId: '2', 
    textoObjetivo: 'Desarrollar un saque con más efecto (slice).', 
    estado: 'actual-progreso'
  },
  {
    id: 'o5', 
    jugadorId: '2', 
    textoObjetivo: 'Mejorar la movilidad lateral en el fondo de la pista.', 
    estado: 'actual-progreso', 
    cuerpoObjetivo: 'Realizar ejercicios específicos de desplazamientos laterales, con y sin pelota. Incorporar conos y piques cortos.'
  },
  {
    id: 'o6', 
    jugadorId: '1', 
    textoObjetivo: 'Leer mejor el saque del oponente.', 
    estado: 'incorporado'
  },
];

// CORREGIDO: Agregado entrenadorId a todas las sesiones
export const INITIAL_SESSIONS_DATA: TrainingSession[] = [
  {
    id: 's1',
    jugadorId: '1',
    entrenadorId: 'default-coach-id', // Agregado
    fecha: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    ejercicios: [
      {
        id: 'e1s1', 
        tipo: TrainingType.CANASTO, 
        area: TrainingArea.JUEGO_DE_BASE, 
        ejercicio: 'Desde el lugar', 
        tiempoCantidad: '20m', 
        intensidad: 7
      },
      {
        id: 'e2s1', 
        tipo: TrainingType.PELOTA_VIVA, 
        area: TrainingArea.RED, 
        ejercicio: 'Volea', 
        tiempoCantidad: '15m', 
        intensidad: 6
      },
    ]
  },
  {
    id: 's2',
    jugadorId: '1',
    entrenadorId: 'default-coach-id', // Agregado
    fecha: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    ejercicios: [
      {
        id: 'e1s2', 
        tipo: TrainingType.CANASTO, 
        area: TrainingArea.JUEGO_DE_BASE, 
        ejercicio: 'Dinámico', 
        tiempoCantidad: '25m', 
        intensidad: 8
      },
      {
        id: 'e2s2', 
        tipo: TrainingType.PELOTA_VIVA, 
        area: TrainingArea.PRIMERAS_PELOTAS, 
        ejercicio: 'Saque + 1', 
        tiempoCantidad: '30 reps', 
        intensidad: 7
      },
    ]
  },
  {
    id: 's3',
    jugadorId: '2',
    entrenadorId: 'default-coach-id', // Agregado
    fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    ejercicios: [
      {
        id: 'e1s3', 
        tipo: TrainingType.PELOTA_VIVA, 
        area: TrainingArea.JUEGO_DE_BASE, 
        ejercicio: 'Control', 
        tiempoCantidad: '30m', 
        intensidad: 6
      },
    ]
  }
];

export const INITIAL_TOURNAMENTS_DATA: Tournament[] = [];