import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAcademia } from '../../contexts/AcademiaContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { useSession } from '../../contexts/SessionContext'; 
import { getTrainingPlan } from '../../Database/FirebaseTrainingPlans';
import { getBatchSurveys } from '../../Database/FirebaseSurveys';
import { Player, TrainingSession, Objective, PostTrainingSurvey } from '../../types';
import TrainedPlayersWidget from '@/components/dashboard/TrainedPlayersWidget';
import PlayerStatusWidget from '@/components/dashboard/PlayerStatusWidget';
import PlanningResumeWidget from '@/components/dashboard/PlanningResumeWidget';
import WeeklySatisfactionWidget from '@/components/dashboard/WeeklySatisfactionWidget';
import { useObjective } from '../../contexts/ObjectiveContext';

// Interfaces locales
interface TrainedPlayerData {
  playerId: string;
  sessionCount: number;
  lastSessionDate: string;
  totalExercises: number;
}

interface PlayerStatus {
  active: Player[];
  inactive: Player[];
  withoutPlan: Player[];
}

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

// Hook personalizado para datos del dashboard del coach
const useAcademyCoachDashboard = () => {
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia();
  const { players: allPlayersFromContext } = usePlayer();
  const { objectives } = useObjective();
  
  // ✅ USAR SessionContext
  const {
    getTrainedPlayersByCoach,
    getSessionsByCoach,
    getTodaySessions,
    getSessionsByDateRange,
    refreshSessions
  } = useSession();
  
  // Estados
  const [trainedPlayers, setTrainedPlayers] = useState<TrainedPlayerData[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>({
    active: [],
    inactive: [],
    withoutPlan: []
  });
  const [weeklySatisfaction, setWeeklySatisfaction] = useState<WeeklySatisfaction>({
    generalAverage: 0,
    playerAverages: [],
    totalSurveys: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Rango de fechas (últimos 30 días por defecto)
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end };
  });

  useEffect(() => {
    if (currentUser && academiaActual && allPlayersFromContext.length > 0) {
      loadDashboardData();
    }
  }, [currentUser, academiaActual, dateRange, allPlayersFromContext]);

  const loadDashboardData = async () => {
    if (!currentUser || !academiaActual) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // ✅ USAR FUNCIÓN DEL CONTEXTO para obtener jugadores entrenados
      const trainedPlayersData = await getTrainedPlayersByCoach(
        currentUser.uid,
        dateRange.start,
        dateRange.end
      );

      // Usar jugadores del contexto
      const players = allPlayersFromContext;

      // Filtrar solo jugadores activos
      const activePlayers = players.filter(p => p.estado === 'activo');

      // Procesar datos adicionales
      await Promise.all([
        processPlayerStatus(activePlayers, trainedPlayersData),
        processWeeklySatisfaction(activePlayers, currentUser.uid)
      ]);

      setTrainedPlayers(trainedPlayersData);
      setAllPlayers(players);
      
    } catch (err) {
      console.error('Error cargando dashboard del coach:', err);
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Procesar estado de jugadores (filtrado para el coach)
  const processPlayerStatus = async (players: Player[], trainedPlayersData: TrainedPlayerData[]) => {
    if (!academiaActual || !currentUser) return;

    // ✅ USAR FUNCIÓN DEL CONTEXTO
    const todaySessions = getTodaySessions();
    const coachTodaySessions = todaySessions.filter(s => s.entrenadorId === currentUser.uid);

    // IDs de jugadores que el coach entrenó hoy
    const activePlayerIds = new Set(coachTodaySessions.map(session => session.jugadorId));
    
    // IDs de jugadores que el coach ha entrenado alguna vez
    const trainedPlayerIds = new Set(trainedPlayersData.map(tp => tp.playerId));
    
    // Filtrar solo jugadores que el coach entrena o ha entrenado
    const coachPlayers = players.filter(player => trainedPlayerIds.has(player.id));
    
    // Separar jugadores activos e inactivos (del coach)
    const activePlayers = coachPlayers.filter(player => activePlayerIds.has(player.id));
    const inactivePlayers = coachPlayers.filter(player => !activePlayerIds.has(player.id));

    // Verificar planificación para los jugadores del coach
    const playersWithoutPlan: Player[] = [];
    
    for (const player of coachPlayers) {
      try {
        const hasObjectives = objectives.some((obj: Objective) => obj.jugadorId === player.id);
       
        
        const trainingPlan = await getTrainingPlan(academiaActual.id, player.id);
        const hasTrainingPlan = trainingPlan !== null;

        if (!hasObjectives && !hasTrainingPlan) {
          playersWithoutPlan.push(player);
        }
      } catch (error) {
        console.error(`Error verificando planificación para jugador ${player.id}:`, error);
      }
    }

    setPlayerStatus({
      active: activePlayers,
      inactive: inactivePlayers,
      withoutPlan: playersWithoutPlan
    });
  };

  // Procesar satisfacción semanal (solo de los jugadores del coach)
  const processWeeklySatisfaction = async (players: Player[], coachId: string) => {
    if (!academiaActual || players.length === 0) {
      setWeeklySatisfaction({
        generalAverage: 0,
        playerAverages: [],
        totalSurveys: 0
      });
      return;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    try {
      // ✅ USAR FUNCIÓN DEL CONTEXTO para obtener sesiones del coach
      const coachWeekSessions = getSessionsByCoach(coachId, { start: startDate, end: endDate });

      // Obtener IDs únicos de jugadores entrenados por el coach
      const coachPlayerIds = [...new Set(coachWeekSessions.map(s => s.jugadorId))];
      
      if (coachPlayerIds.length === 0) {
        setWeeklySatisfaction({
          generalAverage: 0,
          playerAverages: [],
          totalSurveys: 0
        });
        return;
      }

      // Obtener encuestas solo de los jugadores del coach
      const surveys = await getBatchSurveys(academiaActual.id, coachPlayerIds, startDate, endDate);

      if (surveys.length === 0) {
        setWeeklySatisfaction({
          generalAverage: 0,
          playerAverages: [],
          totalSurveys: 0
        });
        return;
      }

      // Agrupar encuestas por jugador
      const surveysByPlayer: { [playerId: string]: PostTrainingSurvey[] } = {};
      surveys.forEach((survey: PostTrainingSurvey) => {
        if (!surveysByPlayer[survey.jugadorId]) {
          surveysByPlayer[survey.jugadorId] = [];
        }
        surveysByPlayer[survey.jugadorId].push(survey);
      });

      // Calcular promedio por jugador
      const playerAverages = Object.entries(surveysByPlayer).map(([playerId, playerSurveys]) => {
        const player = players.find(p => p.id === playerId);
        
        let totalSum = 0;
        let totalResponses = 0;

        playerSurveys.forEach(survey => {
          totalSum += survey.cansancioFisico + survey.concentracion + 
                     survey.actitudMental + survey.sensacionesTenisticas;
          totalResponses += 4;
        });

        const average = totalResponses > 0 ? totalSum / totalResponses : 0;

        return {
          playerId,
          playerName: player?.name || 'Jugador desconocido',
          average: Number(average.toFixed(2)),
          surveysCount: playerSurveys.length
        };
      });

      // Calcular promedio general
      const totalSum = playerAverages.reduce((sum, player) => sum + (player.average * player.surveysCount), 0);
      const totalSurveys = playerAverages.reduce((sum, player) => sum + player.surveysCount, 0);
      const generalAverage = totalSurveys > 0 ? Number((totalSum / totalSurveys).toFixed(2)) : 0;

      playerAverages.sort((a, b) => b.average - a.average);

      setWeeklySatisfaction({
        generalAverage,
        playerAverages,
        totalSurveys: surveys.length
      });

    } catch (error) {
      console.error('Error calculando satisfacción semanal:', error);
      setWeeklySatisfaction({
        generalAverage: 0,
        playerAverages: [],
        totalSurveys: 0
      });
    }
  };

  return {
    trainedPlayers,
    allPlayers,
    playerStatus,
    weeklySatisfaction,
    dateRange,
    loading,
    error,
    refreshData: async () => {
      await refreshSessions(); // ✅ REFRESCAR SESIONES DEL CONTEXTO
      await loadDashboardData();
    },
    updateDateRange: (newRange: { start: Date; end: Date }) => setDateRange(newRange)
  };
};

// Componente principal del Dashboard del Academy Coach
const DashboardAcademyCoachView: React.FC = () => {
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia();
  const {
    trainedPlayers,
    allPlayers,
    playerStatus,
    weeklySatisfaction,
    dateRange,
    loading,
    error,
    refreshData
  } = useAcademyCoachDashboard();

  if (!academiaActual) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">No hay academia seleccionada</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto shadow-lg shadow-green-500/50"></div>
          <p className="mt-4 text-gray-400">Cargando tu dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={refreshData}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold rounded-lg transition-all duration-200"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const coachName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Entrenador';

  return (
    <div className="min-h-screen bg-black">
      {/* Efectos de fondo */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="fixed top-20 left-20 w-64 h-64 lg:w-96 lg:h-96 bg-green-500/5 rounded-full blur-3xl"></div>
      <div className="fixed bottom-20 right-20 w-64 h-64 lg:w-96 lg:h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header personalizado para Coach */}
        <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                Hola, {coachName}
              </h1>
              <p className="text-gray-400">Panel de control - {academiaActual.nombre}</p>
              <p className="text-sm text-gray-500">
                Última actualización: {new Date().toLocaleTimeString()}
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={refreshData}
                className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                title="Actualizar datos"
              >
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Grid principal - Primera fila */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Widget principal: Jugadores entrenados */}
          <TrainedPlayersWidget
            trainedPlayersData={trainedPlayers}
            players={allPlayers}
            dateRange={dateRange}
            coachName={coachName}
          />
          
          {/* Widget de estado de jugadores (solo los del coach) */}
          <PlayerStatusWidget playerStatus={playerStatus} />
        </div>

        {/* Segunda fila */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Satisfacción semanal (solo de los jugadores del coach) */}
          <WeeklySatisfactionWidget weeklySatisfaction={weeklySatisfaction} />
          
          {/* Resumen de planificación (solo de los jugadores del coach) */}
          <PlanningResumeWidget playerStatus={playerStatus} />
        </div>
      </div>
    </div>
  );
};

export default DashboardAcademyCoachView;