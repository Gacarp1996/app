import React, { useState, useEffect } from 'react';
import { useAcademia } from '../../contexts/AcademiaContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { useSession } from '../../contexts/SessionContext'; // ✅ NUEVO IMPORT
import { getAcademiaUsers, AcademiaUser } from '../../Database/FirebaseRoles';
import { getObjectives } from '../../Database/FirebaseObjectives';
import { getTrainingPlan } from '../../Database/FirebaseTrainingPlans';
import { getBatchSurveys } from '../../Database/FirebaseSurveys';
import { TrainingSession, Player, Objective, PostTrainingSurvey } from '../../types';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import ActiveTrainersWidget from '@/components/dashboard/ActiveTrainersWidget';
import TodayTrainingsWidget from '@/components/dashboard/TodayTrainingsWidget';
import WeeklySatisfactionWidget from '@/components/dashboard/WeeklySatisfactionWidget';
import PlanningResumeWidget from '@/components/dashboard/PlanningResumeWidget';
import PlayerStatusWidget from '@/components/dashboard/PlayerStatusWidget';
import { UpcomingCompetitionsWidget } from '@/components/dashboard/UpcomingCompetitionsWidget';

// Interfaces para los datos de los widgets
interface ActiveTrainer {
  id: string;
  name: string;
  email: string;
  sessionsToday: number;
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

// Hook personalizado para los datos del dashboard del director
const useDirectorDashboardData = () => {
  const { academiaActual } = useAcademia();
  const { currentUser } = useAuth();
  const { players: allPlayersFromContext } = usePlayer();
  
  // ✅ USAR SessionContext
  const { 
    getTodaySessions,
    getSessionsByDateRange,
    refreshSessions 
  } = useSession();
  
  const [activeTrainers, setActiveTrainers] = useState<ActiveTrainer[]>([]);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>({
    active: [],
    inactive: [],
    withoutPlan: []
  });
  const [todayTrainings, setTodayTrainings] = useState<number>(0);
  const [weeklySatisfaction, setWeeklySatisfaction] = useState<WeeklySatisfaction>({
    generalAverage: 0,
    playerAverages: [],
    totalSurveys: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ USAR DATOS DEL CONTEXTO
  const [todaySessions, setTodaySessions] = useState<TrainingSession[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (academiaActual && allPlayersFromContext.length > 0) {
      loadDashboardData();
    }
  }, [academiaActual, allPlayersFromContext]);

  const loadDashboardData = async () => {
    if (!academiaActual) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // ✅ USAR FUNCIONES DEL CONTEXTO
      const todaySessionsData = getTodaySessions();
      const users = await getAcademiaUsers(academiaActual.id);

      // Usar jugadores del contexto
      const players = allPlayersFromContext;

      // Filtrar solo jugadores activos
      const activePlayers = players.filter(p => p.estado === 'activo');
      
      // Guardar jugadores y sesiones para los widgets
      setAllPlayers(activePlayers);
      setTodaySessions(todaySessionsData);

      // Procesar datos para cada widget
      await Promise.all([
        processActiveTrainers(todaySessionsData, users),
        processPlayerStatus(activePlayers, todaySessionsData),
        processTodayTrainings(todaySessionsData),
        processWeeklySatisfaction(activePlayers)
      ]);

    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
      setError('Error cargando los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Widget 1: Entrenadores Activos - USANDO DATOS DEL CONTEXTO
  const processActiveTrainers = async (todaySessions: TrainingSession[], users: AcademiaUser[]) => {
    // Contar entrenamientos por entrenador
    const trainerSessionsCount: { [key: string]: number } = {};
    todaySessions.forEach(session => {
      if (session.entrenadorId) {
        trainerSessionsCount[session.entrenadorId] = (trainerSessionsCount[session.entrenadorId] || 0) + 1;
      }
    });

    // Crear lista de entrenadores activos con sus datos
    const trainers: ActiveTrainer[] = Object.entries(trainerSessionsCount).map(([trainerId, count]) => {
      const user = users.find(u => u.userId === trainerId);
      return {
        id: trainerId,
        name: user?.userName || user?.userEmail.split('@')[0] || 'Usuario desconocido',
        email: user?.userEmail || '',
        sessionsToday: count
      };
    });

    // Ordenar por número de sesiones (descendente)
    trainers.sort((a, b) => b.sessionsToday - a.sessionsToday);
    
    setActiveTrainers(trainers);
  };

  // Widget 2: Jugadores Activos - SIMPLIFICADO CON CONTEXTO
  const processPlayerStatus = async (players: Player[], todaySessions: TrainingSession[]) => {
    if (!academiaActual) return;

    // IDs de jugadores que entrenaron hoy
    const activePlayerIds = new Set(todaySessions.map(session => session.jugadorId));

    // Separar jugadores activos e inactivos
    const activePlayers = players.filter(player => activePlayerIds.has(player.id));
    const inactivePlayers = players.filter(player => !activePlayerIds.has(player.id));

    // Verificar planificación para cada jugador
    const playersWithoutPlan: Player[] = [];
    
    for (const player of players) {
      try {
        // Verificar si tiene objetivos
        const objectives = await getObjectives(academiaActual.id);
        const hasObjectives = objectives.some((obj: Objective) => obj.jugadorId === player.id);
        
        // Verificar si tiene plan de entrenamiento
        const trainingPlan = await getTrainingPlan(academiaActual.id, player.id);
        const hasTrainingPlan = trainingPlan !== null;

        // Si no tiene ni objetivos ni plan de entrenamiento
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

  // Widget 3: Entrenamientos Hoy - SIMPLIFICADO
  const processTodayTrainings = async (todaySessions: TrainingSession[]) => {
    setTodayTrainings(todaySessions.length);
  };

  // Widget 4: Satisfacción Semanal - USANDO CONTEXTO PARA SESIONES
  const processWeeklySatisfaction = async (players: Player[]) => {
    if (!academiaActual || players.length === 0) {
      setWeeklySatisfaction({
        generalAverage: 0,
        playerAverages: [],
        totalSurveys: 0
      });
      return;
    }

    // Definir rango de la última semana
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    try {
      // ✅ USAR FUNCIÓN DEL CONTEXTO
      const weekSessions = getSessionsByDateRange(startDate, endDate);
      
      // Obtener todas las encuestas de la última semana
      const playerIds = players.map(p => p.id);
      const surveys = await getBatchSurveys(academiaActual.id, playerIds, startDate, endDate);

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
        
        // Calcular promedio de todas las respuestas del jugador
        let totalSum = 0;
        let totalResponses = 0;

        playerSurveys.forEach(survey => {
          totalSum += survey.cansancioFisico + survey.concentracion + 
                     survey.actitudMental + survey.sensacionesTenisticas;
          totalResponses += 4; // 4 preguntas por encuesta
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

      // Ordenar por promedio descendente
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
    activeTrainers,
    playerStatus,
    todayTrainings,
    weeklySatisfaction,
    todaySessions,
    allPlayers,
    loading,
    error,
    refreshData: async () => {
      await refreshSessions(); // ✅ REFRESCAR SESIONES DEL CONTEXTO
      await loadDashboardData();
    }
  };
};

// Componente principal del Dashboard del Director
const DashboardDirectorView: React.FC = () => {
  const { academiaActual } = useAcademia();
  const {
    activeTrainers,
    playerStatus,
    todayTrainings,
    weeklySatisfaction,
    todaySessions,
    allPlayers,
    loading,
    error,
    refreshData
  } = useDirectorDashboardData();

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
          <p className="mt-4 text-gray-400">Cargando dashboard...</p>
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

  return (
    <div className="min-h-screen bg-black">
      {/* Efectos de fondo */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="fixed top-20 left-20 w-64 h-64 lg:w-96 lg:h-96 bg-green-500/5 rounded-full blur-3xl"></div>
      <div className="fixed bottom-20 right-20 w-64 h-64 lg:w-96 lg:h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Dashboard */}
        <DashboardHeader 
          academiaActual={academiaActual} 
          onRefresh={refreshData} 
        />

        {/* Grid principal - Primera fila */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <ActiveTrainersWidget 
            activeTrainers={activeTrainers} 
            players={allPlayers}
          />
          <PlayerStatusWidget playerStatus={playerStatus} />
          <TodayTrainingsWidget todayTrainings={todayTrainings} />
        </div>

        {/* Segunda fila */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <WeeklySatisfactionWidget weeklySatisfaction={weeklySatisfaction} />
          <PlanningResumeWidget playerStatus={playerStatus} />
          <UpcomingCompetitionsWidget academiaId={academiaActual.id} />
        </div>
      </div>
    </div>
  );
};

export default DashboardDirectorView;