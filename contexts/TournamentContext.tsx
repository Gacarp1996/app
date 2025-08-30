// contexts/TournamentContext.tsx - ACTUALIZADO CON AUTO-LIMPIEZA
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
  // Estados existentes...
  tournaments: Tournament[];
  loadingTournaments: boolean;
  tournamentsError: string | null;
  disputedTournaments: DisputedTournament[];
  loadingDisputedTournaments: boolean;
  disputedTournamentsError: string | null;
  isLoading: boolean;
  
  // ✅ NUEVO: Torneos pendientes de registro
  endedTournamentsCount: number;
  
  // Funciones existentes...
  loadTournaments: () => Promise<void>;
  loadDisputedTournaments: () => Promise<void>;
  refreshAllTournaments: () => Promise<void>;
  getTournamentById: (tournamentId: string) => Tournament | undefined;
  getTournamentsByPlayer: (playerId: string) => Tournament[];
  getFutureTournaments: (playerId?: string) => Tournament[];
  getUpcomingTournaments: (days: number, playerId?: string) => Tournament[];
  getEndedTournaments: (playerId?: string) => Tournament[];
  
  // ✅ NUEVO: Obtener torneos que necesitan registro
  getEndedTournamentsNeedingRegistration: () => Tournament[];
  
  // Resto de funciones...
  getDisputedTournamentById: (tournamentId: string) => DisputedTournament | undefined;
  getDisputedTournamentsByPlayer: (playerId: string) => DisputedTournament[];
  getDisputedTournamentsByDateRange: (playerId: string, startDate: Date, endDate: Date) => DisputedTournament[];
  getPlayerTournamentStats: (playerId: string) => TournamentStats;
  addTournament: (tournamentData: Omit<Tournament, 'id'>) => Promise<void>;
  updateTournament: (tournamentId: string, updates: Partial<Tournament>) => Promise<void>;
  deleteTournament: (tournamentId: string) => Promise<void>;
  addDisputedTournament: (tournamentData: Omit<DisputedTournament, 'id'>) => Promise<void>;
  updateDisputedTournament: (tournamentId: string, updates: Partial<DisputedTournament>) => Promise<void>;
  deleteDisputedTournament: (tournamentId: string) => Promise<void>;
  convertToDisputed: (
    futureTournamentId: string, 
    resultData: {
      resultado: string;
      rendimientoJugador: DisputedTournament['rendimientoJugador'];
      observaciones?: string;
    }
  ) => Promise<void>;
}

interface TournamentStats {
  totalTournaments: number;
  totalDisputed: number;
  championships: number;
  finals: number;
  semifinals: number;
  averagePerformance: number;
}

const RENDIMIENTO_MAP: Record<DisputedTournament['rendimientoJugador'], number> = {
  'Muy malo': 1,
  'Malo': 2,
  'Bueno': 3,
  'Muy bueno': 4,
  'Excelente': 5
};

// ✅ NUEVA CONSTANTE: Días para auto-eliminar torneos vencidos
const DAYS_TO_AUTO_DELETE = 7;

const TournamentContext = createContext<TournamentContextType | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { academiaActual } = useAcademia();
  
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [tournamentsError, setTournamentsError] = useState<string | null>(null);
  const [disputedTournaments, setDisputedTournaments] = useState<DisputedTournament[]>([]);
  const [loadingDisputedTournaments, setLoadingDisputedTournaments] = useState(false);
  const [disputedTournamentsError, setDisputedTournamentsError] = useState<string | null>(null);
  
  // ✅ NUEVO: Estado para contar torneos vencidos
  const [endedTournamentsCount, setEndedTournamentsCount] = useState(0);
  
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
  
  const isLoading = loadingTournaments || loadingDisputedTournaments;
  
  // ✅ NUEVA FUNCIÓN: Auto-limpieza de torneos vencidos
  const autoCleanExpiredTournaments = useCallback(async (loadedTournaments: Tournament[]) => {
    if (!academiaActual) return loadedTournaments;
    
    const now = new Date();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_AUTO_DELETE);
    
    const tournamentsToDelete: Tournament[] = [];
    const tournamentsToKeep: Tournament[] = [];
    
    loadedTournaments.forEach(tournament => {
      const endDate = new Date(tournament.fechaFin);
      if (endDate < cutoffDate) {
        // Torneo vencido hace más de 7 días - eliminar
        tournamentsToDelete.push(tournament);
       
      } else {
        tournamentsToKeep.push(tournament);
      }
    });
    
    // Eliminar torneos vencidos de Firebase
    if (tournamentsToDelete.length > 0) {
 
      
      // Eliminar en paralelo pero sin bloquear la UI
      Promise.all(
        tournamentsToDelete.map(t => 
          deleteTournamentFromDB(academiaActual.id, t.id).catch(err => {

          })
        )
      );
    }
    
    return tournamentsToKeep;
  }, [academiaActual]);
  
  // ✅ ACTUALIZADA: Función para cargar torneos con auto-limpieza
  const loadTournaments = useCallback(async () => {
    if (!academiaActual) {
      setTournaments([]);
      setEndedTournamentsCount(0);
      return;
    }
    
    setLoadingTournaments(true);
    setTournamentsError(null);
    
    try {
      const loadedTournaments = await getTournamentsFromDB(academiaActual.id);
      
      // Auto-limpieza de torneos vencidos
      const cleanedTournaments = await autoCleanExpiredTournaments(loadedTournaments);
      
      // Contar torneos que necesitan registro (finalizados pero dentro del plazo)
      const now = new Date();
      const needingRegistration = cleanedTournaments.filter(t => 
        new Date(t.fechaFin) < now
      ).length;
      setEndedTournamentsCount(needingRegistration);
      
      // Ordenar por fecha de inicio
      const sortedTournaments = cleanedTournaments.sort((a, b) => {
        return new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime();
      });
      
      setTournaments(sortedTournaments);
    } catch (error) {
 
      setTournamentsError('Error al cargar los torneos');
      setTournaments([]);
      setEndedTournamentsCount(0);
    } finally {
      setLoadingTournaments(false);
    }
  }, [academiaActual, autoCleanExpiredTournaments]);
  
  const loadDisputedTournaments = useCallback(async () => {
    if (!academiaActual) {
      setDisputedTournaments([]);
      return;
    }
    
    setLoadingDisputedTournaments(true);
    setDisputedTournamentsError(null);
    
    try {
      const loadedTournaments = await getDisputedTournamentsFromDB(academiaActual.id);
      setDisputedTournaments(loadedTournaments);
    } catch (error) {

      setDisputedTournamentsError('Error al cargar los torneos disputados');
      setDisputedTournaments([]);
    } finally {
      setLoadingDisputedTournaments(false);
    }
  }, [academiaActual]);
  
  const refreshAllTournaments = useCallback(async () => {
    await Promise.all([
      loadTournaments(),
      loadDisputedTournaments()
    ]);
  }, [loadTournaments, loadDisputedTournaments]);
  
  useEffect(() => {
    if (academiaActual) {
      refreshAllTournaments();
    } else {
      setTournaments([]);
      setDisputedTournaments([]);
      setTournamentsError(null);
      setDisputedTournamentsError(null);
      setEndedTournamentsCount(0);
    }
  }, [academiaActual?.id]);
  
  // ✅ NUEVA FUNCIÓN: Obtener torneos que necesitan registro
  const getEndedTournamentsNeedingRegistration = useCallback((): Tournament[] => {
    const now = new Date();
    return tournaments.filter(t => new Date(t.fechaFin) < now);
  }, [tournaments]);
  
  const getTournamentById = useCallback((tournamentId: string): Tournament | undefined => {
    return tournaments.find(t => t.id === tournamentId);
  }, [tournaments]);
  
  const getTournamentsByPlayer = useCallback((playerId: string): Tournament[] => {
    return tournamentsByPlayer.get(playerId) || [];
  }, [tournamentsByPlayer]);
  
  const getFutureTournaments = useCallback((playerId?: string): Tournament[] => {
    const now = new Date();
    let futureTournaments = tournaments.filter(t => new Date(t.fechaFin) >= now);
    
    if (playerId) {
      futureTournaments = futureTournaments.filter(t => t.jugadorId === playerId);
    }
    
    return futureTournaments;
  }, [tournaments]);
  
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
  
  const getEndedTournaments = useCallback((playerId?: string): Tournament[] => {
    const now = new Date();
    let endedTournaments = tournaments.filter(t => new Date(t.fechaFin) < now);
    
    if (playerId) {
      endedTournaments = endedTournaments.filter(t => t.jugadorId === playerId);
    }
    
    return endedTournaments;
  }, [tournaments]);
  
  const getDisputedTournamentById = useCallback((tournamentId: string): DisputedTournament | undefined => {
    return disputedTournaments.find(t => t.id === tournamentId);
  }, [disputedTournaments]);
  
  const getDisputedTournamentsByPlayer = useCallback((playerId: string): DisputedTournament[] => {
    return disputedTournamentsByPlayer.get(playerId) || [];
  }, [disputedTournamentsByPlayer]);
  
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
  
  const getPlayerTournamentStats = useCallback((playerId: string): TournamentStats => {
    const playerTournaments = getTournamentsByPlayer(playerId);
    const playerDisputedTournaments = getDisputedTournamentsByPlayer(playerId);
    
    let championships = 0;
    let finals = 0;
    let semifinals = 0;
    let totalPerformance = 0;
    
    playerDisputedTournaments.forEach(t => {
      if (t.resultado === 'Campeón') championships++;
      else if (t.resultado === 'Finalista') finals++;
      else if (t.resultado === 'Semifinal') semifinals++;
      
      totalPerformance += RENDIMIENTO_MAP[t.rendimientoJugador];
    });
    
    return {
      totalTournaments: playerTournaments.length,
      totalDisputed: playerDisputedTournaments.length,
      championships,
      finals,
      semifinals,
      averagePerformance: playerDisputedTournaments.length > 0 
        ? totalPerformance / playerDisputedTournaments.length 
        : 0
    };
  }, [getTournamentsByPlayer, getDisputedTournamentsByPlayer]);
  
  const addTournament = useCallback(async (tournamentData: Omit<Tournament, 'id'>) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    try {
      await addTournamentToDB(academiaActual.id, tournamentData);
      
      const tempTournament: Tournament = {
        ...tournamentData,
        id: `temp_${Date.now()}`
      };
      setTournaments(prev => [...prev, tempTournament].sort((a, b) => 
        new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
      ));
      
      await loadTournaments();
    } catch (error) {
  
      await loadTournaments();
      throw error;
    }
  }, [academiaActual, loadTournaments]);
  
  const updateTournament = useCallback(async (tournamentId: string, updates: Partial<Tournament>) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    try {
      await updateTournamentInDB(academiaActual.id, tournamentId, updates);
      
      setTournaments(prev => prev.map(t => 
        t.id === tournamentId ? { ...t, ...updates } : t
      ).sort((a, b) => 
        new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
      ));
      
      await loadTournaments();
    } catch (error) {
  
      await loadTournaments();
      throw error;
    }
  }, [academiaActual, loadTournaments]);
  
  const deleteTournament = useCallback(async (tournamentId: string) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    const tournamentToDelete = getTournamentById(tournamentId);
    
    try {
      setTournaments(prev => prev.filter(t => t.id !== tournamentId));
      
      await deleteTournamentFromDB(academiaActual.id, tournamentId);
      
      await loadTournaments();
    } catch (error) {
 
      
      if (tournamentToDelete) {
        setTournaments(prev => [...prev, tournamentToDelete].sort((a, b) => 
          new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
        ));
      }
      await loadTournaments();
      throw error;
    }
  }, [academiaActual, getTournamentById, loadTournaments]);
  
  const addDisputedTournament = useCallback(async (tournamentData: Omit<DisputedTournament, 'id'>) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    try {
      await addDisputedTournamentToDB(academiaActual.id, tournamentData);
      
      const tempTournament: DisputedTournament = {
        ...tournamentData,
        id: `temp_${Date.now()}`
      };
      setDisputedTournaments(prev => [tempTournament, ...prev]);
      
      await loadDisputedTournaments();
    } catch (error) {
      
      await loadDisputedTournaments();
      throw error;
    }
  }, [academiaActual, loadDisputedTournaments]);
  
  const updateDisputedTournament = useCallback(async (tournamentId: string, updates: Partial<DisputedTournament>) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    try {
      await updateDisputedTournamentInDB(academiaActual.id, tournamentId, updates);
      
      setDisputedTournaments(prev => prev.map(t => 
        t.id === tournamentId ? { ...t, ...updates } : t
      ));
      
      await loadDisputedTournaments();
    } catch (error) {
 
      await loadDisputedTournaments();
      throw error;
    }
  }, [academiaActual, loadDisputedTournaments]);
  
  const deleteDisputedTournament = useCallback(async (tournamentId: string) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    const tournamentToDelete = getDisputedTournamentById(tournamentId);
    
    try {
      setDisputedTournaments(prev => prev.filter(t => t.id !== tournamentId));
      
      await deleteDisputedTournamentFromDB(academiaActual.id, tournamentId);
      
      await loadDisputedTournaments();
    } catch (error) {
     
      
      if (tournamentToDelete) {
        setDisputedTournaments(prev => [tournamentToDelete, ...prev]);
      }
      await loadDisputedTournaments();
      throw error;
    }
  }, [academiaActual, getDisputedTournamentById, loadDisputedTournaments]);
  
  // ✅ ACTUALIZADA: Conversión mejorada con eliminación garantizada
  const convertToDisputed = useCallback(async (
    futureTournamentId: string,
    resultData: {
      resultado: string;
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
   
      
      // 1. Crear el torneo disputado
      await convertToDisputedTournamentInDB(
        academiaActual.id,
        futureTournament,
        resultData
      );
      
      // 2. Eliminar el torneo futuro - CRÍTICO: esto debe suceder siempre
      await deleteTournamentFromDB(academiaActual.id, futureTournamentId);
      
  
      
      // 3. Actualizar el contador de torneos pendientes
      setEndedTournamentsCount(prev => Math.max(0, prev - 1));
      
      // 4. Recargar ambas listas
      await refreshAllTournaments();
    } catch (error) {

      await refreshAllTournaments();
      throw error;
    }
  }, [academiaActual, getTournamentById, refreshAllTournaments]);
  
  const value: TournamentContextType = {
    tournaments,
    loadingTournaments,
    tournamentsError,
    disputedTournaments,
    loadingDisputedTournaments,
    disputedTournamentsError,
    isLoading,
    endedTournamentsCount, // ✅ NUEVO
    loadTournaments,
    loadDisputedTournaments,
    refreshAllTournaments,
    getTournamentById,
    getTournamentsByPlayer,
    getFutureTournaments,
    getUpcomingTournaments,
    getEndedTournaments,
    getEndedTournamentsNeedingRegistration, // ✅ NUEVO
    getDisputedTournamentById,
    getDisputedTournamentsByPlayer,
    getDisputedTournamentsByDateRange,
    getPlayerTournamentStats,
    addTournament,
    updateTournament,
    deleteTournament,
    addDisputedTournament,
    updateDisputedTournament,
    deleteDisputedTournament,
    convertToDisputed
  };
  
  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
};

export const useTournament = (): TournamentContextType => {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error('useTournament debe ser usado dentro de TournamentProvider');
  }
  return context;
};