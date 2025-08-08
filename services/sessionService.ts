// services/sessionService.ts
import { TrainingSession, LoggedExercise, Player, SessionExercise } from '../types';
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
   * Crea datos de sesión desde ejercicios del contexto
   */
  static createSessionFromExercises(
    player: Player,
    exercises: SessionExercise[],
    entrenadorId: string,
    observaciones?: string
  ): Omit<TrainingSession, 'id'> {
    const playerExercises = exercises
      .filter(ex => ex.loggedForPlayerId === player.id)
      .map(({ loggedForPlayerId, loggedForPlayerName, ...rest }) => {
        const exercise: LoggedExercise = {
          id: rest.id || crypto.randomUUID(),
          tipo: rest.tipo,
          area: rest.area,
          ejercicio: rest.ejercicio || '',
          ejercicioEspecifico: rest.ejercicioEspecifico,
          tiempoCantidad: rest.tiempoCantidad || '',
          intensidad: rest.intensidad || 1
        };
        return exercise;
      });
    
    return {
      jugadorId: player.id,
      entrenadorId,
      fecha: new Date().toISOString(),
      ejercicios: playerExercises,
      observaciones: observaciones?.trim() || ''
    };
  }
  
  /**
   * Crea múltiples sesiones para múltiples jugadores
   */
  static createSessionsForPlayers(
    players: Player[],
    exercises: SessionExercise[],
    entrenadorId: string,
    observaciones?: string
  ): Omit<TrainingSession, 'id'>[] {
    return players
      .map(player => this.createSessionFromExercises(
        player,
        exercises,
        entrenadorId,
        observaciones
      ))
      .filter(session => 
        session.ejercicios.length > 0 || 
        (session.observaciones && session.observaciones.length > 0)
      );
  }
  
  /**
   * Prepara ejercicios para actualización de sesión
   */
  static prepareExercisesForUpdate(
    exercises: SessionExercise[],
    playerId: string
  ): LoggedExercise[] {
    return exercises
      .filter(ex => ex.loggedForPlayerId === playerId)
      .map(({ loggedForPlayerId, loggedForPlayerName, ...rest }) => ({
        id: rest.id || crypto.randomUUID(),
        tipo: rest.tipo,
        area: rest.area,
        ejercicio: rest.ejercicio || '',
        ejercicioEspecifico: rest.ejercicioEspecifico,
        tiempoCantidad: rest.tiempoCantidad || '',
        intensidad: rest.intensidad || 1
      }));
  }
  
  /**
   * Convierte ejercicios de sesión guardada a formato de contexto
   */
  static convertToSessionExercises(
    exercises: LoggedExercise[],
    playerId: string,
    playerName: string
  ): SessionExercise[] {
    return exercises.map(ex => ({
      ...ex,
      id: ex.id || crypto.randomUUID(),
      loggedForPlayerId: playerId,
      loggedForPlayerName: playerName
    }));
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