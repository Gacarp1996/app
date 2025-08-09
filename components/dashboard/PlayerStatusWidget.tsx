import { Player } from '@/types/types';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

// Componente Modal para mostrar la lista de jugadores
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
        {/* Header del modal */}
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
                    {/* Avatar placeholder */}
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

const PlayerStatusWidget: React.FC<PlayerStatusWidgetProps> = ({ 
  playerStatus
}) => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    players: Player[];
    title: string;
  }>({
    isOpen: false,
    players: [],
    title: ''
  });

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
        
        <div className="grid grid-cols-3 gap-4 mb-4">
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
          <div className="text-center">
            <p className="text-gray-400 text-sm">Sin planificación</p>
            <button
              onClick={() => openModal(playerStatus.withoutPlan, 'Jugadores Sin Planificación')}
              className="text-red-400 text-lg font-semibold hover:text-red-300 transition-colors cursor-pointer"
            >
              {playerStatus.withoutPlan.length}
            </button>
          </div>
        </div>
        
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            Total: {playerStatus.active.length + playerStatus.inactive.length} jugadores
          </p>
        </div>
      </div>

      {/* Modal */}
      <PlayerModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        players={modalState.players}
        title={modalState.title}
      />
    </>
  );
};

export default PlayerStatusWidget;