export interface Player {
  id: string;
  name: string;
  estado: 'activo' | 'archivado';
  edad?: number;
  altura?: number;
  peso?: number;
  pesoIdeal?: number;
  brazoDominante?: 'Derecho' | 'Izquierdo';
  canalComunicacion?: string;
  ojoDominante?: 'Derecho' | 'Izquierdo';
  historiaDeportiva?: string;
  lesionesActuales?: string;
  lesionesPasadas?: string;
  frecuenciaSemanal?: string;
}

// --- MODIFICADO ---
// Se actualizan los estados posibles para un objetivo.
export type ObjectiveEstado = 'actual-progreso' | 'consolidacion' | 'incorporado';

export interface Objective {
  id: string;
  jugadorId: string;
  textoObjetivo: string;
  cuerpoObjetivo?: string; 
  estado: ObjectiveEstado; 
}

export enum TrainingType {
  CANASTO = "Canasto", // Basket drill
  PELOTA_VIVA = "Pelota viva", // Live ball
}

export interface TrainingSession {
  id: string;
  jugadorId: string; // This session is for this specific player
  fecha: string; // ISO date string
  ejercicios: LoggedExercise[];
   observaciones?: string;
}

export interface LoggedExercise {
  id: string;
  tipo: TrainingType;
  area: TrainingArea; // This is the sub-category/area
  ejercicio: string;
  tiempoCantidad: string;
  intensidad: number; // 1-10
}

export enum TrainingArea {
  FONDO = "Fondo",
  RED = "Red", // "Juego de red" maps to this
  PRIMERAS_PELOTAS = "Primeras Pelotas",
  PUNTOS = "Puntos",
}

export interface ChartDataPoint {
  name: string; 
  value: number; 
  type?: 'TrainingType' | 'TrainingArea' | 'Exercise'; 
}

export interface IntensityDataPoint {
  fecha: string; 
  intensidad: number;
}

export type TournamentImportance = 'Muy importante' | 'Importante' | 'Importancia media' | 'Poco importante' | 'Nada importante';

export interface Tournament {
  id: string;
  jugadorId: string;
  nombreTorneo: string;
  gradoImportancia: TournamentImportance;
  fechaInicio: string; // ISO date string
  fechaFin: string; // ISO date string
}

// Tipos para la encuesta post-entrenamiento
export interface PostTrainingSurvey {
  id: string;
  jugadorId: string;
  sessionId: string;
  fecha: string; // ISO date string
  cansancioFisico: number; // 1-5
  concentracion: number; // 1-5
  actitudMental: number; // 1-5
  sensacionesTenisticas: number; // 1-5
}

export interface SurveyDataPoint {
  fecha: string;
  cansancioFisico: number;
  concentracion: number;
  actitudMental: number;
  sensacionesTenisticas: number;
}

// Agregar al final del archivo types.ts

// Tipos para Academia
export type TipoEntidad = 'academia' | 'grupo-entrenamiento';

export interface Academia {
  nombre: string;
  id: string;
  creadorId: string;
  fechaCreacion: Date;
  activa: boolean;
  tipo: TipoEntidad;
  limiteJugadores?: number;
}