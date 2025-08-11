// services/sessionService.ts
import { TrainingSession, LoggedExercise, Player, SessionExercise } from '../types/types';
import { TipoType, AreaType } from '../constants/training';

export interface SessionCreationData {
  jugadorId: string;
  entrenadorId: string;
  fecha: string;
  ejercicios: LoggedExercise[];
  observaciones?: string;
}

/**
 * Servicio para manejar lógica de sesiones de entrenamiento
 */
export class SessionService {
  /**
   * FUNCIÓN CENTRALIZADA: Convierte SessionExercise a LoggedExercise
   * Todos los lugares que necesiten esta conversión deben usar esta función
   */
  static sessionExerciseToLogged(exercise: SessionExercise): LoggedExercise {
    return {
      id: exercise.id || crypto.randomUUID(),
      tipo: exercise.tipo,
      area: exercise.area,
      ejercicio: exercise.ejercicio || exercise.ejercicioEspecifico || "Sin nombre",
      ejercicioEspecifico: exercise.ejercicioEspecifico,
      tiempoCantidad: exercise.tiempoCantidad || '',
      intensidad: exercise.intensidad || 1
    };
  }

  /**
   * FUNCIÓN CENTRALIZADA: Convierte múltiples SessionExercise a LoggedExercise
   * Filtra por playerId si se proporciona
   */
  static sessionExercisesToLogged(
    exercises: SessionExercise[],
    playerId?: string
  ): LoggedExercise[] {
    const filtered = playerId 
      ? exercises.filter(ex => ex.loggedForPlayerId === playerId)
      : exercises;
    
    return filtered.map(ex => this.sessionExerciseToLogged(ex));
  }

  /**
   * FUNCIÓN CENTRALIZADA: Convierte LoggedExercise a SessionExercise
   */
  static loggedExerciseToSession(
    exercise: LoggedExercise,
    playerId: string,
    playerName: string
  ): SessionExercise {
    return {
      ...exercise,
      id: exercise.id || crypto.randomUUID(),
      loggedForPlayerId: playerId,
      loggedForPlayerName: playerName
    };
  }

  /**
   * FUNCIÓN CENTRALIZADA: Convierte múltiples LoggedExercise a SessionExercise
   */
  static loggedExercisesToSession(
    exercises: LoggedExercise[],
    playerId: string,
    playerName: string
  ): SessionExercise[] {
    return exercises.map(ex => this.loggedExerciseToSession(ex, playerId, playerName));
  }

  /**
   * Crea datos de sesión desde ejercicios del contexto
   * ✅ ACTUALIZADO: Recibe fecha como parámetro
   */
  static createSessionFromExercises(
    player: Player,
    exercises: SessionExercise[],
    entrenadorId: string,
    sessionDate: string,        // ✅ NUEVO PARÁMETRO
    observaciones?: string
  ): Omit<TrainingSession, 'id'> {
    // Usar función centralizada
    const playerExercises = this.sessionExercisesToLogged(exercises, player.id);
    
    return {
      jugadorId: player.id,
      entrenadorId,
      fecha: new Date(sessionDate + 'T12:00:00').toISOString(), // ✅ Usar mediodía para evitar problemas de TZ
      ejercicios: playerExercises,
      observaciones: observaciones?.trim() || ''
    };
  }
  
  /**
   * Crea múltiples sesiones para múltiples jugadores
   * ✅ ACTUALIZADO: Recibe fecha como parámetro
   */
  static createSessionsForPlayers(
    players: Player[],
    exercises: SessionExercise[],
    entrenadorId: string,
    sessionDate: string,        // ✅ NUEVO PARÁMETRO
    observaciones?: string
  ): Omit<TrainingSession, 'id'>[] {
    return players
      .map(player => this.createSessionFromExercises(
        player,
        exercises,
        entrenadorId,
        sessionDate,            // ✅ NUEVO: Pasar sessionDate
        observaciones
      ))
      .filter(session => 
        session.ejercicios.length > 0 || 
        (session.observaciones && session.observaciones.length > 0)
      );
  }
  
  /**
   * Prepara ejercicios para actualización de sesión
   * REFACTORIZADO: Usa la función centralizada
   */
  static prepareExercisesForUpdate(
    exercises: SessionExercise[],
    playerId: string
  ): LoggedExercise[] {
    // Usar función centralizada
    return this.sessionExercisesToLogged(exercises, playerId);
  }
  
  /**
   * Convierte ejercicios de sesión guardada a formato de contexto
   * REFACTORIZADO: Usa la función centralizada
   */
  static convertToSessionExercises(
    exercises: LoggedExercise[],
    playerId: string,
    playerName: string
  ): SessionExercise[] {
    // Usar función centralizada
    return this.loggedExercisesToSession(exercises, playerId, playerName);
  }
  
  /**
   * Filtra sesiones por jugador
   */
  static filterSessionsByPlayer(
    sessions: TrainingSession[],
    playerId: string
  ): TrainingSession[] {
    return sessions.filter(s => s.jugadorId === playerId);
  }
  
  /**
   * Filtra sesiones por rango de fechas
   */
  static filterSessionsByDateRange(
    sessions: TrainingSession[],
    startDate: Date,
    endDate: Date
  ): TrainingSession[] {
    return sessions.filter(s => {
      const sessionDate = new Date(s.fecha);
      return sessionDate >= startDate && sessionDate <= endDate;
    });
  }
  
  /**
   * Extrae todos los ejercicios de múltiples sesiones
   */
  static extractExercisesFromSessions(sessions: TrainingSession[]): LoggedExercise[] {
    const exercises: LoggedExercise[] = [];
    sessions.forEach(session => {
      if (session.ejercicios && Array.isArray(session.ejercicios)) {
        exercises.push(...session.ejercicios);
      }
    });
    return exercises;
  }
  
  /**
   * Cuenta sesiones con datos para un jugador
   */
  static countPlayerSessions(
    sessions: TrainingSession[],
    playerId: string
  ): { sessionsCount: number; exercisesCount: number } {
    const playerSessions = this.filterSessionsByPlayer(sessions, playerId);
    const exercisesCount = playerSessions.reduce(
      (sum, session) => sum + (session.ejercicios?.length || 0),
      0
    );
    
    return {
      sessionsCount: playerSessions.length,
      exercisesCount
    };
  }
  
  /**
   * Crea un nuevo ejercicio para la sesión
   */
  static createSessionExercise(
    tipo: TipoType,
    area: AreaType,
    ejercicio: string,
    tiempoCantidad: string,
    intensidad: number,
    player: Player,
    ejercicioEspecifico?: string
  ): SessionExercise {
    return {
      id: crypto.randomUUID(),
      tipo,
      area,
      ejercicio,
      ejercicioEspecifico: ejercicioEspecifico || undefined,
      tiempoCantidad,
      intensidad,
      loggedForPlayerId: player.id,
      loggedForPlayerName: player.name
    };
  }
}