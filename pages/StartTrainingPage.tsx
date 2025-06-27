import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Player } from '../types';
import { MAX_PLAYERS_PER_SESSION } from '../constants';
import { useTraining } from '../contexts/TrainingContext';

interface StartTrainingPageProps {
  players: Player[];
}

const StartTrainingPage: React.FC<StartTrainingPageProps> = ({ players }) => {
  const { startSession, isSessionActive, endSession, loadSession, participants } = useTraining();
  const navigate = useNavigate();
  
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const hasCheckedSession = useRef(false);

  // Verificar si hay una sesión en curso al montar el componente
  useEffect(() => {
    if (!hasCheckedSession.current && isSessionActive && !isStarting) {
      hasCheckedSession.current = true;
      
      // Intentar cargar la sesión primero
      const sessionLoaded = loadSession();
      
      if (sessionLoaded && participants.length > 0) {
        // Si la sesión se cargó correctamente, preguntar al usuario
        if (window.confirm("Hemos detectado un entrenamiento en curso. ¿Deseas reanudarlo?")) {
          // Navegar directamente usando los participantes cargados
          const playerIds = participants.map(p => p.id).join(',');
          navigate(`/training/${playerIds}`);
        } else {
          // Si el usuario no quiere continuar, limpiar la sesión
          endSession();
        }
      } else {
        // Si no se pudo cargar la sesión correctamente, limpiar el estado
        endSession();
      }
    }
  }, [isSessionActive, endSession, loadSession, navigate, isStarting, participants]);

  const handleStartSession = () => {
    if (selectedPlayerIds.size === 0) {
      alert('Por favor, selecciona al menos un jugador.');
      return;
    }
    setIsStarting(true);
    const selectedPlayers = players.filter(p => selectedPlayerIds.has(p.id));
    startSession(selectedPlayers);
  };
  
  const handlePlayerToggle = (playerId: string) => {
    const newSelection = new Set(selectedPlayerIds);
    if (newSelection.has(playerId)) {
      newSelection.delete(playerId);
    } else if (newSelection.size < MAX_PLAYERS_PER_SESSION) {
      newSelection.add(playerId);
    } else {
      alert(`Puedes seleccionar un máximo de ${MAX_PLAYERS_PER_SESSION} jugadores.`);
    }
    setSelectedPlayerIds(newSelection);
  };
  
  const activePlayers = useMemo(() => {
    return players
      .filter(p => p.estado === 'activo')
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [players]);
  
  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return activePlayers;
    return activePlayers.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activePlayers, searchTerm]);

  // Mostrar loading mientras se verifica la sesión
  if (isSessionActive && !hasCheckedSession.current && !isStarting) {
    return (
      <div className="text-center py-10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent mx-auto"></div>
          <p className="mt-4 text-app-secondary">Verificando sesión en curso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-app-accent mb-6 text-center">Comenzar Entrenamiento</h1>
      <p className="text-app-secondary mb-2 text-center">Selecciona de 1 a {MAX_PLAYERS_PER_SESSION} jugadores:</p>
      <p className="text-app-secondary mb-4 text-center font-semibold">{selectedPlayerIds.size} / {MAX_PLAYERS_PER_SESSION} seleccionados</p>

      <div className="mb-6 p-4 bg-app-surface rounded-lg shadow-md">
        <input 
          type="text" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          placeholder="Buscar jugador activo..." 
          className="w-full p-2 app-input rounded-md"
        />
      </div>
      
      {activePlayers.length === 0 ? (
         <p className="text-app-secondary text-center py-4">No hay jugadores activos registrados.</p>
      ) : filteredPlayers.length === 0 && searchTerm ? (
        <p className="text-app-secondary text-center py-4">No se encontraron jugadores activos con ese nombre.</p>
      ) : (
        <ul className="space-y-3 mb-8">
          {filteredPlayers.map((player) => (
            <li key={player.id}>
              <label className={`w-full text-left p-4 rounded-lg shadow-md transition-colors flex items-center cursor-pointer ${
                selectedPlayerIds.has(player.id) 
                  ? 'bg-app-accent ring-2 text-app-on-accent' 
                  : 'bg-app-surface hover:bg-app-surface-alt'
              }`}>
                <input 
                  type="checkbox" 
                  checked={selectedPlayerIds.has(player.id)} 
                  onChange={() => handlePlayerToggle(player.id)} 
                  className="form-checkbox h-6 w-6 rounded mr-4 accent-[var(--color-accent-primary)]"
                />
                <span className="text-xl">{player.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <button 
        onClick={handleStartSession} 
        disabled={selectedPlayerIds.size === 0} 
        className="w-full app-button btn-success text-white font-bold py-3 px-4 rounded-lg"
      >
        Iniciar Entrenamiento
      </button>

      <div className="mt-8 text-center">
        <Link to="/" className="app-link font-medium">&larr; Volver al Inicio</Link>
      </div>
    </div>
  );
};

export default StartTrainingPage;