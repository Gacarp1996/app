import { Player } from '@/types';
import React from 'react';


interface PlayerStatus {
  active: Player[];
  inactive: Player[];
  withoutPlan: Player[];
}

interface PlayerStatusWidgetProps {
  playerStatus: PlayerStatus;
}

const PlayerStatusWidget: React.FC<PlayerStatusWidgetProps> = ({ playerStatus }) => {
  return (
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
          <p className="text-green-400 text-lg font-semibold">{playerStatus.active.length}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm">Inactivos hoy</p>
          <p className="text-yellow-400 text-lg font-semibold">{playerStatus.inactive.length}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm">Sin planificación</p>
          <p className="text-red-400 text-lg font-semibold">{playerStatus.withoutPlan.length}</p>
        </div>
      </div>
      
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          Total: {playerStatus.active.length + playerStatus.inactive.length} jugadores
        </p>
      </div>
    </div>
  );
};

export default PlayerStatusWidget;