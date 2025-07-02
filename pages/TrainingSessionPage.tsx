import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, Objective, TrainingSession, Tournament, LoggedExercise } from '../types';
import { useTraining, SessionExercise } from '../contexts/TrainingContext';
import { addSession } from '../Database/FirebaseSessions';
import { addPostTrainingSurvey, checkSurveyExists } from '../Database/FirebaseSurveys';
import { NEW_EXERCISE_HIERARCHY_CONST, NEW_EXERCISE_HIERARCHY_MAPPING } from '../constants';
import ObjectiveModal from '../components/ObjectiveModal';
import Modal from '../components/Modal';
import PostTrainingSurveyModal from '../components/PostTrainingSurveyModal';

interface TrainingSessionPageProps {
  allPlayers: Player[];
  allObjectives: Objective[];
  allTournaments: Tournament[];
  onDataChange: () => void;
  academiaId: string;
}

// El modal para gestionar participantes permanece igual
interface ManageParticipantsModalProps {
    isOpen: boolean; onClose: () => void; currentParticipants: Player[];
    allPlayersFromStorage: Player[]; onRemoveParticipant: (playerId: string) => void;
    onAddParticipant: (player: Player) => void;
}
const ManageParticipantsModal: React.FC<ManageParticipantsModalProps> = ({ isOpen, onClose, currentParticipants, allPlayersFromStorage, onRemoveParticipant, onAddParticipant }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const availablePlayersToAdd = useMemo(() => {
        const currentIds = new Set(currentParticipants.map(p => p.id));
        return allPlayersFromStorage.filter(p =>
            p.estado === 'activo' && !currentIds.has(p.id) && p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [currentParticipants, allPlayersFromStorage, searchTerm]);
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Gestionar Participantes">
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div>
                    <h4 className="text-lg font-semibold text-app-accent mb-2">Participantes Actuales</h4>
                    {currentParticipants.length === 0 && <p className="text-app-secondary text-sm">No hay participantes.</p>}
                    <ul className="space-y-2">
                        {currentParticipants.map(player => (
                            <li key={player.id} className="flex justify-between items-center bg-app-surface-alt p-2 rounded">
                                <span className="text-app-primary">{player.name}</span>
                                <button onClick={() => onRemoveParticipant(player.id)} className="app-button btn-danger text-xs" disabled={currentParticipants.length <= 1}>Quitar</button>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="border-t border-app pt-4">
                    <h4 className="text-lg font-semibold text-app-accent mb-2">Agregar Jugador</h4>
                    <input type="text" placeholder="Buscar jugador..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 app-input rounded-md mb-2" />
                    <ul className="space-y-2 max-h-40 overflow-y-auto">
                        {availablePlayersToAdd.map(player => (
                            <li key={player.id} className="flex justify-between items-center bg-app-surface-alt p-2 rounded">
                                <span className="text-app-primary">{player.name}</span>
                                <button onClick={() => { onAddParticipant(player); setSearchTerm(''); }} className="app-button btn-success text-xs">+ Agregar</button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            <button onClick={onClose} className="mt-6 app-button btn-primary w-full">Cerrar</button>
        </Modal>
    );
};

const TrainingSessionPage: React.FC<TrainingSessionPageProps> = ({ allPlayers, allObjectives, allTournaments, onDataChange, academiaId }) => {
  const navigate = useNavigate();
  const { participants, setParticipants, exercises, addExercise, endSession, loadSession } = useTraining();

  // TODOS los useState deben estar ANTES de cualquier return condicional
  const [isLoading, setIsLoading] = useState(true);
  const [activePlayerIds, setActivePlayerIds] = useState<Set<string>>(new Set(participants.map(p => p.id)));
  const [isObjectiveModalOpen, setIsObjectiveModalOpen] = useState(false);
  const [isParticipantModalOpen, setIsParticipantModalOpen] = useState(false);
  const modalOpenedOnceRef = useRef(false);
  const [currentTipoKey, setCurrentTipoKey] = useState<string>('');
  const [currentAreaKey, setCurrentAreaKey] = useState<string>('');
  const [currentEjercicioName, setCurrentEjercicioName] = useState<string>('');
  const [tiempoCantidad, setTiempoCantidad] = useState<string>('');
  const [intensidad, setIntensidad] = useState<number>(5);
  const [observaciones, setObservaciones] = useState('');
  
  // Estados para las encuestas post-entrenamiento
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [currentSurveyPlayerIndex, setCurrentSurveyPlayerIndex] = useState(0);
  const [pendingSurveyPlayers, setPendingSurveyPlayers] = useState<Player[]>([]);
  const [sessionIds, setSessionIds] = useState<Map<string, string>>(new Map());
  const [askForSurveys, setAskForSurveys] = useState(true); // Opción para hacer las encuestas opcionales

  // TODOS los useMemo también deben estar antes de cualquier return
  const playerNamesDisplay = useMemo(() => participants.map(p => p.name).join(', '), [participants]);
  const singleActivePlayer = useMemo(() => (activePlayerIds.size === 1) ? participants.find(p => p.id === Array.from(activePlayerIds)[0]) : null, [activePlayerIds, participants]);
  const objectivesForSingleActivePlayer = useMemo(() => singleActivePlayer ? allObjectives.filter(obj => obj.jugadorId === singleActivePlayer.id && obj.estado === 'actual-progreso') : [], [singleActivePlayer, allObjectives]);
  
  const availableTipoKeys = Object.keys(NEW_EXERCISE_HIERARCHY_CONST);
  const availableAreaKeys = currentTipoKey ? Object.keys(NEW_EXERCISE_HIERARCHY_CONST[currentTipoKey] || {}) : [];
  const availableEjercicioNames = currentTipoKey && currentAreaKey ? NEW_EXERCISE_HIERARCHY_CONST[currentTipoKey]?.[currentAreaKey]! : [];

  // useEffect para cargar la sesión
  useEffect(() => {
    if (participants.length === 0) {
      const loaded = loadSession();
      if (!loaded) {
        navigate('/start-training');
      } else {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, [participants.length, loadSession, navigate]);

  // useEffect para actualizar activePlayerIds y mostrar modal
  useEffect(() => {
    setActivePlayerIds(new Set(participants.map(p => p.id)));
    if (participants.length > 0 && !modalOpenedOnceRef.current) {
        setIsObjectiveModalOpen(true);
        modalOpenedOnceRef.current = true;
    }
  }, [participants]);

  // Todas las funciones handler
  const handlePlayerToggleActive = (playerId: string) => {
    const newSelection = new Set(activePlayerIds);
    newSelection.has(playerId) ? newSelection.delete(playerId) : newSelection.add(playerId);
    setActivePlayerIds(newSelection);
  };

  const toggleSelectAllPlayers = () => {
    if (activePlayerIds.size === participants.length) setActivePlayerIds(new Set());
    else setActivePlayerIds(new Set(participants.map(p => p.id)));
  };
  
  const handleAddExerciseToSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTipoKey || !currentAreaKey || !currentEjercicioName || !tiempoCantidad || activePlayerIds.size === 0) {
      alert('Por favor, completa todos los campos y selecciona al menos un jugador.');
      return;
    }
    activePlayerIds.forEach(playerId => {
        const player = participants.find(p => p.id === playerId);
        if (player) {
            const newExercise: SessionExercise = {
                id: crypto.randomUUID(),
                tipo: NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP[currentTipoKey],
                area: NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP[currentAreaKey],
                ejercicio: currentEjercicioName, tiempoCantidad, intensidad,
                loggedForPlayerId: player.id, loggedForPlayerName: player.name,
            };
            addExercise(newExercise);
        }
    });
    setCurrentEjercicioName('');
    setTiempoCantidad('');
    setIntensidad(5);
  };

  const handleFinishTraining = async () => {
    if (exercises.length === 0 && !window.confirm("No has registrado ningún ejercicio. ¿Deseas finalizar de todas formas?")) return;
    
    const sessionIdsMap = new Map<string, string>();
    const sessionsToSave: Omit<TrainingSession, 'id'>[] = participants.map(player => {
        const playerExercises = exercises.filter(ex => ex.loggedForPlayerId === player.id)
            .map(({ loggedForPlayerId, loggedForPlayerName, ...rest }) => rest as LoggedExercise);
        
        return { 
            jugadorId: player.id, 
            fecha: new Date().toISOString(), 
            ejercicios: playerExercises,
            observaciones: observaciones.trim()
        };
    }).filter(session => session.ejercicios.length > 0 || (session.observaciones && session.observaciones.length > 0));

    if (sessionsToSave.length > 0) {
      // Guardar las sesiones y almacenar los IDs generados
      for (const session of sessionsToSave) {
        try {
          const sessionId = await addSession(academiaId, session);
          if (sessionId) {
            sessionIdsMap.set(session.jugadorId, sessionId);
          }
        } catch (error) {
          console.error('Error guardando sesión:', error);
        }
      }
      
      setSessionIds(sessionIdsMap);
      
      // Preguntar si quieren hacer las encuestas
      if (askForSurveys && sessionsToSave.length > 0) {
        const wantsSurveys = window.confirm(
          `Entrenamiento guardado para ${sessionsToSave.length} jugador(es).\n\n` +
          `¿Deseas completar las encuestas post-entrenamiento?\n\n` +
          `(Esto ayuda a monitorear el estado físico y mental de los jugadores)`
        );
        
        if (wantsSurveys) {
          // Preparar jugadores para encuestas
          const playersWithSessions = participants.filter(p => sessionIdsMap.has(p.id));
          setPendingSurveyPlayers(playersWithSessions);
          setCurrentSurveyPlayerIndex(0);
          setIsSurveyModalOpen(true);
          return; // No navegar todavía, esperar a que terminen las encuestas
        }
      }
      
      alert(`Entrenamiento finalizado y guardado para ${sessionsToSave.length} jugador(es).`);
      onDataChange();
    } else {
      alert("Entrenamiento finalizado. No se guardaron datos nuevos.");
    }

    endSession();
    navigate('/players');
  };

  const handleSurveySubmit = async (playerId: string, responses: {
    cansancioFisico: number;
    concentracion: number;
    actitudMental: number;
    sensacionesTenisticas: number;
  }) => {
    try {
      const sessionId = sessionIds.get(playerId);
      if (!sessionId) {
        console.error('No se encontró sessionId para el jugador:', playerId);
        return;
      }

      // CORREGIDO: Verificar si ya existe una encuesta para este jugador en el día de hoy
      const surveyDate = new Date();
      const surveyExists = await checkSurveyExists(academiaId, playerId, surveyDate);
      if (surveyExists) {
        console.log('Ya existe una encuesta para este jugador/sesión hoy');
      } else {
        await addPostTrainingSurvey(academiaId, {
          jugadorId: playerId,
          sessionId: sessionId,
          fecha: surveyDate.toISOString(),
          ...responses
        });
      }
      
      // Avanzar al siguiente jugador
      if (currentSurveyPlayerIndex < pendingSurveyPlayers.length - 1) {
        setCurrentSurveyPlayerIndex(prev => prev + 1);
      } else {
        // Todas las encuestas completadas
        setIsSurveyModalOpen(false);
        alert(`¡Excelente! Encuestas guardadas para ${pendingSurveyPlayers.length} jugador(es).`);
        onDataChange();
        endSession();
        navigate('/players');
      }
    } catch (error) {
      console.error('Error guardando encuesta:', error);
      alert('Error al guardar la encuesta. Intenta de nuevo.');
    }
  };

  const handleCloseSurveyModal = () => {
    if (window.confirm('¿Estás seguro de salir sin completar las encuestas?')) {
      setIsSurveyModalOpen(false);
      onDataChange();
      endSession();
      navigate('/players');
    }
  };

  const handleAddParticipant = (player: Player) => setParticipants(prev => [...prev, player]);
  const handleRemoveParticipant = (playerId: string) => setParticipants(prev => prev.filter(p => p.id !== playerId));

  // AHORA SÍ, después de todos los hooks, podemos hacer returns condicionales
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Cargando sesión de entrenamiento...</p>
        </div>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No se pudo cargar la sesión</p>
          <button 
            onClick={() => navigate('/start-training')} 
            className="app-button btn-primary"
          >
            Volver a Inicio
          </button>
        </div>
      </div>
    );
  }

  // Render principal del componente
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Efectos de fondo sutiles */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px] bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10 max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        <ObjectiveModal isOpen={isObjectiveModalOpen} onClose={() => setIsObjectiveModalOpen(false)} selectedPlayers={participants} allObjectives={allObjectives} allTournaments={allTournaments} />
        <ManageParticipantsModal isOpen={isParticipantModalOpen} onClose={() => setIsParticipantModalOpen(false)} currentParticipants={participants} allPlayersFromStorage={allPlayers} onRemoveParticipant={handleRemoveParticipant} onAddParticipant={handleAddParticipant} />
        
        {/* Modal de encuestas post-entrenamiento */}
        {isSurveyModalOpen && pendingSurveyPlayers[currentSurveyPlayerIndex] && (
          <PostTrainingSurveyModal
            isOpen={isSurveyModalOpen}
            onClose={handleCloseSurveyModal}
            player={pendingSurveyPlayers[currentSurveyPlayerIndex]}
            onSubmit={handleSurveySubmit}
            currentIndex={currentSurveyPlayerIndex}
            totalPlayers={pendingSurveyPlayers.length}
          />
        )}

        {/* Header mejorado */}
        <div className="mb-6 lg:mb-10">
          <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl shadow-2xl shadow-green-500/10">
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent truncate" title={playerNamesDisplay}>
                    Entrenamiento en Curso
                  </h1>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-400 mt-1 truncate" title={playerNamesDisplay}>
                    {playerNamesDisplay}
                  </p>
                </div>
                <div className="flex gap-2 lg:gap-3 flex-shrink-0">
                  <button 
                    onClick={() => setIsParticipantModalOpen(true)} 
                    className="px-4 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-400 font-semibold rounded-lg transition-all duration-200 border border-purple-500/30 hover:border-purple-500/50 text-sm lg:text-base"
                  >
                    Participantes
                  </button>
                  <button 
                    onClick={() => setIsObjectiveModalOpen(true)} 
                    className="px-4 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30 text-blue-400 font-semibold rounded-lg transition-all duration-200 border border-blue-500/30 hover:border-blue-500/50 text-sm lg:text-base"
                  >
                    Ver Info
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid principal para desktop */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Columna principal */}
          <div className="lg:col-span-8 space-y-6">
            {/* Selector de jugadores mejorado */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg lg:text-xl font-semibold text-green-400">Seleccionar Jugadores para el Ejercicio</h3>
                  <button 
                    onClick={toggleSelectAllPlayers} 
                    className="text-xs lg:text-sm px-3 py-1 lg:px-4 lg:py-2 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50"
                  >
                    {activePlayerIds.size === participants.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                  </button>
              </div>
              <div className="flex flex-wrap gap-2 lg:gap-3">
                {participants.map(player => (
                  <button 
                    key={player.id} 
                    onClick={() => handlePlayerToggleActive(player.id)}
                    className={`py-2 px-4 lg:py-3 lg:px-6 rounded-lg text-sm lg:text-base font-medium transition-all duration-200 ${
                      activePlayerIds.has(player.id) 
                        ? 'bg-gradient-to-r from-green-500/20 to-cyan-500/20 text-green-400 border border-green-400 shadow-lg shadow-green-500/20' 
                        : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 border border-gray-700'
                    }`}
                  >
                    {player.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Mostrar objetivos cuando hay un solo jugador seleccionado */}
            {singleActivePlayer && objectivesForSingleActivePlayer.length > 0 && (
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg">
                <p className="text-gray-400 text-sm lg:text-base">
                  <span className="text-green-400 font-semibold">Objetivos de {singleActivePlayer.name}:</span> {objectivesForSingleActivePlayer.map(o => o.textoObjetivo).join(', ')}
                </p>
              </div>
            )}

            {/* Formulario de ejercicio mejorado para desktop */}
            <form onSubmit={handleAddExerciseToSession} className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg space-y-6">
              <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Registrar Ejercicio</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Tipo</label>
                    <select 
                      value={currentTipoKey} 
                      onChange={e => { setCurrentTipoKey(e.target.value); setCurrentAreaKey(''); setCurrentEjercicioName(''); }} 
                      className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                    >
                      <option value="">Selecciona tipo</option>
                      {availableTipoKeys.map(tipo => (<option key={tipo} value={tipo}>{tipo}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Área</label>
                    <select 
                      value={currentAreaKey} 
                      onChange={e => { setCurrentAreaKey(e.target.value); setCurrentEjercicioName(''); }} 
                      disabled={!currentTipoKey} 
                      className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Selecciona área</option>
                      {availableAreaKeys.map(area => (<option key={area} value={area}>{area}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Ejercicio</label>
                    <select 
                      value={currentEjercicioName} 
                      onChange={e => setCurrentEjercicioName(e.target.value)} 
                      disabled={!currentAreaKey} 
                      className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Selecciona ejercicio</option>
                      {availableEjercicioNames.map(exName => (<option key={exName} value={exName}>{exName}</option>))}
                    </select>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                      <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Tiempo (minutos)</label>
                      <input 
                          type="text"
                          inputMode="numeric"
                          value={tiempoCantidad} 
                          onChange={e => setTiempoCantidad(e.target.value)} 
                          placeholder="Ej: 30" 
                          className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                      />
                  </div>
                  <div>
                      <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">
                        Intensidad 
                        <span className="text-green-400 font-bold ml-2">({intensidad}/10)</span>
                      </label>
                      <div className="relative pt-2">
                        <input 
                            type="range" 
                            min="1" 
                            max="10" 
                            value={intensidad} 
                            onChange={e => setIntensidad(Number(e.target.value))} 
                            className="w-full h-2 lg:h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
                        />
                        <div className="flex justify-between text-xs lg:text-sm text-gray-500 mt-2">
                          <span>1</span>
                          <span>5</span>
                          <span>10</span>
                        </div>
                      </div>
                  </div>
              </div>
              
              <button 
                type="submit" 
                className="w-full px-6 py-3 lg:py-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold text-base lg:text-lg rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
              >
                <span className="flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 lg:w-6 lg:h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Agregar Ejercicio
                </span>
              </button>
            </form>

            {/* Observaciones de la sesión */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg">
                <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">Observaciones de la Sesión</h2>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={4}
                  className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"
                  placeholder="Añade aquí notas sobre la actitud del jugador, condiciones climáticas, sensaciones, etc."
                />
            </div>

            {/* Configuración de encuestas */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg lg:text-xl font-semibold text-green-400">Encuestas Post-Entrenamiento</h3>
                  <p className="text-sm lg:text-base text-gray-400 mt-1">Las encuestas ayudan a monitorear el estado de los jugadores</p>
                </div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={askForSurveys}
                    onChange={(e) => setAskForSurveys(e.target.checked)}
                    className="h-5 w-5 lg:h-6 lg:w-6 rounded text-green-400 bg-gray-800 border-gray-600 focus:ring-2 focus:ring-green-500/20 focus:ring-offset-0"
                  />
                  <span className="text-sm lg:text-base text-white">Preguntar al finalizar</span>
                </label>
              </div>
            </div>
          </div>

          {/* Columna lateral - Lista de ejercicios y resumen */}
          <div className="lg:col-span-4 mt-6 lg:mt-0">
            <div className="sticky top-8 space-y-6">
              {/* Lista de ejercicios */}
              {exercises.length > 0 && (
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg">
                  <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                    Ejercicios Registrados ({exercises.length})
                  </h2>
                  <ul className="space-y-3 max-h-[400px] lg:max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {exercises.map((ex) => (
                      <li key={ex.id} className="bg-gray-800/50 p-3 lg:p-4 rounded-lg border border-gray-700">
                        <p className="font-semibold text-green-400">{ex.loggedForPlayerName}</p>
                        <p className="text-sm lg:text-base text-gray-300 mt-1">
                          {ex.tipo.toString()} - {ex.area.toString()} - {ex.ejercicio}
                        </p>
                        <p className="text-xs lg:text-sm text-gray-500 mt-1">
                          Tiempo: {ex.tiempoCantidad} min | Intensidad: {ex.intensidad}/10
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resumen de la sesión */}
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg">
                <h3 className="text-lg lg:text-xl font-semibold text-gray-300 mb-4">Resumen de la Sesión</h3>
                <div className="space-y-3">
                  <div className="bg-gray-800/50 rounded-lg p-3 lg:p-4">
                    <p className="text-gray-400 text-sm">Participantes</p>
                    <p className="text-xl lg:text-2xl font-bold text-white">{participants.length}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 lg:p-4">
                    <p className="text-gray-400 text-sm">Ejercicios registrados</p>
                    <p className="text-xl lg:text-2xl font-bold text-green-400">{exercises.length}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-3 lg:p-4">
                    <p className="text-gray-400 text-sm">Tiempo total estimado</p>
                    <p className="text-xl lg:text-2xl font-bold text-cyan-400">
                      {exercises.reduce((total, ex) => {
                        const minutes = parseInt(ex.tiempoCantidad) || 0;
                        return total + minutes;
                      }, 0)} min
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Botón de finalizar - Fijo en móvil, normal en desktop */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-lg border-t border-gray-800 lg:relative lg:mt-8 lg:p-0 lg:bg-transparent lg:backdrop-blur-none lg:border-0">
          <button 
            onClick={handleFinishTraining} 
            className="w-full px-6 py-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold text-lg lg:text-xl rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/25"
          >
            <span className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
              </svg>
              Finalizar y Guardar
            </span>
          </button>
        </div>
        
        {/* Espaciado extra en móvil para el botón fijo */}
        <div className="h-20 lg:hidden"></div>
      </div>
    </div>
  );
};

export default TrainingSessionPage;