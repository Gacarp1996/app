// services/sessionService.ts
import { Player } from '../types';
import { SessionExercise } from '../contexts/TrainingContext';

export interface SessionState {
  participants: Player[];
  exercises: SessionExercise[];
  startTime: string;
  lastUpdateTime: string;
  academiaId: string;
}

export class SessionService {
  private static readonly STORAGE_PREFIX = 'inProgressTrainingSession_';
  private static readonly MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas

  static saveSession(academiaId: string, participants: Player[], exercises: SessionExercise[]): void {
    const sessionState: SessionState = {
      participants,
      exercises,
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString(),
      academiaId
    };

    const key = this.getStorageKey(academiaId);
    localStorage.setItem(key, JSON.stringify(sessionState));
  }

  static loadSession(academiaId: string): SessionState | null {
    try {
      const key = this.getStorageKey(academiaId);
      const data = localStorage.getItem(key);
      
      if (!data) return null;

      const session: SessionState = JSON.parse(data);
      
      // Validar que la sesión corresponde a la academia actual
      if (session.academiaId !== academiaId) {
        this.clearSession(academiaId);
        return null;
      }

      // Verificar que la sesión no sea muy antigua
      const lastUpdate = new Date(session.lastUpdateTime);
      const now = new Date();
      const age = now.getTime() - lastUpdate.getTime();

      if (age > this.MAX_SESSION_AGE_MS) {
        this.clearSession(academiaId);
        return null;
      }

      // Validar estructura de datos
      if (!this.isValidSession(session)) {
        this.clearSession(academiaId);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error loading session:', error);
      this.clearSession(academiaId);
      return null;
    }
  }

  static updateSession(academiaId: string, updates: Partial<SessionState>): void {
    const currentSession = this.loadSession(academiaId);
    if (!currentSession) return;

    const updatedSession: SessionState = {
      ...currentSession,
      ...updates,
      lastUpdateTime: new Date().toISOString()
    };

    const key = this.getStorageKey(academiaId);
    localStorage.setItem(key, JSON.stringify(updatedSession));
  }

  static clearSession(academiaId: string): void {
    const key = this.getStorageKey(academiaId);
    localStorage.removeItem(key);
  }

  static hasActiveSession(academiaId: string): boolean {
    return this.loadSession(academiaId) !== null;
  }

  static getAllSessions(): SessionState[] {
    const sessions: SessionState[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.STORAGE_PREFIX)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const session = JSON.parse(data);
            if (this.isValidSession(session)) {
              sessions.push(session);
            }
          }
        } catch (error) {
          console.error('Error parsing session:', error);
        }
      }
    }
    
    return sessions;
  }

  private static getStorageKey(academiaId: string): string {
    return `${this.STORAGE_PREFIX}${academiaId}`;
  }

  private static isValidSession(session: any): session is SessionState {
    return (
      session &&
      Array.isArray(session.participants) &&
      Array.isArray(session.exercises) &&
      session.participants.length > 0 &&
      typeof session.startTime === 'string' &&
      typeof session.lastUpdateTime === 'string' &&
      typeof session.academiaId === 'string'
    );
  }
}