import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Player } from '../types';
import { MAX_PLAYERS_PER_SESSION } from '../constants/index';
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

  const handleSelectAll = () => {
    if (filteredPlayers.length <= MAX_PLAYERS_PER_SESSION) {
      setSelectedPlayerIds(new Set(filteredPlayers.map(p => p.id)));
    } else {
      alert(`Solo puedes seleccionar hasta ${MAX_PLAYERS_PER_SESSION} jugadores.`);
    }
  };

  const handleClearSelection = () => {
    setSelectedPlayerIds(new Set());
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Verificando sesión en curso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Efectos de fondo animados sutiles */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px] bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10 max-w-2xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header con gradiente neón */}
        <div className="text-center mb-8 lg:mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">
            Comenzar Entrenamiento
          </h1>
          <p className="text-gray-400 text-base sm:text-lg lg:text-xl xl:text-2xl mb-2">
            Selecciona de 1 a {MAX_PLAYERS_PER_SESSION} jugadores para iniciar la sesión
          </p>
        </div>

        {/* Grid layout para desktop */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 xl:gap-12">
          {/* Columna principal */}
          <div className="lg:col-span-8">
            {/* Contador de selección con acciones rápidas */}
            <div className="mb-6 lg:mb-8">
              <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl shadow-2xl shadow-green-500/10">
                <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 sm:p-6 lg:p-8">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div>
                      <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                        <span className="text-green-400">{selectedPlayerIds.size}</span>
                        <span className="text-gray-400"> / {MAX_PLAYERS_PER_SESSION}</span>
                      </p>
                      <p className="text-sm lg:text-base text-gray-400 mt-1">jugadores seleccionados</p>
                    </div>
                    <div className="flex gap-2 lg:gap-3">
                      <button
                        onClick={handleSelectAll}
                        disabled={filteredPlayers.length === 0 || filteredPlayers.length > MAX_PLAYERS_PER_SESSION}
                        className="px-4 py-2 lg:px-6 lg:py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50 disabled:border-gray-800 text-sm lg:text-base"
                      >
                        Seleccionar todos
                      </button>
                      <button
                        onClick={handleClearSelection}
                        disabled={selectedPlayerIds.size === 0}
                        className="px-4 py-2 lg:px-6 lg:py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-600 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50 disabled:border-gray-800 text-sm lg:text-base"
                      >
                        Limpiar selección
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de búsqueda mejorada */}
            <div className="mb-6 lg:mb-8">
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg">
                <div className="relative">
                  <svg className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5 lg:w-6 lg:h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input 
                    type="text" 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    placeholder="Buscar jugador activo..." 
                    className="w-full pl-10 lg:pl-12 pr-4 py-3 lg:py-4 lg:text-lg bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
            
            {/* Lista de jugadores */}
            {activePlayers.length === 0 ? (
              <div className="text-center py-12 lg:py-20">
                <svg className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto text-gray-700 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <p className="text-gray-400 text-base sm:text-lg lg:text-xl xl:text-2xl">
                  No hay jugadores activos registrados.
                </p>
              </div>
            ) : filteredPlayers.length === 0 && searchTerm ? (
              <div className="text-center py-12 lg:py-20">
                <p className="text-gray-400 text-base sm:text-lg lg:text-xl xl:text-2xl">
                  No se encontraron jugadores activos con ese nombre.
                </p>
              </div>
            ) : (
              <div className="space-y-3 lg:space-y-4 mb-8">
                {filteredPlayers.map((player) => (
                  <div key={player.id} className="group">
                    <label className={`block p-4 sm:p-5 lg:p-6 rounded-xl transition-all duration-300 cursor-pointer ${
                      selectedPlayerIds.has(player.id) 
                        ? 'bg-gradient-to-r from-green-500/20 to-cyan-500/20 border-2 border-green-400 shadow-lg shadow-green-500/20' 
                        : 'bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-gray-700 hover:shadow-lg hover:shadow-green-500/5'
                    }`}>
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={selectedPlayerIds.has(player.id)} 
                          onChange={() => handlePlayerToggle(player.id)} 
                          className="h-5 w-5 lg:h-6 lg:w-6 rounded text-green-400 bg-gray-800 border-gray-600 focus:ring-2 focus:ring-green-500/20 focus:ring-offset-0 transition-all duration-200"
                        />
                        <span className={`ml-4 text-xl sm:text-2xl lg:text-3xl font-medium transition-colors duration-200 ${
                          selectedPlayerIds.has(player.id) 
                            ? 'text-green-400' 
                            : 'text-white group-hover:text-green-400'
                        }`}>
                          {player.name}
                        </span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* Botón de iniciar entrenamiento */}
            <button 
              onClick={handleStartSession} 
              disabled={selectedPlayerIds.size === 0} 
              className="w-full px-6 py-4 lg:py-5 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 disabled:from-gray-700 disabled:to-gray-700 text-black disabled:text-gray-500 font-bold text-lg lg:text-xl xl:text-2xl rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none shadow-lg shadow-green-500/25 disabled:shadow-none"
            >
              <span className="flex items-center justify-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 lg:w-8 lg:h-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                Iniciar Entrenamiento
              </span>
            </button>
          </div>

          {/* Sidebar para desktop */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-8 space-y-6">
              {/* Panel de información */}
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 xl:p-8 border border-gray-800 shadow-lg">
                <h3 className="text-xl xl:text-2xl font-semibold text-gray-300 mb-4">Información de la Sesión</h3>
                <div className="space-y-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-gray-400 text-sm xl:text-base mb-1">Duración estimada</p>
                    <p className="text-2xl xl:text-3xl font-bold text-green-400">45-90 min</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-gray-400 text-sm xl:text-base mb-1">Jugadores activos disponibles</p>
                    <p className="text-2xl xl:text-3xl font-bold text-white">{activePlayers.length}</p>
                  </div>
                  <div className="pt-4 border-t border-gray-700">
                    <h4 className="text-sm xl:text-base font-medium text-gray-400 mb-2">Consejos para la sesión:</h4>
                    <ul className="space-y-2 text-sm xl:text-base text-gray-500">
                      <li className="flex items-start">
                        <span className="text-green-400 mr-2">•</span>
                        <span>Agrupa jugadores de nivel similar para entrenamientos más efectivos</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-400 mr-2">•</span>
                        <span>Recuerda revisar los objetivos de cada jugador antes de comenzar</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-green-400 mr-2">•</span>
                        <span>Las sesiones grupales fomentan la competitividad sana</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Jugadores seleccionados (resumen) */}
              {selectedPlayerIds.size > 0 && (
                <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 xl:p-8 border border-gray-800 shadow-lg">
                  <h3 className="text-xl xl:text-2xl font-semibold text-gray-300 mb-4">Jugadores Seleccionados</h3>
                  <ul className="space-y-2">
                    {Array.from(selectedPlayerIds).map(id => {
                      const player = players.find(p => p.id === id);
                      return player ? (
                        <li key={id} className="text-green-400 text-sm xl:text-base flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 xl:w-5 xl:h-5 mr-2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          {player.name}
                        </li>
                      ) : null;
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer con enlace de retorno */}
        <div className="mt-12 lg:mt-20 text-center pb-8">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors duration-200 font-medium text-lg lg:text-xl group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 lg:w-6 lg:h-6 group-hover:-translate-x-1 transition-transform duration-200">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Volver al Inicio</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StartTrainingPage;