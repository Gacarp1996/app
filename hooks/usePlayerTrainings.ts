// hooks/usePlayerTrainings.ts
import { useState, useEffect, useMemo } from 'react';
import { TrainingSession, PostTrainingSurvey, ChartDataPoint, IntensityDataPoint, TrainingType, TrainingArea } from '../types';
import { getPlayerSurveys } from '../Database/FirebaseSurveys';
import { EXERCISE_HIERARCHY } from '../constants';
import { parseTimeToMinutes, getDefaultDateRange, METRIC_CONFIG } from '../components/player-profile/utils';

interface UsePlayerTrainingsProps {
  playerId: string | undefined;
  academiaId: string;
  sessions: TrainingSession[];
  activeTab: string;
}

export const usePlayerTrainings = ({ 
  playerId, 
  academiaId, 
  sessions, 
  activeTab 
}: UsePlayerTrainingsProps) => {
  // Estados de filtros
  const defaultDates = getDefaultDateRange();
  const [startDate, setStartDate] = useState<string>(defaultDates.start);
  const [endDate, setEndDate] = useState<string>(defaultDates.end);
  const [drillDownPath, setDrillDownPath] = useState<string[]>([]);
  const [areaChartTitle, setAreaChartTitle] = useState<string>("Distribución por Tipo");
  const [intensityChartTitle, setIntensityChartTitle] = useState<string>("Progresión de Intensidad");
  
  // Estados de encuestas
  const [playerSurveys, setPlayerSurveys] = useState<PostTrainingSurvey[]>([]);
  const [surveysLoading, setSurveysLoading] = useState(false);
  
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

  useEffect(() => {
    if (activeTab === 'trainings' && playerId) {
      loadPlayerSurveys();
    }
  }, [activeTab, playerId, startDate, endDate]);

  const loadPlayerSurveys = async () => {
    if (!playerId) return;
    
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
    } catch (error) {
      console.error('Error cargando encuestas:', error);
    } finally {
      setSurveysLoading(false);
    }
  };

  const dateFilteredSessions = useMemo(() => {
    if (!startDate || !endDate) return [];
    
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
  }, [sessions, playerId, startDate, endDate]);

  const trainingsForSelectedDate = useMemo(() => {
    if (!selectedDate || !playerId) return [];
    return sessions.filter(s => 
      s.jugadorId === playerId &&
      new Date(s.fecha).toDateString() === selectedDate.toDateString()
    );
  }, [selectedDate, sessions, playerId]);

  const drillDownData = useMemo((): ChartDataPoint[] => {
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
  }, [dateFilteredSessions, drillDownPath]);

  const intensityChartData = useMemo((): IntensityDataPoint[] => {
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
  }, [dateFilteredSessions, drillDownPath]);

  const radarData = useMemo(() => {
    if (!playerSurveys || playerSurveys.length === 0) return [];

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
  }, [playerSurveys]);

  const prepareIndividualChartData = (metricKey: string) => {
    if (!playerSurveys || playerSurveys.length === 0) return [];

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
  };

  const handlePieSliceClick = (dataPoint: ChartDataPoint) => {
    if (!dataPoint.name || (drillDownPath.length > 1 && dataPoint.type === 'Exercise')) return;
    if (drillDownPath.length < 2) {
      const currentType = drillDownPath[0] as TrainingType;
      if (drillDownPath.length === 0 || EXERCISE_HIERARCHY[currentType]?.[dataPoint.name as TrainingArea]) {
        setDrillDownPath(prev => [...prev, dataPoint.name]);
      }
    }
  };

  const handleBreadcrumbClick = (index: number) => setDrillDownPath(drillDownPath.slice(0, index));

  const resetDateFilters = () => {
    const defaultDates = getDefaultDateRange();
    setStartDate(defaultDates.start);
    setEndDate(defaultDates.end);
  };

  const handleDateClick = (date: Date) => {
    const trainingsOnDay = sessions.some(s => 
      s.jugadorId === playerId && 
      new Date(s.fecha).toDateString() === date.toDateString()
    );
    if (trainingsOnDay) {
      setSelectedDate(date);
      setIsTrainingsModalOpen(true);
    }
  };

  // Función para crear el CustomTooltip (será usado como componente en el padre)
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return {
        active,
        payload,
        label
      };
    }
    return null;
  };

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
    CustomTooltip,
    METRIC_CONFIG,
  };
};