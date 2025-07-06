import React from 'react';
import { Player } from '../../types';

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
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg lg:text-xl font-semibold text-green-400">
          Seleccionar Jugadores para el Ejercicio
        </h3>
        <button 
          onClick={onToggleSelectAll} 
          className="text-xs lg:text-sm px-3 py-1 lg:px-4 lg:py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50"
        >
          {activePlayerIds.size === participants.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 lg:gap-3">
        {participants.map(player => (
          <button 
            key={player.id} 
            onClick={() => onPlayerToggleActive(player.id)}
            className={`py-2 px-4 lg:py-3 lg:px-6 rounded-lg text-sm lg:text-base font-medium transition-all duration-200 ${
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