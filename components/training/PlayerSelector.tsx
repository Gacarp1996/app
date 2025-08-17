import React from 'react';
import { Player } from '../../types/types';

interface PlayerSelectorProps {
  participants: Player[];
  activePlayerIds: Set<string>;
  onPlayerToggleActive: (playerId: string) => void;
  onToggleSelectAll: () => void;
}

const PlayerSelector: React.FC<PlayerSelectorProps> = ({
  participants,
  activePlayerIds,
  onPlayerToggleActive,
  onToggleSelectAll
}) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-lg p-3 sm:p-4 lg:p-6 border border-gray-800">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-green-400">
          Jugadores en el Ejercicio
        </h3>
        <button 
          onClick={onToggleSelectAll} 
          className="self-start sm:self-auto text-xs sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50"
        >
          {activePlayerIds.size === participants.length ? 'Deseleccionar' : 'Seleccionar Todos'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {participants.map(player => (
          <button 
            key={player.id} 
            onClick={() => onPlayerToggleActive(player.id)}
            className={`py-2 px-3 sm:px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              activePlayerIds.has(player.id) 
                ? 'bg-gradient-to-r from-green-500/20 to-cyan-500/20 text-green-400 border border-green-400 shadow-lg shadow-green-500/20' 
                : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border border-gray-700'
            }`}
          >
            {player.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PlayerSelector;