import { Player } from '@/types/types';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament } from '@/contexts/TournamentContext';
import { usePlayer } from '@/contexts/PlayerContext';

interface PlayerStatus {
  active: Player[];
  inactive: Player[];
  withoutPlan: Player[];
}

interface PlayerStatusWidgetProps {
  playerStatus: PlayerStatus;
}

interface PlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  title: string;
}

interface TournamentWithPlayer {
  tournament: any;
  playerName: string;
  playerId: string;
}

interface TournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentsWithPlayers: TournamentWithPlayer[];
  title: string;
}

// Modal para jugadores
const PlayerModal: React.FC<PlayerModalProps> = ({ 
  isOpen, 
  onClose, 
  players, 
  title
}) => {
  const navigate = useNavigate();
  
  if (!isOpen) return null;

  const handlePlayerClick = (player: Player) => {
    navigate(`/player/${player.id}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-96">
          {players.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No hay jugadores en esta categoría
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {players.map((player) => (
                <button
                  key={player.id}
                  onClick={() => handlePlayerClick(player)}
                  className="w-full text-left p-3 hover:bg-gray-800/50 rounded-lg transition-colors border border-transparent hover:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <span className="text-purple-400 text-sm font-medium">
                        {player.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{player.name || 'Jugador sin nombre'}</p>
                      <p className="text-gray-400 text-sm">
                        {player.edad ? `${player.edad} años` : 'Edad no especificada'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ✅ CORREGIDO: Modal con hooks antes del return condicional
const TournamentModal: React.FC<TournamentModalProps> = ({ 
  isOpen, 
  onClose, 
  tournamentsWithPlayers, 
  title
}) => {
  const navigate = useNavigate();
  
  // ✅ IMPORTANTE: useMemo ANTES del return condicional
  const tournamentsByPlayer = useMemo(() => {
    const grouped = tournamentsWithPlayers.reduce((acc, item) => {
      if (!acc[item.playerId]) {
        acc[item.playerId] = {
          playerName: item.playerName,
          tournaments: []
        };
      }
      acc[item.playerId].tournaments.push(item);
      return acc;
    }, {} as Record<string, { playerName: string; tournaments: TournamentWithPlayer[] }>);
    
    return grouped;
  }, [tournamentsWithPlayers]);
  
  // Funciones helper (no son hooks, pueden estar donde sea)
  const getDaysAgo = (dateStr: string) => {
    const endDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - endDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    return `Hace ${diffDays} días`;
  };

  const getUrgencyColor = (dateStr: string) => {
    const endDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - endDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 5) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (diffDays >= 3) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    return 'text-green-400 bg-green-500/10 border-green-500/30';
  };
  
  // Return condicional DESPUÉS de todos los hooks
  if (!isOpen) return null;

  const handleTournamentClick = (item: TournamentWithPlayer) => {
    navigate(`/player/${item.playerId}?tab=tournaments`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-lg w-full max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="overflow-y-auto max-h-[60vh]">
          {tournamentsWithPlayers.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No hay torneos pendientes de registro
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {Object.entries(tournamentsByPlayer).map(([playerId, data]) => (
                <div key={playerId} className="space-y-2">
                  {/* Header del jugador */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <span className="text-purple-400 text-sm font-medium">
                        {data.playerName.charAt(0)}
                      </span>
                    </div>
                    <h4 className="text-white font-semibold">{data.playerName}</h4>
                    <span className="text-gray-400 text-sm">
                      ({data.tournaments.length} torneo{data.tournaments.length !== 1 ? 's' : ''})
                    </span>
                  </div>
                  
                  {/* Torneos del jugador */}
                  {data.tournaments.map((item) => (
                    <button
                      key={item.tournament.id}
                      onClick={() => handleTournamentClick(item)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 border ${getUrgencyColor(item.tournament.fechaFin)} hover:scale-[1.02]`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">
                            {item.tournament.nombreTorneo}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-gray-400 text-sm">
                              {getDaysAgo(item.tournament.fechaFin)}
                            </p>
                            {getDaysAgo(item.tournament.fechaFin) === 'Hace 6 días' && (
                              <span className="text-xs text-red-400 bg-red-500/20 px-2 py-0.5 rounded">
                                ⚠️ Última oportunidad
                              </span>
                            )}
                          </div>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PlayerStatusWidget: React.FC<PlayerStatusWidgetProps> = ({ 
  playerStatus
}) => {
  const { getEndedTournamentsNeedingRegistration } = useTournament();
  const { players } = usePlayer();
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    players: Player[];
    title: string;
  }>({
    isOpen: false,
    players: [],
    title: ''
  });
  
  const [tournamentModalState, setTournamentModalState] = useState<{
    isOpen: boolean;
    tournamentsWithPlayers: TournamentWithPlayer[];
    title: string;
  }>({
    isOpen: false,
    tournamentsWithPlayers: [],
    title: ''
  });

  // Obtener torneos con nombres de jugadores
  const tournamentsWithPlayers = useMemo(() => {
    const endedTournaments = getEndedTournamentsNeedingRegistration();
    
    return endedTournaments.map(tournament => {
      const player = players.find(p => p.id === tournament.jugadorId);
      return {
        tournament,
        playerName: player?.name || 'Jugador desconocido',
        playerId: tournament.jugadorId
      };
    }).sort((a, b) => {
      // Ordenar por urgencia (días desde finalización)
      const dateA = new Date(a.tournament.fechaFin);
      const dateB = new Date(b.tournament.fechaFin);
      return dateA.getTime() - dateB.getTime();
    });
  }, [getEndedTournamentsNeedingRegistration, players]);

  const openModal = (players: Player[], title: string) => {
    setModalState({
      isOpen: true,
      players,
      title
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      players: [],
      title: ''
    });
  };
  
  const openTournamentModal = () => {
    setTournamentModalState({
      isOpen: true,
      tournamentsWithPlayers,
      title: '🏆 Torneos Pendientes de Registro'
    });
  };

  const closeTournamentModal = () => {
    setTournamentModalState({
      isOpen: false,
      tournamentsWithPlayers: [],
      title: ''
    });
  };

  return (
    <>
      <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Estado de Jugadores</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Activos hoy</p>
            <button
              onClick={() => openModal(playerStatus.active, 'Jugadores Activos')}
              className="text-green-400 text-lg font-semibold hover:text-green-300 transition-colors cursor-pointer"
            >
              {playerStatus.active.length}
            </button>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">Inactivos hoy</p>
            <button
              onClick={() => openModal(playerStatus.inactive, 'Jugadores Inactivos')}
              className="text-yellow-400 text-lg font-semibold hover:text-yellow-300 transition-colors cursor-pointer"
            >
              {playerStatus.inactive.length}
            </button>
          </div>
        </div>
        
        {/* Sección de torneos pendientes */}
        {tournamentsWithPlayers.length > 0 && (
          <div className="space-y-3">
            <div className="border-t border-gray-700"></div>
            <button
              onClick={openTournamentModal}
              className="w-full p-3 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg transition-all duration-200 group"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl flex-shrink-0">🏆</span>
                  <div className="text-left min-w-0">
                    <p className="text-yellow-400 font-semibold text-sm sm:text-base truncate">
                      Torneos por registrar
                    </p>
                    <p className="text-yellow-300 text-xs sm:text-sm">
                      {tournamentsWithPlayers.length} torneo{tournamentsWithPlayers.length !== 1 ? 's' : ''} finalizado{tournamentsWithPlayers.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs sm:text-sm font-bold">
                    {tournamentsWithPlayers.length}
                  </span>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              
              {/* Mini preview de jugadores */}
              <div className="mt-2 flex flex-wrap gap-1">
                {[...new Set(tournamentsWithPlayers.map(t => t.playerName))].slice(0, 3).map((name, idx) => (
                  <span key={idx} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                    {name}
                  </span>
                ))}
                {[...new Set(tournamentsWithPlayers.map(t => t.playerName))].length > 3 && (
                  <span className="text-xs text-gray-400">
                    +{[...new Set(tournamentsWithPlayers.map(t => t.playerName))].length - 3} más
                  </span>
                )}
              </div>
            </button>
          </div>
        )}
        
        <div className="text-center mt-4 pt-4 border-t border-gray-700">
          <p className="text-gray-400 text-sm">
            Total: {playerStatus.active.length + playerStatus.inactive.length} jugadores
          </p>
        </div>
      </div>

      {/* Modales */}
      <PlayerModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        players={modalState.players}
        title={modalState.title}
      />
      
      <TournamentModal
        isOpen={tournamentModalState.isOpen}
        onClose={closeTournamentModal}
        tournamentsWithPlayers={tournamentModalState.tournamentsWithPlayers}
        title={tournamentModalState.title}
      />
    </>
  );
};

export default PlayerStatusWidget;