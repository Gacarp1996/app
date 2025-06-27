import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player, Objective, TrainingSession, Tournament, LoggedExercise } from '../types';
import { useTraining, SessionExercise } from '../contexts/TrainingContext';
import { addSession } from '../Database/FirebaseSessions';
import { NEW_EXERCISE_HIERARCHY_CONST, NEW_EXERCISE_HIERARCHY_MAPPING } from '../constants';
import ObjectiveModal from '../components/ObjectiveModal';
import Modal from '../components/Modal';

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
      await Promise.all(sessionsToSave.map(session => addSession(academiaId, session)));
      alert(`Entrenamiento finalizado y guardado para ${sessionsToSave.length} jugador(es).`);
      onDataChange();
    } else {
      alert("Entrenamiento finalizado. No se guardaron datos nuevos.");
    }

    endSession();
    navigate('/players');
  };

  const handleAddParticipant = (player: Player) => setParticipants(prev => [...prev, player]);
  const handleRemoveParticipant = (playerId: string) => setParticipants(prev => prev.filter(p => p.id !== playerId));

  // AHORA SÍ, después de todos los hooks, podemos hacer returns condicionales
  if (isLoading) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent mx-auto"></div>
        <p className="mt-4 text-app-secondary">Cargando sesión de entrenamiento...</p>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-app-secondary mb-4">No se pudo cargar la sesión</p>
        <button 
          onClick={() => navigate('/start-training')} 
          className="app-button btn-primary"
        >
          Volver a Inicio
        </button>
      </div>
    );
  }

  // Render principal del componente
  return (
    <div className="max-w-4xl mx-auto pb-8">
      <ObjectiveModal isOpen={isObjectiveModalOpen} onClose={() => setIsObjectiveModalOpen(false)} selectedPlayers={participants} allObjectives={allObjectives} allTournaments={allTournaments} />
      <ManageParticipantsModal isOpen={isParticipantModalOpen} onClose={() => setIsParticipantModalOpen(false)} currentParticipants={participants} allPlayersFromStorage={allPlayers} onRemoveParticipant={handleRemoveParticipant} onAddParticipant={handleAddParticipant} />

      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-3 gap-2">
        <h1 className="text-3xl font-bold text-app-accent truncate" title={playerNamesDisplay}>Entrenamiento: {playerNamesDisplay}</h1>
        <div className="flex space-x-2 flex-shrink-0">
          <button onClick={() => setIsParticipantModalOpen(true)} className="app-button btn-special text-white font-semibold py-2 px-3 rounded-lg shadow-md flex items-center justify-center text-sm transition-colors">Participantes</button>
          <button onClick={() => setIsObjectiveModalOpen(true)} className="app-button btn-primary text-white font-semibold py-2 px-3 rounded-lg shadow-md flex items-center justify-center text-sm transition-colors">Ver Info</button>
        </div>
      </div>

      <div className="mb-4 p-3 bg-app-surface rounded-lg shadow">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-md font-semibold text-app-accent">Seleccionar Jugadores para el Ejercicio:</h3>
            <button onClick={toggleSelectAllPlayers} className="text-xs app-button btn-secondary py-1 px-2 rounded">{activePlayerIds.size === participants.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {participants.map(player => (
            <button key={player.id} onClick={() => handlePlayerToggleActive(player.id)}
              className={`py-2 px-3 rounded-md text-sm font-medium transition-all shadow-sm ${activePlayerIds.has(player.id) ? 'app-button btn-success text-white' : 'bg-app-surface-alt hover:filter hover:brightness-110'}`}>
              {player.name}
            </button>
          ))}
        </div>
      </div>
      
      {singleActivePlayer && objectivesForSingleActivePlayer.length > 0 && (<div className="mb-4 p-3 bg-app-surface rounded-lg shadow"><p className="text-app-secondary text-sm">Objetivos de {singleActivePlayer.name}: {objectivesForSingleActivePlayer.map(o => o.textoObjetivo).join(', ')}</p></div>)}

      <form onSubmit={handleAddExerciseToSession} className="bg-app-surface p-6 rounded-lg shadow-lg mb-6 space-y-4">
        <h2 className="text-2xl font-semibold text-app-accent">Registrar Ejercicio</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-app-secondary mb-1">Tipo</label><select value={currentTipoKey} onChange={e => { setCurrentTipoKey(e.target.value); setCurrentAreaKey(''); setCurrentEjercicioName(''); }} className="w-full p-2 app-input rounded-md" ><option value="">Selecciona</option>{availableTipoKeys.map(tipo => (<option key={tipo} value={tipo}>{tipo}</option>))}</select></div>
            <div><label className="block text-sm font-medium text-app-secondary mb-1">Área</label><select value={currentAreaKey} onChange={e => { setCurrentAreaKey(e.target.value); setCurrentEjercicioName(''); }} disabled={!currentTipoKey} className="w-full p-2 app-input rounded-md"><option value="">Selecciona</option>{availableAreaKeys.map(area => (<option key={area} value={area}>{area}</option>))}</select></div>
            <div><label className="block text-sm font-medium text-app-secondary mb-1">Ejercicio</label><select value={currentEjercicioName} onChange={e => setCurrentEjercicioName(e.target.value)} disabled={!currentAreaKey} className="w-full p-2 app-input rounded-md"><option value="">Selecciona</option>{availableEjercicioNames.map(exName => (<option key={exName} value={exName}>{exName}</option>))}</select></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-app-secondary mb-1">Tiempo (minutos)</label>
                <input 
                    type="text"
                    inputMode="numeric"
                    value={tiempoCantidad} 
                    onChange={e => setTiempoCantidad(e.target.value)} 
                    placeholder="Ej: 30" 
                    className="w-full p-2 app-input rounded-md" 
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-app-secondary mb-1">Intensidad ({intensidad})</label>
                <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={intensidad} 
                    onChange={e => setIntensidad(Number(e.target.value))} 
                    className="w-full h-2 rounded-lg" 
                />
            </div>
        </div>
        <button type="submit" className="w-full app-button btn-success text-white font-semibold py-2.5 px-4 rounded-lg">Agregar Ejercicio</button>
      </form>

      {exercises.length > 0 && (
        <div className="bg-app-surface p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-2xl font-semibold text-app-accent mb-4">Ejercicios en Sesión ({exercises.length})</h2>
          <ul className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {exercises.map((ex) => (
              <li key={ex.id} className="bg-app-surface-alt p-3 rounded-md shadow">
                <p className="font-semibold">{ex.loggedForPlayerName}: <span className="font-normal">{ex.tipo.toString()} - {ex.area.toString()} - {ex.ejercicio}</span></p>
                <p className="text-sm text-app-secondary">Tiempo: {ex.tiempoCantidad} min | Intensidad: {ex.intensidad}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-app-surface p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-2xl font-semibold text-app-accent mb-4">Observaciones de la Sesión</h2>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={4}
            className="w-full p-2 app-input rounded-md"
            placeholder="Añade aquí notas sobre la actitud del jugador, condiciones climáticas, sensaciones, etc."
          />
      </div>

      <button onClick={handleFinishTraining} className="w-full app-button btn-danger font-bold py-3 text-lg">Finalizar y Guardar</button>
    </div>
  );
};

export default TrainingSessionPage;