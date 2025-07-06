// components/player-profile/PlayerHeader.tsx
import React from 'react';
import { Player } from '../../types';

interface PlayerHeaderProps {
  player: Player;
  onArchiveClick: () => void;
}

const PlayerHeader: React.FC<PlayerHeaderProps> = ({
  player,
  onArchiveClick
}) => {
  return (
    <div className="mb-6 lg:mb-10">
      <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl shadow-2xl shadow-green-500/10">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                {player.name}
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-gray-400">
                <span className="inline-block px-3 py-1 rounded-full bg-gray-800/50 border border-gray-700">
                  Estado: <span className="font-medium text-white">{player.estado}</span>
                </span>
              </p>
            </div>
            {player.estado === 'activo' && (
              <button 
                onClick={onArchiveClick} 
                className="app-button btn-warning w-full sm:w-auto px-4 py-2 lg:px-6 lg:py-3 text-sm sm:text-base lg:text-lg"
              >
                Archivar Jugador
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerHeader;