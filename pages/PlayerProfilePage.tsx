// pages/PlayerProfilePage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Player, Objective, TrainingSession, Tournament, DisputedTournament, PostTrainingSurvey, TrainingPlan } from '../types';
import { NEW_EXERCISE_HIERARCHY_CONST } from '../constants';
import { addTournament, updateTournament, deleteTournament } from '../Database/FirebaseTournaments';
import { updatePlayer } from '../Database/FirebasePlayers';
import { getPlayerSurveys } from '../Database/FirebaseSurveys';
import { getTrainingPlan, saveTrainingPlan, validateFlexiblePlan as validatePlan } from '../Database/FirebaseTrainingPlans';
import { getPlayerDisputedTournaments, addDisputedTournament, updateDisputedTournament, deleteDisputedTournament, convertToDisputedTournament } from '../Database/FirebaseDisputedTournaments';
import { useHashNavigation } from '../hooks/useHashNavigation';

// Import all sub-components
import ProfileHeader from '../components/player-profile/ProfileHeader';
import ProfileTabs from '../components/player-profile/ProfileTabs';
import TabPerfil from '../components/player-profile/TabPerfil';
import TabTrainings from '../components/player-profile/TabTrainings';
import TabObjectives from '../components/player-profile/TabObjectives';
import TabTournaments from '../components/player-profile/TabTournaments';
import TabPlanning from '../components/player-profile/TabPlanning';
import PlayerArchiveModal from '../components/player-profile/PlayerArchiveModal';

interface PlayerProfilePageProps {
  players: Player[];
  objectives: Objective[];
  sessions: TrainingSession[];
  tournaments: Tournament[];
  onDataChange: () => void;
  academiaId: string;
}

type Tab = "perfil" | "trainings" | "objectives" | "tournaments" | "planificacion";

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

const PlayerProfilePage: React.FC<PlayerProfilePageProps> = ({ 
  players, 
  objectives, 
  sessions, 
  tournaments, 
  onDataChange, 
  academiaId 
}) => {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();

  // Main state
  const [player, setPlayer] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("perfil");
  
  // Hook for hash navigation
  useHashNavigation<Tab>(setActiveTab, {
    'trainings': 'trainings',
    'planificacion': 'planificacion',
    'objectives': 'objectives',
    'tournaments': 'tournaments'
  });
  
  // Profile state
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
  const [requierePlanificacion, setRequierePlanificacion] = useState<boolean>(true);
  
  // Date filter state
  const defaultDates = getDefaultDateRange();
  const [startDate, setStartDate] = useState<string>(defaultDates.start);
  const [endDate, setEndDate] = useState<string>(defaultDates.end);
  
  // Training state
  const [drillDownPath, setDrillDownPath] = useState<string[]>([]);
  const [areaChartTitle, setAreaChartTitle] = useState<string>("Distribución por Tipo");
  const [intensityChartTitle, setIntensityChartTitle] = useState<string>("Progresión de Intensidad");
  const [playerSurveys, setPlayerSurveys] = useState<PostTrainingSurvey[]>([]);
  const [surveysLoading, setSurveysLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isTrainingsModalOpen, setIsTrainingsModalOpen] = useState(false);
  
  // Tournament state
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [playerDisputedTournaments, setPlayerDisputedTournaments] = useState<DisputedTournament[]>([]);
  const [isDisputedTournamentModalOpen, setIsDisputedTournamentModalOpen] = useState(false);
  const [editingDisputedTournament, setEditingDisputedTournament] = useState<DisputedTournament | null>(null);
  const [tournamentToConvert, setTournamentToConvert] = useState<Tournament | null>(null);
  
  // Planning state
  const [planLoading, setPlanLoading] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [rangoAnalisis, setRangoAnalisis] = useState(30);
  const [planificacion, setPlanificacion] = useState<TrainingPlan['planificacion']>({});
  const [isPlanningAnalysisOpen, setIsPlanningAnalysisOpen] = useState(false);
  
  // Modal state
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  // User timezone
  const userTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
      console.warn('No se pudo detectar la zona horaria, usando default');
      return 'America/Argentina/Buenos_Aires';
    }
  }, []);

  // Initialize player data
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
      setRequierePlanificacion(foundPlayer.requierePlanificacion ?? true);
    } else if (players.length > 0) {
      navigate('/players');
    }
  }, [playerId, players, navigate]);

  // Load player surveys
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

  // Load disputed tournaments
  const loadDisputedTournaments = async () => {
    if (!playerId) return;
    try {
      const disputed = await getPlayerDisputedTournaments(academiaId, playerId);
      setPlayerDisputedTournaments(disputed);
    } catch (error) {
      console.error('Error cargando torneos disputados:', error);
    }
  };

  // Load existing plan
  const loadExistingPlan = async () => {
    if (!playerId || !academiaId) return;
    
    setPlanLoading(true);
    try {
      const existingPlan = await getTrainingPlan(academiaId, playerId);
      
      if (existingPlan && existingPlan.planificacion) {
        setPlanificacion(existingPlan.planificacion);
        setRangoAnalisis(existingPlan.rangoAnalisis || 30);
      } else {
        initializeEmptyPlan();
      }
    } catch (error) {
      console.error('Error cargando plan:', error);
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

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === 'trainings' && playerId) {
      loadPlayerSurveys();
    }
  }, [activeTab, playerId, startDate, endDate]);

  useEffect(() => {
    if (activeTab === 'tournaments' && playerId) {
      loadDisputedTournaments();
    }
  }, [activeTab, playerId]);

  useEffect(() => {
    if (activeTab === 'planificacion' && playerId) {
      loadExistingPlan();
    }
  }, [activeTab, playerId]);

  // Planning handlers with proper typing
  const handleTipoPercentageChange = (tipo: string, value: number) => {
    setPlanificacion((prev: TrainingPlan['planificacion']) => ({
      ...prev,
      [tipo]: {
        porcentajeTotal: value,
        areas: prev[tipo]?.areas || {}
      }
    }));
  };

  const handleAreaPercentageChange = (tipo: string, area: string, value: number) => {
    setPlanificacion((prev: TrainingPlan['planificacion']) => ({
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
    setPlanificacion((prev: TrainingPlan['planificacion']) => ({
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
    return Object.values(planificacion || {}).reduce((sum: number, tipo) => {
      if (!tipo || typeof tipo.porcentajeTotal !== 'number') return sum;
      return sum + tipo.porcentajeTotal;
    }, 0);
  };

  const calculateAreasTotalPercentage = (tipo: string): number => {
    if (!planificacion[tipo]?.areas) return 0;
    return Object.values(planificacion[tipo].areas).reduce(
      (sum: number, area) => {
        if (!area || typeof area.porcentajeDelTotal !== 'number') return sum;
        return sum + area.porcentajeDelTotal;
      }, 0
    );
  };

  const calculateEjerciciosTotalPercentage = (tipo: string, area: string): number => {
    if (!planificacion[tipo]?.areas[area]?.ejercicios) return 0;
    return Object.values(planificacion[tipo].areas[area].ejercicios).reduce(
      (sum: number, ej) => {
        if (!ej || typeof ej.porcentajeDelTotal !== 'number') return sum;
        return sum + ej.porcentajeDelTotal;
      }, 0
    );
  };

  const hasDetailAtLevel = (tipo: string, area?: string): boolean => {
    if (!planificacion[tipo]) return false;
    
    if (!area) {
      if (!planificacion[tipo].areas) return false;
      return Object.values(planificacion[tipo].areas).some((a: any) => 
        a && typeof a.porcentajeDelTotal === 'number' && a.porcentajeDelTotal > 0
      );
    } else {
      if (!planificacion[tipo].areas[area]?.ejercicios) return false;
      return Object.values(planificacion[tipo].areas[area].ejercicios).some((e: any) => 
        e && typeof e.porcentajeDelTotal === 'number' && e.porcentajeDelTotal > 0
      );
    }
  };

  const validateFlexiblePlan = (): { isValid: boolean; warnings: string[] } => {
    const planData: Partial<TrainingPlan> = {
      jugadorId: playerId!,
      rangoAnalisis,
      planificacion
    };
    
    const result = validatePlan(planData);
    
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

    if (validation.warnings.length > 0) {
      const confirmMessage = `Plan válido con las siguientes notas:\n\n${validation.warnings.join('\n')}\n\n¿Desea guardar el plan?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setPlanSaving(true);
    try {
      const planData = {
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

  // Computed values
  const playerAllObjectives = useMemo(() => {
    if (!objectives || !Array.isArray(objectives)) return [];
    return objectives.filter(obj => obj.jugadorId === playerId);
  }, [objectives, playerId]);

  const playerActualObjectivesCount = useMemo(() => 
    playerAllObjectives.filter(obj => obj.estado === 'actual-progreso').length, 
    [playerAllObjectives]
  );

  const playerTournaments = useMemo(() => 
    tournaments.filter(t => t.jugadorId === playerId)
      .sort((a,b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()), 
    [tournaments, playerId]
  );
  
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

  // Handlers
  const resetDateFilters = () => {
    const defaultDates = getDefaultDateRange();
    setStartDate(defaultDates.start);
    setEndDate(defaultDates.end);
  };
  
  const handleOpenAddTournamentModal = () => { 
    setEditingTournament(null); 
    setIsTournamentModalOpen(true); 
  };

  const handleEditTournamentClick = (tournament: Tournament) => { 
    setEditingTournament(tournament); 
    setIsTournamentModalOpen(true); 
  };
  
  const handleSaveTournament = async (data: Omit<Tournament, 'id'|'jugadorId'>) => { 
    if (!playerId) return;
    if (editingTournament) {
      await updateTournament(academiaId, editingTournament.id, data);
    } else {
      await addTournament(academiaId, { ...data, jugadorId: playerId });
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
      if (!playerId) return;

      if (editingDisputedTournament) {
        await updateDisputedTournament(academiaId, editingDisputedTournament.id, data);
      } else if (tournamentToConvert) {
        await convertToDisputedTournament(academiaId, tournamentToConvert, {
          resultado: data.resultado,
          nivelDificultad: data.nivelDificultad,
          evaluacionGeneral: data.evaluacionGeneral,
          observaciones: data.observaciones
        });
      } else {
        await addDisputedTournament(academiaId, { ...data, jugadorId: playerId });
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
      requierePlanificacion,
    }; 
    await updatePlayer(academiaId, player.id, profileData); 
    onDataChange(); 
    alert("Perfil actualizado."); 
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

  if (!player) return <div className="text-center py-10 text-gray-400">Cargando...</div>;
  
  if (!objectives || !sessions || !tournaments) {
    return <div className="text-center py-10 text-gray-400">Cargando datos...</div>;
  }

  const validation = validateFlexiblePlan();

  return (
    <div className="min-h-screen bg-black relative">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="fixed top-20 left-20 w-64 h-64 lg:w-96 lg:h-96 bg-green-500/5 rounded-full blur-3xl"></div>
      <div className="fixed bottom-20 right-20 w-64 h-64 lg:w-96 lg:h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Archive modal */}
        <PlayerArchiveModal
          isOpen={isArchiveModalOpen}
          onClose={() => setIsArchiveModalOpen(false)}
          onConfirm={confirmArchivePlayer}
          player={player}
        />
        
        {/* Header */}
        <ProfileHeader player={player} onArchivePlayer={handleArchivePlayer} />

        {/* Tabs */}
        <ProfileTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          playerActualObjectivesCount={playerActualObjectivesCount}
        />
        
        {/* Tab content */}
        {activeTab === "perfil" && (
          <TabPerfil
            edad={edad}
            setEdad={setEdad}
            altura={altura}
            setAltura={setAltura}
            peso={peso}
            setPeso={setPeso}
            pesoIdeal={pesoIdeal}
            setPesoIdeal={setPesoIdeal}
            brazoDominante={brazoDominante}
            setBrazoDominante={setBrazoDominante}
            canalComunicacion={canalComunicacion}
            setCanalComunicacion={setCanalComunicacion}
            ojoDominante={ojoDominante}
            setOjoDominante={setOjoDominante}
            historiaDeportiva={historiaDeportiva}
            setHistoriaDeportiva={setHistoriaDeportiva}
            lesionesActuales={lesionesActuales}
            setLesionesActuales={setLesionesActuales}
            lesionesPasadas={lesionesPasadas}
            setLesionesPasadas={setLesionesPasadas}
            frecuenciaSemanal={frecuenciaSemanal}
            setFrecuenciaSemanal={setFrecuenciaSemanal}
            requierePlanificacion={requierePlanificacion}
            setRequierePlanificacion={setRequierePlanificacion}
            onProfileSave={handleProfileSave}
          />
        )}

        {activeTab === "trainings" && (
          <TabTrainings
            playerId={playerId}
            sessions={sessions}
            dateFilteredSessions={dateFilteredSessions}
            playerSurveys={playerSurveys}
            surveysLoading={surveysLoading}
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            resetDateFilters={resetDateFilters}
            drillDownPath={drillDownPath}
            setDrillDownPath={setDrillDownPath}
            areaChartTitle={areaChartTitle}
            setAreaChartTitle={setAreaChartTitle}
            intensityChartTitle={intensityChartTitle}
            setIntensityChartTitle={setIntensityChartTitle}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            isTrainingsModalOpen={isTrainingsModalOpen}
            setIsTrainingsModalOpen={setIsTrainingsModalOpen}
            trainingsForSelectedDate={trainingsForSelectedDate}
            handleDateClick={handleDateClick}
            userTimeZone={userTimeZone}
            parseTimeToMinutes={parseTimeToMinutes}
          />
        )}

        {activeTab === "objectives" && (
          <TabObjectives
            playerId={playerId}
            playerAllObjectives={playerAllObjectives}
          />
        )}

        {activeTab === "tournaments" && (
          <TabTournaments
            playerId={playerId}
            playerTournaments={playerTournaments}
            playerDisputedTournaments={playerDisputedTournaments}
            onOpenAddTournamentModal={handleOpenAddTournamentModal}
            onEditTournamentClick={handleEditTournamentClick}
            onDeleteTournament={handleDeleteTournament}
            onOpenAddDisputedTournamentModal={handleOpenAddDisputedTournamentModal}
            onEditDisputedTournamentClick={handleEditDisputedTournamentClick}
            onConvertTournamentClick={handleConvertTournamentClick}
            onDeleteDisputedTournament={handleDeleteDisputedTournament}
            isTournamentModalOpen={isTournamentModalOpen}
            setIsTournamentModalOpen={setIsTournamentModalOpen}
            editingTournament={editingTournament}
            onSaveTournament={handleSaveTournament}
            isDisputedTournamentModalOpen={isDisputedTournamentModalOpen}
            setIsDisputedTournamentModalOpen={setIsDisputedTournamentModalOpen}
            editingDisputedTournament={editingDisputedTournament}
            tournamentToConvert={tournamentToConvert}
            onSaveDisputedTournament={handleSaveDisputedTournament}
          />
        )}

        {activeTab === "planificacion" && (
          <TabPlanning
            player={player}
            academiaId={academiaId}
            planLoading={planLoading}
            planSaving={planSaving}
            rangoAnalisis={rangoAnalisis}
            setRangoAnalisis={setRangoAnalisis}
            planificacion={planificacion}
            handleTipoPercentageChange={handleTipoPercentageChange}
            handleAreaPercentageChange={handleAreaPercentageChange}
            handleEjercicioPercentageChange={handleEjercicioPercentageChange}
            calculateTotalPercentage={calculateTotalPercentage}
            calculateAreasTotalPercentage={calculateAreasTotalPercentage}
            calculateEjerciciosTotalPercentage={calculateEjerciciosTotalPercentage}
            hasDetailAtLevel={hasDetailAtLevel}
            validation={validation}
            handleSavePlan={handleSavePlan}
            isPlanningAnalysisOpen={isPlanningAnalysisOpen}
            setIsPlanningAnalysisOpen={setIsPlanningAnalysisOpen}
          />
        )}
        
        <div className="mt-8 lg:mt-12 text-center pb-8">
          <Link to="/players" className="inline-flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors duration-200 font-medium text-lg lg:text-xl group">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 lg:w-6 lg:h-6 group-hover:-translate-x-1 transition-transform duration-200">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Volver a Jugadores</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfilePage;