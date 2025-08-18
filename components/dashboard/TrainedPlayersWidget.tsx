import { Player } from '@/types/types';
import React from 'react';
import { formatDate, getPlayerName } from './helpers';


interface TrainedPlayerData {
  playerId: string;
  sessionCount: number;
  lastSessionDate: string;
  totalExercises: number;
}

interface TrainedPlayersWidgetProps {
  trainedPlayersData: TrainedPlayerData[];
  players: Player[]; // Para obtener los nombres de los jugadores
  dateRange: {
    start: Date;
    end: Date;
  };
  coachName?: string;
  loading?: boolean;
}

const TrainedPlayersWidget: React.FC<TrainedPlayersWidgetProps> = ({ 
  trainedPlayersData, 
  players,
  dateRange,
  coachName,
  loading = false
}) => {
  // Función para formatear el rango de fechas
  const formatDateRange = (): string => {
    const start = dateRange.start.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short'
    });
    const end = dateRange.end.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    return `${start} - ${end}`;
  };

  // FILTRAR solo jugadores que existen actualmente
  const validTrainedPlayersData = trainedPlayersData.filter(playerData => {
    // Verificar si el jugador existe en la lista actual de jugadores
    const playerExists = players.some(p => p.id === playerData.playerId);
    return playerExists;
  });

  // Calcular totales con datos filtrados
  const totalSessions = validTrainedPlayersData.reduce((sum, player) => sum + player.sessionCount, 0);
  const totalPlayers = validTrainedPlayersData.length;

  if (loading) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Jugadores Entrenados
              {coachName && <span className="text-gray-400 text-sm font-normal ml-2">por {coachName}</span>}
            </h3>
            <p className="text-xs text-gray-500">{formatDateRange()}</p>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-800/30 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-cyan-400">{totalPlayers}</p>
          <p className="text-xs text-gray-400">Jugadores únicos</p>
        </div>
        <div className="bg-gray-800/30 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-400">{totalSessions}</p>
          <p className="text-xs text-gray-400">Sesiones totales</p>
        </div>
      </div>

      {/* Lista de jugadores */}
      {validTrainedPlayersData.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No hay jugadores entrenados en este período</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {validTrainedPlayersData.slice(0, 10).map((playerData, index) => {
            const player = players.find(p => p.id === playerData.playerId);
            const playerName = player?.name || 'Jugador desconocido';
            const isActive = player?.estado === 'activo';
            
            return (
              <div 
                key={playerData.playerId} 
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 font-mono w-4">{index + 1}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                    <div>
                      <p className="text-white font-medium text-sm">{playerName}</p>
                      <p className="text-xs text-gray-400">
                        Última sesión: {formatDate(playerData.lastSessionDate)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-cyan-400">{playerData.sessionCount}</p>
                  <p className="text-xs text-gray-500">
                    {playerData.sessionCount === 1 ? 'sesión' : 'sesiones'}
                  </p>
                </div>
              </div>
            );
          })}
          
          {validTrainedPlayersData.length > 10 && (
            <p className="text-center text-xs text-gray-400 mt-3 pt-3 border-t border-gray-700">
              +{validTrainedPlayersData.length - 10} jugadores más
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TrainedPlayersWidget;