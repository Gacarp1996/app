import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { getTrainedPlayersByCoach } from '../Database/FirebaseSessions';
import { getPlayers } from '../Database/FirebasePlayers';
import { getUserRoleInAcademia } from '../Database/FirebaseRoles';
import { Player } from '../types';

interface TrainedPlayerData {
  playerId: string;
  sessionCount: number;
  lastSessionDate: string;
  totalExercises: number;
}

interface CoachDashboardData {
  trainedPlayers: TrainedPlayerData[];
  allPlayers: Player[];
  loading: boolean;
  error: string | null;
  dateRange: {
    start: Date;
    end: Date;
  };
  isCoach: boolean;
}

export const useCoachDashboardData = (customDateRange?: { start: Date; end: Date }) => {
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia();
  
  // Estado por defecto: últimos 30 días
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);
  
  const dateRange = customDateRange || {
    start: defaultStartDate,
    end: defaultEndDate
  };
  
  const [data, setData] = useState<CoachDashboardData>({
    trainedPlayers: [],
    allPlayers: [],
    loading: true,
    error: null,
    dateRange,
    isCoach: false
  });

  useEffect(() => {
    if (currentUser && academiaActual) {
      loadCoachData();
    }
  }, [currentUser, academiaActual, dateRange.start, dateRange.end]);

  const loadCoachData = async () => {
    if (!currentUser || !academiaActual) return;
    
    setData(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Verificar si el usuario es un coach
      const userRole = await getUserRoleInAcademia(academiaActual.id, currentUser.uid);
      const isCoach = userRole === 'academyCoach' || userRole === 'groupCoach' || userRole === 'assistantCoach';
      
      if (!isCoach) {
        setData(prev => ({
          ...prev,
          loading: false,
          isCoach: false,
          error: 'Usuario no es entrenador'
        }));
        return;
      }

      // Cargar datos en paralelo
      const [trainedPlayersData, allPlayers] = await Promise.all([
        getTrainedPlayersByCoach(
          academiaActual.id,
          currentUser.uid,
          dateRange.start,
          dateRange.end
        ),
        getPlayers(academiaActual.id)
      ]);

      setData({
        trainedPlayers: trainedPlayersData,
        allPlayers,
        loading: false,
        error: null,
        dateRange,
        isCoach: true
      });

    } catch (error) {
      console.error('Error cargando datos del coach:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Error cargando los datos'
      }));
    }
  };

  const refreshData = () => {
    loadCoachData();
  };

  const updateDateRange = (newDateRange: { start: Date; end: Date }) => {
    setData(prev => ({ ...prev, dateRange: newDateRange }));
  };

  return {
    ...data,
    refreshData,
    updateDateRange
  };
};