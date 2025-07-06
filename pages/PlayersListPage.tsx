import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Player, Academia } from '../types';
import { addPlayer, updatePlayer } from '../Database/FirebasePlayers';

interface PlayersListPageProps {
  players: Player[];
  onDataChange: () => void;
  academiaId: string;
  academiaActual?: Academia;
}

const PlayersListPage: React.FC<PlayersListPageProps> = ({ players, onDataChange, academiaId, academiaActual }) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) {
      alert('El nombre del jugador no puede estar vacío.');
      return;
    }

    if (academiaActual?.tipo === 'grupo-entrenamiento' && academiaActual.limiteJugadores) {
      const jugadoresActivos = players.filter(p => p.estado === 'activo').length;
      if (jugadoresActivos >= academiaActual.limiteJugadores) {
        alert(`Este grupo de entrenamiento personal tiene un límite de ${academiaActual.limiteJugadores} jugadores activos. Para agregar un nuevo jugador, primero archiva uno existente.`);
        return;
      }
    }

    const newPlayer: Omit<Player, "id"> = {
      name: newPlayerName.trim(),
      estado: 'activo',
    };
    await addPlayer(academiaId, newPlayer);
    setNewPlayerName('');
    onDataChange(); 
  };

  const handleStartEdit = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditingName(player.name);
  };

  const handleCancelEdit = () => {
    setEditingPlayerId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (playerId: string) => {
    if (!editingName.trim()) {
      alert('El nombre no puede estar vacío.');
      return;
    }
    await updatePlayer(academiaId, playerId, { name: editingName.trim() });
    setEditingPlayerId(null);
    setEditingName('');
    onDataChange();
  };

  const filteredPlayers = useMemo(() => {
    return players
      .filter(player => player.estado === 'activo')
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter(player =>
        player.name && player.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [players, searchTerm]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Efectos de fondo animados sutiles - escalan con la pantalla */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px] bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10 max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 xl:py-16">
        {/* Header con gradiente neón elegante - más grande en desktop */}
        <div className="text-center mb-8 lg:mb-16">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">
            Lista de Jugadores
          </h1>
          <p className="text-gray-400 text-base sm:text-lg lg:text-xl xl:text-2xl">Gestiona los jugadores activos de tu academia</p>
        </div>

        {/* Grid layout para desktop */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 xl:gap-12">
          {/* Columna principal */}
          <div className="lg:col-span-8">
            {/* Formulario para agregar jugador */}
            <form onSubmit={handleAddPlayer} className="mb-6 lg:mb-8">
              <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl shadow-2xl shadow-green-500/10">
                <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 sm:p-6 lg:p-8">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-300 mb-4">Agregar Nuevo Jugador</h2>
                  <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
                    <input
                      type="text"
                      value={newPlayerName}
                      onChange={e => setNewPlayerName(e.target.value)}
                      placeholder="Nombre del nuevo jugador"
                      className="flex-grow px-4 py-3 lg:px-6 lg:py-4 lg:text-lg bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                      aria-label="Nombre del nuevo jugador"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
                    >
                      <span className="flex items-center gap-2 lg:text-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 lg:w-6 lg:h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Agregar Jugador
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Barra de búsqueda */}
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
                    placeholder="Buscar jugador activo por nombre..."
                    className="w-full pl-10 lg:pl-12 pr-4 py-3 lg:py-4 lg:text-lg bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                    aria-label="Buscar jugador"
                  />
                </div>
              </div>
            </div>

            {/* Lista de jugadores */}
            {filteredPlayers.length === 0 ? (
              <div className="text-center py-12 lg:py-20">
                <svg className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto text-gray-700 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
                <p className="text-gray-400 text-base sm:text-lg lg:text-xl xl:text-2xl">
                  {searchTerm ? "No se encontraron jugadores activos con ese nombre." : "No hay jugadores activos registrados. ¡Agrega uno nuevo!"}
                </p>
              </div>
            ) : (
              <div className="space-y-3 lg:space-y-4">
                {filteredPlayers.map((player) => (
                  <div key={player.id} className="group">
                    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 hover:border-gray-700 shadow-lg hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300">
                      {editingPlayerId === player.id ? (
                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-grow px-4 py-2 lg:px-5 lg:py-3 lg:text-lg bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(player.id);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                          />
                          <div className="flex gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => handleSaveEdit(player.id)}
                              className="flex-1 sm:flex-initial px-4 py-2 lg:px-6 lg:py-3 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-green-500/25"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="flex-1 sm:flex-initial px-4 py-2 lg:px-6 lg:py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                          <Link 
                            to={`/player/${player.id}`} 
                            className="flex-grow group-hover:text-green-400 transition-colors duration-200"
                          >
                            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white group-hover:text-shadow-neon-sm">
                              {player.name}
                            </h3>
                            <p className="text-sm lg:text-base text-gray-500 mt-1">Click para ver perfil completo</p>
                          </Link>
                          <div className="flex gap-2 lg:gap-3 w-full sm:w-auto">
                            <button
                              onClick={() => handleStartEdit(player)}
                              className="flex-1 sm:flex-initial px-4 py-2 lg:px-6 lg:py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50"
                              aria-label={`Editar nombre de ${player.name}`}
                            >
                              <span className="flex items-center justify-center gap-2 lg:text-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 lg:w-5 lg:h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                </svg>
                                <span>Editar</span>
                              </span>
                            </button>
                            <Link 
                              to={`/player/${player.id}`} 
                              className="flex-1 sm:flex-initial px-4 py-2 lg:px-6 lg:py-3 bg-gradient-to-r from-green-500/20 to-cyan-500/20 hover:from-green-500/30 hover:to-cyan-500/30 text-green-400 font-semibold rounded-lg transition-all duration-200 border border-green-500/30 hover:border-green-500/50 flex items-center justify-center gap-2 lg:text-lg"
                              aria-label={`Ver perfil de ${player.name}`}
                            >
                              <span>Ver Perfil</span>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 lg:w-5 lg:h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar para desktop */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-8">
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 xl:p-8 border border-gray-800 shadow-lg">
                <h3 className="text-xl xl:text-2xl font-semibold text-gray-300 mb-4">Resumen</h3>
                <div className="space-y-4">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-gray-400 text-sm xl:text-base">Total de jugadores activos</p>
                    <p className="text-3xl xl:text-4xl font-bold text-green-400 mt-1">{filteredPlayers.length}</p>
                  </div>
                  {academiaActual && (
                    <div className="bg-gray-800/50 rounded-lg p-4">
                      <p className="text-gray-400 text-sm xl:text-base">Academia actual</p>
                      <p className="text-lg xl:text-xl font-semibold text-white mt-1">{academiaActual.nombre}</p>
                    </div>
                  )}
                  <div className="pt-4 border-t border-gray-700">
                    <p className="text-sm xl:text-base text-gray-500">
                      Los jugadores archivados no aparecen en esta lista. 
                      Para archivar un jugador, entra a su perfil.
                    </p>
                  </div>
                </div>
              </div>
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

export default PlayersListPage;