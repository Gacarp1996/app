// components/dashboard/widgets/UpcomingCompetitionsWidget.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../../contexts/PlayerContext';
import { useTournament } from '../../contexts/TournamentContext'; // ✅ NUEVO IMPORT

interface UpcomingCompetitionsWidgetProps {
  playerIds?: string[]; // Para filtrar solo jugadores específicos (útil para coaches)
  title?: string;
  maxItems?: number; // Máximo de items a mostrar
}

export const UpcomingCompetitionsWidget: React.FC<UpcomingCompetitionsWidgetProps> = ({ 
  playerIds,
  title = "Próximas Competencias",
  maxItems = 10
}) => {
  const navigate = useNavigate();
  const { getActivePlayers } = usePlayer();
  const { getUpcomingTournaments } = useTournament(); // ✅ USAR CONTEXTO
  
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUpcomingCompetitions();
  }, [playerIds]);

  const loadUpcomingCompetitions = async () => {
    try {
      setLoading(true);
      
      // ✅ USAR FUNCIÓN DEL CONTEXTO
      const upcomingTournaments = getUpcomingTournaments(60); // Próximos 60 días
      const activePlayers = getActivePlayers();
      
      // ✅ CREAR SET DE IDs DE JUGADORES ACTIVOS para filtrado eficiente
      const activePlayerIds = new Set(activePlayers.map(p => p.id));
      
      // ✅ FILTRAR SOLO TORNEOS DE JUGADORES ACTIVOS
      let filteredTournaments = upcomingTournaments.filter(t => 
        activePlayerIds.has(t.jugadorId)
      );
      
      // Filtrar por jugadores específicos si se proporcionan (y que estén activos)
      if (playerIds && playerIds.length > 0) {
        filteredTournaments = filteredTournaments.filter(t => 
          playerIds.includes(t.jugadorId)
        );
      }
      
      // Mapear torneos con información del jugador
      const competitionsData = filteredTournaments.map(tournament => {
        const player = activePlayers.find(p => p.id === tournament.jugadorId);
        const competitionDate = new Date(tournament.fechaInicio);
        const now = new Date();
        const daysRemaining = Math.ceil(
          (competitionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return {
          playerId: tournament.jugadorId,
          playerName: player?.name || 'Jugador desconocido',
          competitionName: tournament.nombreTorneo,
          competitionDate,
          daysRemaining,
          tournamentId: tournament.id,
          importance: tournament.gradoImportancia
        };
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, maxItems);
      
      setCompetitions(competitionsData);
    } catch (error) {
      console.error('Error cargando competencias próximas:', error);
      setCompetitions([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerClick = (playerId: string) => {
    // Navegación al perfil del jugador con la pestaña de torneos activa
    navigate(`/player/${playerId}?tab=tournaments`);
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

  // Función para obtener color según importancia
  const getImportanceColor = (importance: string) => {
    if (importance.includes('Muy importante')) return 'bg-red-500/20';
    if (importance.includes('Importante')) return 'bg-orange-500/20';
    if (importance.includes('media')) return 'bg-yellow-500/20';
    return 'bg-gray-500/20';
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
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        {competitions.length > 0 && (
          <span className="text-xs text-gray-400">
            {competitions.length} próxima{competitions.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Contenido */}
      {competitions.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-400">No hay competencias próximas</p>
          <p className="text-xs text-gray-500 mt-1">Los torneos aparecerán aquí cuando se acerquen</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {competitions.map((competition) => (
            <button
              key={`${competition.playerId}-${competition.tournamentId}`}
              onClick={() => handlePlayerClick(competition.playerId)}
              className="w-full flex justify-between items-center p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-all duration-200 cursor-pointer border border-transparent hover:border-gray-700 group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Avatar del jugador con indicador de importancia */}
                <div className={`w-10 h-10 ${getImportanceColor(competition.importance)} rounded-full flex items-center justify-center flex-shrink-0 relative`}>
                  <span className="text-white text-sm font-bold">
                    {competition.playerName?.charAt(0) || '?'}
                  </span>
                  {competition.daysRemaining <= 7 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium">
                      {competition.playerName}
                    </span>
                    {competition.daysRemaining === 0 && (
                      <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                        HOY
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {competition.competitionName}
                  </p>
                  <p className="text-xs text-gray-600">
                    {competition.competitionDate.toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-3">
                <div className="text-right">
                  <div className={`text-sm font-bold ${getDaysRemainingColor(competition.daysRemaining)}`}>
                    {getDaysRemainingText(competition.daysRemaining)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {competition.importance.split(' ')[0]}
                  </div>
                </div>
                
                {/* Icono de navegación */}
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-300 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
          
          {competitions.length === maxItems && (
            <p className="text-center text-xs text-gray-500 mt-3 py-2">
              Mostrando próximos {maxItems} torneos
            </p>
          )}
        </div>
      )}
    </div>
  );
};