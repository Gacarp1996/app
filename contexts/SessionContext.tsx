// src/contexts/SessionContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAcademia } from './AcademiaContext';
import { useAuth } from './AuthContext';
import { TrainingSession, LoggedExercise } from '../types/types';
import { 
  getSessions as getSessionsFromDB,
  addSession as addSessionToDB,
  updateSession as updateSessionInDB,
  deleteSession as deleteSessionFromDB,
  getTrainedPlayersByCoach as getTrainedPlayersByCoachFromDB
} from '../Database/FirebaseSessions';
// ✅ NUEVO: Imports de dateHelpers
import { 
  isSameLocalDay,
  isInLocalDateRange
} from '../utils/dateHelpers';

// Tipos para el contexto
interface TrainedPlayerData {
  playerId: string;
  sessionCount: number;
  lastSessionDate: string;
  totalExercises: number;
}

interface SessionStats {
  totalSessions: number;
  totalExercises: number;
  averageIntensity: number;
  lastSessionDate: string | null;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface CacheEntry {
  data: any;
  timestamp: number;
  queryType: 'all' | 'player' | 'coach' | 'date' | 'trainedPlayers';
  queryParams?: any;
}

interface SessionContextType {
  // Estado
  sessions: TrainingSession[];
  loadingSessions: boolean;
  sessionsError: string | null;
  lastRefresh: Date | null;
  
  // Funciones de carga
  loadSessions: () => Promise<void>;
  refreshSessions: (force?: boolean) => Promise<void>;
  
  // Consultas básicas
  getSessionsByPlayer: (playerId: string, dateRange?: DateRange) => TrainingSession[];
  getSessionsByCoach: (coachId: string, dateRange?: DateRange) => TrainingSession[];
  getSessionsByDate: (date: string) => TrainingSession[];
  getSessionsByDateRange: (start: Date, end: Date) => TrainingSession[];
  getTodaySessions: () => TrainingSession[];
  getSessionById: (sessionId: string) => TrainingSession | undefined;
  
  // Consultas especializadas
  getTrainedPlayersByCoach: (coachId: string, startDate: Date, endDate: Date) => Promise<TrainedPlayerData[]>;
  getSessionsCountByPlayer: (playerId: string, days: number) => number;
  getLastSessionDate: (playerId: string) => string | null;
  getPlayerStats: (playerId: string, days?: number) => SessionStats;
  
  // CRUD
  addSession: (sessionData: Omit<TrainingSession, 'id'>) => Promise<string>;
  updateSession: (sessionId: string, updates: Partial<TrainingSession>) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  
  // Utilidades
  clearCache: () => void;
  isStale: () => boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// Configuración
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
const MAX_SESSIONS_IN_MEMORY = 1000;
const STALE_TIME = 60 * 1000; // 1 minuto para considerar datos obsoletos

export const SessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { academiaActual } = useAcademia();
  const { currentUser } = useAuth(); // ✅ YA ESTÁ IMPORTADO
  
  // Estados principales
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  
  // Cache
  const [cache, setCache] = useState<Map<string, CacheEntry>>(new Map());
  
  // ✅ NUEVO: Refs para actualizaciones pendientes del cache
  const pendingCacheUpdates = useRef<Map<string, CacheEntry>>(new Map());
  const cacheUpdateScheduled = useRef(false);
  
  // Estado para actualizaciones optimistas
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Partial<TrainingSession>>>(new Map());
  
  // Función helper para generar clave de cache
  const getCacheKey = (queryType: string, params?: any): string => {
    return `${queryType}_${JSON.stringify(params || {})}`;
  };
  
  // Función helper para verificar si el cache es válido
  const isCacheValid = (entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp < CACHE_DURATION;
  };
  
  // ✅ NUEVO: Función para aplicar actualizaciones de cache de forma diferida
  const applyPendingCacheUpdates = useCallback(() => {
    if (pendingCacheUpdates.current.size > 0) {
      setCache(prevCache => {
        const newCache = new Map(prevCache);
        pendingCacheUpdates.current.forEach((value, key) => {
          newCache.set(key, value);
        });
        return newCache;
      });
      pendingCacheUpdates.current.clear();
    }
    cacheUpdateScheduled.current = false;
  }, []);
  
  // ✅ NUEVO: Función helper para actualizar cache de forma segura
  const updateCacheSafely = useCallback((key: string, entry: CacheEntry) => {
    // Guardar en actualizaciones pendientes
    pendingCacheUpdates.current.set(key, entry);
    
    // Programar actualización si no está ya programada
    if (!cacheUpdateScheduled.current) {
      cacheUpdateScheduled.current = true;
      // Usar setTimeout para diferir la actualización
      setTimeout(() => {
        applyPendingCacheUpdates();
      }, 0);
    }
  }, [applyPendingCacheUpdates]);
  
  // Función para limpiar cache
  const clearCache = useCallback(() => {
    setCache(new Map());
    setOptimisticUpdates(new Map());
    pendingCacheUpdates.current.clear();
    cacheUpdateScheduled.current = false;
  }, []);
  
  // Función para verificar si los datos están obsoletos
  const isStale = useCallback((): boolean => {
    if (!lastRefresh) return true;
    return Date.now() - lastRefresh.getTime() > STALE_TIME;
  }, [lastRefresh]);
  
  // Función principal para cargar sesiones
  const loadSessions = useCallback(async () => {
    if (!academiaActual) {
      setSessions([]);
      return;
    }
    
    setLoadingSessions(true);
    setSessionsError(null);
    
    try {
      const loadedSessions = await getSessionsFromDB(academiaActual.id);
      
      // Limitar sesiones en memoria (mantener las más recientes)
      const sortedSessions = loadedSessions
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
        .slice(0, MAX_SESSIONS_IN_MEMORY);
      
      setSessions(sortedSessions);
      setLastRefresh(new Date());
      clearCache();
      
    } catch (error) {
      console.error('Error cargando sesiones:', error);
      setSessionsError('Error al cargar las sesiones');
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [academiaActual, clearCache]);
  
  // Función para refrescar sesiones con control de cache
  const refreshSessions = useCallback(async (force: boolean = false) => {
    if (!force && !isStale()) {
      return; // No refrescar si los datos son recientes
    }
    
    await loadSessions();
  }, [loadSessions, isStale]);
  
  // Cargar sesiones cuando cambie la academia
  useEffect(() => {
    if (academiaActual) {
      loadSessions();
    } else {
      setSessions([]);
      setSessionsError(null);
      clearCache();
    }
  }, [academiaActual?.id]); // Solo recargar cuando cambie el ID
  
  // Aplicar actualizaciones optimistas a las sesiones
  const sessionsWithOptimisticUpdates = useMemo(() => {
    if (optimisticUpdates.size === 0) return sessions;
    
    return sessions.map(session => {
      const update = optimisticUpdates.get(session.id);
      return update ? { ...session, ...update } : session;
    });
  }, [sessions, optimisticUpdates]);
  
  // FUNCIONES DE CONSULTA
  
  // ✅ ACTUALIZADO: Obtener sesiones por jugador con comparación de fecha local
  const getSessionsByPlayer = useCallback((playerId: string, dateRange?: DateRange): TrainingSession[] => {
    const cacheKey = getCacheKey('player', { playerId, dateRange });
    const cached = cache.get(cacheKey);
    
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
    
    let filtered = sessionsWithOptimisticUpdates.filter(s => s.jugadorId === playerId);
    
    if (dateRange) {
      // ✅ ACTUALIZADO: Usar isInLocalDateRange
      filtered = filtered.filter(s => 
        isInLocalDateRange(s.fecha, dateRange.start, dateRange.end)
      );
    }
    
    updateCacheSafely(cacheKey, {
      data: filtered,
      timestamp: Date.now(),
      queryType: 'player',
      queryParams: { playerId, dateRange }
    });
    
    return filtered;
  }, [sessionsWithOptimisticUpdates, cache, updateCacheSafely]);
  
  // ✅ ACTUALIZADO: Obtener sesiones por entrenador con comparación de fecha local
  const getSessionsByCoach = useCallback((coachId: string, dateRange?: DateRange): TrainingSession[] => {
    const cacheKey = getCacheKey('coach', { coachId, dateRange });
    const cached = cache.get(cacheKey);
    
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
    
    let filtered = sessionsWithOptimisticUpdates.filter(s => s.entrenadorId === coachId);
    
    if (dateRange) {
      // ✅ ACTUALIZADO: Usar isInLocalDateRange
      filtered = filtered.filter(s => 
        isInLocalDateRange(s.fecha, dateRange.start, dateRange.end)
      );
    }
    
    updateCacheSafely(cacheKey, {
      data: filtered,
      timestamp: Date.now(),
      queryType: 'coach',
      queryParams: { coachId, dateRange }
    });
    
    return filtered;
  }, [sessionsWithOptimisticUpdates, cache, updateCacheSafely]);
  
  // ✅ ACTUALIZADO: Obtener sesiones por fecha específica con comparación de fecha local
  const getSessionsByDate = useCallback((date: string): TrainingSession[] => {
    const cacheKey = getCacheKey('date', { date });
    const cached = cache.get(cacheKey);
    
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
    
    // ✅ ACTUALIZADO: Usar isSameLocalDay
    const filtered = sessionsWithOptimisticUpdates.filter(s => 
      isSameLocalDay(s.fecha, date)
    );
    
    updateCacheSafely(cacheKey, {
      data: filtered,
      timestamp: Date.now(),
      queryType: 'date',
      queryParams: { date }
    });
    
    return filtered;
  }, [sessionsWithOptimisticUpdates, cache, updateCacheSafely]);
  
  // ✅ ACTUALIZADO: Obtener sesiones por rango de fechas con comparación de fecha local
  const getSessionsByDateRange = useCallback((start: Date, end: Date): TrainingSession[] => {
    // ✅ ACTUALIZADO: Usar isInLocalDateRange directamente
    return sessionsWithOptimisticUpdates.filter(s => 
      isInLocalDateRange(s.fecha, start, end)
    );
  }, [sessionsWithOptimisticUpdates]);
  
  // Obtener sesiones de hoy
  const getTodaySessions = useCallback((): TrainingSession[] => {
    const today = new Date().toLocaleDateString('en-CA'); // Usar fecha local en formato YYYY-MM-DD
    return getSessionsByDate(today);
  }, [getSessionsByDate]);
  
  // Obtener sesión por ID
  const getSessionById = useCallback((sessionId: string): TrainingSession | undefined => {
    return sessionsWithOptimisticUpdates.find(s => s.id === sessionId);
  }, [sessionsWithOptimisticUpdates]);
  
  // ✅ MODIFICADO: Obtener jugadores entrenados por un coach con cache seguro
  const getTrainedPlayersByCoach = useCallback(async (
    coachId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<TrainedPlayerData[]> => {
    if (!academiaActual) return [];
    
    const cacheKey = getCacheKey('trainedPlayers', { coachId, startDate, endDate });
    const cached = cache.get(cacheKey);
    
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
    
    try {
      const data = await getTrainedPlayersByCoachFromDB(academiaActual.id, coachId, startDate, endDate);
      
      // ✅ Usar updateCacheSafely para esta función async también
      updateCacheSafely(cacheKey, {
        data,
        timestamp: Date.now(),
        queryType: 'trainedPlayers',
        queryParams: { coachId, startDate, endDate }
      });
      
      return data;
    } catch (error) {
      console.error('Error obteniendo jugadores entrenados por coach:', error);
      return [];
    }
  }, [academiaActual, cache, updateCacheSafely]);
  
  // Contar sesiones por jugador en los últimos N días
  const getSessionsCountByPlayer = useCallback((playerId: string, days: number): number => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const playerSessions = getSessionsByPlayer(playerId, { start: startDate, end: endDate });
    return playerSessions.length;
  }, [getSessionsByPlayer]);
  
  // Obtener fecha de última sesión de un jugador
  const getLastSessionDate = useCallback((playerId: string): string | null => {
    const playerSessions = getSessionsByPlayer(playerId);
    if (playerSessions.length === 0) return null;
    
    // Las sesiones ya están ordenadas por fecha descendente
    return playerSessions[0].fecha;
  }, [getSessionsByPlayer]);
  
  // Obtener estadísticas de un jugador
  const getPlayerStats = useCallback((playerId: string, days: number = 30): SessionStats => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const playerSessions = getSessionsByPlayer(playerId, { start: startDate, end: endDate });
    
    if (playerSessions.length === 0) {
      return {
        totalSessions: 0,
        totalExercises: 0,
        averageIntensity: 0,
        lastSessionDate: null
      };
    }
    
    const totalExercises = playerSessions.reduce((sum, session) => sum + session.ejercicios.length, 0);
    const totalIntensity = playerSessions.reduce((sum, session) => {
      const sessionIntensity = session.ejercicios.reduce((sSum, ex) => sSum + ex.intensidad, 0);
      return sum + sessionIntensity;
    }, 0);
    
    return {
      totalSessions: playerSessions.length,
      totalExercises,
      averageIntensity: totalExercises > 0 ? totalIntensity / totalExercises : 0,
      lastSessionDate: playerSessions[0].fecha
    };
  }, [getSessionsByPlayer]);
  
  // FUNCIONES CRUD
  
  // ✅ CRÍTICO: Agregar sesión con currentUser para registro
  const addSession = useCallback(async (sessionData: Omit<TrainingSession, 'id'>): Promise<string> => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    // Crear ID temporal para actualización optimista
    const tempId = `temp_${Date.now()}`;
    const optimisticSession: TrainingSession = {
      ...sessionData,
      id: tempId
    };
    
    // Actualizar estado local inmediatamente
    setSessions(prev => [optimisticSession, ...prev].slice(0, MAX_SESSIONS_IN_MEMORY));
    
    try {
      // ✅ CRÍTICO: Pasar currentUser a FirebaseSessions
      const realId = await addSessionToDB(
        academiaActual.id, 
        sessionData, 
        currentUser || undefined
      );
      
      // Actualizar con el ID real
      setSessions(prev => prev.map(s => 
        s.id === tempId ? { ...s, id: realId } : s
      ));
      
      // Limpiar cache relacionado
      clearCache();
      setLastRefresh(new Date());
      
      return realId;
    } catch (error) {
      // Revertir cambio optimista en caso de error
      setSessions(prev => prev.filter(s => s.id !== tempId));
      throw error;
    }
  }, [academiaActual, clearCache, currentUser]);
  
  // ✅ CRÍTICO: Actualizar sesión con currentUser para registro
  const updateSession = useCallback(async (sessionId: string, updates: Partial<TrainingSession>): Promise<void> => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    // Guardar actualización optimista
    setOptimisticUpdates(prev => {
      const newMap = new Map(prev);
      const currentUpdates = newMap.get(sessionId) || {};
      newMap.set(sessionId, { ...currentUpdates, ...updates });
      return newMap;
    });
    
    try {
      // ✅ CRÍTICO: Pasar currentUser a FirebaseSessions
      await updateSessionInDB(
        academiaActual.id, 
        sessionId, 
        updates, 
        currentUser || undefined
      );
      
      // Actualizar estado real
      setSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, ...updates } : s
      ));
      
      // Limpiar actualización optimista
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(sessionId);
        return newMap;
      });
      
      // Limpiar cache relacionado
      clearCache();
      setLastRefresh(new Date());
    } catch (error) {
      // Revertir actualización optimista en caso de error
      setOptimisticUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(sessionId);
        return newMap;
      });
      throw error;
    }
  }, [academiaActual, clearCache, currentUser]);
  
  // Eliminar sesión con actualización optimista
  const deleteSession = useCallback(async (sessionId: string): Promise<void> => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    // Guardar sesión para poder revertir
    const sessionToDelete = sessions.find(s => s.id === sessionId);
    
    // Eliminar optimistamente
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    
    try {
      // Llamar a Firebase
      await deleteSessionFromDB(academiaActual.id, sessionId);
      
      // Limpiar cache relacionado
      clearCache();
      setLastRefresh(new Date());
    } catch (error) {
      // Revertir eliminación en caso de error
      if (sessionToDelete) {
        setSessions(prev => [...prev, sessionToDelete].sort((a, b) => 
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        ));
      }
      throw error;
    }
  }, [academiaActual, sessions, clearCache]);
  
  const value: SessionContextType = {
    // Estado
    sessions: sessionsWithOptimisticUpdates,
    loadingSessions,
    sessionsError,
    lastRefresh,
    
    // Funciones de carga
    loadSessions,
    refreshSessions,
    
    // Consultas
    getSessionsByPlayer,
    getSessionsByCoach,
    getSessionsByDate,
    getSessionsByDateRange,
    getTodaySessions,
    getSessionById,
    getTrainedPlayersByCoach,
    getSessionsCountByPlayer,
    getLastSessionDate,
    getPlayerStats,
    
    // CRUD
    addSession,
    updateSession,
    deleteSession,
    
    // Utilidades
    clearCache,
    isStale
  };
  
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession debe ser usado dentro de SessionProvider');
  }
  return context;
};