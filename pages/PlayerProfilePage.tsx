// pages/PlayerProfilePage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Player, Objective, TrainingSession, Tournament, ObjectiveEstado, TrainingType, TrainingArea, ChartDataPoint, IntensityDataPoint, PostTrainingSurvey, DisputedTournament } from '../types';
import { OBJECTIVE_ESTADOS, MAX_ACTIVE_OBJECTIVES, EXERCISE_HIERARCHY, NEW_EXERCISE_HIERARCHY_CONST } from '../constants';
import AreaPieChart from '../components/AreaPieChart';
import IntensityLineChart from '../components/IntensityLineChart';
import TournamentFormModal from '../components/TournamentFormModal';
import Modal from '../components/Modal';
import TrainingCalendar from '../components/TrainingCalendar';
import TrainingsOnDateModal from '../components/TrainingOnDateModal';
import { addTournament, updateTournament, deleteTournament } from '../Database/FirebaseTournaments';
import { updatePlayer } from '../Database/FirebasePlayers';
import { getPlayerSurveys } from '../Database/FirebaseSurveys';
import { getTrainingPlan, saveTrainingPlan, TrainingPlan, validateFlexiblePlan as validatePlan } from '../Database/FirebaseTrainingPlans';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import PlanningAccordion from '@/components/PlanningAccordion';
// NUEVOS IMPORTS PARA TORNEOS DISPUTADOS
import DisputedTournamentFormModal from '../components/DisputedTournamentFormModal';
import TournamentPerformanceChart from '../components/TournamentPerformanceChart';
import { getPlayerDisputedTournaments, addDisputedTournament, updateDisputedTournament, deleteDisputedTournament, convertToDisputedTournament } from '../Database/FirebaseDisputedTournaments';

interface PlayerProfilePageProps {
  players: Player[];
  objectives: Objective[];
  sessions: TrainingSession[];
  tournaments: Tournament[];
  onDataChange: () => void;
  academiaId: string;
}

type Tab = "perfil" | "trainings" | "objectives" | "tournaments" | "planificacion";

// Definir los colores y nombres de las métricas
const METRIC_CONFIG = {
  energia: { key: 'cansancioFisico', label: 'Energía', color: '#22c55e' },
  concentracion: { key: 'concentracion', label: 'Concentración', color: '#3b82f6' },
  actitud: { key: 'actitudMental', label: 'Actitud', color: '#facc15' },
  sensaciones: { key: 'sensacionesTenisticas', label: 'Sensaciones', color: '#a855f7' }
};

const parseTimeToMinutes = (tiempoCantidad: string): number => {
  const cleanTime = tiempoCantidad.trim().toLowerCase();
  
  const pureNumber = parseFloat(cleanTime);
  if (!isNaN(pureNumber) && cleanTime === pureNumber.toString()) {
    return pureNumber;
  }
  
  const minuteMatch = cleanTime.match(/(\d+\.?\d*)\s*(m|min|mins|minuto|minutos)/);
  if (minuteMatch) {
    return parseFloat(minuteMatch[1]);
  }
  
  const hourMatch = cleanTime.match(/(\d+\.?\d*)\s*(h|hr|hrs|hora|horas)/);
  if (hourMatch) {
    return parseFloat(hourMatch[1]) * 60;
  }
  
  const mixedMatch = cleanTime.match(/(\d+)\s*(h|hr|hrs|hora|horas)?\s*:?\s*(\d+)\s*(m|min|mins|minuto|minutos)?/);
  if (mixedMatch) {
    const hours = parseFloat(mixedMatch[1]) || 0;
    const minutes = parseFloat(mixedMatch[3]) || 0;
    return hours * 60 + minutes;
  }
  
  return 0;
};

const getDefaultDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0]
  };
};

const PlayerProfilePage: React.FC<PlayerProfilePageProps> = ({ players, objectives, sessions, tournaments, onDataChange, academiaId }) => {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();

  const [player, setPlayer] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("perfil");
  const [edad, setEdad] = useState<number | ''>('');
  const [altura, setAltura] = useState<number | ''>('');
  const [peso, setPeso] = useState<number | ''>('');
  const [pesoIdeal, setPesoIdeal] = useState<number | ''>('');
  const [brazoDominante, setBrazoDominante] = useState<'Derecho' | 'Izquierdo'>('Derecho');
  const [canalComunicacion, setCanalComunicacion] = useState('');
  const [ojoDominante, setOjoDominante] = useState<'Derecho' | 'Izquierdo'>('Derecho');
  const [historiaDeportiva, setHistoriaDeportiva] = useState('');
  const [lesionesActuales, setLesionesActuales] = useState('');
  const [lesionesPasadas, setLesionesPasadas] = useState('');
  const [frecuenciaSemanal, setFrecuenciaSemanal] = useState('');
  
  const defaultDates = getDefaultDateRange();
  const [startDate, setStartDate] = useState<string>(defaultDates.start);
  const [endDate, setEndDate] = useState<string>(defaultDates.end);
  
  const [drillDownPath, setDrillDownPath] = useState<string[]>([]);
  const [areaChartTitle, setAreaChartTitle] = useState<string>("Distribución por Tipo");
  const [intensityChartTitle, setIntensityChartTitle] = useState<string>("Progresión de Intensidad");
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  
  const [playerSurveys, setPlayerSurveys] = useState<PostTrainingSurvey[]>([]);
  const [surveysLoading, setSurveysLoading] = useState(false);

  // Nuevos estados para el calendario
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isTrainingsModalOpen, setIsTrainingsModalOpen] = useState(false);
  const [isPlanningAnalysisOpen, setIsPlanningAnalysisOpen] = useState(false);
  
  // Estados para la planificación
  const [planLoading, setPlanLoading] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [rangoAnalisis, setRangoAnalisis] = useState(30);
  const [planificacion, setPlanificacion] = useState<TrainingPlan['planificacion']>({});

  // NUEVOS ESTADOS PARA TORNEOS DISPUTADOS
  const [playerDisputedTournaments, setPlayerDisputedTournaments] = useState<DisputedTournament[]>([]);
  const [isDisputedTournamentModalOpen, setIsDisputedTournamentModalOpen] = useState(false);
  const [editingDisputedTournament, setEditingDisputedTournament] = useState<DisputedTournament | null>(null);
  const [tournamentToConvert, setTournamentToConvert] = useState<Tournament | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'future' | 'disputed'>('future');

  const userTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('No se pudo detectar la zona horaria, usando default');
      return 'America/Argentina/Buenos_Aires';
    }
  }, []);

  useEffect(() => {
    const foundPlayer = players.find(p => p.id === playerId);
    if (foundPlayer) {
      setPlayer(foundPlayer);
      setEdad(foundPlayer.edad || '');
      setAltura(foundPlayer.altura || '');
      setPeso(foundPlayer.peso || '');
      setPesoIdeal(foundPlayer.pesoIdeal || '');
      setBrazoDominante(foundPlayer.brazoDominante || 'Derecho');
      setCanalComunicacion(foundPlayer.canalComunicacion || '');
      setOjoDominante(foundPlayer.ojoDominante || 'Derecho');
      setHistoriaDeportiva(foundPlayer.historiaDeportiva || '');
      setLesionesActuales(foundPlayer.lesionesActuales || '');
      setLesionesPasadas(foundPlayer.lesionesPasadas || '');
      setFrecuenciaSemanal(foundPlayer.frecuenciaSemanal || '');
    } else if (players.length > 0) {
      navigate('/players');
    }
  }, [playerId, players, navigate]);

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

  // NUEVA FUNCIÓN PARA CARGAR TORNEOS DISPUTADOS
  const loadDisputedTournaments = async () => {
    if (!playerId) return;
    try {
      const disputed = await getPlayerDisputedTournaments(academiaId, playerId);
      setPlayerDisputedTournaments(disputed);
    } catch (error) {
      console.error('Error cargando torneos disputados:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'trainings' && playerId) {
      loadPlayerSurveys();
    }
  }, [activeTab, playerId, startDate, endDate]);

  // NUEVO USEEFFECT PARA CARGAR TORNEOS DISPUTADOS
  useEffect(() => {
    if (activeTab === 'tournaments' && playerId) {
      loadDisputedTournaments();
    }
  }, [activeTab, playerId]);

  // Cargar plan cuando se abre la pestaña de planificación
  useEffect(() => {
    if (activeTab === 'planificacion' && playerId) {
      loadExistingPlan();
    }
  }, [activeTab, playerId]);

  const loadExistingPlan = async () => {
    if (!playerId || !academiaId) return;
    
    setPlanLoading(true);
    try {
      const existingPlan = await getTrainingPlan(academiaId, playerId);
      
      if (existingPlan && existingPlan.planificacion) {
        setPlanificacion(existingPlan.planificacion);
        setRangoAnalisis(existingPlan.rangoAnalisis || 30);
      } else {
        // Inicializar con estructura vacía
        initializeEmptyPlan();
      }
    } catch (error) {
      console.error('Error cargando plan:', error);
      // En caso de error, inicializar con estructura vacía
      initializeEmptyPlan();
    } finally {
      setPlanLoading(false);
    }
  };

  const initializeEmptyPlan = () => {
    const newPlan: TrainingPlan['planificacion'] = {};
    
    Object.keys(NEW_EXERCISE_HIERARCHY_CONST).forEach(tipo => {
      newPlan[tipo] = {
        porcentajeTotal: 0,
        areas: {}
      };
      
      Object.keys(NEW_EXERCISE_HIERARCHY_CONST[tipo]).forEach(area => {
        newPlan[tipo].areas[area] = {
          porcentajeDelTotal: 0,
          ejercicios: {}
        };
        
        if (NEW_EXERCISE_HIERARCHY_CONST[tipo][area] && Array.isArray(NEW_EXERCISE_HIERARCHY_CONST[tipo][area])) {
          NEW_EXERCISE_HIERARCHY_CONST[tipo][area].forEach(ejercicio => {
            if (!newPlan[tipo].areas[area].ejercicios) {
              newPlan[tipo].areas[area].ejercicios = {};
            }
            newPlan[tipo].areas[area].ejercicios[ejercicio] = {
              porcentajeDelTotal: 0
            };
          });
        }
      });
    });
    
    setPlanificacion(newPlan);
  };

  const handleTipoPercentageChange = (tipo: string, value: number) => {
    setPlanificacion(prev => ({
      ...prev,
      [tipo]: {
        porcentajeTotal: value,
        areas: prev[tipo]?.areas || {}
      }
    }));
  };

  const handleAreaPercentageChange = (tipo: string, area: string, value: number) => {
    setPlanificacion(prev => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        areas: {
          ...prev[tipo].areas,
          [area]: {
            porcentajeDelTotal: value,
            ejercicios: prev[tipo]?.areas[area]?.ejercicios || {}
          }
        }
      }
    }));
  };

  const handleEjercicioPercentageChange = (tipo: string, area: string, ejercicio: string, value: number) => {
    setPlanificacion(prev => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        areas: {
          ...prev[tipo].areas,
          [area]: {
            ...prev[tipo].areas[area],
            ejercicios: {
              ...prev[tipo].areas[area].ejercicios || {},
              [ejercicio]: {
                porcentajeDelTotal: value
              }
            }
          }
        }
      }
    }));
  };

  const calculateTotalPercentage = (): number => {
    return Object.values(planificacion || {}).reduce((sum, tipo) => {
      if (!tipo || typeof tipo.porcentajeTotal !== 'number') return sum;
      return sum + tipo.porcentajeTotal;
    }, 0);
  };

  const calculateAreasTotalPercentage = (tipo: string): number => {
    if (!planificacion[tipo]?.areas) return 0;
    return Object.values(planificacion[tipo].areas).reduce(
      (sum, area) => {
        if (!area || typeof area.porcentajeDelTotal !== 'number') return sum;
        return sum + area.porcentajeDelTotal;
      }, 0
    );
  };

  const calculateEjerciciosTotalPercentage = (tipo: string, area: string): number => {
    if (!planificacion[tipo]?.areas[area]?.ejercicios) return 0;
    return Object.values(planificacion[tipo].areas[area].ejercicios).reduce(
      (sum, ej) => {
        if (!ej || typeof ej.porcentajeDelTotal !== 'number') return sum;
        return sum + ej.porcentajeDelTotal;
      }, 0
    );
  };

  // Nueva función para verificar si un nivel tiene detalles
  const hasDetailAtLevel = (tipo: string, area?: string): boolean => {
    if (!planificacion[tipo]) return false;
    
    if (!area) {
      // Verificar si el tipo tiene áreas con porcentaje > 0
      if (!planificacion[tipo].areas) return false;
      return Object.values(planificacion[tipo].areas).some(a => 
        a && typeof a.porcentajeDelTotal === 'number' && a.porcentajeDelTotal > 0
      );
    } else {
      // Verificar si el área tiene ejercicios con porcentaje > 0
      if (!planificacion[tipo].areas[area]?.ejercicios) return false;
      return Object.values(planificacion[tipo].areas[area].ejercicios).some(e => 
        e && typeof e.porcentajeDelTotal === 'number' && e.porcentajeDelTotal > 0
      );
    }
  };

  // Nueva función de validación flexible
  const validateFlexiblePlan = (): { isValid: boolean; warnings: string[] } => {
    const planData: Partial<TrainingPlan> = {
      jugadorId: playerId!,
      rangoAnalisis,
      planificacion
    };
    
    const result = validatePlan(planData);
    
    // Si hay errores, mostrarlos como warnings para el usuario
    if (!result.isValid) {
      return {
        isValid: false,
        warnings: result.errors
      };
    }
    
    return {
      isValid: true,
      warnings: result.warnings
    };
  };

  const handleSavePlan = async () => {
    if (!playerId) return;
    
    const validation = validateFlexiblePlan();
    
    if (!validation.isValid) {
      alert(validation.warnings.join('\n'));
      return;
    }

    // Mostrar advertencias si las hay
    if (validation.warnings.length > 0) {
      const confirmMessage = `Plan válido con las siguientes notas:\n\n${validation.warnings.join('\n')}\n\n¿Desea guardar el plan?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setPlanSaving(true);
    try {
      const planData: Omit<TrainingPlan, 'fechaCreacion'> = {
        jugadorId: playerId,
        fechaActualizacion: new Date().toISOString(),
        rangoAnalisis,
        planificacion
      };
      
      await saveTrainingPlan(academiaId, playerId, planData);
      alert('Plan de entrenamiento guardado exitosamente');
    } catch (error) {
      console.error('Error guardando plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al guardar el plan de entrenamiento:\n${errorMessage}\n\nRevise la consola para más detalles.`);
    } finally {
      setPlanSaving(false);
    }
  };

  const playerAllObjectives = useMemo(() => {
    if (!objectives || !Array.isArray(objectives)) return [];
    return objectives.filter(obj => obj.jugadorId === playerId);
  }, [objectives, playerId]);
  const playerActualObjectivesCount = useMemo(() => playerAllObjectives.filter(obj => obj.estado === 'actual-progreso').length, [playerAllObjectives]);
  const playerTournaments = useMemo(() => tournaments.filter(t => t.jugadorId === playerId).sort((a,b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()), [tournaments, playerId]);
  
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

  // Nuevo useMemo para entrenamientos de la fecha seleccionada
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
        if(drillDownPath.length === 1) { const type = drillDownPath[0] as TrainingType; relevantExercises = session.ejercicios.filter(ex => ex.tipo === type); title = `Intensidad (${type})`;}
        else if (drillDownPath.length === 2) { const [type, area] = drillDownPath; relevantExercises = session.ejercicios.filter(ex => ex.tipo === type && ex.area === area); title = `Intensidad (${type} - ${area})`;}
        const avg = relevantExercises.length > 0 ? relevantExercises.reduce((sum, ex) => sum + ex.intensidad, 0) / relevantExercises.length : 0;
        return { ...session, avgIntensity: avg };
    }).filter(s => s.avgIntensity > 0).map(s => ({ fecha: new Date(s.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }), intensidad: parseFloat(s.avgIntensity.toFixed(1)) }));
    setIntensityChartTitle(title);
    return data.reverse();
  }, [dateFilteredSessions, drillDownPath]);

  // Calcular promedios para el gráfico de radar
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

  // Preparar datos para gráficos de líneas individuales
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
  
  const handleOpenAddTournamentModal = () => { setEditingTournament(null); setIsTournamentModalOpen(true); };
  const handleEditTournamentClick = (tournament: Tournament) => { setEditingTournament(tournament); setIsTournamentModalOpen(true); };
  
  const handleSaveTournament = async (data: Omit<Tournament, 'id'|'jugadorId'>) => { 
    if (editingTournament) {
      await updateTournament(academiaId, editingTournament.id, data);
    } else {
      await addTournament(academiaId, { ...data, jugadorId: playerId! });
    }
    onDataChange(); 
    setIsTournamentModalOpen(false); 
  };
  
  const handleDeleteTournament = async (id: string) => { 
    if (window.confirm("¿Seguro?")) { 
      await deleteTournament(academiaId, id); 
      onDataChange(); 
    }
  };

  // NUEVAS FUNCIONES PARA MANEJAR TORNEOS DISPUTADOS
  const handleOpenAddDisputedTournamentModal = () => {
    setEditingDisputedTournament(null);
    setTournamentToConvert(null);
    setIsDisputedTournamentModalOpen(true);
  };

  const handleEditDisputedTournamentClick = (tournament: DisputedTournament) => {
    setEditingDisputedTournament(tournament);
    setTournamentToConvert(null);
    setIsDisputedTournamentModalOpen(true);
  };

  const handleConvertTournamentClick = (tournament: Tournament) => {
    setTournamentToConvert(tournament);
    setEditingDisputedTournament(null);
    setIsDisputedTournamentModalOpen(true);
  };

  const handleSaveDisputedTournament = async (data: Omit<DisputedTournament, 'id' | 'jugadorId' | 'fechaRegistro'>) => {
    try {
      if (editingDisputedTournament) {
        await updateDisputedTournament(academiaId, editingDisputedTournament.id, data);
      } else if (tournamentToConvert) {
        await convertToDisputedTournament(academiaId, tournamentToConvert, {
          resultado: data.resultado,
          nivelDificultad: data.nivelDificultad,
          rendimientoJugador: data.rendimientoJugador,
          conformidadGeneral: data.conformidadGeneral,
          observaciones: data.observaciones
        });
      } else {
        await addDisputedTournament(academiaId, { ...data, jugadorId: playerId! });
      }
      await loadDisputedTournaments();
      onDataChange();
    } catch (error) {
      console.error('Error al guardar torneo disputado:', error);
      alert('Error al guardar el torneo disputado');
    }
    setIsDisputedTournamentModalOpen(false);
  };

  const handleDeleteDisputedTournament = async (id: string) => {
    if (window.confirm("¿Está seguro de eliminar este torneo disputado?")) {
      try {
        await deleteDisputedTournament(academiaId, id);
        await loadDisputedTournaments();
      } catch (error) {
        console.error('Error al eliminar torneo disputado:', error);
        alert('Error al eliminar el torneo disputado');
      }
    }
  };
  
  const handleArchivePlayer = () => setIsArchiveModalOpen(true);
  
  const confirmArchivePlayer = async () => { 
    if(player) { 
      await updatePlayer(academiaId, player.id, { estado: 'archivado' }); 
      onDataChange(); 
      navigate('/players'); 
    }
  };
  
  const handleProfileSave = async () => { 
    if (!player) return; 
    const profileData: Partial<Player> = { 
      edad: Number(edad) || undefined, 
      altura: Number(altura) || undefined, 
      peso: Number(peso) || undefined, 
      pesoIdeal: Number(pesoIdeal) || undefined, 
      brazoDominante, 
      canalComunicacion, 
      ojoDominante, 
      historiaDeportiva, 
      lesionesActuales, 
      lesionesPasadas, 
      frecuenciaSemanal, 
    }; 
    await updatePlayer(academiaId, player.id, profileData); 
    onDataChange(); 
    alert("Perfil actualizado."); 
  };

  // Nueva función para manejar clics en el calendario
  const handleDateClick = (date: Date) => {
    // Comprueba si hay entrenamientos en el día clickeado
    const trainingsOnDay = sessions.some(s => 
      s.jugadorId === playerId && 
      new Date(s.fecha).toDateString() === date.toDateString()
    );
    // Solo abre el modal si hay entrenamientos
    if (trainingsOnDay) {
      setSelectedDate(date);
      setIsTrainingsModalOpen(true);
    }
  };

  // Componente personalizado para el tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-gray-900/95 backdrop-blur-xl shadow-lg rounded-lg border border-gray-800">
          <p className="text-white font-semibold mb-1">{label}</p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            Valor: {payload[0].value}/5
          </p>
        </div>
      );
    }
    return null;
  };

  if (!player) return <div className="text-center py-10 text-gray-400">Cargando...</div>;
  
  // Verificar que los datos esenciales estén cargados
  if (!objectives || !sessions || !tournaments) {
    return <div className="text-center py-10 text-gray-400">Cargando datos...</div>;
  }
  
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  const totalPercentage = calculateTotalPercentage();
  const validation = validateFlexiblePlan();

  return (
    <div className="min-h-screen bg-black relative">
      {/* Efectos de fondo sutiles */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="fixed top-20 left-20 w-64 h-64 lg:w-96 lg:h-96 bg-green-500/5 rounded-full blur-3xl"></div>
      <div className="fixed bottom-20 right-20 w-64 h-64 lg:w-96 lg:h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <Modal isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} title="Confirmar Archivar">
          <p>¿Archivar a <strong>{player.name}</strong>?</p>
          <div className="flex justify-end space-x-3 mt-4"><button onClick={() => setIsArchiveModalOpen(false)} className="app-button btn-secondary">Cancelar</button><button onClick={confirmArchivePlayer} className="app-button btn-warning">Sí, Archivar</button></div>
        </Modal>
        
        {/* Modal para torneos */}
        {isTournamentModalOpen && playerId && (
          <TournamentFormModal 
            isOpen={isTournamentModalOpen} 
            onClose={() => setIsTournamentModalOpen(false)} 
            onSave={handleSaveTournament} 
            playerId={playerId} 
            existingTournament={editingTournament} 
          />
        )}
        
        {/* Nuevo modal para entrenamientos */}
        <TrainingsOnDateModal
          isOpen={isTrainingsModalOpen}
          onClose={() => setIsTrainingsModalOpen(false)}
          date={selectedDate}
          sessions={trainingsForSelectedDate}
        />

        {/* NUEVO MODAL PARA TORNEOS DISPUTADOS */}
        {isDisputedTournamentModalOpen && playerId && (
          <DisputedTournamentFormModal
            isOpen={isDisputedTournamentModalOpen}
            onClose={() => setIsDisputedTournamentModalOpen(false)}
            onSave={handleSaveDisputedTournament}
            playerId={playerId}
            existingDisputedTournament={editingDisputedTournament}
            futureTournamentToConvert={tournamentToConvert}
          />
        )}

        {/* Header del jugador con mejor diseño responsivo */}
        <div className="mb-6 lg:mb-10">
          <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl shadow-2xl shadow-green-500/10">
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8 lg:p-10">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="w-full sm:w-auto">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                      {player.name}
                    </h1>
                    <p className="text-sm sm:text-base lg:text-lg text-gray-400">
                      <span className="inline-block px-3 py-1 rounded-full bg-gray-800/50 border border-gray-700">
                        Estado: <span className="font-medium text-white">{player.estado}</span>
                      </span>
                    </p>
                  </div>
                  {player.estado === 'activo' && (
                    <button 
                      onClick={handleArchivePlayer} 
                      className="app-button btn-warning w-full sm:w-auto px-4 py-2 lg:px-6 lg:py-3 text-sm sm:text-base lg:text-lg"
                    >
                      Archivar Jugador
                    </button>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs mejorados para móvil y desktop */}
        <div className="mb-6 lg:mb-10 border-b border-gray-800 overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-4 lg:space-x-8 min-w-max px-2 sm:px-0">
            <button onClick={() => setActiveTab("perfil")} className={`py-3 px-3 sm:px-4 lg:px-6 font-medium text-sm sm:text-base lg:text-lg transition-all duration-200 ${activeTab === "perfil" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400 hover:text-gray-300"}`}>Perfil</button>
            <button onClick={() => setActiveTab("trainings")} className={`py-3 px-3 sm:px-4 lg:px-6 font-medium text-sm sm:text-base lg:text-lg transition-all duration-200 ${activeTab === "trainings" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400 hover:text-gray-300"}`}>Entrenamientos</button>
            <button onClick={() => setActiveTab("objectives")} className={`py-3 px-3 sm:px-4 lg:px-6 font-medium text-sm sm:text-base lg:text-lg transition-all duration-200 ${activeTab === "objectives" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400 hover:text-gray-300"}`}>Objetivos ({playerActualObjectivesCount}/{MAX_ACTIVE_OBJECTIVES})</button>
            <button onClick={() => setActiveTab("tournaments")} className={`py-3 px-3 sm:px-4 lg:px-6 font-medium text-sm sm:text-base lg:text-lg transition-all duration-200 ${activeTab === "tournaments" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400 hover:text-gray-300"}`}>Torneos</button>
            <button onClick={() => setActiveTab("planificacion")} className={`py-3 px-3 sm:px-4 lg:px-6 font-medium text-sm sm:text-base lg:text-lg transition-all duration-200 ${activeTab === "planificacion" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400 hover:text-gray-300"}`}>Planificación</button>
          </nav>
        </div>
        
        {activeTab === "perfil" && (
          <section className="bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 lg:p-10 rounded-xl shadow-lg border border-gray-800">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-6 sm:mb-8 lg:mb-10">Información Detallada</h2>
            
            {/* Grid responsivo para la información del perfil */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 xl:gap-10">
              {/* Datos Físicos */}
              <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700 space-y-4">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 border-b border-gray-700 pb-3 mb-4">Datos Físicos</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Edad</label>
                    <input type="number" value={edad} onChange={e => setEdad(Number(e.target.value))} className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"/>
                  </div>
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Altura (cm)</label>
                    <input type="number" value={altura} onChange={e => setAltura(Number(e.target.value))} className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"/>
                  </div>
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Peso (kg)</label>
                    <input type="number" value={peso} onChange={e => setPeso(Number(e.target.value))} className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"/>
                  </div>
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Peso Ideal (kg)</label>
                    <input type="number" value={pesoIdeal} onChange={e => setPesoIdeal(Number(e.target.value))} className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"/>
                  </div>
                </div>
              </div>
              
              {/* Dominancias */}
              <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700 space-y-4">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 border-b border-gray-700 pb-3 mb-4">Dominancias</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Brazo Dominante</label>
                    <select value={brazoDominante} onChange={e => setBrazoDominante(e.target.value as any)} className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200">
                      <option>Derecho</option>
                      <option>Izquierdo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Ojo Dominante</label>
                    <select value={ojoDominante} onChange={e => setOjoDominante(e.target.value as any)} className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200">
                      <option>Derecho</option>
                      <option>Izquierdo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Canal Comunicación</label>
                    <input type="text" value={canalComunicacion} onChange={e => setCanalComunicacion(e.target.value)} className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"/>
                  </div>
                </div>
              </div>
              
              {/* Entrenamiento */}
              <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700 space-y-4">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 border-b border-gray-700 pb-3 mb-4">Entrenamiento</h3>
                <div>
                  <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Frecuencia Semanal</label>
                  <textarea value={frecuenciaSemanal} onChange={e => setFrecuenciaSemanal(e.target.value)} rows={6} className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"/>
                </div>
              </div>
            </div>
            
            {/* Segunda fila de información */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-10 mt-6 lg:mt-10">
              <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 mb-4">Historia Deportiva</h3>
                <textarea value={historiaDeportiva} onChange={e => setHistoriaDeportiva(e.target.value)} rows={6} className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"/>
              </div>
              <div className="bg-gray-800/50 p-5 sm:p-6 lg:p-8 rounded-lg border border-gray-700 space-y-4">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 mb-4">Historial de Lesiones</h3>
                <div>
                  <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Lesiones Actuales</label>
                  <textarea value={lesionesActuales} onChange={e => setLesionesActuales(e.target.value)} rows={3} className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"/>
                </div>
                <div>
                  <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Lesiones Pasadas</label>
                  <textarea value={lesionesPasadas} onChange={e => setLesionesPasadas(e.target.value)} rows={3} className="w-full p-3 lg:p-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"/>
                </div>
              </div>
            </div>
            
            <div className="mt-8 sm:mt-10 lg:mt-12 text-center sm:text-right">
              <button onClick={handleProfileSave} className="px-6 py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25 text-base sm:text-lg lg:text-xl">
                Guardar Cambios del Perfil
              </button>
            </div>
          </section>
        )}

        {activeTab === "trainings" && (
          <section className="space-y-8 lg:space-y-12">
            {/* Filtros de fecha mejorados */}
            <div className="bg-gray-900/50 backdrop-blur-sm p-4 lg:p-6 rounded-xl shadow-lg border border-gray-800">
              <h3 className="text-lg lg:text-xl font-semibold text-green-400 mb-4">Filtrar por Fecha</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4 items-end">
                <div>
                  <label htmlFor="startDate" className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Desde</label>
                  <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 lg:p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"/>
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Hasta</label>
                  <input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 lg:p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"/>
                </div>
                <button onClick={resetDateFilters} className="px-4 py-2 lg:px-6 lg:py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50 h-[42px] lg:h-[50px]">Restablecer (últimos 7 días)</button>
              </div>
            </div>

            {/* Análisis de ejercicios - Grid para desktop */}
            <div className="border-t border-gray-800 pt-8 lg:pt-12">
              <h2 className="text-2xl lg:text-3xl font-semibold text-green-400 mb-6 lg:mb-8">Análisis de Ejercicios</h2>
              {dateFilteredSessions.length === 0 ? (
                <p className="text-center p-4 text-gray-400">No hay sesiones de entrenamiento en el período seleccionado</p>
              ) : (
                  <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    <div>
                      {drillDownPath.length > 0 && (
                        <nav className="mb-2 text-sm lg:text-base">
                          <button onClick={() => handleBreadcrumbClick(0)} className="text-gray-400 hover:text-green-400 transition-colors">Inicio</button>
                          {drillDownPath.map((item, i) => (
                            <span key={i}> &gt; <button onClick={() => handleBreadcrumbClick(i + 1)} className="text-gray-400 hover:text-green-400 transition-colors">{item}</button></span>
                          ))}
                        </nav>
                      )}
                      <AreaPieChart data={drillDownData} chartTitle={areaChartTitle} onSliceClick={handlePieSliceClick} height={384}/>
                    </div>
                    <IntensityLineChart data={intensityChartData} chartTitle={intensityChartTitle} />
                  </div>
              )}
            </div>
            
            {/* Mentalidad y Rendimiento - Mejorado para desktop */}
            <div className="border-t border-gray-800 pt-8 lg:pt-12">
              <h2 className="text-2xl lg:text-3xl font-semibold text-green-400 mb-6 lg:mb-8">Mentalidad y Rendimiento</h2>
              {surveysLoading ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Cargando encuestas...</p>
                </div>
              ) : playerSurveys.length === 0 ? (
                <div className="bg-gray-900/50 p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800 text-center">
                  <p className="text-gray-400 text-lg">
                    No hay encuestas registradas para este jugador en el período seleccionado.
                  </p>
                </div>
              ) : (
                <div className="space-y-8 lg:space-y-10">
                  {/* Vista General con Gráfico de Radar - Más grande en desktop */}
                  <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
                    <h3 className="text-xl lg:text-2xl font-semibold text-green-400 mb-4">
                      Vista General - Promedios del Período
                    </h3>
                    <p className="text-sm lg:text-base text-gray-400 mb-6">
                      Basado en {playerSurveys.length} {playerSurveys.length === 1 ? 'encuesta' : 'encuestas'}
                    </p>
                    <div className="flex justify-center">
                      <ResponsiveContainer width="100%" height={400} minWidth={300}>
                        <RadarChart data={radarData}>
                          <PolarGrid 
                            stroke="#374151" 
                            radialLines={true}
                          />
                          <PolarAngleAxis 
                            dataKey="metric"
                            tick={{ fill: '#e5e7eb', fontSize: 14 }}
                          />
                          <PolarRadiusAxis 
                            angle={90} 
                            domain={[0, 5]} 
                            tickCount={6}
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                          />
                          <Radar 
                            name="Promedio" 
                            dataKey="value" 
                            stroke="#3b82f6" 
                            fill="#3b82f6" 
                            fillOpacity={0.3}
                            strokeWidth={2}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'rgba(17, 24, 39, 0.95)',
                              border: '1px solid #374151',
                              borderRadius: '8px'
                            }}
                            labelStyle={{ color: '#f3f4f6' }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Evolución Individual - Grid 2x2 en desktop */}
                  <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
                    <h3 className="text-xl lg:text-2xl font-semibold text-green-400 mb-6">
                      Evolución Individual de Métricas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                      {/* Gráfico de Energía */}
                      <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
                        <h4 className="text-lg lg:text-xl font-medium mb-4" style={{ color: METRIC_CONFIG.energia.color }}>
                          Evolución de la {METRIC_CONFIG.energia.label}
                        </h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={prepareIndividualChartData(METRIC_CONFIG.energia.key)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="fecha" 
                              stroke="#9ca3af"
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis 
                              domain={[0, 5]} 
                              ticks={[0, 1, 2, 3, 4, 5]}
                              stroke="#9ca3af"
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke={METRIC_CONFIG.energia.color}
                              strokeWidth={2}
                              dot={{ fill: METRIC_CONFIG.energia.color, r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Gráfico de Concentración */}
                      <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
                        <h4 className="text-lg lg:text-xl font-medium mb-4" style={{ color: METRIC_CONFIG.concentracion.color }}>
                          Evolución de la {METRIC_CONFIG.concentracion.label}
                        </h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={prepareIndividualChartData(METRIC_CONFIG.concentracion.key)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="fecha" 
                              stroke="#9ca3af"
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis 
                              domain={[0, 5]} 
                              ticks={[0, 1, 2, 3, 4, 5]}
                              stroke="#9ca3af"
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke={METRIC_CONFIG.concentracion.color}
                              strokeWidth={2}
                              dot={{ fill: METRIC_CONFIG.concentracion.color, r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Gráfico de Actitud */}
                      <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
                        <h4 className="text-lg lg:text-xl font-medium mb-4" style={{ color: METRIC_CONFIG.actitud.color }}>
                          Evolución de la {METRIC_CONFIG.actitud.label}
                        </h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={prepareIndividualChartData(METRIC_CONFIG.actitud.key)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="fecha" 
                              stroke="#9ca3af"
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis 
                              domain={[0, 5]} 
                              ticks={[0, 1, 2, 3, 4, 5]}
                              stroke="#9ca3af"
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke={METRIC_CONFIG.actitud.color}
                              strokeWidth={2}
                              dot={{ fill: METRIC_CONFIG.actitud.color, r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Gráfico de Sensaciones */}
                      <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
                        <h4 className="text-lg lg:text-xl font-medium mb-4" style={{ color: METRIC_CONFIG.sensaciones.color }}>
                          Evolución de las {METRIC_CONFIG.sensaciones.label}
                        </h4>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={prepareIndividualChartData(METRIC_CONFIG.sensaciones.key)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="fecha" 
                              stroke="#9ca3af"
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis 
                              domain={[0, 5]} 
                              ticks={[0, 1, 2, 3, 4, 5]}
                              stroke="#9ca3af"
                              tick={{ fontSize: 12 }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke={METRIC_CONFIG.sensaciones.color}
                              strokeWidth={2}
                              dot={{ fill: METRIC_CONFIG.sensaciones.color, r: 4 }}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Leyenda de interpretación */}
                    <div className="mt-6 bg-blue-900/20 border border-blue-800 p-4 rounded-lg">
                      <p className="text-sm lg:text-base text-blue-300">
                        <strong>Interpretación de valores:</strong> 1 = Muy bajo/negativo | 2 = Bajo | 3 = Normal | 4 = Bueno | 5 = Excelente
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Calendario - Mejor diseño en desktop */}
            <div className="border-t border-gray-800 pt-8 lg:pt-12">
              <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
                <h2 className="text-2xl lg:text-3xl font-semibold text-green-400 mb-6">Calendario de Entrenamientos</h2>
                <div className="max-w-4xl mx-auto">
                  <TrainingCalendar
                    sessions={sessions.filter(s => s.jugadorId === playerId)}
                    onDateClick={handleDateClick}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "objectives" && (
          <section className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
            <div className="flex justify-between items-center mb-6 lg:mb-8">
              <h2 className="text-2xl lg:text-3xl font-semibold text-green-400">Objetivos</h2>
              <Link to={`/player/${playerId}/edit-objectives`} className="px-6 py-2 lg:px-8 lg:py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25">Gestionar</Link>
            </div>
            
            {/* Grid para objetivos en desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {(Object.keys(OBJECTIVE_ESTADOS) as ObjectiveEstado[]).map(estado => {
                const objectivesInState = playerAllObjectives.filter(obj => obj.estado === estado);
                if (objectivesInState.length === 0) return null;
                return (
                  <div key={estado} className="space-y-4">
                    <h3 className="text-xl lg:text-2xl font-semibold text-gray-300 border-b border-gray-700 pb-2">{OBJECTIVE_ESTADOS[estado]} ({objectivesInState.length})</h3>
                    <ul className="space-y-3">
                      {objectivesInState.map(obj => (
                        <li key={obj.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-green-500/50 transition-all duration-200">
                          <Link to={`/objective/${obj.id}/edit`} className="text-white hover:text-green-400 transition-colors">
                            <p className="text-base lg:text-lg">{obj.textoObjetivo}</p>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {playerAllObjectives.length === 0 && <p className="text-gray-400 col-span-full text-center text-lg">No hay objetivos registrados.</p>}
            </div>
          </section>
        )}

        {activeTab === "tournaments" && (
          <section className="space-y-6">
            {/* Sub-tabs para dividir la sección */}
            <div className="border-b border-gray-800">
              <nav className="flex space-x-8">
                <button
                  onClick={() => setActiveSubTab('future')}
                  className={`py-2 px-1 font-medium transition-colors ${
                    activeSubTab === 'future'
                      ? 'border-b-2 border-green-400 text-green-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Próximos Torneos ({playerTournaments.length})
                </button>
                <button
                  onClick={() => setActiveSubTab('disputed')}
                  className={`py-2 px-1 font-medium transition-colors ${
                    activeSubTab === 'disputed'
                      ? 'border-b-2 border-green-400 text-green-400'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Torneos Disputados ({playerDisputedTournaments.length})
                </button>
              </nav>
            </div>

            {/* Contenido según el sub-tab activo */}
            {activeSubTab === 'future' ? (
              // Sección de torneos futuros
              <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl lg:text-3xl font-semibold text-green-400">Próximos Torneos</h2>
                  <button onClick={handleOpenAddTournamentModal} className="px-6 py-2 lg:px-8 lg:py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25">
                    Agregar Torneo
                  </button>
                </div>
                {playerTournaments.length === 0 ? (
                  <p className="text-gray-400 text-center py-8 text-lg">No hay torneos próximos programados.</p>
                ) : (
                  <ul className="space-y-4">
                    {playerTournaments.map(t => {
                      const tournamentEnded = new Date(t.fechaFin) < new Date();
                      return (
                        <li key={t.id} className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700 hover:border-green-500/50 transition-all duration-200">
                          <div className="flex flex-col lg:flex-row justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold text-xl lg:text-2xl text-white">{t.nombreTorneo}</h3>
                              <p className="text-sm lg:text-base text-gray-400 mt-1">{t.gradoImportancia}</p>
                              <p className="text-sm lg:text-base text-gray-300 mt-1">{formatDate(t.fechaInicio)} - {formatDate(t.fechaFin)}</p>
                              {tournamentEnded && (
                                <p className="text-sm lg:text-base text-yellow-400 mt-2">
                                  ⚠️ Este torneo ya finalizó
                                </p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 lg:space-x-3">
                              {tournamentEnded && (
                                <button
                                  onClick={() => handleConvertTournamentClick(t)}
                                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all duration-200 text-sm lg:text-base"
                                  title="Registrar resultado del torneo"
                                >
                                  📊 Registrar Resultado
                                </button>
                              )}
                              <button 
                                onClick={() => handleEditTournamentClick(t)} 
                                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50 text-sm lg:text-base"
                              >
                                Editar
                              </button>
                              <button 
                                onClick={() => handleDeleteTournament(t.id)} 
                                className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-400 font-semibold rounded-lg transition-all duration-200 border border-red-800 hover:border-red-600 text-sm lg:text-base"
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : (
              // Sección de torneos disputados
              <div className="space-y-6">
                <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl lg:text-3xl font-semibold text-green-400">Torneos Disputados</h2>
                    <button 
                      onClick={handleOpenAddDisputedTournamentModal} 
                      className="px-6 py-2 lg:px-8 lg:py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
                    >
                      Registrar Torneo Disputado
                    </button>
                  </div>
                  
                  {playerDisputedTournaments.length === 0 ? (
                    <p className="text-gray-400 text-center py-8 text-lg">
                      No hay torneos disputados registrados. Comience registrando los resultados de torneos pasados.
                    </p>
                  ) : (
                    <>
                      {/* Lista de torneos disputados - Grid en desktop */}
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
                        {playerDisputedTournaments.map(t => (
                          <div key={t.id} className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700 hover:border-green-500/50 transition-all duration-200">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-semibold text-lg lg:text-xl text-white">{t.nombreTorneo}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm lg:text-base">
                                  <p>
                                    <span className="text-gray-400">Fecha:</span>{' '}
                                    {formatDate(t.fechaInicio)} - {formatDate(t.fechaFin)}
                                  </p>
                                  <p>
                                    <span className="text-gray-400">Resultado:</span>{' '}
                                    <span className="font-medium text-green-400">{t.resultado}</span>
                                  </p>
                                  <p>
                                    <span className="text-gray-400">Rendimiento:</span>{' '}
                                    <span className={`font-medium ${
                                      t.rendimientoJugador === 'Excelente' ? 'text-green-500' :
                                      t.rendimientoJugador === 'Muy bueno' ? 'text-blue-500' :
                                      t.rendimientoJugador === 'Bueno' ? 'text-yellow-500' :
                                      'text-red-500'
                                    }`}>
                                      {t.rendimientoJugador}
                                    </span>
                                  </p>
                                  <p>
                                    <span className="text-gray-400">Dificultad:</span>{' '}
                                    <span className="font-medium">
                                      {'⭐'.repeat(t.nivelDificultad)}
                                      <span className="text-gray-400 ml-1">({t.nivelDificultad}/5)</span>
                                    </span>
                                  </p>
                                </div>
                                {t.observaciones && (
                                  <p className="mt-3 text-sm lg:text-base text-gray-500 italic">
                                    "{t.observaciones}"
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col space-y-2 ml-4">
                                <button
                                  onClick={() => handleEditDisputedTournamentClick(t)}
                                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50 text-sm"
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteDisputedTournament(t.id)}
                                  className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-400 font-semibold rounded-lg transition-all duration-200 border border-red-800 hover:border-red-600 text-sm"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Gráficos de rendimiento */}
                      <div className="border-t border-gray-700 pt-6">
                        <h3 className="text-xl lg:text-2xl font-semibold text-green-400 mb-4">
                          Análisis de Rendimiento en Torneos
                        </h3>
                        <TournamentPerformanceChart 
                          tournaments={playerDisputedTournaments}
                          showRadar={true}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === "planificacion" && (
          <section className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
            <h2 className="text-2xl lg:text-3xl font-semibold text-green-400 mb-6">Plan de Entrenamiento</h2>
            
            {planLoading ? (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
                <p className="mt-4 text-gray-400">Cargando plan...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Grid para desktop con configuración y acciones */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Configuración de rango de análisis */}
                  <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
                    <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">
                      Días hacia atrás para análisis
                    </label>
                    <input
                      type="number"
                      value={rangoAnalisis}
                      onChange={(e) => setRangoAnalisis(Number(e.target.value))}
                      min="7"
                      max="365"
                      className="w-full p-2 lg:p-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                    />
                    <p className="text-xs lg:text-sm text-gray-500 mt-2">
                      Se analizarán los últimos {rangoAnalisis} días de entrenamiento para las recomendaciones
                    </p>
                  </div>

                  {/* Total general */}
                  <div className={`p-4 lg:p-6 rounded-lg border-2 ${
                    validation.isValid
                      ? 'bg-green-900/20 border-green-500' 
                      : 'bg-red-900/20 border-red-500'
                  }`}>
                    <p className={`font-bold text-lg lg:text-xl ${
                      validation.isValid
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>
                      Total General: {totalPercentage.toFixed(2)}% / 100%
                    </p>
                    {!validation.isValid && validation.warnings.length > 0 && (
                      <p className="text-sm text-red-400 mt-1">
                        {validation.warnings[0]}
                      </p>
                    )}
                  </div>

                  {/* Botón de análisis */}
                  <div className="flex items-center justify-center lg:justify-end">
                    <button
                      onClick={() => setIsPlanningAnalysisOpen(true)}
                      className="px-6 py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25"
                      title="Ver análisis de planificación"
                    >
                      📊 Ver análisis completo
                    </button>
                  </div>
                </div>

                {/* Información sobre planificación flexible */}
                <div className="bg-blue-900/20 border border-blue-800 p-4 lg:p-6 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-300 text-lg lg:text-xl mb-2">
                        💡 Planificación Flexible
                      </h3>
                      <p className="text-sm lg:text-base text-blue-400">
                        No es necesario completar todos los niveles. Puede especificar solo hasta el nivel que desee:
                      </p>
                      <ul className="list-disc list-inside text-sm lg:text-base text-blue-400 mt-2">
                        <li>Solo tipos (ej: Peloteo 80%, Canasto 20%)</li>
                        <li>Tipos y áreas (sin detallar ejercicios específicos)</li>
                        <li>Detalle completo con ejercicios individuales</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Mostrar advertencias si las hay */}
                {validation.isValid && validation.warnings.length > 0 && (
                  <div className="bg-yellow-900/20 border border-yellow-800 p-4 lg:p-6 rounded-lg">
                    <h4 className="font-semibold text-yellow-300 text-lg mb-2">
                      Distribución del plan:
                    </h4>
                    <ul className="list-disc list-inside text-sm lg:text-base text-yellow-400">
                      {validation.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Planificación por tipo - Grid en desktop */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {Object.keys(NEW_EXERCISE_HIERARCHY_CONST).map(tipo => {
                    const tipoHasDetail = hasDetailAtLevel(tipo);
                    const areasTotal = calculateAreasTotalPercentage(tipo);
                    const tipoPorcentaje = planificacion[tipo]?.porcentajeTotal || 0;
                    const isAreasExceeded = areasTotal > tipoPorcentaje + 0.01;
                    
                    return (
                      <div key={tipo} className="border border-gray-700 rounded-lg p-4 lg:p-6 space-y-4 bg-gray-800/30">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg lg:text-xl font-semibold text-green-400 flex items-center gap-2">
                            {tipo}
                            {tipoPorcentaje > 0 && !tipoHasDetail && (
                              <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded">
                                Sin detallar
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={tipoPorcentaje}
                              onChange={(e) => handleTipoPercentageChange(tipo, Number(e.target.value))}
                              min="0"
                              max="100"
                              step="0.1"
                              className="w-20 p-1 lg:p-2 bg-gray-900/50 border border-gray-700 rounded text-sm lg:text-base text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                            />
                            <span className="text-sm lg:text-base">%</span>
                          </div>
                        </div>

                        {tipoPorcentaje > 0 && (
                          <div className="ml-4 space-y-3">
                            {tipoHasDetail && (
                              <div className={`text-sm font-medium p-2 rounded ${
                                isAreasExceeded
                                  ? 'bg-red-900/20 text-red-400'
                                  : areasTotal < tipoPorcentaje - 0.01
                                  ? 'bg-yellow-900/20 text-yellow-400'
                                  : 'bg-green-900/20 text-green-400'
                              }`}>
                                Total áreas: {areasTotal.toFixed(2)}% / {tipoPorcentaje}%
                                {areasTotal < tipoPorcentaje - 0.01 && 
                                  ` (${(tipoPorcentaje - areasTotal).toFixed(1)}% sin detallar)`
                                }
                              </div>
                            )}
                            
                            {Object.keys(NEW_EXERCISE_HIERARCHY_CONST[tipo]).map(area => {
                              const areaHasDetail = hasDetailAtLevel(tipo, area);
                              const ejerciciosTotal = calculateEjerciciosTotalPercentage(tipo, area);
                              const areaPorcentaje = planificacion[tipo]?.areas[area]?.porcentajeDelTotal || 0;
                              const isEjerciciosExceeded = ejerciciosTotal > areaPorcentaje + 0.01;
                              
                              return (
                                <div key={area} className="bg-gray-900/50 rounded-lg p-3 lg:p-4 space-y-2 border border-gray-700">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-gray-300 flex items-center gap-2">
                                      {area}
                                      {areaPorcentaje > 0 && !areaHasDetail && (
                                        <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded">
                                          Sin detallar
                                        </span>
                                      )}
                                    </h4>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        value={areaPorcentaje}
                                        onChange={(e) => handleAreaPercentageChange(tipo, area, Number(e.target.value))}
                                        min="0"
                                        max={tipoPorcentaje}
                                        step="0.1"
                                        className="w-16 p-1 bg-gray-900/50 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                                      />
                                      <span className="text-sm">%</span>
                                    </div>
                                  </div>

                                  {areaPorcentaje > 0 && (
                                    <div className="ml-4 space-y-1">
                                      {areaHasDetail && (
                                        <div className={`text-xs font-medium p-1 rounded ${
                                          isEjerciciosExceeded
                                            ? 'bg-red-900/20 text-red-400'
                                            : ejerciciosTotal < areaPorcentaje - 0.01
                                            ? 'bg-yellow-900/20 text-yellow-400'
                                            : 'bg-green-900/20 text-green-400'
                                        }`}>
                                          Total ejercicios: {ejerciciosTotal.toFixed(2)}% / {areaPorcentaje}%
                                          {ejerciciosTotal < areaPorcentaje - 0.01 && 
                                            ` (${(areaPorcentaje - ejerciciosTotal).toFixed(1)}% sin detallar)`
                                          }
                                        </div>
                                      )}
                                      {NEW_EXERCISE_HIERARCHY_CONST[tipo][area].map(ejercicio => (
                                        <div key={ejercicio} className="flex items-center justify-between py-1">
                                          <span className="text-sm text-gray-400">{ejercicio}</span>
                                          <div className="flex items-center gap-1">
                                            <input
                                              type="number"
                                              value={planificacion[tipo]?.areas[area]?.ejercicios?.[ejercicio]?.porcentajeDelTotal || 0}
                                              onChange={(e) => handleEjercicioPercentageChange(tipo, area, ejercicio, Number(e.target.value))}
                                              min="0"
                                              max={areaPorcentaje}
                                              step="0.1"
                                              className="w-14 p-1 bg-gray-900/50 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                                            />
                                            <span className="text-xs">%</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Botón de guardar */}
                <div className="text-center mt-8">
                  <button
                    onClick={handleSavePlan}
                    disabled={planSaving || !validation.isValid}
                    className="px-8 py-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25 text-lg lg:text-xl disabled:opacity-50"
                  >
                    {planSaving ? 'Guardando...' : 'Guardar Plan de Entrenamiento'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
        
        <div className="mt-8 lg:mt-12 text-center pb-8">
          <Link to="/players" className="inline-flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors duration-200 font-medium text-lg lg:text-xl group">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 lg:w-6 lg:h-6 group-hover:-translate-x-1 transition-transform duration-200">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Volver a Jugadores</span>
          </Link>
        </div>
        
        {/* Modal de Análisis de Planificación */}
        {isPlanningAnalysisOpen && player && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-800">
              <div className="p-6 border-b border-gray-700">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-green-400">
                    {player.name} - Análisis de Planificación
                  </h2>
                  <button
                    onClick={() => setIsPlanningAnalysisOpen(false)}
                    className="text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <PlanningAccordion 
                  player={player} 
                  academiaId={academiaId} 
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerProfilePage;