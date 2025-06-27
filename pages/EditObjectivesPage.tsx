/// pages/EditObjectivesPage.tsx (Versión Completa y Final)

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Player, Objective, ObjectiveEstado } from '../types';
import { MAX_ACTIVE_OBJECTIVES, OBJECTIVE_ESTADOS } from '../constants';
import { addObjective, updateObjective, deleteObjective } from '../Database/FirebaseObjectives';

interface EditObjectivesPageProps {
  players: Player[];
  allObjectives: Objective[];
  onDataChange: () => void;
  academiaId: string;
}

const EditObjectivesPage: React.FC<EditObjectivesPageProps> = ({ players, allObjectives, onDataChange, academiaId }) => {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();

  const [player, setPlayer] = useState<Player | null>(null);
  const [newObjectiveText, setNewObjectiveText] = useState('');

  useEffect(() => {
    const foundPlayer = players.find(p => p.id === playerId);
    if (foundPlayer) {
      setPlayer(foundPlayer);
    } else {
      if(players.length > 0) navigate('/players');
    }
  }, [playerId, players, navigate]);

  const playerObjectives = allObjectives.filter(obj => obj.jugadorId === playerId);
  const objectivesByEstado = (estado: ObjectiveEstado) => playerObjectives.filter(obj => obj.estado === estado);
  
  const actualObjectivesCount = objectivesByEstado('actual-progreso').length;

  const handleAddNewObjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newObjectiveText.trim()) {
        alert('El texto del objetivo no puede estar vacío.');
        return;
    };
    if (actualObjectivesCount >= MAX_ACTIVE_OBJECTIVES) {
      alert(`No puedes tener más de ${MAX_ACTIVE_OBJECTIVES} objetivos en 'Actual/En Progreso'.`);
      return;
    }
    const newObj: Omit<Objective, 'id'> = {
      jugadorId: playerId!,
      textoObjetivo: newObjectiveText.trim(),
      estado: 'actual-progreso',
      cuerpoObjetivo: ''
    };
    await addObjective(academiaId, newObj);
    setNewObjectiveText('');
    onDataChange();
  };
  
  const handleDeleteObjective = async (objectiveId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este objetivo?')) {
      await deleteObjective(academiaId, objectiveId);
      onDataChange();
    }
  };

  const handleChangeEstado = async (objectiveId: string, newEstado: ObjectiveEstado) => {
    if (newEstado === 'actual-progreso' && actualObjectivesCount >= MAX_ACTIVE_OBJECTIVES) {
      alert(`No puedes tener más de ${MAX_ACTIVE_OBJECTIVES} objetivos en 'Actual/En Progreso'.`);
      return;
    }
    await updateObjective(academiaId, objectiveId, { estado: newEstado });
    onDataChange();
  };

  if (!player) {
    return <div className="text-center py-10 text-app-secondary">Cargando...</div>;
  }

  const renderObjectiveList = (estadoToList: ObjectiveEstado) => {
    const objectives = objectivesByEstado(estadoToList);
    return (
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-app-accent mb-3">{OBJECTIVE_ESTADOS[estadoToList]} ({objectives.length})</h3>
        {estadoToList === 'actual-progreso' && <p className="text-sm text-app-secondary mb-2">Máximo {MAX_ACTIVE_OBJECTIVES} objetivos.</p>}
        {objectives.length > 0 ? (
          <ul className="space-y-3">
            {objectives.map(obj => (
              <li key={obj.id} className="p-4 rounded-md shadow bg-app-surface-alt">
                <div className="flex justify-between items-start space-x-3">
                    <Link to={`/objective/${obj.id}/edit`} className="flex-grow text-app-primary hover:text-app-accent" title="Editar detalles del objetivo">
                        {obj.textoObjetivo}
                    </Link>
                    <div className="flex-shrink-0 space-x-2 flex items-center">
                         <button onClick={() => navigate(`/objective/${obj.id}/edit`)} className="p-1.5 app-button btn-primary text-white rounded">Editar</button>
                         <button onClick={() => handleDeleteObjective(obj.id)} className="p-1.5 app-button btn-danger text-white rounded">Eliminar</button>
                    </div>
                </div>
                <div className="mt-3 pt-2 border-t border-app flex flex-wrap gap-2 text-xs">
                    Mover a:
                    {obj.estado !== 'actual-progreso' && <button onClick={() => handleChangeEstado(obj.id, 'actual-progreso')} disabled={actualObjectivesCount >= MAX_ACTIVE_OBJECTIVES} className="py-1 px-2 app-button bg-blue-500 rounded">Actual/En Progreso</button>}
                    {obj.estado !== 'consolidacion' && <button onClick={() => handleChangeEstado(obj.id, 'consolidacion')} className="py-1 px-2 app-button bg-yellow-500 rounded">En Consolidación</button>}
                    {obj.estado !== 'incorporado' && <button onClick={() => handleChangeEstado(obj.id, 'incorporado')} className="py-1 px-2 app-button bg-green-500 rounded">Incorporado</button>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-app-secondary">No hay objetivos en este estado.</p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-app-accent mb-2">Gestionar Objetivos</h1>
      <p className="text-xl text-app-secondary mb-8">Jugador: {player.name}</p>

      <form onSubmit={handleAddNewObjective} className="bg-app-surface p-6 rounded-lg shadow-lg mb-8 space-y-4">
        <h2 className="text-2xl font-semibold text-app-accent mb-3">Añadir Nuevo Objetivo (a "Actual/En Progreso")</h2>
        <div>
          <label htmlFor="objectiveText" className="block text-sm font-medium text-app-secondary mb-1">
            Título del Nuevo Objetivo
          </label>
          <textarea
            id="objectiveText"
            value={newObjectiveText}
            onChange={e => setNewObjectiveText(e.target.value)}
            rows={2}
            className="w-full p-2 app-input rounded-md"
            placeholder="Ej: Mejorar primer saque (este es solo el título, edita detalles luego)"
          />
        </div>
        <button type="submit" className="app-button btn-success text-white font-semibold py-2 px-4 rounded-lg w-full"
            disabled={actualObjectivesCount >= MAX_ACTIVE_OBJECTIVES}>
          Guardar Nuevo Objetivo en "Actual/En Progreso"
        </button>
      </form>

      <div className="bg-app-surface p-6 rounded-lg shadow-lg">
        {renderObjectiveList('actual-progreso')}
        {renderObjectiveList('consolidacion')}
        {renderObjectiveList('incorporado')}
      </div>

      <div className="mt-8">
        <Link to={`/player/${player.id}`} className="app-link font-medium">
            &larr; Volver al Perfil de {player.name}
        </Link>
      </div>
    </div>
  );
};

export default EditObjectivesPage;