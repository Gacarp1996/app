// hooks/usePlayerTrainings.ts - Optimizado con skipExecution
import { useState, useEffect, useMemo, useCallback } from 'react';
import { TrainingSession, PostTrainingSurvey, ChartDataPoint, IntensityDataPoint } from '../types';
import { TipoType, AreaType } from '../constants/training';
import { getPlayerSurveys } from '../Database/FirebaseSurveys';
import { parseTimeToMinutes, getDefaultDateRange, METRIC_CONFIG } from '../components/player-profile/utils';

interface UsePlayerTrainingsProps {
  playerId: string | undefined;
  academiaId: string;
  sessions: TrainingSession[];
  activeTab: string;
  skipExecution?: boolean;
}

export const usePlayerTrainings = ({ 
  playerId, 
  academiaId, 
  sessions, 
  activeTab,
  skipExecution = false
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
    if (!playerId || surveysLoaded || skipExecution) return;
    
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
  }, [playerId, academiaId, startDate, endDate, surveysLoaded, skipExecution]);

  // OPTIMIZACIÓN: Solo ejecutar effects cuando NO se debe saltar la ejecución
  useEffect(() => {
    if (!skipExecution && activeTab === 'trainings' && playerId) {
      // Cargar encuestas con debounce
      const timeoutId = setTimeout(() => {
        loadPlayerSurveys();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [skipExecution, activeTab, playerId, loadPlayerSurveys]);

  // OPTIMIZACIÓN: Memoización pesada de sesiones filtradas
  const dateFilteredSessions = useMemo(() => {
    if (!startDate || !endDate || !playerId || skipExecution) return [];
    
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
  }, [sessions, playerId, startDate, endDate, skipExecution]);

  // OPTIMIZACIÓN: Memoización de entrenamientos para fecha seleccionada
  const trainingsForSelectedDate = useMemo(() => {
    if (!selectedDate || !playerId || skipExecution) return [];
    return sessions.filter(s => 
      s.jugadorId === playerId &&
      new Date(s.fecha).toDateString() === selectedDate.toDateString()
    );
  }, [selectedDate, sessions, playerId, skipExecution]);

  // OPTIMIZACIÓN: Cálculos de drill down con memoización
  const drillDownData = useMemo((): ChartDataPoint[] => {
    if (skipExecution) return [];
    
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
      const type = drillDownPath[0] as TipoType; 
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
  }, [dateFilteredSessions, drillDownPath, skipExecution]);

  // OPTIMIZACIÓN: Datos de intensidad con memoización
  const intensityChartData = useMemo((): IntensityDataPoint[] => {
    if (skipExecution) return [];
    
    let title = "Progresión de Intensidad (General)";
    
    // Primero calculamos la intensidad promedio de cada sesión
    const sessionsWithAvg = dateFilteredSessions.map(session => {
        let relevantExercises = session.ejercicios;
        if(drillDownPath.length === 1) { 
          const type = drillDownPath[0] as TipoType; 
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
    }).filter(s => s.avgIntensity > 0);

    // Agrupar sesiones por día
    const sessionsByDay = sessionsWithAvg.reduce((acc, session) => {
      const dateKey = new Date(session.fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: userTimeZone
      });
      
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(session);
      return acc;
    }, {} as Record<string, typeof sessionsWithAvg>);

    // Calcular promedios de intensidad por día
    const dailyIntensityAverages = Object.entries(sessionsByDay).map(([dateKey, sessions]) => {
      const totalIntensity = sessions.reduce((sum, session) => sum + session.avgIntensity, 0);
      const avgDailyIntensity = totalIntensity / sessions.length;
      
      // Usar la fecha de la primera sesión del día para el formato de visualización
      const displayDate = new Date(sessions[0].fecha).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short',
        timeZone: userTimeZone
      });
      
      return {
        fecha: displayDate,
        intensidad: parseFloat(avgDailyIntensity.toFixed(1)),
        sessionsCount: sessions.length
      };
    });

    // Ordenar por fecha cronológicamente
    const sortedData = dailyIntensityAverages.sort((a, b) => {
      // Encontrar las fechas originales para ordenar correctamente
      const dateA = new Date(Object.entries(sessionsByDay).find(([_, sessions]) => 
        new Date(sessions[0].fecha).toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: 'short',
          timeZone: userTimeZone
        }) === a.fecha
      )![1][0].fecha);
      
      const dateB = new Date(Object.entries(sessionsByDay).find(([_, sessions]) => 
        new Date(sessions[0].fecha).toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: 'short',
          timeZone: userTimeZone
        }) === b.fecha
      )![1][0].fecha);
      
      return dateA.getTime() - dateB.getTime();
    });

    setIntensityChartTitle(title);
    return sortedData;
  }, [dateFilteredSessions, drillDownPath, skipExecution, userTimeZone]);

  // OPTIMIZACIÓN: Datos de radar con memoización
  const radarData = useMemo(() => {
    if (!playerSurveys || playerSurveys.length === 0 || skipExecution) return [];

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
  }, [playerSurveys, skipExecution]);

  // OPTIMIZACIÓN: Función memoizada para datos de gráficos individuales
  const prepareIndividualChartData = useCallback((metricKey: string) => {
    if (!playerSurveys || playerSurveys.length === 0 || skipExecution) return [];

    // Agrupar encuestas por día
    const surveysByDay = playerSurveys.reduce((acc, survey) => {
      // Crear una clave única por día
      const dateKey = new Date(survey.fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: userTimeZone
      });
      
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(survey);
      return acc;
    }, {} as Record<string, PostTrainingSurvey[]>);

    // Calcular promedios por día
    const dailyAverages = Object.entries(surveysByDay).map(([dateKey, surveys]) => {
      const sum = surveys.reduce((total, survey) => 
        total + (survey[metricKey as keyof PostTrainingSurvey] as number), 0
      );
      const average = sum / surveys.length;
      
      // Tomar la fecha de la primera encuesta del día para el formato de visualización
      const displayDate = new Date(surveys[0].fecha).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short',
        timeZone: userTimeZone
      });
      
      return {
        fecha: displayDate,
        value: parseFloat(average.toFixed(1)),
        surveysCount: surveys.length
      };
    });

    // Ordenar por fecha (cronológicamente)
    return dailyAverages.sort((a, b) => {
      // Necesitamos parsear las fechas para ordenarlas correctamente
      const dateA = new Date(surveysByDay[Object.keys(surveysByDay).find(key => 
        new Date(surveysByDay[key][0].fecha).toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: 'short',
          timeZone: userTimeZone
        }) === a.fecha
      )!][0].fecha);
      
      const dateB = new Date(surveysByDay[Object.keys(surveysByDay).find(key => 
        new Date(surveysByDay[key][0].fecha).toLocaleDateString('es-ES', { 
          day: '2-digit', 
          month: 'short',
          timeZone: userTimeZone
        }) === b.fecha
      )!][0].fecha);
      
      return dateA.getTime() - dateB.getTime();
    });
  }, [playerSurveys, userTimeZone, skipExecution]);

  // Handlers optimizados (solo activos cuando NO se salta la ejecución)
  const handlePieSliceClick = useCallback((dataPoint: ChartDataPoint) => {
    if (skipExecution) return;
    if (!dataPoint.name || (drillDownPath.length > 1 && dataPoint.type === 'Exercise')) return;
    
    // Solo permitir drill down si es un tipo o área válida
    if (drillDownPath.length === 0) {
      // Verificar si es un tipo válido
      if (Object.values(TipoType).includes(dataPoint.name as TipoType)) {
        setDrillDownPath([dataPoint.name]);
      }
    } else if (drillDownPath.length === 1) {
      // Verificar si es un área válida
      if (Object.values(AreaType).includes(dataPoint.name as AreaType)) {
        setDrillDownPath(prev => [...prev, dataPoint.name]);
      }
    }
  }, [drillDownPath, skipExecution]);

  const handleBreadcrumbClick = useCallback((index: number) => {
    if (skipExecution) return;
    setDrillDownPath(drillDownPath.slice(0, index));
  }, [drillDownPath, skipExecution]);

  const resetDateFilters = useCallback(() => {
    if (skipExecution) return;
    const defaultDates = getDefaultDateRange();
    setStartDate(defaultDates.start);
    setEndDate(defaultDates.end);
    // Reset surveys when dates change
    setSurveysLoaded(false);
  }, [skipExecution]);

  const handleDateClick = useCallback((date: Date) => {
    if (skipExecution) return;
    const trainingsOnDay = sessions.some(s => 
      s.jugadorId === playerId && 
      new Date(s.fecha).toDateString() === date.toDateString()
    );
    if (trainingsOnDay) {
      setSelectedDate(date);
      setIsTrainingsModalOpen(true);
    }
  }, [sessions, playerId, skipExecution]);

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