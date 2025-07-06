// hooks/usePlayerTournaments.ts
import { useState, useEffect } from 'react';
import { Tournament, DisputedTournament } from '../types';
import { addTournament, updateTournament, deleteTournament } from '../Database/FirebaseTournaments';
import { 
  getPlayerDisputedTournaments, 
  addDisputedTournament, 
  updateDisputedTournament, 
  deleteDisputedTournament, 
  convertToDisputedTournament 
} from '../Database/FirebaseDisputedTournaments';

interface UsePlayerTournamentsProps {
  playerId: string | undefined;
  academiaId: string;
  activeTab: string;
  onDataChange: () => void;
}

export const usePlayerTournaments = ({ 
  playerId, 
  academiaId, 
  activeTab, 
  onDataChange 
}: UsePlayerTournamentsProps) => {
  // Estados de torneos
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  
  // Estados de torneos disputados
  const [playerDisputedTournaments, setPlayerDisputedTournaments] = useState<DisputedTournament[]>([]);
  const [isDisputedTournamentModalOpen, setIsDisputedTournamentModalOpen] = useState(false);
  const [editingDisputedTournament, setEditingDisputedTournament] = useState<DisputedTournament | null>(null);
  const [tournamentToConvert, setTournamentToConvert] = useState<Tournament | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'future' | 'disputed'>('future');

  useEffect(() => {
    if (activeTab === 'tournaments' && playerId) {
      loadDisputedTournaments();
    }
  }, [activeTab, playerId]);

  const loadDisputedTournaments = async () => {
    if (!playerId) return;
    try {
      const disputed = await getPlayerDisputedTournaments(academiaId, playerId);
      setPlayerDisputedTournaments(disputed);
    } catch (error) {
      console.error('Error cargando torneos disputados:', error);
    }
  };

  // Handlers para torneos futuros
  const handleOpenAddTournamentModal = () => {
    setEditingTournament(null);
    setIsTournamentModalOpen(true);
  };

  const handleEditTournamentClick = (tournament: Tournament) => {
    setEditingTournament(tournament);
    setIsTournamentModalOpen(true);
  };

  const handleSaveTournament = async (data: Omit<Tournament, 'id' | 'jugadorId'>) => {
    if (editingTournament) {
      await updateTournament(academiaId, editingTournament.id, data);
    } else {
      await addTournament(academiaId, { ...data, jugadorId: playerId! });
    }
    onDataChange();
    setIsTournamentModalOpen(false);
  };

  const handleDeleteTournament = async (id: string) => {
    if (window.confirm("¿Seguro?")) {
      await deleteTournament(academiaId, id);
      onDataChange();
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

  const handleSaveDisputedTournament = async (data: Omit<DisputedTournament, 'id' | 'jugadorId' | 'fechaRegistro'>) => {
    try {
      if (editingDisputedTournament) {
        await updateDisputedTournament(academiaId, editingDisputedTournament.id, data);
      } else if (tournamentToConvert) {
        // ACTUALIZADO: Removido conformidadGeneral
        await convertToDisputedTournament(academiaId, tournamentToConvert, {
          resultado: data.resultado,
          nivelDificultad: data.nivelDificultad,
          rendimientoJugador: data.rendimientoJugador,
          observaciones: data.observaciones
        });
      } else {
        await addDisputedTournament(academiaId, { ...data, jugadorId: playerId! });
      }
      await loadDisputedTournaments();
      onDataChange();
    } catch (error) {
      console.error('Error al guardar torneo disputado:', error);
      alert('Error al guardar el torneo disputado');
    }
    setIsDisputedTournamentModalOpen(false);
  };

  const handleDeleteDisputedTournament = async (id: string) => {
    if (window.confirm("¿Está seguro de eliminar este torneo disputado?")) {
      try {
        await deleteDisputedTournament(academiaId, id);
        await loadDisputedTournaments();
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