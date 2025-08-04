import { useState, useEffect } from 'react';
import { useAcademia } from '../contexts/AcademiaContext';
import { usePlayer } from '../contexts/PlayerContext'; // ✅ NUEVO IMPORT
import { getSessions } from '../Database/FirebaseSessions';
import { getAcademiaUsers, AcademiaUser } from '../Database/FirebaseRoles';
import { getObjectives } from '../Database/FirebaseObjectives';
import { getTrainingPlan } from '../Database/FirebaseTrainingPlans';
import { getBatchSurveys } from '../Database/FirebaseSurveys';
import { TrainingSession, Player, PostTrainingSurvey } from '../types';

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

export const useDashboardData = () => {
  const { academiaActual } = useAcademia();
  const { players: allPlayers, loadingPlayers } = usePlayer(); // ✅ USAR PLAYERS DEL CONTEXTO
  
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

  useEffect(() => {
    // ✅ ESPERAR A QUE SE CARGUEN LOS PLAYERS
    if (academiaActual && !loadingPlayers) {
      loadDashboardData();
    }
  }, [academiaActual, allPlayers, loadingPlayers]); // ✅ AGREGAR allPlayers y loadingPlayers como dependencias

  const loadDashboardData = async () => {
    if (!academiaActual) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // ✅ CARGAR SOLO SESIONES Y USUARIOS (NO PLAYERS)
      const [sessions, users] = await Promise.all([
        getSessions(academiaActual.id),
        getAcademiaUsers(academiaActual.id)
      ]);

      // ✅ USAR allPlayers DEL CONTEXTO
      // Filtrar solo jugadores activos
      const activePlayers = allPlayers.filter(p => p.estado === 'activo');

      // Procesar datos para cada widget
      await Promise.all([
        processActiveTrainers(sessions, users),
        processPlayerStatus(activePlayers),
        processTodayTrainings(sessions),
        processWeeklySatisfaction(activePlayers)
      ]);

    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
      setError('Error cargando los datos del dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Widget 1: Entrenadores Activos
  const processActiveTrainers = async (sessions: TrainingSession[], users: AcademiaUser[]) => {
    const today = new Date().toISOString().split('T')[0];
    
    // Filtrar entrenamientos de hoy
    const todaySessions = sessions.filter(session => 
      session.fecha.startsWith(today)
    );

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

  // Widget 2: Jugadores Activos
  // ✅ YA RECIBE players COMO PARÁMETRO, NO NECESITA CAMBIOS
  const processPlayerStatus = async (players: Player[]) => {
    if (!academiaActual) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Obtener entrenamientos de hoy
    const sessions = await getSessions(academiaActual.id);
    const todaySessions = sessions.filter(session => 
      session.fecha.startsWith(today)
    );

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
        const hasObjectives = objectives.some(obj => obj.jugadorId === player.id);
        
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

  // Widget 3: Entrenamientos Hoy
  const processTodayTrainings = async (sessions: TrainingSession[]) => {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = sessions.filter(session => 
      session.fecha.startsWith(today)
    ).length;
    
    setTodayTrainings(todayCount);
  };

  // Widget 4: Satisfacción Semanal
  // ✅ YA RECIBE players COMO PARÁMETRO, NO NECESITA CAMBIOS
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
      surveys.forEach(survey => {
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
    loading: loading || loadingPlayers, // ✅ INCLUIR loadingPlayers
    error,
    refreshData: loadDashboardData
  };
};