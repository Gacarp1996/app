import React from 'react';
import { useNavigate } from 'react-router-dom';

interface WeeklySatisfaction {
  generalAverage: number;
  playerAverages: {
    playerId: string;
    playerName: string;
    average: number;
    surveysCount: number;
  }[];
  totalSurveys: number;
}

interface WeeklySatisfactionWidgetProps {
  weeklySatisfaction: WeeklySatisfaction;
}

const WeeklySatisfactionWidget: React.FC<WeeklySatisfactionWidgetProps> = ({ weeklySatisfaction }) => {
  const navigate = useNavigate();

  const handlePlayerClick = (playerId: string) => {
    // Navega al perfil del jugador con la pestaña de entrenamientos activa
    navigate(`/player/${playerId}?tab=trainings`);
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-yellow-500/20 rounded-lg">
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">Satisfacción Semanal</h3>
      </div>
      
      {weeklySatisfaction.totalSurveys === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No hay encuestas en los últimos 7 días</p>
        </div>
      ) : (
        <>
          <div className="text-center mb-6">
            <p className="text-4xl font-bold text-yellow-400 mb-1">
              {weeklySatisfaction.generalAverage}
              <span className="text-xl text-gray-400">/5</span>
            </p>
            <p className="text-gray-400 text-sm">
              Promedio general ({weeklySatisfaction.totalSurveys} encuestas)
            </p>
          </div>
          
          {weeklySatisfaction.playerAverages.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              <p className="text-sm font-medium text-gray-300 mb-2">Por jugador:</p>
              {weeklySatisfaction.playerAverages.slice(0, 5).map((player) => (
                <button
                  key={player.playerId}
                  onClick={() => handlePlayerClick(player.playerId)}
                  className="w-full flex justify-between items-center p-2 bg-gray-800/30 rounded hover:bg-gray-800/50 transition-colors cursor-pointer border border-transparent hover:border-gray-700"
                >
                  <div className="flex items-center gap-2">
                    {/* Avatar del jugador */}
                    <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-yellow-400 text-xs font-medium">
                        {player.playerName?.charAt(0) || '?'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-300 hover:text-white transition-colors">
                      {player.playerName}
                    </span>
                  </div>
                  <div className="text-right flex items-center gap-1">
                    <span className="text-sm font-medium text-yellow-400">{player.average}/5</span>
                    <span className="text-xs text-gray-500">({player.surveysCount})</span>
                    {/* Icono de navegación */}
                    <svg className="w-3 h-3 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
              {weeklySatisfaction.playerAverages.length > 5 && (
                <p className="text-center text-xs text-gray-400 mt-2">
                  +{weeklySatisfaction.playerAverages.length - 5} jugadores más
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WeeklySatisfactionWidget;