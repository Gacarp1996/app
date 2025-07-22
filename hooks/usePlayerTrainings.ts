// hooks/usePlayerTrainings.ts - Optimizado con skipExecution
import { useState, useEffect, useMemo, useCallback } from 'react';
import { TrainingSession, PostTrainingSurvey, ChartDataPoint, IntensityDataPoint, TrainingType, TrainingArea } from '../types';
import { getPlayerSurveys } from '../Database/FirebaseSurveys';
import { EXERCISE_HIERARCHY } from '../constants';
import { parseTimeToMinutes, getDefaultDateRange, METRIC_CONFIG } from '../components/player-profile/utils';

interface UsePlayerTrainingsProps {
  playerId: string | undefined;
  academiaId: string;
  sessions: TrainingSession[];
  activeTab: string;
  skipExecution?: boolean; // NUEVO PARÁMETRO
}

export const usePlayerTrainings = ({ 
  playerId, 
  academiaId, 
  sessions, 
  activeTab,
  skipExecution = false // NUEVO PARÁMETRO CON DEFAULT
}: UsePlayerTrainingsProps) => {
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

  const userTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('No se pudo detectar la zona horaria, usando default');
      return 'America/Argentina/Buenos_Aires';
    }
  }, []);

  // OPTIMIZACIÓN: Solo cargar encuestas cuando realmente se necesiten
  const loadPlayerSurveys = useCallback(async () => {
    if (!playerId || surveysLoaded || skipExecution) return; // AGREGAR skipExecution
    
    setSurveysLoading(true);
    try {
      const userTimezoneOffset = new Date().getTimezoneOffset() * 60000;
      const startDateObj = startDate ? new Date(new Date(startDate).getTime() + userTimezoneOffset) : undefined;
      
      let endDateObj;
      if (endDate) {
          endDateObj = new Date(new Date(endDate).getTime() + userTimezoneOffset);
          endDateObj.setHours(23, 59, 59, 999);
      } else {
          endDateObj = undefined;
      }

      const surveys = await getPlayerSurveys(academiaId, playerId, startDateObj, endDateObj);
      setPlayerSurveys(surveys);
      setSurveysLoaded(true);
    } catch (error) {
      console.error('Error cargando encuestas:', error);
    } finally {
      setSurveysLoading(false);
    }
  }, [playerId, academiaId, startDate, endDate, surveysLoaded, skipExecution]); // AGREGAR skipExecution

  // OPTIMIZACIÓN: Solo ejecutar effects cuando NO se debe saltar la ejecución
  useEffect(() => {
    if (!skipExecution && activeTab === 'trainings' && playerId) { // AGREGAR !skipExecution
      // Cargar encuestas con debounce
      const timeoutId = setTimeout(() => {
        loadPlayerSurveys();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [skipExecution, activeTab, playerId, loadPlayerSurveys]); // AGREGAR skipExecution

  // OPTIMIZACIÓN: Memoización pesada de sesiones filtradas
  const dateFilteredSessions = useMemo(() => {
    if (!startDate || !endDate || !playerId || skipExecution) return []; // AGREGAR skipExecution
    
    const userTimezoneOffset = new Date().getTimezoneOffset() * 60000;
    const start = new Date(new Date(startDate).getTime() + userTimezoneOffset);
    const end = new Date(new Date(endDate).getTime() + userTimezoneOffset);
    end.setHours(23, 59, 59, 999);

    return sessions
      .filter(s => {
        const sessionDate = new Date(s.fecha);
        return s.jugadorId === playerId && sessionDate >= start && sessionDate <= end;
      })
      .sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [sessions, playerId, startDate, endDate, skipExecution]); // AGREGAR skipExecution

  // OPTIMIZACIÓN: Memoización de entrenamientos para fecha seleccionada
  const trainingsForSelectedDate = useMemo(() => {
    if (!selectedDate || !playerId || skipExecution) return []; // AGREGAR skipExecution
    return sessions.filter(s => 
      s.jugadorId === playerId &&
      new Date(s.fecha).toDateString() === selectedDate.toDateString()
    );
  }, [selectedDate, sessions, playerId, skipExecution]); // AGREGAR skipExecution

  // OPTIMIZACIÓN: Cálculos de drill down con memoización
  const drillDownData = useMemo((): ChartDataPoint[] => {
    if (skipExecution) return []; // AGREGAR skipExecution
    
    const timeSums: Record<string, number> = {};
    
    if (drillDownPath.length === 0) { 
      setAreaChartTitle("Distribución por Tipo (minutos)"); 
      dateFilteredSessions.forEach(s => s.ejercicios.forEach(ex => { 
        const minutes = parseTimeToMinutes(ex.tiempoCantidad);
        timeSums[ex.tipo] = (timeSums[ex.tipo] || 0) + minutes; 
      })); 
      return Object.entries(timeSums).map(([name, value]) => ({ name, value, type: 'TrainingType' })); 
    }
    else if (drillDownPath.length === 1) { 
      const type = drillDownPath[0] as TrainingType; 
      setAreaChartTitle(`${type}: Por Área (minutos)`); 
      dateFilteredSessions.forEach(s => s.ejercicios.forEach(ex => { 
        if(ex.tipo === type) {
          const minutes = parseTimeToMinutes(ex.tiempoCantidad);
          timeSums[ex.area] = (timeSums[ex.area] || 0) + minutes; 
        }
      })); 
      return Object.entries(timeSums).map(([name, value]) => ({ name, value, type: 'TrainingArea' })); 
    }
    else { 
      const [type, area] = drillDownPath; 
      setAreaChartTitle(`${type} - ${area}: Por Ejercicio (minutos)`); 
      dateFilteredSessions.forEach(s => s.ejercicios.forEach(ex => { 
        if(ex.tipo === type && ex.area === area) {
          const minutes = parseTimeToMinutes(ex.tiempoCantidad);
          timeSums[ex.ejercicio] = (timeSums[ex.ejercicio] || 0) + minutes; 
        }
      })); 
      return Object.entries(timeSums).map(([name, value]) => ({ name, value, type: 'Exercise' })); 
    }
  }, [dateFilteredSessions, drillDownPath, skipExecution]); // AGREGAR skipExecution

  // OPTIMIZACIÓN: Datos de intensidad con memoización
  const intensityChartData = useMemo((): IntensityDataPoint[] => {
    if (skipExecution) return []; // AGREGAR skipExecution
    
    let title = "Progresión de Intensidad (General)";
    const data = dateFilteredSessions.map(session => {
        let relevantExercises = session.ejercicios;
        if(drillDownPath.length === 1) { 
          const type = drillDownPath[0] as TrainingType; 
          relevantExercises = session.ejercicios.filter(ex => ex.tipo === type); 
          title = `Intensidad (${type})`;
        }
        else if (drillDownPath.length === 2) { 
          const [type, area] = drillDownPath; 
          relevantExercises = session.ejercicios.filter(ex => ex.tipo === type && ex.area === area); 
          title = `Intensidad (${type} - ${area})`;
        }
        const avg = relevantExercises.length > 0 
          ? relevantExercises.reduce((sum, ex) => sum + ex.intensidad, 0) / relevantExercises.length 
          : 0;
        return { ...session, avgIntensity: avg };
    }).filter(s => s.avgIntensity > 0)
      .map(s => ({ 
        fecha: new Date(s.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }), 
        intensidad: parseFloat(s.avgIntensity.toFixed(1)) 
      }));
    setIntensityChartTitle(title);
    return data.reverse();
  }, [dateFilteredSessions, drillDownPath, skipExecution]); // AGREGAR skipExecution

  // OPTIMIZACIÓN: Datos de radar con memoización
  const radarData = useMemo(() => {
    if (!playerSurveys || playerSurveys.length === 0 || skipExecution) return []; // AGREGAR skipExecution

    const totals = playerSurveys.reduce((acc, survey) => ({
      cansancioFisico: acc.cansancioFisico + survey.cansancioFisico,
      concentracion: acc.concentracion + survey.concentracion,
      actitudMental: acc.actitudMental + survey.actitudMental,
      sensacionesTenisticas: acc.sensacionesTenisticas + survey.sensacionesTenisticas
    }), {
      cansancioFisico: 0,
      concentracion: 0,
      actitudMental: 0,
      sensacionesTenisticas: 0
    });

    const count = playerSurveys.length;
    
    return [
      { metric: 'Energía', value: parseFloat((totals.cansancioFisico / count).toFixed(1)), fullMark: 5 },
      { metric: 'Concentración', value: parseFloat((totals.concentracion / count).toFixed(1)), fullMark: 5 },
      { metric: 'Actitud', value: parseFloat((totals.actitudMental / count).toFixed(1)), fullMark: 5 },
      { metric: 'Sensaciones', value: parseFloat((totals.sensacionesTenisticas / count).toFixed(1)), fullMark: 5 }
    ];
  }, [playerSurveys, skipExecution]); // AGREGAR skipExecution

  // OPTIMIZACIÓN: Función memoizada para datos de gráficos individuales
  const prepareIndividualChartData = useCallback((metricKey: string) => {
    if (!playerSurveys || playerSurveys.length === 0 || skipExecution) return []; // AGREGAR skipExecution

    const sortedSurveys = [...playerSurveys].sort((a, b) =>
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );

    return sortedSurveys.map(survey => ({
      fecha: new Date(survey.fecha).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short',
        timeZone: userTimeZone
      }),
      value: survey[metricKey as keyof PostTrainingSurvey] as number
    }));
  }, [playerSurveys, userTimeZone, skipExecution]); // AGREGAR skipExecution

  // Handlers optimizados (solo activos cuando NO se salta la ejecución)
  const handlePieSliceClick = useCallback((dataPoint: ChartDataPoint) => {
    if (skipExecution) return; // AGREGAR skipExecution
    if (!dataPoint.name || (drillDownPath.length > 1 && dataPoint.type === 'Exercise')) return;
    if (drillDownPath.length < 2) {
      const currentType = drillDownPath[0] as TrainingType;
      if (drillDownPath.length === 0 || EXERCISE_HIERARCHY[currentType]?.[dataPoint.name as TrainingArea]) {
        setDrillDownPath(prev => [...prev, dataPoint.name]);
      }
    }
  }, [drillDownPath, skipExecution]); // AGREGAR skipExecution

  const handleBreadcrumbClick = useCallback((index: number) => {
    if (skipExecution) return; // AGREGAR skipExecution
    setDrillDownPath(drillDownPath.slice(0, index));
  }, [drillDownPath, skipExecution]); // AGREGAR skipExecution

  const resetDateFilters = useCallback(() => {
    if (skipExecution) return; // AGREGAR skipExecution
    const defaultDates = getDefaultDateRange();
    setStartDate(defaultDates.start);
    setEndDate(defaultDates.end);
    // Reset surveys when dates change
    setSurveysLoaded(false);
  }, [skipExecution]); // AGREGAR skipExecution

  const handleDateClick = useCallback((date: Date) => {
    if (skipExecution) return; // AGREGAR skipExecution
    const trainingsOnDay = sessions.some(s => 
      s.jugadorId === playerId && 
      new Date(s.fecha).toDateString() === date.toDateString()
    );
    if (trainingsOnDay) {
      setSelectedDate(date);
      setIsTrainingsModalOpen(true);
    }
  }, [sessions, playerId, skipExecution]); // AGREGAR skipExecution

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
    
    // Estados de encuestas (con lazy loading)
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
    
    // Handlers optimizados
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