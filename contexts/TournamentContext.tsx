// contexts/TournamentContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useAcademia } from './AcademiaContext';
import { Tournament, DisputedTournament, TournamentImportance } from '../types/types';
import { 
  getTournaments as getTournamentsFromDB,
  addTournament as addTournamentToDB,
  updateTournament as updateTournamentInDB,
  deleteTournament as deleteTournamentFromDB
} from '../Database/FirebaseTournaments';
import {
  getDisputedTournaments as getDisputedTournamentsFromDB,
  addDisputedTournament as addDisputedTournamentToDB,
  updateDisputedTournament as updateDisputedTournamentInDB,
  deleteDisputedTournament as deleteDisputedTournamentFromDB,
  convertToDisputedTournament as convertToDisputedTournamentInDB
} from '../Database/FirebaseDisputedTournaments';

interface TournamentContextType {
  // Estado - Torneos Futuros
  tournaments: Tournament[];
  loadingTournaments: boolean;
  tournamentsError: string | null;
  
  // Estado - Torneos Disputados
  disputedTournaments: DisputedTournament[];
  loadingDisputedTournaments: boolean;
  disputedTournamentsError: string | null;
  
  // Estado general
  isLoading: boolean; // Loading combinado
  
  // Funciones de carga
  loadTournaments: () => Promise<void>;
  loadDisputedTournaments: () => Promise<void>;
  refreshAllTournaments: () => Promise<void>;
  
  // Consultas - Torneos Futuros
  getTournamentById: (tournamentId: string) => Tournament | undefined;
  getTournamentsByPlayer: (playerId: string) => Tournament[];
  getFutureTournaments: (playerId?: string) => Tournament[];
  getUpcomingTournaments: (days: number, playerId?: string) => Tournament[];
  getEndedTournaments: (playerId?: string) => Tournament[];
  
  // Consultas - Torneos Disputados
  getDisputedTournamentById: (tournamentId: string) => DisputedTournament | undefined;
  getDisputedTournamentsByPlayer: (playerId: string) => DisputedTournament[];
  getDisputedTournamentsByDateRange: (playerId: string, startDate: Date, endDate: Date) => DisputedTournament[];
  getPlayerTournamentStats: (playerId: string) => TournamentStats;
  
  // CRUD - Torneos Futuros
  addTournament: (tournamentData: Omit<Tournament, 'id'>) => Promise<void>;
  updateTournament: (tournamentId: string, updates: Partial<Tournament>) => Promise<void>;
  deleteTournament: (tournamentId: string) => Promise<void>;
  
  // CRUD - Torneos Disputados
  addDisputedTournament: (tournamentData: Omit<DisputedTournament, 'id'>) => Promise<void>;
  updateDisputedTournament: (tournamentId: string, updates: Partial<DisputedTournament>) => Promise<void>;
  deleteDisputedTournament: (tournamentId: string) => Promise<void>;
  
  // Conversión
  convertToDisputed: (
    futureTournamentId: string, 
    resultData: {
      resultado: string;
      nivelDificultad: number;
      rendimientoJugador: DisputedTournament['rendimientoJugador'];
      observaciones?: string;
    }
  ) => Promise<void>;
}

// Tipo para estadísticas
interface TournamentStats {
  totalTournaments: number;
  totalDisputed: number;
  championships: number;
  finals: number;
  semifinals: number;
  averagePerformance: number;
  averageDifficulty: number;
}

// Mapeo de rendimiento a número para cálculos
const RENDIMIENTO_MAP: Record<DisputedTournament['rendimientoJugador'], number> = {
  'Muy malo': 1,
  'Malo': 2,
  'Bueno': 3,
  'Muy bueno': 4,
  'Excelente': 5
};

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { academiaActual } = useAcademia();
  
  // Estados - Torneos Futuros
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [tournamentsError, setTournamentsError] = useState<string | null>(null);
  
  // Estados - Torneos Disputados
  const [disputedTournaments, setDisputedTournaments] = useState<DisputedTournament[]>([]);
  const [loadingDisputedTournaments, setLoadingDisputedTournaments] = useState(false);
  const [disputedTournamentsError, setDisputedTournamentsError] = useState<string | null>(null);
  
  // Cache de torneos por jugador para optimización
  const tournamentsByPlayer = useMemo(() => {
    const map = new Map<string, Tournament[]>();
    tournaments.forEach(tournament => {
      const playerTournaments = map.get(tournament.jugadorId) || [];
      playerTournaments.push(tournament);
      map.set(tournament.jugadorId, playerTournaments);
    });
    return map;
  }, [tournaments]);
  
  const disputedTournamentsByPlayer = useMemo(() => {
    const map = new Map<string, DisputedTournament[]>();
    disputedTournaments.forEach(tournament => {
      const playerTournaments = map.get(tournament.jugadorId) || [];
      playerTournaments.push(tournament);
      map.set(tournament.jugadorId, playerTournaments);
    });
    return map;
  }, [disputedTournaments]);
  
  // Loading combinado
  const isLoading = loadingTournaments || loadingDisputedTournaments;
  
  // Función para cargar torneos futuros
  const loadTournaments = useCallback(async () => {
    if (!academiaActual) {
      setTournaments([]);
      return;
    }
    
    setLoadingTournaments(true);
    setTournamentsError(null);
    
    try {
      const loadedTournaments = await getTournamentsFromDB(academiaActual.id);
      
      // Ordenar por fecha de inicio (próximos primero)
      const sortedTournaments = loadedTournaments.sort((a, b) => {
        return new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime();
      });
      
      setTournaments(sortedTournaments);
    } catch (error) {
      console.error('Error cargando torneos:', error);
      setTournamentsError('Error al cargar los torneos');
      setTournaments([]);
    } finally {
      setLoadingTournaments(false);
    }
  }, [academiaActual]);
  
  // Función para cargar torneos disputados
  const loadDisputedTournaments = useCallback(async () => {
    if (!academiaActual) {
      setDisputedTournaments([]);
      return;
    }
    
    setLoadingDisputedTournaments(true);
    setDisputedTournamentsError(null);
    
    try {
      const loadedTournaments = await getDisputedTournamentsFromDB(academiaActual.id);
      
      // Ya vienen ordenados por fechaFin desc desde Firebase
      setDisputedTournaments(loadedTournaments);
    } catch (error) {
      console.error('Error cargando torneos disputados:', error);
      setDisputedTournamentsError('Error al cargar los torneos disputados');
      setDisputedTournaments([]);
    } finally {
      setLoadingDisputedTournaments(false);
    }
  }, [academiaActual]);
  
  // Función para refrescar todos los torneos
  const refreshAllTournaments = useCallback(async () => {
    await Promise.all([
      loadTournaments(),
      loadDisputedTournaments()
    ]);
  }, [loadTournaments, loadDisputedTournaments]);
  
  // Cargar torneos cuando cambie la academia
  useEffect(() => {
    if (academiaActual) {
      refreshAllTournaments();
    } else {
      // Limpiar estado cuando no hay academia
      setTournaments([]);
      setDisputedTournaments([]);
      setTournamentsError(null);
      setDisputedTournamentsError(null);
    }
  }, [academiaActual?.id]); // Solo recargar cuando cambie el ID
  
  // FUNCIONES DE CONSULTA - TORNEOS FUTUROS
  
  // Obtener torneo por ID
  const getTournamentById = useCallback((tournamentId: string): Tournament | undefined => {
    return tournaments.find(t => t.id === tournamentId);
  }, [tournaments]);
  
  // Obtener torneos por jugador
  const getTournamentsByPlayer = useCallback((playerId: string): Tournament[] => {
    return tournamentsByPlayer.get(playerId) || [];
  }, [tournamentsByPlayer]);
  
  // Obtener torneos futuros (no finalizados)
  const getFutureTournaments = useCallback((playerId?: string): Tournament[] => {
    const now = new Date();
    let futureTournaments = tournaments.filter(t => new Date(t.fechaFin) >= now);
    
    if (playerId) {
      futureTournaments = futureTournaments.filter(t => t.jugadorId === playerId);
    }
    
    return futureTournaments;
  }, [tournaments]);
  
  // Obtener torneos próximos en N días
  const getUpcomingTournaments = useCallback((days: number, playerId?: string): Tournament[] => {
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + days);
    
    let upcomingTournaments = tournaments.filter(t => {
      const startDate = new Date(t.fechaInicio);
      return startDate >= now && startDate <= maxDate;
    });
    
    if (playerId) {
      upcomingTournaments = upcomingTournaments.filter(t => t.jugadorId === playerId);
    }
    
    return upcomingTournaments;
  }, [tournaments]);
  
  // Obtener torneos que ya terminaron pero siguen como futuros
  const getEndedTournaments = useCallback((playerId?: string): Tournament[] => {
    const now = new Date();
    let endedTournaments = tournaments.filter(t => new Date(t.fechaFin) < now);
    
    if (playerId) {
      endedTournaments = endedTournaments.filter(t => t.jugadorId === playerId);
    }
    
    return endedTournaments;
  }, [tournaments]);
  
  // FUNCIONES DE CONSULTA - TORNEOS DISPUTADOS
  
  // Obtener torneo disputado por ID
  const getDisputedTournamentById = useCallback((tournamentId: string): DisputedTournament | undefined => {
    return disputedTournaments.find(t => t.id === tournamentId);
  }, [disputedTournaments]);
  
  // Obtener torneos disputados por jugador
  const getDisputedTournamentsByPlayer = useCallback((playerId: string): DisputedTournament[] => {
    return disputedTournamentsByPlayer.get(playerId) || [];
  }, [disputedTournamentsByPlayer]);
  
  // Obtener torneos disputados por rango de fechas
  const getDisputedTournamentsByDateRange = useCallback((
    playerId: string, 
    startDate: Date, 
    endDate: Date
  ): DisputedTournament[] => {
    const playerTournaments = getDisputedTournamentsByPlayer(playerId);
    
    return playerTournaments.filter(t => {
      const tournamentEndDate = new Date(t.fechaFin);
      return tournamentEndDate >= startDate && tournamentEndDate <= endDate;
    });
  }, [getDisputedTournamentsByPlayer]);
  
  // Obtener estadísticas de torneos de un jugador
  const getPlayerTournamentStats = useCallback((playerId: string): TournamentStats => {
    const playerTournaments = getTournamentsByPlayer(playerId);
    const playerDisputedTournaments = getDisputedTournamentsByPlayer(playerId);
    
    // Contar logros
    let championships = 0;
    let finals = 0;
    let semifinals = 0;
    let totalPerformance = 0;
    let totalDifficulty = 0;
    
    playerDisputedTournaments.forEach(t => {
      if (t.resultado === 'Campeón') championships++;
      else if (t.resultado === 'Finalista') finals++;
      else if (t.resultado === 'Semifinal') semifinals++;
      
      totalPerformance += RENDIMIENTO_MAP[t.rendimientoJugador];
      totalDifficulty += t.nivelDificultad;
    });
    
    return {
      totalTournaments: playerTournaments.length,
      totalDisputed: playerDisputedTournaments.length,
      championships,
      finals,
      semifinals,
      averagePerformance: playerDisputedTournaments.length > 0 
        ? totalPerformance / playerDisputedTournaments.length 
        : 0,
      averageDifficulty: playerDisputedTournaments.length > 0 
        ? totalDifficulty / playerDisputedTournaments.length 
        : 0
    };
  }, [getTournamentsByPlayer, getDisputedTournamentsByPlayer]);
  
  // FUNCIONES CRUD - TORNEOS FUTUROS
  
  // Agregar torneo futuro
  const addTournament = useCallback(async (tournamentData: Omit<Tournament, 'id'>) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    try {
      await addTournamentToDB(academiaActual.id, tournamentData);
      
      // Actualización optimista
      const tempTournament: Tournament = {
        ...tournamentData,
        id: `temp_${Date.now()}`
      };
      setTournaments(prev => [...prev, tempTournament].sort((a, b) => 
        new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
      ));
      
      // Recargar para obtener el ID real
      await loadTournaments();
    } catch (error) {
      console.error('Error agregando torneo:', error);
      await loadTournaments(); // Revertir cambio optimista
      throw error;
    }
  }, [academiaActual, loadTournaments]);
  
  // Actualizar torneo futuro
  const updateTournament = useCallback(async (tournamentId: string, updates: Partial<Tournament>) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    try {
      await updateTournamentInDB(academiaActual.id, tournamentId, updates);
      
      // Actualización optimista
      setTournaments(prev => prev.map(t => 
        t.id === tournamentId ? { ...t, ...updates } : t
      ).sort((a, b) => 
        new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
      ));
      
      // Recargar para asegurar consistencia
      await loadTournaments();
    } catch (error) {
      console.error('Error actualizando torneo:', error);
      await loadTournaments(); // Revertir cambio optimista
      throw error;
    }
  }, [academiaActual, loadTournaments]);
  
  // Eliminar torneo futuro
  const deleteTournament = useCallback(async (tournamentId: string) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    const tournamentToDelete = getTournamentById(tournamentId);
    
    try {
      // Actualización optimista
      setTournaments(prev => prev.filter(t => t.id !== tournamentId));
      
      await deleteTournamentFromDB(academiaActual.id, tournamentId);
      
      // Recargar para asegurar consistencia
      await loadTournaments();
    } catch (error) {
      console.error('Error eliminando torneo:', error);
      
      // Revertir cambio optimista
      if (tournamentToDelete) {
        setTournaments(prev => [...prev, tournamentToDelete].sort((a, b) => 
          new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
        ));
      }
      await loadTournaments();
      throw error;
    }
  }, [academiaActual, getTournamentById, loadTournaments]);
  
  // FUNCIONES CRUD - TORNEOS DISPUTADOS
  
  // Agregar torneo disputado
  const addDisputedTournament = useCallback(async (tournamentData: Omit<DisputedTournament, 'id'>) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    try {
      await addDisputedTournamentToDB(academiaActual.id, tournamentData);
      
      // Actualización optimista
      const tempTournament: DisputedTournament = {
        ...tournamentData,
        id: `temp_${Date.now()}`
      };
      setDisputedTournaments(prev => [tempTournament, ...prev]);
      
      // Recargar para obtener el ID real
      await loadDisputedTournaments();
    } catch (error) {
      console.error('Error agregando torneo disputado:', error);
      await loadDisputedTournaments(); // Revertir cambio optimista
      throw error;
    }
  }, [academiaActual, loadDisputedTournaments]);
  
  // Actualizar torneo disputado
  const updateDisputedTournament = useCallback(async (tournamentId: string, updates: Partial<DisputedTournament>) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    try {
      await updateDisputedTournamentInDB(academiaActual.id, tournamentId, updates);
      
      // Actualización optimista
      setDisputedTournaments(prev => prev.map(t => 
        t.id === tournamentId ? { ...t, ...updates } : t
      ));
      
      // Recargar para asegurar consistencia
      await loadDisputedTournaments();
    } catch (error) {
      console.error('Error actualizando torneo disputado:', error);
      await loadDisputedTournaments(); // Revertir cambio optimista
      throw error;
    }
  }, [academiaActual, loadDisputedTournaments]);
  
  // Eliminar torneo disputado
  const deleteDisputedTournament = useCallback(async (tournamentId: string) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    const tournamentToDelete = getDisputedTournamentById(tournamentId);
    
    try {
      // Actualización optimista
      setDisputedTournaments(prev => prev.filter(t => t.id !== tournamentId));
      
      await deleteDisputedTournamentFromDB(academiaActual.id, tournamentId);
      
      // Recargar para asegurar consistencia
      await loadDisputedTournaments();
    } catch (error) {
      console.error('Error eliminando torneo disputado:', error);
      
      // Revertir cambio optimista
      if (tournamentToDelete) {
        setDisputedTournaments(prev => [tournamentToDelete, ...prev]);
      }
      await loadDisputedTournaments();
      throw error;
    }
  }, [academiaActual, getDisputedTournamentById, loadDisputedTournaments]);
  
  // FUNCIÓN DE CONVERSIÓN
  
  // Convertir torneo futuro a disputado
  const convertToDisputed = useCallback(async (
    futureTournamentId: string,
    resultData: {
      resultado: string;
      nivelDificultad: number;
      rendimientoJugador: DisputedTournament['rendimientoJugador'];
      observaciones?: string;
    }
  ) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    const futureTournament = getTournamentById(futureTournamentId);
    if (!futureTournament) {
      throw new Error('Torneo no encontrado');
    }
    
    try {
      // Usar la función existente de Firebase
      await convertToDisputedTournamentInDB(
        academiaActual.id,
        futureTournament,
        resultData
      );
      
      // Eliminar el torneo futuro
      await deleteTournamentFromDB(academiaActual.id, futureTournamentId);
      
      // Recargar ambas listas
      await refreshAllTournaments();
    } catch (error) {
      console.error('Error convirtiendo torneo:', error);
      // Si falla, recargar para asegurar consistencia
      await refreshAllTournaments();
      throw error;
    }
  }, [academiaActual, getTournamentById, refreshAllTournaments]);
  
  const value: TournamentContextType = {
    // Estados
    tournaments,
    loadingTournaments,
    tournamentsError,
    disputedTournaments,
    loadingDisputedTournaments,
    disputedTournamentsError,
    isLoading,
    
    // Funciones de carga
    loadTournaments,
    loadDisputedTournaments,
    refreshAllTournaments,
    
    // Consultas - Torneos Futuros
    getTournamentById,
    getTournamentsByPlayer,
    getFutureTournaments,
    getUpcomingTournaments,
    getEndedTournaments,
    
    // Consultas - Torneos Disputados
    getDisputedTournamentById,
    getDisputedTournamentsByPlayer,
    getDisputedTournamentsByDateRange,
    getPlayerTournamentStats,
    
    // CRUD - Torneos Futuros
    addTournament,
    updateTournament,
    deleteTournament,
    
    // CRUD - Torneos Disputados
    addDisputedTournament,
    updateDisputedTournament,
    deleteDisputedTournament,
    
    // Conversión
    convertToDisputed
  };
  
  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useTournament = (): TournamentContextType => {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error('useTournament debe ser usado dentro de TournamentProvider');
  }
  return context;
};