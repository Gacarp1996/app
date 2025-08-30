// types/types.ts - ARCHIVO COMPLETO CON VALIDACIONES ESTRICTAS ACTUALIZADAS
import { TipoType, AreaType } from '../constants/training';

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
  type?: 'TrainingType' | 'TrainingArea' | 'Exercise' |'SpecificExercise';
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

// ✅ NUEVAS INTERFACES PARA SISTEMA DE APROBACIÓN
export interface JoinRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  academiaId: string;
  publicIdUsed: string;  // Para tracking de qué código usó
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestedAt: string;    // ISO timestamp
  processedAt?: string;   // ISO timestamp cuando se aprueba/rechaza
  processedBy?: string;   // userId del director que procesó
  expiresAt: string;      // ISO timestamp (requestedAt + 7 días)
  metadata?: {
    userAgent?: string;   // Para detectar posibles bots
    ipHash?: string;      // Hash del IP para detectar spam
  };
}

export interface PublicIdRotation {
  id: string;
  academiaId: string;
  oldPublicId: string;
  newPublicId: string;
  rotatedBy: string;      // userId del director
  rotatedAt: string;      // ISO timestamp
  reason?: string;
}

// ✅ ACTUALIZADO: Tipos para planes de entrenamiento con porcentajes absolutos y validaciones estrictas
export interface TrainingPlanArea {
  porcentajeDelTotal: number;     // % ABSOLUTO del total del entrenamiento (OBLIGATORIO)
  porcentajeAbsoluto?: number;    // Alias futuro para mayor claridad
  ejercicios?: {
    [ejercicioName: string]: {
      porcentajeDelTotal: number;  // % ABSOLUTO del total del entrenamiento (OBLIGATORIO si se define ejercicio)
      porcentajeAbsoluto?: number; // Alias futuro
    };
  };
}

export interface TrainingPlanTipo {
  porcentajeTotal: number;  // % del TOTAL del entrenamiento que corresponde a este tipo (OBLIGATORIO)
  areas: {
    [area in AreaType]?: TrainingPlanArea;
  };
}

// ✅ ACTUALIZADA: Interface TrainingPlan con nuevas propiedades
export interface TrainingPlan {
  id?: string;              
  jugadorId: string;
  academiaId?: string;      
  planificacion: {
    [tipo in TipoType]?: TrainingPlanTipo;
  };
  fechaCreacion: string;
  fechaActualizacion: string;
  rangoAnalisis?: number;
  
  // ✅ NUEVAS PROPIEDADES AGREGADAS para validaciones estrictas
  version?: number;                    // Para tracking de migraciones (2 = porcentajes absolutos)
  isComplete?: boolean;                // Plan 100% completo y validado
  granularityLevel?: 'TIPO' | 'AREA' | 'EJERCICIO';  // Nivel de detalle detectado
  validationErrors?: string[];         // Errores de validación si los hay
  
  // Para Fase 2 (futuro)
  usaDistribucionFlexible?: boolean;   // Deprecated en Fase 1
}

// ✅ NUEVAS: Interfaces para validación estricta
export interface StrictValidationResult {
  isValid: boolean;                    // Pasa validaciones básicas
  isComplete: boolean;                 // Plan 100% completo para generar recomendaciones
  errors: string[];                    // Errores que bloquean guardado
  warnings: string[];                  // Advertencias que no bloquean
  totalPercentage: number;             // Suma total actual
  granularityLevel: 'TIPO' | 'AREA' | 'EJERCICIO';  // Nivel detectado
  canGenerateRecommendations: boolean; // Determina si se pueden generar recomendaciones
}

export interface PlanConfiguration {
  granularityLevel: 'TIPO' | 'AREA' | 'EJERCICIO';
  allowIncompleteData: boolean;  // Siempre false en Fase 1
  tolerancePercentage: number;   // Default: 0.5% para redondeo
  enforceStrictValidation: boolean; // Siempre true en Fase 1
}

export interface RecommendationValidation {
  canGenerate: boolean;
  reason?: string;
  validationResult?: StrictValidationResult;
  blockingErrors?: string[];
}

// Tipos para análisis y estadísticas
export interface TrainingStats {
  tipo: TipoType;
  area: AreaType;
  ejercicio: string;
  tiempoTotal: number;
  porcentaje: number;
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

// ✅ ACTUALIZADO: Type guard para TrainingPlan válido
export function isValidTrainingPlan(obj: any): obj is TrainingPlan {
  return obj &&
    typeof obj.jugadorId === 'string' &&
    typeof obj.planificacion === 'object' &&
    typeof obj.fechaCreacion === 'string' &&
    typeof obj.fechaActualizacion === 'string';
}

// ✅ NUEVO: Type guard para StrictValidationResult
export function isStrictValidationResult(obj: any): obj is StrictValidationResult {
  return obj &&
    typeof obj.isValid === 'boolean' &&
    typeof obj.isComplete === 'boolean' &&
    Array.isArray(obj.errors) &&
    Array.isArray(obj.warnings) &&
    typeof obj.totalPercentage === 'number' &&
    typeof obj.canGenerateRecommendations === 'boolean' &&
    ['TIPO', 'AREA', 'EJERCICIO'].includes(obj.granularityLevel);
}

// ✅ NUEVO: Type guard para JoinRequest
export function isJoinRequest(obj: any): obj is JoinRequest {
  return obj &&
    typeof obj.userId === 'string' &&
    typeof obj.userEmail === 'string' &&
    typeof obj.academiaId === 'string' &&
    typeof obj.publicIdUsed === 'string' &&
    ['pending', 'approved', 'rejected', 'expired'].includes(obj.status) &&
    typeof obj.requestedAt === 'string' &&
    typeof obj.expiresAt === 'string';
}

// Helper types para validación
export type ValidationLevel = 'STRICT' | 'PERMISSIVE';
export type PlanStatus = 'COMPLETE' | 'INCOMPLETE' | 'INVALID' | 'EMPTY';
export type RecommendationStatus = 'ENABLED' | 'BLOCKED' | 'LIMITED';

// Interface para metadatos de plan
export interface PlanMetadata {
  status: PlanStatus;
  completionPercentage: number;
  lastValidation: string;
  errorsCount: number;
  warningsCount: number;
  recommendationStatus: RecommendationStatus;
}

// ✅ NUEVAS: Constants para validación
export const VALIDATION_CONSTANTS = {
  TOLERANCE_PERCENTAGE: 0.5,        // ±0.5% tolerancia para suma
  REQUIRED_TOTAL: 100,              // Plan debe sumar 100%
  MIN_PERCENTAGE: 0,                // Mínimo porcentaje permitido
  MAX_PERCENTAGE: 100,              // Máximo porcentaje permitido
  RECOMMENDATION_THRESHOLD: 5       // ±5% para determinar incrementar/reducir
} as const;