// hooks/useSessionParticipants.ts
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Player, Objective } from '../types';

interface UseSessionParticipantsProps {
  participants: Player[];
  setParticipants: React.Dispatch<React.SetStateAction<Player[]>>;
  allObjectives: Objective[];
  isEditMode: boolean;
}

export const useSessionParticipants = ({
  participants,
  setParticipants,
  allObjectives,
  isEditMode
}: UseSessionParticipantsProps) => {
  // Estados
  const [activePlayerIds, setActivePlayerIds] = useState<Set<string>>(
    new Set(participants.map(p => p.id))
  );
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const modalOpenedOnceRef = useRef(false);

  // Valores computados
  const playerNamesDisplay = useMemo(() => 
    participants.map(p => p.name).join(', '), 
    [participants]
  );

  const singleActivePlayer = useMemo(() => 
    (activePlayerIds.size === 1) 
      ? participants.find(p => p.id === Array.from(activePlayerIds)[0]) 
      : null, 
    [activePlayerIds, participants]
  );

  const objectivesForSingleActivePlayer = useMemo(() => 
    singleActivePlayer 
      ? allObjectives.filter(obj => 
          obj.jugadorId === singleActivePlayer.id && 
          obj.estado === 'actual-progreso'
        ) 
      : [], 
    [singleActivePlayer, allObjectives]
  );

  // Actualizar jugadores activos cuando cambien los participantes
  useEffect(() => {
    setActivePlayerIds(new Set(participants.map(p => p.id)));
    
    // Abrir modal de objetivos al inicio (solo primera vez)
    if (participants.length > 0 && !modalOpenedOnceRef.current && !isEditMode) {
      setIsObjectiveModalOpen(true);
      modalOpenedOnceRef.current = true;
    }
  }, [participants, isEditMode]);

  // Handlers
  const handlePlayerToggleActive = useCallback((playerId: string) => {
    setActivePlayerIds(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(playerId)) {
        newSelection.delete(playerId);
      } else {
        newSelection.add(playerId);
      }
      return newSelection;
    });
  }, []);

  const toggleSelectAllPlayers = useCallback(() => {
    if (activePlayerIds.size === participants.length) {
      setActivePlayerIds(new Set());
    } else {
      setActivePlayerIds(new Set(participants.map(p => p.id)));
    }
  }, [activePlayerIds.size, participants]);

  const handleAddParticipant = useCallback((player: Player) => {
    setParticipants(prev => [...prev, player]);
  }, [setParticipants]);

  const handleRemoveParticipant = useCallback((playerId: string) => {
    setParticipants(prev => prev.filter(p => p.id !== playerId));
    setActivePlayerIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(playerId);
      return newSet;
    });
  }, [setParticipants]);

  const isPlayerActive = useCallback((playerId: string) => {
    return activePlayerIds.has(playerId);
  }, [activePlayerIds]);

  const getActiveParticipants = useCallback(() => {
    return participants.filter(p => activePlayerIds.has(p.id));
  }, [participants, activePlayerIds]);

  return {
    // Estados
    activePlayerIds,
    isObjectiveModalOpen,
    isParticipantModalOpen,
    
    // Valores computados
    playerNamesDisplay,
    singleActivePlayer,
    objectivesForSingleActivePlayer,
    
    // Setters
    setIsObjectiveModalOpen,
    setIsParticipantModalOpen,
    
    // Handlers
    handlePlayerToggleActive,
    toggleSelectAllPlayers,
    handleAddParticipant,
    handleRemoveParticipant,
    isPlayerActive,
    getActiveParticipants
  };
};