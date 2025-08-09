// hooks/usePlayerTrainings.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { TrainingSession, PostTrainingSurvey, ChartDataPoint, IntensityDataPoint } from '../types/types';
import { getPlayerSurveys } from '../Database/FirebaseSurveys';
import { useSession } from '../contexts/SessionContext';
import { 
  getUserTimeZone, 
  getDefaultDateRange, 
  adjustDateWithTimezone,
  filterByDateRange,
  sortByDate 
} from '../utils/dateHelpers';
import { StatisticsService } from '../services/statisticsService';

// Configuración de métricas para gráficos individuales
export const METRIC_CONFIG = {
  energia: { 
    key: 'cansancioFisico',  // La key real en la base de datos
    label: 'Energía Física', 
    color: '#10b981'
  },
  concentracion: { 
    key: 'concentracion',
    label: 'Concentración', 
    color: '#3b82f6'
  },
  actitud: { 
    key: 'actitudMental',  // La key real en la base de datos
    label: 'Actitud Mental', 
    color: '#f59e0b'
  },
  sensaciones: { 
    key: 'sensacionesTenisticas',  // La key real en la base de datos
    label: 'Sensaciones Tenísticas', 
    color: '#8b5cf6'
  }
};

interface UsePlayerTrainingsProps {
  playerId: string | undefined;
  academiaId: string;
  activeTab: string;
  skipExecution?: boolean;
}

export const usePlayerTrainings = ({ 
  playerId, 
  academiaId, 
  activeTab,
  skipExecution = false
}: UsePlayerTrainingsProps) => {
  // Obtener sesiones del contexto
  const { getSessionsByPlayer } = useSession();
  
  // Estados de filtros
  const defaultDates = getDefaultDateRange();
  const [startDate, setStartDate] = useState<string>(defaultDates.start);
  const [endDate, setEndDate] = useState<string>(defaultDates.end);
  const [drillDownPath, setDrillDownPath] = useState<string[]>([]);
  const [areaChartTitle, setAreaChartTitle] = useState<string>("Distribución por Tipo");
  const [intensityChartTitle, setIntensityChartTitle] = useState<string>("Progresión de Intensidad");
  
  // Estados de encuestas - LAZY LOADING
  const [playerSurveys, setPlayerSurveys] = useState<PostTrainingSurvey[]>([]);
  const [surveysLoading, setSurveysLoading] = useState(false);
  const [surveysLoaded, setSurveysLoaded] = useState(false);
  
  // Estados del calendario
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isTrainingsModalOpen, setIsTrainingsModalOpen] = useState(false);

  // Obtener timezone del usuario
  const userTimeZone = useMemo(() => getUserTimeZone(), []);

  // Obtener sesiones del jugador
  const sessions = useMemo(() => {
    if (!playerId || skipExecution) return [];
    return getSessionsByPlayer(playerId);
  }, [playerId, getSessionsByPlayer, skipExecution]);

  // Cargar encuestas del jugador
  const loadPlayerSurveys = useCallback(async () => {
    if (!playerId || surveysLoaded || skipExecution) return;
    
    setSurveysLoading(true);
    try {
      const startDateObj = startDate ? adjustDateWithTimezone(startDate) : undefined;
      const endDateObj = endDate ? adjustDateWithTimezone(endDate, true) : undefined;

      const surveys = await getPlayerSurveys(academiaId, playerId, startDateObj, endDateObj);
      setPlayerSurveys(surveys);
      setSurveysLoaded(true);
    } catch (error) {
      console.error('Error cargando encuestas:', error);
    } finally {
      setSurveysLoading(false);
    }
  }, [playerId, academiaId, startDate, endDate, surveysLoaded, skipExecution]);

  // Cargar encuestas cuando sea necesario
  useEffect(() => {
    if (!skipExecution && activeTab === 'trainings' && playerId) {
      const timeoutId = setTimeout(() => {
        loadPlayerSurveys();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [skipExecution, activeTab, playerId, loadPlayerSurveys]);

  // Filtrar sesiones por fecha
  const dateFilteredSessions = useMemo(() => {
    if (!startDate || !endDate || !playerId || skipExecution) return [];
    
    const filtered = filterByDateRange(
      sessions,
      startDate,
      endDate,
      s => s.fecha
    );
    
    return sortByDate(filtered, s => s.fecha, false);
  }, [sessions, startDate, endDate, playerId, skipExecution]);

  // Entrenamientos para fecha seleccionada
  const trainingsForSelectedDate = useMemo(() => {
    if (!selectedDate || !playerId || skipExecution) return [];
    return sessions.filter(s => 
      new Date(s.fecha).toDateString() === selectedDate.toDateString()
    );
  }, [selectedDate, sessions, playerId, skipExecution]);

  // Calcular datos de drill down usando el servicio
  const drillDownData = useMemo((): ChartDataPoint[] => {
    if (skipExecution) return [];
    
    const result = StatisticsService.calculateDrillDownData(
      dateFilteredSessions,
      drillDownPath
    );
    
    setAreaChartTitle(result.title);
    return result.data;
  }, [dateFilteredSessions, drillDownPath, skipExecution]);

  // Calcular datos de intensidad usando el servicio
  const intensityChartData = useMemo((): IntensityDataPoint[] => {
    if (skipExecution) return [];
    
    const result = StatisticsService.calculateIntensityData(
      dateFilteredSessions,
      drillDownPath,
      userTimeZone
    );
    
    setIntensityChartTitle(result.title);
    return result.data;
  }, [dateFilteredSessions, drillDownPath, skipExecution, userTimeZone]);

  // Calcular datos de radar usando el servicio
  const radarData = useMemo(() => {
    if (!playerSurveys || playerSurveys.length === 0 || skipExecution) return [];
    return StatisticsService.calculateRadarData(playerSurveys);
  }, [playerSurveys, skipExecution]);

  // Preparar datos de gráficos individuales usando el servicio
  const prepareIndividualChartData = useCallback((metricKey: string) => {
    if (!playerSurveys || playerSurveys.length === 0 || skipExecution) return [];
    
    return StatisticsService.prepareIndividualMetricData(
      playerSurveys,
      metricKey as keyof PostTrainingSurvey,
      userTimeZone
    );
  }, [playerSurveys, userTimeZone, skipExecution]);

  // Handler para click en slice del gráfico
  const handlePieSliceClick = useCallback((dataPoint: ChartDataPoint) => {
    if (skipExecution) return;
    if (!dataPoint.name || (drillDownPath.length > 1 && dataPoint.type === 'Exercise')) return;
    
    // Solo permitir drill down si es un tipo o área válida
    if (drillDownPath.length === 0) {
      // Verificar si es un tipo válido
      if (dataPoint.type === 'TrainingType') {
        setDrillDownPath([dataPoint.name]);
      }
    } else if (drillDownPath.length === 1) {
      // Verificar si es un área válida
      if (dataPoint.type === 'TrainingArea') {
        setDrillDownPath(prev => [...prev, dataPoint.name]);
      }
    }
  }, [drillDownPath, skipExecution]);

  // Handler para navegación breadcrumb
  const handleBreadcrumbClick = useCallback((index: number) => {
    if (skipExecution) return;
    setDrillDownPath(drillDownPath.slice(0, index));
  }, [drillDownPath, skipExecution]);

  // Reset de filtros de fecha
  const resetDateFilters = useCallback(() => {
    if (skipExecution) return;
    const defaultDates = getDefaultDateRange();
    setStartDate(defaultDates.start);
    setEndDate(defaultDates.end);
    // Reset surveys when dates change
    setSurveysLoaded(false);
  }, [skipExecution]);

  // Handler para click en fecha del calendario
  const handleDateClick = useCallback((date: Date) => {
    if (skipExecution) return;
    const trainingsOnDay = sessions.some(s => 
      new Date(s.fecha).toDateString() === date.toDateString()
    );
    if (trainingsOnDay) {
      setSelectedDate(date);
      setIsTrainingsModalOpen(true);
    }
  }, [sessions, skipExecution]);

  return {
    // Estados de filtros
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    resetDateFilters,
    
    // Estados de charts
    drillDownPath,
    drillDownData,
    areaChartTitle,
    intensityChartData,
    intensityChartTitle,
    
    // Estados de encuestas
    playerSurveys,
    surveysLoading,
    radarData,
    
    // Estados del calendario
    selectedDate,
    isTrainingsModalOpen,
    setIsTrainingsModalOpen,
    trainingsForSelectedDate,
    
    // Datos filtrados
    dateFilteredSessions,
    
    // Handlers
    handlePieSliceClick,
    handleBreadcrumbClick,
    handleDateClick,
    
    // Utils
    prepareIndividualChartData,
    METRIC_CONFIG,
    
    // Función para cargar encuestas manualmente
    loadPlayerSurveys,
  };
};