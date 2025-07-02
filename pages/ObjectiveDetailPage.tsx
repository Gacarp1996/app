import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Objective, Player } from '../types';
import { updateObjective } from '../Database/FirebaseObjectives'; 
import { useTraining } from '../contexts/TrainingContext';

interface ObjectiveDetailPageProps {
  allObjectives: Objective[];
  players: Player[];
  onDataChange: () => void;
  academiaId: string;
}

const ObjectiveDetailPage: React.FC<ObjectiveDetailPageProps> = ({ allObjectives, players, onDataChange, academiaId }) => {
  const { objectiveId } = useParams<{ objectiveId: string }>();
  const navigate = useNavigate();
  
  const { isSessionActive, participants } = useTraining();

  const [objective, setObjective] = useState<Objective | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [editText, setEditText] = useState('');
  const [editBody, setEditBody] = useState('');

  useEffect(() => {
    const foundObjective = allObjectives.find(obj => obj.id === objectiveId);
    if (foundObjective) {
      setObjective(foundObjective);
      setEditText(foundObjective.textoObjetivo);
      setEditBody(foundObjective.cuerpoObjetivo || '');
      const foundPlayer = players.find(p => p.id === foundObjective.jugadorId);
      setPlayer(foundPlayer || null);
    } else {
      if (allObjectives.length > 0) navigate('/players');
    }
  }, [objectiveId, allObjectives, players, navigate]);
  
  const handleReturnToTraining = () => {
    if (participants.length > 0) {
        const playerIds = participants.map(p => p.id).join(',');
        navigate(`/training/${playerIds}`);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective) return;
    if (!editText.trim()) {
        alert('El título del objetivo no puede estar vacío.');
        return;
    }

    const updatedData = {
      textoObjetivo: editText.trim(),
      cuerpoObjetivo: editBody.trim() ? editBody.trim() : undefined
    };

    await updateObjective(academiaId, objective.id, updatedData);
    onDataChange();
    alert('Objetivo actualizado con éxito.');

    if (isSessionActive) {
      handleReturnToTraining();
    } else if (player) {
      navigate(`/player/${player.id}`);
    }
  };

  if (!objective || !player) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto shadow-lg shadow-green-500/50"></div>
          <p className="mt-4 text-gray-400">Cargando objetivo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 flex items-center justify-center relative overflow-hidden">
      {/* Efectos de fondo animados */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Encabezado */}
        <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent text-shadow-neon-sm">
              Detalle del Objetivo
            </h1>
            <p className="text-lg text-gray-400 mt-2">Jugador: {player.name}</p>
        </div>

        {/* Contenedor del formulario con borde neón */}
        <div className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl shadow-2xl shadow-green-500/20">
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl">
            <form onSubmit={handleSaveChanges} className="p-6 sm:p-8 space-y-6">
              <div>
                <label htmlFor="objectiveTitle" className="block text-sm font-medium text-gray-400 mb-2">
                  Título del Objetivo (Resumen)
                </label>
                <input
                  type="text"
                  id="objectiveTitle"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 text-lg"
                  required
                />
              </div>
              <div>
                <label htmlFor="objectiveBody" className="block text-sm font-medium text-gray-400 mb-2">
                  Descripción Detallada (Opcional)
                </label>
                <textarea
                  id="objectiveBody"
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                  placeholder="Añade aquí más detalles, criterios de éxito, etc."
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  className="app-button btn-primary w-full sm:w-auto flex-grow"
                >
                  Guardar Cambios
                </button>
                
                {isSessionActive ? (
                  <button
                    type="button"
                    onClick={handleReturnToTraining}
                    className="app-button btn-secondary w-full sm:w-auto flex-grow"
                  >
                    Volver al Entrenamiento
                  </button>
                ) : (
                  <Link
                    to={`/player/${player.id}`}
                    className="app-button btn-secondary w-full sm:w-auto flex-grow text-center"
                  >
                    Cancelar y Volver
                  </Link>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObjectiveDetailPage;