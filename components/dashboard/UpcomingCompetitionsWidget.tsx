// components/dashboard/widgets/UpcomingCompetitionsWidget.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUpcomingCompetitions, getMultiplePlayersUpcomingCompetitions, PlayerCompetition } from '../../Database/FirebaseUpcomingCompetitions';

interface UpcomingCompetitionsWidgetProps {
  academiaId: string;
  playerIds?: string[]; // Para filtrar solo jugadores específicos (útil para coaches)
  title?: string;
}

export const UpcomingCompetitionsWidget: React.FC<UpcomingCompetitionsWidgetProps> = ({ 
  academiaId,
  playerIds,
  title = "Próximas Competencias"
}) => {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<PlayerCompetition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingCompetitions();
  }, [academiaId, playerIds]);

  const loadUpcomingCompetitions = async () => {
    try {
      setLoading(true);
      
      let competitionsData: PlayerCompetition[];
      
      if (playerIds && playerIds.length > 0) {
        competitionsData = await getMultiplePlayersUpcomingCompetitions(academiaId, playerIds);
      } else {
        competitionsData = await getUpcomingCompetitions(academiaId);
      }
      
      setCompetitions(competitionsData);
    } catch (error) {
      console.error('Error cargando competencias próximas:', error);
      setCompetitions([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerClick = (playerId: string) => {
    navigate(`/player/${playerId}/tournaments`);
  };

  const getDaysRemainingColor = (days: number) => {
    if (days <= 7) return 'text-red-400';
    if (days <= 14) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getDaysRemainingText = (days: number) => {
    if (days === 1) return '1 día';
    if (days === 0) return 'Hoy';
    if (days < 0) return 'Pasado';
    return `${days} días`;
  };

  if (loading) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-400 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
      {/* Header exactamente como WeeklySatisfactionWidget */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-500/20 rounded-lg">
          <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>

      {/* Contenido */}
      {competitions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No hay competencias próximas</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {competitions.map((competition) => (
            <div
              key={`${competition.playerId}-${competition.tournamentId}`}
              onClick={() => handlePlayerClick(competition.playerId)}
              className="flex justify-between items-center p-2 bg-gray-800/30 rounded cursor-pointer hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-300">{competition.playerName}</span>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {competition.competitionName}
                </p>
                <p className="text-xs text-gray-500">
                  {competition.competitionDate.toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </p>
              </div>
              
              <div className="text-right ml-2">
                <div className={`text-sm font-medium ${getDaysRemainingColor(competition.daysRemaining)}`}>
                  {getDaysRemainingText(competition.daysRemaining)}
                </div>
              </div>
            </div>
          ))}
          
          {competitions.length > 5 && (
            <p className="text-center text-xs text-gray-400 mt-2">
              Mostrando primeras {Math.min(competitions.length, 5)} competencias
            </p>
          )}
        </div>
      )}
    </div>
  );
};