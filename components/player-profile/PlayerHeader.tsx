// components/player-profile/PlayerHeader.tsx - Con botón eliminar mejorado
import React from 'react';
import { Player } from '../../types/types';

interface PlayerHeaderProps {
  player: Player;
  onDeleteClick: () => void; 
}

const PlayerHeader: React.FC<PlayerHeaderProps> = ({ player, onDeleteClick }) => {
  return (
    <div className="mb-8 lg:mb-12">
      <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
        <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-6">
          
          {/* Información del jugador */}
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-4">
              {/* Avatar del jugador */}
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-br from-green-500/20 to-cyan-500/20 rounded-full border-2 border-green-500/30 flex items-center justify-center">
                <span className="text-2xl lg:text-3xl font-bold text-green-400">
                  {player.name.charAt(0).toUpperCase()}
                </span>
              </div>
              
              <div>
                <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2">
                  {player.name}
                </h1>
                <div className="flex items-center gap-2 text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-sm lg:text-base">Jugador de Tenis</span>
                </div>
              </div>
            </div>
            
            {/* Información adicional si existe */}
            {(player.edad || player.altura || player.peso) && (
              <div className="flex flex-wrap gap-4 text-sm lg:text-base">
                {player.edad && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{player.edad} años</span>
                  </div>
                )}
                {player.altura && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                    <span>{player.altura} cm</span>
                  </div>
                )}
                {player.peso && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                    <span>{player.peso} kg</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Botón de eliminar rediseñado */}
          <div className="flex-shrink-0">
            <button
              onClick={onDeleteClick}
              className="group relative px-4 py-2 lg:px-6 lg:py-3 bg-red-900/30 hover:bg-red-800/50 text-red-400 hover:text-red-300 font-semibold rounded-lg transition-all duration-200 border border-red-800/50 hover:border-red-600/70 transform hover:scale-105 active:scale-95"
              title="Eliminar jugador"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 lg:w-5 lg:h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden sm:inline">Eliminar</span>
              </span>
              
              {/* Efecto de hover sutil */}
              <div className="absolute inset-0 bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerHeader;