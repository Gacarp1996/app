import { Player } from '@/types/types';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface PlayerStatus {
  active: Player[];
  inactive: Player[];
  withoutPlan: Player[];
}

interface PlanningResumeWidgetProps {
  playerStatus: PlayerStatus;
}

interface PlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  title: string;
  statusType: 'withPlan' | 'withoutPlan';
}

// Componente Modal para mostrar jugadores con/sin planificación
const PlanningModal: React.FC<PlanningModalProps> = ({ 
  isOpen, 
  onClose, 
  players, 
  title,
  statusType
}) => {
  const navigate = useNavigate();
  
  if (!isOpen) return null;

  const handlePlayerClick = (player: Player) => {
    navigate(`/player/${player.id}?tab=planificacion`);
    onClose();
  };

  const getStatusColor = () => {
    return statusType === 'withPlan' ? 'text-green-400' : 'text-red-400';
  };

  const getStatusIcon = () => {
    if (statusType === 'withPlan') {
      return (
        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header del modal */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              {getStatusIcon()}
            </div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Lista de jugadores */}
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
                    {/* Avatar */}
                    <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                      <span className="text-orange-400 text-sm font-medium">
                        {player.name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{player.name || 'Jugador sin nombre'}</p>
                      <p className="text-gray-400 text-sm">
                        {statusType === 'withPlan' ? 'Planificación activa' : 'Necesita planificación'}
                      </p>
                    </div>
                    {/* Icono de estado */}
                    <div className="flex-shrink-0">
                      {statusType === 'withPlan' ? (
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                        </svg>
                      )}
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

const PlanningResumeWidget: React.FC<PlanningResumeWidgetProps> = ({ playerStatus }) => {
  const navigate = useNavigate();
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    players: Player[];
    title: string;
    statusType: 'withPlan' | 'withoutPlan';
  }>({
    isOpen: false,
    players: [],
    title: '',
    statusType: 'withPlan'
  });

  // Calculamos los jugadores con planificación
  const playersWithPlan = useMemo(() => {
    const allPlayers = [...playerStatus.active, ...playerStatus.inactive];
    return allPlayers.filter(player => 
      !playerStatus.withoutPlan.some(withoutPlan => withoutPlan.id === player.id)
    );
  }, [playerStatus]);

  const openModal = (players: Player[], title: string, statusType: 'withPlan' | 'withoutPlan') => {
    setModalState({
      isOpen: true,
      players,
      title,
      statusType
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      players: [],
      title: '',
      statusType: 'withPlan'
    });
  };

  const handleRequiresAttentionClick = (player: Player) => {
    navigate(`/player/${player.id}?tab=planificacion`);
  };

  return (
    <>
      <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">Resumen de Planificación</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Con planificación</p>
            <button
              onClick={() => openModal(playersWithPlan, 'Jugadores con Planificación', 'withPlan')}
              className="text-green-400 text-2xl font-semibold hover:text-green-300 transition-colors cursor-pointer"
            >
              {playersWithPlan.length}
            </button>
          </div>
          <div className="text-center">
            <p className="text-gray-400 text-sm">Sin planificación</p>
            <button
              onClick={() => openModal(playerStatus.withoutPlan, 'Jugadores sin Planificación', 'withoutPlan')}
              className="text-red-400 text-2xl font-semibold hover:text-red-300 transition-colors cursor-pointer"
            >
              {playerStatus.withoutPlan.length}
            </button>
          </div>
        </div>
        
        {playerStatus.withoutPlan.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-400 mb-3">Requieren atención:</p>
            <div className="space-y-2 max-h-24 overflow-y-auto">
              {playerStatus.withoutPlan.slice(0, 3).map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleRequiresAttentionClick(player)}
                  className="w-full flex items-center gap-2 text-left p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 rounded-lg transition-all duration-200 group"
                >
                  <div className="w-4 h-4 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-red-400 text-xs font-medium">
                      {player.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <span className="text-red-300 group-hover:text-red-200 text-sm font-medium flex-1">
                    {player.name}
                  </span>
                  <svg className="w-3 h-3 text-red-400 group-hover:text-red-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
              {playerStatus.withoutPlan.length > 3 && (
                <button
                  onClick={() => openModal(playerStatus.withoutPlan, 'Jugadores sin Planificación', 'withoutPlan')}
                  className="w-full flex items-center justify-center gap-2 p-2 bg-gray-800/30 hover:bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 rounded-lg transition-all duration-200 group"
                >
                  <span className="text-gray-400 group-hover:text-gray-300 text-sm">
                    +{playerStatus.withoutPlan.length - 3} más
                  </span>
                  <svg className="w-3 h-3 text-gray-400 group-hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <PlanningModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        players={modalState.players}
        title={modalState.title}
        statusType={modalState.statusType}
      />
    </>
  );
};

export default PlanningResumeWidget;