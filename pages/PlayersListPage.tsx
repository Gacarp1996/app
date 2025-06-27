import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Player } from '../types';
import { addPlayer, updatePlayer } from '../Database/FirebasePlayers';

interface PlayersListPageProps {
  players: Player[];
  onDataChange: () => void;
  academiaId: string; // NUEVO
}

interface PlayersListPageProps {
  players: Player[];
  onDataChange: () => void;
}

const PlayersListPage: React.FC<PlayersListPageProps> = ({ players, onDataChange }) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddPlayer = async (e: React.FormEvent) => {
  // ... validaciones ...
  await addPlayer(academiaId, newPlayer); // MODIFICADO
  // ...};

  const handleSaveEdit = async (playerId: string) => {
  // ... validaciones ...
  await updatePlayer(academiaId, playerId, { name: editingName.trim() }); // MODIFICADO
  // ...};
  
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) {
      alert('El nombre del jugador no puede estar vacío.');
      return;
    }
    const newPlayer: Omit<Player, "id"> = {
      name: newPlayerName.trim(),
      estado: 'activo',
    };
    await addPlayer(newPlayer);
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
    await updatePlayer(playerId, { name: editingName.trim() });
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl sm:text-4xl font-bold text-app-accent mb-8 text-center">Lista de Jugadores Activos</h1>

      <form onSubmit={handleAddPlayer} className="mb-6 p-4 sm:p-6 bg-app-surface rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newPlayerName}
            onChange={e => setNewPlayerName(e.target.value)}
            placeholder="Nombre del nuevo jugador"
            className="flex-grow p-3 app-input rounded-md"
            aria-label="Nombre del nuevo jugador"
          />
          <button
            type="submit"
            className="app-button btn-success text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors"
          >
            Agregar Jugador
          </button>
        </div>
      </form>

      <div className="mb-6 p-4 sm:p-6 bg-app-surface rounded-lg shadow-md">
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Buscar jugador activo por nombre..."
          className="w-full p-3 app-input rounded-md"
          aria-label="Buscar jugador"
        />
      </div>

      {filteredPlayers.length === 0 ? (
        <p className="text-app-secondary text-center py-8 text-lg">
          {searchTerm ? "No se encontraron jugadores activos con ese nombre." : "No hay jugadores activos registrados. ¡Agrega uno nuevo!"}
        </p>
      ) : (
        <ul className="space-y-4">
          {filteredPlayers.map((player) => (
            <li key={player.id} className="bg-app-surface p-4 sm:p-5 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              {editingPlayerId === player.id ? (
                // Modo edición
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-grow p-2 app-input rounded-md text-lg"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit(player.id);
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                  />
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleSaveEdit(player.id)}
                      className="app-button btn-success text-sm px-4 py-2 flex-1 sm:flex-initial"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="app-button btn-secondary text-sm px-4 py-2 flex-1 sm:flex-initial"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo normal
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center">
                  <Link 
                    to={`/player/${player.id}`} 
                    className="flex-grow text-xl sm:text-2xl font-medium text-app-primary hover:text-app-accent transition-colors"
                  >
                    {player.name}
                  </Link>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleStartEdit(player)}
                      className="app-button btn-primary text-sm px-4 py-2 flex items-center gap-2 flex-1 sm:flex-initial"
                      aria-label={`Editar nombre de ${player.name}`}
                    >
                      <span className="hidden sm:inline">✏️</span>
                      <span>Editar</span>
                    </button>
                    <Link 
                      to={`/player/${player.id}`} 
                      className="app-button btn-secondary text-sm px-4 py-2 flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                      aria-label={`Ver perfil de ${player.name}`}
                    >
                      <span className="sm:hidden">Ver Perfil</span>
                      <span className="hidden sm:inline">Ver Perfil</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </Link>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 text-center pb-8">
        <Link to="/" className="app-link font-medium text-lg">
          &larr; Volver al Inicio
        </Link>
      </div>
    </div>
  );
};

export default PlayersListPage;