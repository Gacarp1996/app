import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Player, Objective, TrainingSession, Tournament, ObjectiveEstado, TrainingType, TrainingArea, ChartDataPoint, LoggedExercise, IntensityDataPoint, PostTrainingSurvey } from '../types';
import { OBJECTIVE_ESTADOS, MAX_ACTIVE_OBJECTIVES, EXERCISE_HIERARCHY } from '../constants';
import AreaPieChart from '../components/AreaPieChart';
import IntensityLineChart from '../components/IntensityLineChart';
import TournamentFormModal from '../components/TournamentFormModal';
import Modal from '../components/Modal';
import SurveyVisualization from '../components/SurveyVisualization';
import { addTournament, updateTournament, deleteTournament } from '../Database/FirebaseTournaments';
import { updatePlayer } from '../Database/FirebasePlayers';
import { deleteSession } from '../Database/FirebaseSessions';
import { getPlayerSurveys } from '../Database/FirebaseSurveys';


interface PlayerProfilePageProps {
  players: Player[];
  objectives: Objective[];
  sessions: TrainingSession[];
  tournaments: Tournament[];
  onDataChange: () => void;
  academiaId: string; // NUEVO
}

type Tab = "perfil" | "trainings" | "objectives" | "tournaments";

// Función helper para parsear el tiempo y convertirlo a minutos
const parseTimeToMinutes = (tiempoCantidad: string): number => {
  // Eliminar espacios y convertir a minúsculas
  const cleanTime = tiempoCantidad.trim().toLowerCase();
  
  // Si es solo un número, asumimos que son minutos
  const pureNumber = parseFloat(cleanTime);
  if (!isNaN(pureNumber) && cleanTime === pureNumber.toString()) {
    return pureNumber;
  }
  
  // Buscar patrones como "20m", "20min", "20 minutos", etc.
  const minuteMatch = cleanTime.match(/(\d+\.?\d*)\s*(m|min|mins|minuto|minutos)/);
  if (minuteMatch) {
    return parseFloat(minuteMatch[1]);
  }
  
  // Buscar patrones de horas como "1h", "1.5h", "1 hora", etc.
  const hourMatch = cleanTime.match(/(\d+\.?\d*)\s*(h|hr|hrs|hora|horas)/);
  if (hourMatch) {
    return parseFloat(hourMatch[1]) * 60;
  }
  
  // Buscar patrones como "1h 30m" o "1:30"
  const mixedMatch = cleanTime.match(/(\d+)\s*(h|hr|hrs|hora|horas)?\s*:?\s*(\d+)\s*(m|min|mins|minuto|minutos)?/);
  if (mixedMatch) {
    const hours = parseFloat(mixedMatch[1]) || 0;
    const minutes = parseFloat(mixedMatch[3]) || 0;
    return hours * 60 + minutes;
  }
  
  // Si no podemos parsear, devolver 0 (o podrías devolver 1 para contar al menos como 1 minuto)
  return 0;
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
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [drillDownPath, setDrillDownPath] = useState<string[]>([]);
  const [areaChartTitle, setAreaChartTitle] = useState<string>("Distribución por Tipo");
  const [intensityChartTitle, setIntensityChartTitle] = useState<string>("Progresión de Intensidad");
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<Tournament | null>(null);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

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

  const playerAllObjectives = useMemo(() => objectives.filter(obj => obj.jugadorId === playerId), [objectives, playerId]);
  const playerActualObjectivesCount = useMemo(() => playerAllObjectives.filter(obj => obj.estado === 'actual-progreso').length, [playerAllObjectives]);
  const playerTournaments = useMemo(() => tournaments.filter(t => t.jugadorId === playerId).sort((a,b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()), [tournaments, playerId]);
  
  const dateFilteredSessions = useMemo(() => {
    let s = sessions.filter(s => s.jugadorId === playerId);
    if (startDate) { const start = new Date(startDate); start.setHours(0,0,0,0); s = s.filter(session => new Date(session.fecha) >= start); }
    if (endDate) { const end = new Date(endDate); end.setHours(23,59,59,999); s = s.filter(session => new Date(session.fecha) <= end); }
    return s.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }, [sessions, playerId, startDate, endDate]);

  // MODIFICADO: Ahora suma los tiempos en lugar de contar ejercicios
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
  const resetDateFilters = () => { setStartDate(''); setEndDate(''); };
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
  
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("¿Estás seguro de que quieres eliminar este entrenamiento? Esta acción no se puede deshacer.")) {
      await deleteSession(academiaId, sessionId);
      onDataChange();
      alert("Entrenamiento eliminado.");
    }
  };

  if (!player) return <div className="text-center py-10 text-app-secondary">Cargando...</div>;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <Modal isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} title="Confirmar Archivar">
        <p>¿Archivar a <strong>{player.name}</strong>?</p>
        <div className="flex justify-end space-x-3 mt-4"><button onClick={() => setIsArchiveModalOpen(false)} className="app-button btn-secondary">Cancelar</button><button onClick={confirmArchivePlayer} className="app-button btn-warning">Sí, Archivar</button></div>
      </Modal>
      {isTournamentModalOpen && playerId && <TournamentFormModal isOpen={isTournamentModalOpen} onClose={() => setIsTournamentModalOpen(false)} onSave={handleSaveTournament} playerId={playerId} existingTournament={editingTournament} />}

      <div className="mb-6 p-6 sm:p-8 bg-app-surface rounded-lg shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-3xl sm:text-4xl font-bold text-app-accent mb-2 break-words">{player.name}</h1>
              <p className="text-sm sm:text-base text-app-secondary">
                <span className="inline-block px-3 py-1 rounded-full bg-app-surface-alt">
                  Estado: <span className="font-medium">{player.estado}</span>
                </span>
              </p>
            </div>
            {player.estado === 'activo' && (
              <button 
                onClick={handleArchivePlayer} 
                className="app-button btn-warning w-full sm:w-auto px-4 py-2 text-sm sm:text-base"
              >
                Archivar Jugador
              </button>
            )}
        </div>
      </div>

      <div className="mb-6 border-b border-app overflow-x-auto">
        <nav className="flex space-x-1 sm:space-x-4 min-w-max px-2 sm:px-0">
          <button onClick={() => setActiveTab("perfil")} className={`py-3 px-3 sm:px-4 font-medium text-sm sm:text-base ${activeTab === "perfil" ? "border-b-2 border-app-accent text-app-accent" : "text-app-secondary"}`}>Perfil</button>
          <button onClick={() => setActiveTab("trainings")} className={`py-3 px-3 sm:px-4 font-medium text-sm sm:text-base ${activeTab === "trainings" ? "border-b-2 border-app-accent text-app-accent" : "text-app-secondary"}`}>Entrenamientos</button>
          <button onClick={() => setActiveTab("objectives")} className={`py-3 px-3 sm:px-4 font-medium text-sm sm:text-base ${activeTab === "objectives" ? "border-b-2 border-app-accent text-app-accent" : "text-app-secondary"}`}>Objetivos ({playerActualObjectivesCount}/{MAX_ACTIVE_OBJECTIVES})</button>
          <button onClick={() => setActiveTab("tournaments")} className={`py-3 px-3 sm:px-4 font-medium text-sm sm:text-base ${activeTab === "tournaments" ? "border-b-2 border-app-accent text-app-accent" : "text-app-secondary"}`}>Torneos</button>
        </nav>
      </div>
      
      {activeTab === "perfil" && (
        <section className="bg-app-surface p-4 sm:p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl sm:text-3xl font-semibold text-app-accent mb-6 sm:mb-8">Información Detallada</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
            {/* Datos Físicos */}
            <div className="bg-app-surface-alt p-5 sm:p-6 rounded-lg space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold text-app-accent border-b pb-3 mb-4">Datos Físicos</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-secondary mb-2">Edad</label>
                  <input type="number" value={edad} onChange={e => setEdad(Number(e.target.value))} className="w-full p-3 app-input rounded-md"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-secondary mb-2">Altura (cm)</label>
                  <input type="number" value={altura} onChange={e => setAltura(Number(e.target.value))} className="w-full p-3 app-input rounded-md"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-secondary mb-2">Peso (kg)</label>
                  <input type="number" value={peso} onChange={e => setPeso(Number(e.target.value))} className="w-full p-3 app-input rounded-md"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-secondary mb-2">Peso Ideal (kg)</label>
                  <input type="number" value={pesoIdeal} onChange={e => setPesoIdeal(Number(e.target.value))} className="w-full p-3 app-input rounded-md"/>
                </div>
              </div>
            </div>
            
            {/* Dominancias */}
            <div className="bg-app-surface-alt p-5 sm:p-6 rounded-lg space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold text-app-accent border-b pb-3 mb-4">Dominancias</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-secondary mb-2">Brazo Dominante</label>
                  <select value={brazoDominante} onChange={e => setBrazoDominante(e.target.value as any)} className="w-full p-3 app-input rounded-md">
                    <option>Derecho</option>
                    <option>Izquierdo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-secondary mb-2">Ojo Dominante</label>
                  <select value={ojoDominante} onChange={e => setOjoDominante(e.target.value as any)} className="w-full p-3 app-input rounded-md">
                    <option>Derecho</option>
                    <option>Izquierdo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-app-secondary mb-2">Canal Comunicación</label>
                  <input type="text" value={canalComunicacion} onChange={e => setCanalComunicacion(e.target.value)} className="w-full p-3 app-input rounded-md"/>
                </div>
              </div>
            </div>
            
            {/* Entrenamiento */}
            <div className="bg-app-surface-alt p-5 sm:p-6 rounded-lg space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold text-app-accent border-b pb-3 mb-4">Entrenamiento</h3>
              <div>
                <label className="block text-sm font-medium text-app-secondary mb-2">Frecuencia Semanal</label>
                <textarea value={frecuenciaSemanal} onChange={e => setFrecuenciaSemanal(e.target.value)} rows={6} className="w-full p-3 app-input rounded-md resize-none"/>
              </div>
            </div>
          </div>
          
          {/* Historia y Lesiones */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 mt-8 sm:mt-10">
            <div className="bg-app-surface-alt p-5 sm:p-6 rounded-lg">
              <h3 className="text-lg sm:text-xl font-semibold text-app-accent mb-4">Historia Deportiva</h3>
              <textarea value={historiaDeportiva} onChange={e => setHistoriaDeportiva(e.target.value)} rows={6} className="w-full p-3 app-input rounded-md resize-none"/>
            </div>
            <div className="bg-app-surface-alt p-5 sm:p-6 rounded-lg space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold text-app-accent mb-4">Historial de Lesiones</h3>
              <div>
                <label className="block text-sm font-medium text-app-secondary mb-2">Lesiones Actuales</label>
                <textarea value={lesionesActuales} onChange={e => setLesionesActuales(e.target.value)} rows={3} className="w-full p-3 app-input rounded-md resize-none"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-app-secondary mb-2">Lesiones Pasadas</label>
                <textarea value={lesionesPasadas} onChange={e => setLesionesPasadas(e.target.value)} rows={3} className="w-full p-3 app-input rounded-md resize-none"/>
              </div>
            </div>
          </div>
          
          <div className="mt-8 sm:mt-10 text-center sm:text-right">
            <button onClick={handleProfileSave} className="app-button btn-success px-6 py-3 text-base sm:text-lg font-semibold">
              Guardar Cambios del Perfil
            </button>
          </div>
        </section>
      )}

      {activeTab === "trainings" && (
        <section>
          <div className="bg-app-surface p-4 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-semibold text-app-accent mb-3">Filtrar por Fecha</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
              <div><label htmlFor="startDate" className="block text-sm font-medium">Desde</label><input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 app-input"/></div>
              <div><label htmlFor="endDate" className="block text-sm font-medium">Hasta</label><input type="date" id="endDate" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 app-input"/></div>
              <button onClick={resetDateFilters} className="app-button btn-secondary h-10">Limpiar</button>
            </div>
          </div>
          {dateFilteredSessions.length === 0 ? <p className="text-center p-4">No hay sesiones</p> : (
            <>
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div>
                  {drillDownPath.length > 0 && (<nav className="mb-2 text-sm"><button onClick={() => handleBreadcrumbClick(0)} className="hover:underline">Inicio</button>{drillDownPath.map((item, i) => (<span key={i}> &gt; <button onClick={() => handleBreadcrumbClick(i + 1)} className="hover:underline">{item}</button></span>))}</nav>)}
                  <AreaPieChart data={drillDownData} chartTitle={areaChartTitle} onSliceClick={handlePieSliceClick} height={384}/>
                </div>
                <IntensityLineChart data={intensityChartData} chartTitle={intensityChartTitle} />
              </div>
              <div className="bg-app-surface p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold mb-4">Sesiones Registradas ({dateFilteredSessions.length})</h3>
                <ul className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {dateFilteredSessions.map(session => (
                    <li key={session.id} className="bg-app-surface-alt p-4 rounded-md shadow group flex justify-between items-center">
                      <Link to={`/session/${session.id}`} className="flex-grow">
                        <p className="font-semibold">Fecha: {formatDate(session.fecha)}</p>
                        <p className="text-sm">Ejercicios: {session.ejercicios.length}</p>
                        <ul className="mt-1 text-xs">{session.ejercicios.map((ex: LoggedExercise, i) => <li key={i}>{ex.ejercicio}</li>)}</ul>
                      </Link>
                       <button 
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="app-button btn-danger text-xs font-bold py-1 px-2 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                        title="Eliminar permanentemente"
                      >
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === "objectives" && (
        <section className="bg-app-surface p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-semibold">Objetivos</h2><Link to={`/player/${playerId}/edit-objectives`} className="app-button btn-primary">Gestionar</Link></div>
          {(Object.keys(OBJECTIVE_ESTADOS) as ObjectiveEstado[]).map(estado => {
            const objectivesInState = playerAllObjectives.filter(obj => obj.estado === estado);
            if (objectivesInState.length === 0) return null;
            return (
              <div key={estado} className="mb-6">
                <h3 className="text-xl font-semibold border-b pb-2">{OBJECTIVE_ESTADOS[estado]} ({objectivesInState.length})</h3>
                <ul className="space-y-3 mt-3">{objectivesInState.map(obj => (<li key={obj.id} className="bg-app-surface-alt p-4 rounded"><Link to={`/objective/${obj.id}/edit`} className="text-app-primary"><p>{obj.textoObjetivo}</p></Link></li>))}</ul>
              </div>
            );
          })}
          {playerAllObjectives.length === 0 && <p>No hay objetivos.</p>}
        </section>
      )}

      {activeTab === "tournaments" && (
        <section className="bg-app-surface p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-semibold">Torneos</h2><button onClick={handleOpenAddTournamentModal} className="app-button btn-success">Agregar</button></div>
          {playerTournaments.length === 0 ? <p>No hay torneos.</p> : (
            <ul className="space-y-4">
              {playerTournaments.map(t => (<li key={t.id} className="bg-app-surface-alt p-4 rounded flex justify-between"><div><h3>{t.nombreTorneo}</h3><p>{t.gradoImportancia}</p><p>{formatDate(t.fechaInicio)} - {formatDate(t.fechaFin)}</p></div><div className="space-x-2"><button onClick={() => handleEditTournamentClick(t)} className="app-button btn-primary text-sm">Editar</button><button onClick={() => handleDeleteTournament(t.id)} className="app-button btn-danger text-sm">Eliminar</button></div></li>))}
            </ul>
          )}
        </section>
      )}
      
      <div className="mt-8 text-center pb-8"><Link to="/players" className="app-link">&larr; Volver a Jugadores</Link></div>
    </div>
  );
};

export default PlayerProfilePage;