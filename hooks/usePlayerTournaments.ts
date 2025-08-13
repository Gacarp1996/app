// hooks/usePlayerTournaments.ts
import { useState, useEffect } from 'react';
import { Tournament, DisputedTournament } from '../types/types';
import { usePlayer } from '../contexts/PlayerContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { useTournament } from '../contexts/TournamentContext';
import { useNotification } from './useNotification';

interface UsePlayerTournamentsProps {
  playerId: string | undefined;
  activeTab: string;
}

export const usePlayerTournaments = ({ 
  playerId, 
  activeTab
}: UsePlayerTournamentsProps) => {
  const { refreshPlayers } = usePlayer();
  const { academiaActual } = useAcademia();
  const notification = useNotification();
  
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
  
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  
  const [playerDisputedTournaments, setPlayerDisputedTournaments] = useState<DisputedTournament[]>([]);
  const [isDisputedTournamentModalOpen, setIsDisputedTournamentModalOpen] = useState(false);
  const [editingDisputedTournament, setEditingDisputedTournament] = useState<DisputedTournament | null>(null);
  const [tournamentToConvert, setTournamentToConvert] = useState<Tournament | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'future' | 'disputed'>('future');

  useEffect(() => {
    if (activeTab === 'tournaments' && playerId) {
      const disputed = getDisputedTournamentsByPlayer(playerId);
      setPlayerDisputedTournaments(disputed);
    }
  }, [activeTab, playerId, getDisputedTournamentsByPlayer]);

  const handleOpenAddTournamentModal = () => {
    setEditingTournament(null);
    setIsTournamentModalOpen(true);
  };

  const handleEditTournamentClick = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setIsTournamentModalOpen(true);
  };

  const handleSaveTournament = async (data: Omit<Tournament, 'id' | 'jugadorId'>) => {
    try {
      if (editingTournament) {
        await updateTournament(editingTournament.id, data);
      } else {
        await addTournament({ ...data, jugadorId: playerId! });
      }
      
      await Promise.all([
        refreshAllTournaments(),
        refreshPlayers()
      ]);
      
      setIsTournamentModalOpen(false);
    } catch (error) {
      console.error('Error guardando torneo:', error);
      notification.error('Error al guardar el torneo');
    }
  };

  const handleDeleteTournament = async (id: string) => {
    const confirmed = await notification.confirm({
      title: 'Eliminar torneo',
      message: '¿Seguro que deseas eliminar este torneo?',
      type: 'danger',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    try {
      await deleteTournament(id);
      
      await Promise.all([
        refreshAllTournaments(),
        refreshPlayers()
      ]);
      
      notification.success('Torneo eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminando torneo:', error);
      notification.error('Error al eliminar el torneo');
    }
  };

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

  const handleSaveDisputedTournament = async (data: Omit<DisputedTournament, 'id' | 'jugadorId' | 'fechaRegistro'>) => {
    try {
      if (editingDisputedTournament) {
        await updateDisputedTournament(editingDisputedTournament.id, data);
      } else if (tournamentToConvert) {
        // Convertir torneo futuro a disputado - SIN nivelDificultad
        await convertToDisputed(tournamentToConvert.id, {
          resultado: data.resultado,
          rendimientoJugador: data.rendimientoJugador,
          observaciones: data.observaciones
        });
      } else {
        await addDisputedTournament({ ...data, jugadorId: playerId! });
      }
      
      await Promise.all([
        refreshAllTournaments(),
        refreshPlayers()
      ]);
      
      if (playerId) {
        const updatedDisputed = getDisputedTournamentsByPlayer(playerId);
        setPlayerDisputedTournaments(updatedDisputed);
      }
      
      setIsDisputedTournamentModalOpen(false);
      notification.success('Torneo disputado guardado exitosamente');
    } catch (error) {
      console.error('Error al guardar torneo disputado:', error);
      notification.error('Error al guardar el torneo disputado');
    }
  };

  const handleDeleteDisputedTournament = async (id: string) => {
    const confirmed = await notification.confirm({
      title: 'Eliminar torneo disputado',
      message: '¿Está seguro de eliminar este torneo disputado?',
      type: 'danger',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    try {
      await deleteDisputedTournament(id);
      await refreshAllTournaments();
      
      if (playerId) {
        const updatedDisputed = getDisputedTournamentsByPlayer(playerId);
        setPlayerDisputedTournaments(updatedDisputed);
      }
      
      notification.success('Torneo disputado eliminado exitosamente');
    } catch (error) {
      console.error('Error al eliminar torneo disputado:', error);
      notification.error('Error al eliminar el torneo disputado');
    }
  };

  return {
    isTournamentModalOpen,
    editingTournament,
    playerDisputedTournaments,
    isDisputedTournamentModalOpen,
    editingDisputedTournament,
    tournamentToConvert,
    activeSubTab,
    setActiveSubTab,
    
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