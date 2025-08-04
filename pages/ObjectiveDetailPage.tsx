import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Objective } from '../types';
import { updateObjective } from '../Database/FirebaseObjectives'; 
import { useTraining } from '../contexts/TrainingContext';
import { usePlayer } from '../contexts/PlayerContext'; // ✅ NUEVO IMPORT
import { useAcademia } from '../contexts/AcademiaContext'; // ✅ NUEVO IMPORT

// ✅ INTERFACE SIMPLIFICADA
interface ObjectiveDetailPageProps {
  allObjectives: Objective[];
  onDataChange: () => void;
}

const ObjectiveDetailPage: React.FC<ObjectiveDetailPageProps> = ({ allObjectives, onDataChange }) => {
  const { objectiveId } = useParams<{ objectiveId: string }>();
  const navigate = useNavigate();
  
  // ✅ USAR CONTEXTOS
  const { players } = usePlayer();
  const { academiaActual } = useAcademia();
  const { isSessionActive, participants } = useTraining();

  const [objective, setObjective] = useState<Objective | null>(null);
  const [player, setPlayer] = useState<any>(null); // Cambiado a any temporalmente
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
    if (!objective || !academiaActual) return;
    if (!editText.trim()) {
        alert('El título del objetivo no puede estar vacío.');
        return;
    }

    const updatedData = {
      textoObjetivo: editText.trim(),
      cuerpoObjetivo: editBody.trim() ? editBody.trim() : undefined
    };

    // ✅ USAR academiaActual.id del contexto
    await updateObjective(academiaActual.id, objective.id, updatedData);
    onDataChange();
    alert('Objetivo actualizado con éxito.');

    if (isSessionActive) {
      handleReturnToTraining();
    } else if (player) {
      navigate(`/player/${player.id}`);
    }
  };

  if (!objective || !player) {
    return <div className="text-center py-10 text-app-secondary">Cargando objetivo...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-app-accent mb-2">Detalle del Objetivo</h1>
      <p className="text-xl text-app-secondary mb-6">Jugador: {player.name}</p>
      
      <form onSubmit={handleSaveChanges} className="bg-app-surface p-6 rounded-lg shadow-xl space-y-6">
        <div>
          <label htmlFor="objectiveTitle" className="block text-sm font-medium text-app-secondary mb-1">
            Título del Objetivo (Resumen)
          </label>
          <input
            type="text"
            id="objectiveTitle"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            className="w-full p-3 app-input rounded-md text-lg"
            required
          />
        </div>
        <div>
          <label htmlFor="objectiveBody" className="block text-sm font-medium text-app-secondary mb-1">
            Descripción Detallada (Opcional)
          </label>
          <textarea
            id="objectiveBody"
            value={editBody}
            onChange={e => setEditBody(e.target.value)}
            rows={6}
            className="w-full p-3 app-input rounded-md"
            placeholder="Añade aquí más detalles, criterios de éxito, etc."
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            className="app-button btn-success text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors flex-grow"
          >
            Guardar Cambios
          </button>
          
          {isSessionActive ? (
            <button
              type="button"
              onClick={handleReturnToTraining}
              className="app-button btn-secondary text-white text-center font-semibold py-2 px-4 rounded-lg shadow-md transition-colors flex-grow"
            >
              Volver al Entrenamiento
            </button>
          ) : (
            <Link
              to={`/player/${player.id}`}
              className="app-button btn-secondary text-white text-center font-semibold py-2 px-4 rounded-lg shadow-md transition-colors flex-grow"
            >
              Cancelar y Volver
            </Link>
          )}

        </div>
      </form>
    </div>
  );
};

export default ObjectiveDetailPage;