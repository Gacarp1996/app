import { TipoType, AreaType } from './constants/training';

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

export type ObjectiveEstado = 'actual-progreso' | 'consolidacion' | 'incorporado';

export interface Objective {
  id: string;
  jugadorId: string;
  textoObjetivo: string;
  cuerpoObjetivo?: string; 
  estado: ObjectiveEstado; 
}

export interface TrainingSession {
  id: string;
  jugadorId: string; 
  entrenadorId: string; 
  fecha: string; 
  ejercicios: LoggedExercise[];
  observaciones?: string;
}

export interface LoggedExercise {
  id: string;
  tipo: TipoType;
  area: AreaType; 
  ejercicio: string;
  ejercicioEspecifico?: string;
  tiempoCantidad: string;
  intensidad: number; 
}

export interface SpecificExercise {
  id: string;
  name: string;
  tipo: TipoType;
  area: AreaType;
  ejercicio: string;
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
  fechaInicio: string;
  fechaFin: string;
}

export interface PostTrainingSurvey {
  id: string;
  jugadorId: string;
  sessionId: string;
  fecha: string;
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

export type RendimientoJugador = 'Muy malo' | 'Malo' | 'Bueno' | 'Muy bueno' | 'Excelente';

export interface DisputedTournament {
  id: string;
  jugadorId: string;
  nombreTorneo: string;
  fechaInicio: string;
  fechaFin: string;
  resultado: string;
  nivelDificultad: number; // 1-5
  rendimientoJugador: RendimientoJugador;
  observaciones?: string;
  fechaRegistro?: string;
  torneoFuturoId?: string;
}

export interface TournamentPerformanceData {
  fecha: string;
  rendimiento: number; // 1-5
  dificultad: number;
  resultado: string;
  nombreTorneo: string;
}

export interface AcademiaConfig {
  id: string;
  academiaId: string;
  encuestasHabilitadas: boolean;
  preguntasEncuesta: {
    cansancioFisico: boolean;
    concentracion: boolean;
    actitudMental: boolean;
    sensacionesTenisticas: boolean;
  };
  fechaCreacion: string;
  fechaActualizacion: string;
}

// Tipos adicionales para el contexto de entrenamiento
export interface SessionExercise extends LoggedExercise {
  loggedForPlayerId: string;
  loggedForPlayerName: string;
}

// Tipos para planes de entrenamiento
export interface TrainingPlanArea {
  porcentajeDelTotal: number;
  ejercicios?: {
    [ejercicioName: string]: {
      porcentajeDelTotal: number;
    };
  };
}

export interface TrainingPlanTipo {
  porcentajeTotal: number;
  areas: {
    [area in AreaType]?: TrainingPlanArea;
  };
}

export interface TrainingPlan {
  id: string;
  jugadorId: string;
  academiaId: string;
  planificacion: {
    [tipo in TipoType]?: TrainingPlanTipo;
  };
  fechaCreacion: string;
  fechaActualizacion: string;
}

// Tipos para análisis y estadísticas
export interface TrainingStats {
  tipo: TipoType;
  area: AreaType;
  ejercicio: string;
  tiempoTotal: number;
  porcentaje: number;
  sesiones: number;
}

export interface PlayerTrainingAnalysis {
  playerId: string;
  playerName: string;
  totalSessions: number;
  totalExercises: number;
  dateRange: {
    from: string;
    to: string;
  };
  stats: TrainingStats[];
}

// Type guards
export function isLoggedExercise(obj: any): obj is LoggedExercise {
  return obj &&
    typeof obj.id === 'string' &&
    Object.values(TipoType).includes(obj.tipo) &&
    Object.values(AreaType).includes(obj.area) &&
    typeof obj.ejercicio === 'string' &&
    typeof obj.tiempoCantidad === 'string' &&
    typeof obj.intensidad === 'number';
}

export function isTrainingSession(obj: any): obj is TrainingSession {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.jugadorId === 'string' &&
    typeof obj.entrenadorId === 'string' &&
    typeof obj.fecha === 'string' &&
    Array.isArray(obj.ejercicios) &&
    obj.ejercicios.every(isLoggedExercise);
}