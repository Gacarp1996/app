// contexts/PlayerContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { useAcademia } from './AcademiaContext';
import { Player } from '../types/types';
import { 
  getPlayers as getPlayersFromDB, 
  addPlayer as addPlayerToDB, 
  updatePlayer as updatePlayerInDB,
  getPlayerById as getPlayerByIdFromDB
} from '../Database/FirebasePlayers';

interface PlayerContextType {
  // Estado
  players: Player[];
  loadingPlayers: boolean;
  playersError: string | null;
  selectedPlayer: Player | null;
  
  // Funciones de carga
  loadPlayers: () => Promise<void>;
  refreshPlayers: () => Promise<void>;
  
  // Funciones CRUD
  addPlayer: (playerData: Omit<Player, 'id'>) => Promise<void>;
  updatePlayer: (playerId: string, dataToUpdate: Partial<Player>) => Promise<void>;
  archivePlayer: (playerId: string) => Promise<void>;
  deletePlayerPermanently: (playerId: string) => Promise<void>;
  
  // Funciones de selección y filtrado
  setSelectedPlayer: (player: Player | null) => void;
  getPlayerById: (playerId: string) => Player | undefined;
  getActivePlayers: () => Player[];
  getArchivedPlayers: () => Player[];
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { academiaActual } = useAcademia();
  
  // Estados
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [playersError, setPlayersError] = useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  
  // Función para cargar jugadores
  const loadPlayers = useCallback(async () => {
    if (!academiaActual) {
      setPlayers([]);
      return;
    }
    
    setLoadingPlayers(true);
    setPlayersError(null);
    
    try {
      const loadedPlayers = await getPlayersFromDB(academiaActual.id);
      setPlayers(loadedPlayers);
      
      // Si hay un jugador seleccionado, actualizarlo con los datos nuevos
      if (selectedPlayer) {
        const updatedSelectedPlayer = loadedPlayers.find(p => p.id === selectedPlayer.id);
        if (updatedSelectedPlayer) {
          setSelectedPlayer(updatedSelectedPlayer);
        } else {
          // Si el jugador seleccionado ya no existe, limpiar la selección
          setSelectedPlayer(null);
        }
      }
    } catch (error) {
      console.error('Error cargando jugadores:', error);
      setPlayersError('Error al cargar los jugadores');
      setPlayers([]);
    } finally {
      setLoadingPlayers(false);
    }
  }, [academiaActual, selectedPlayer?.id]);
  
  // Cargar jugadores cuando cambie la academia
  useEffect(() => {
    if (academiaActual) {
      loadPlayers();
    } else {
      // Limpiar estado cuando no hay academia
      setPlayers([]);
      setSelectedPlayer(null);
      setPlayersError(null);
    }
  }, [academiaActual?.id]); // Solo recargar cuando cambie el ID de la academia
  
  // Función para refrescar jugadores (alias de loadPlayers para compatibilidad)
  const refreshPlayers = useCallback(async () => {
    await loadPlayers();
  }, [loadPlayers]);
  
  // Función para agregar un jugador
  const addPlayer = useCallback(async (playerData: Omit<Player, 'id'>) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    try {
      await addPlayerToDB(academiaActual.id, playerData);
      await refreshPlayers(); // Recargar la lista después de agregar
    } catch (error) {
      console.error('Error agregando jugador:', error);
      throw error;
    }
  }, [academiaActual, refreshPlayers]);
  
  // Función para actualizar un jugador
  const updatePlayer = useCallback(async (playerId: string, dataToUpdate: Partial<Player>) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    try {
      await updatePlayerInDB(academiaActual.id, playerId, dataToUpdate);
      
      // Actualizar estado local inmediatamente para mejor UX
      setPlayers(prevPlayers => 
        prevPlayers.map(player => 
          player.id === playerId ? { ...player, ...dataToUpdate } : player
        )
      );
      
      // Si es el jugador seleccionado, actualizarlo también
      if (selectedPlayer?.id === playerId) {
        setSelectedPlayer(prev => prev ? { ...prev, ...dataToUpdate } : null);
      }
      
      // Recargar desde la BD para asegurar consistencia
      await refreshPlayers();
    } catch (error) {
      console.error('Error actualizando jugador:', error);
      // Si hay error, revertir recargando desde la BD
      await refreshPlayers();
      throw error;
    }
  }, [academiaActual, selectedPlayer?.id, refreshPlayers]);
  
  // Función para archivar un jugador
  const archivePlayer = useCallback(async (playerId: string) => {
    await updatePlayer(playerId, { estado: 'archivado' });
  }, [updatePlayer]);
  
  // Función para eliminar permanentemente un jugador
  const deletePlayerPermanently = useCallback(async (playerId: string) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    // Por ahora, simplemente archivamos ya que no hay función de eliminación en FirebasePlayers
    // TODO: Implementar eliminación permanente si es necesario
    await archivePlayer(playerId);
  }, [academiaActual, archivePlayer]);
  
  // Función para obtener un jugador por ID
  const getPlayerById = useCallback((playerId: string): Player | undefined => {
    return players.find(player => player.id === playerId);
  }, [players]);
  
  // Función para obtener jugadores activos
  const getActivePlayers = useCallback((): Player[] => {
    return players.filter(player => player.estado === 'activo');
  }, [players]);
  
  // Función para obtener jugadores archivados
  const getArchivedPlayers = useCallback((): Player[] => {
    return players.filter(player => player.estado === 'archivado');
  }, [players]);
  
  const value: PlayerContextType = {
    // Estado
    players,
    loadingPlayers,
    playersError,
    selectedPlayer,
    
    // Funciones
    loadPlayers,
    refreshPlayers,
    addPlayer,
    updatePlayer,
    archivePlayer,
    deletePlayerPermanently,
    setSelectedPlayer,
    getPlayerById,
    getActivePlayers,
    getArchivedPlayers
  };
  
  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer debe ser usado dentro de PlayerProvider');
  }
  return context;
};