// hooks/usePlayerTournaments.ts
import { useState, useEffect } from 'react';
import { Tournament, DisputedTournament } from '../types/types';
import { usePlayer } from '../contexts/PlayerContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { useTournament } from '../contexts/TournamentContext'; // ✅ NUEVO IMPORT

interface UsePlayerTournamentsProps {
  playerId: string | undefined;
  activeTab: string;
}

export const usePlayerTournaments = ({ 
  playerId, 
  activeTab
}: UsePlayerTournamentsProps) => {
  // ✅ USAR CONTEXTOS
  const { refreshPlayers } = usePlayer();
  const { academiaActual } = useAcademia();
  
  // ✅ USAR TournamentContext para todas las operaciones
  const {
    getDisputedTournamentsByPlayer,
    addTournament,
    updateTournament,
    deleteTournament,
    addDisputedTournament,
    updateDisputedTournament,
    deleteDisputedTournament,
    convertToDisputed,
    refreshAllTournaments
  } = useTournament();
  
  // Estados de torneos
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  
  // Estados de torneos disputados
  const [playerDisputedTournaments, setPlayerDisputedTournaments] = useState<DisputedTournament[]>([]);
  const [isDisputedTournamentModalOpen, setIsDisputedTournamentModalOpen] = useState(false);
  const [editingDisputedTournament, setEditingDisputedTournament] = useState<DisputedTournament | null>(null);
  const [tournamentToConvert, setTournamentToConvert] = useState<Tournament | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'future' | 'disputed'>('future');

  // ✅ ACTUALIZADO: Cargar torneos disputados desde el contexto
  useEffect(() => {
    if (activeTab === 'tournaments' && playerId) {
      const disputed = getDisputedTournamentsByPlayer(playerId);
      setPlayerDisputedTournaments(disputed);
    }
  }, [activeTab, playerId, getDisputedTournamentsByPlayer]);

  // Handlers para torneos futuros
  const handleOpenAddTournamentModal = () => {
    setEditingTournament(null);
    setIsTournamentModalOpen(true);
  };

  const handleEditTournamentClick = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setIsTournamentModalOpen(true);
  };

  // ✅ ACTUALIZADO: Usar funciones del contexto
  const handleSaveTournament = async (data: Omit<Tournament, 'id' | 'jugadorId'>) => {
    try {
      if (editingTournament) {
        await updateTournament(editingTournament.id, data);
      } else {
        await addTournament({ ...data, jugadorId: playerId! });
      }
      
      // Refrescar datos
      await Promise.all([
        refreshAllTournaments(),
        refreshPlayers()
      ]);
      
      setIsTournamentModalOpen(false);
    } catch (error) {
      console.error('Error guardando torneo:', error);
      alert('Error al guardar el torneo');
    }
  };

  // ✅ ACTUALIZADO: Usar función del contexto
  const handleDeleteTournament = async (id: string) => {
    if (window.confirm("¿Seguro que deseas eliminar este torneo?")) {
      try {
        await deleteTournament(id);
        
        // Refrescar datos
        await Promise.all([
          refreshAllTournaments(),
          refreshPlayers()
        ]);
      } catch (error) {
        console.error('Error eliminando torneo:', error);
        alert('Error al eliminar el torneo');
      }
    }
  };

  // Handlers para torneos disputados
  const handleOpenAddDisputedTournamentModal = () => {
    setEditingDisputedTournament(null);
    setTournamentToConvert(null);
    setIsDisputedTournamentModalOpen(true);
  };

  const handleEditDisputedTournamentClick = (tournament: DisputedTournament) => {
    setEditingDisputedTournament(tournament);
    setTournamentToConvert(null);
    setIsDisputedTournamentModalOpen(true);
  };

  const handleConvertTournamentClick = (tournament: Tournament) => {
    setTournamentToConvert(tournament);
    setEditingDisputedTournament(null);
    setIsDisputedTournamentModalOpen(true);
  };

  // ✅ ACTUALIZADO: Usar funciones del contexto
  const handleSaveDisputedTournament = async (data: Omit<DisputedTournament, 'id' | 'jugadorId' | 'fechaRegistro'>) => {
    try {
      if (editingDisputedTournament) {
        // Actualizar torneo disputado existente
        await updateDisputedTournament(editingDisputedTournament.id, data);
      } else if (tournamentToConvert) {
        // Convertir torneo futuro a disputado
        await convertToDisputed(tournamentToConvert.id, {
          resultado: data.resultado,
          nivelDificultad: data.nivelDificultad,
          rendimientoJugador: data.rendimientoJugador,
          observaciones: data.observaciones
        });
      } else {
        // Crear nuevo torneo disputado
        await addDisputedTournament({ ...data, jugadorId: playerId! });
      }
      
      // Refrescar datos
      await Promise.all([
        refreshAllTournaments(),
        refreshPlayers()
      ]);
      
      // Actualizar estado local
      if (playerId) {
        const updatedDisputed = getDisputedTournamentsByPlayer(playerId);
        setPlayerDisputedTournaments(updatedDisputed);
      }
      
      setIsDisputedTournamentModalOpen(false);
    } catch (error) {
      console.error('Error al guardar torneo disputado:', error);
      alert('Error al guardar el torneo disputado');
    }
  };

  // ✅ ACTUALIZADO: Usar función del contexto
  const handleDeleteDisputedTournament = async (id: string) => {
    if (window.confirm("¿Está seguro de eliminar este torneo disputado?")) {
      try {
        await deleteDisputedTournament(id);
        
        // Refrescar datos
        await refreshAllTournaments();
        
        // Actualizar estado local
        if (playerId) {
          const updatedDisputed = getDisputedTournamentsByPlayer(playerId);
          setPlayerDisputedTournaments(updatedDisputed);
        }
      } catch (error) {
        console.error('Error al eliminar torneo disputado:', error);
        alert('Error al eliminar el torneo disputado');
      }
    }
  };

  return {
    // Estados
    isTournamentModalOpen,
    editingTournament,
    playerDisputedTournaments,
    isDisputedTournamentModalOpen,
    editingDisputedTournament,
    tournamentToConvert,
    activeSubTab,
    setActiveSubTab,
    
    // Handlers
    futureTournamentHandlers: {
      handleOpenAddTournamentModal,
      handleEditTournamentClick,
      handleSaveTournament,
      handleDeleteTournament,
      handleConvertTournamentClick,
      setIsTournamentModalOpen,
    },
    
    disputedTournamentHandlers: {
      handleOpenAddDisputedTournamentModal,
      handleEditDisputedTournamentClick,
      handleSaveDisputedTournament,
      handleDeleteDisputedTournament,
      setIsDisputedTournamentModalOpen,
    }
  };
};