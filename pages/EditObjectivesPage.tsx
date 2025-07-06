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
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  const getEstadoColor = (estado: ObjectiveEstado) => {
    switch(estado) {
      case 'actual-progreso': return { border: 'border-blue-500/50', bg: 'from-blue-500/10 to-indigo-500/10', text: 'text-blue-400' };
      case 'consolidacion': return { border: 'border-yellow-500/50', bg: 'from-yellow-500/10 to-orange-500/10', text: 'text-yellow-400' };
      case 'incorporado': return { border: 'border-green-500/50', bg: 'from-green-500/10 to-emerald-500/10', text: 'text-green-400' };
    }
  };

  const renderObjectiveList = (estadoToList: ObjectiveEstado) => {
    const objectives = objectivesByEstado(estadoToList);
    const colors = getEstadoColor(estadoToList);
    
    return (
      <div className="mb-8 lg:mb-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-xl lg:text-2xl font-bold ${colors.text}`}>
            {OBJECTIVE_ESTADOS[estadoToList]} ({objectives.length})
          </h3>
          {estadoToList === 'actual-progreso' && (
            <span className="text-sm lg:text-base text-gray-400">
              Máximo {MAX_ACTIVE_OBJECTIVES} objetivos
            </span>
          )}
        </div>
        
        {objectives.length > 0 ? (
          <ul className="space-y-3 lg:space-y-4">
            {objectives.map(obj => (
              <li key={obj.id} className={`group bg-gradient-to-br ${colors.bg} p-[1px] rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl`}>
                <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 lg:p-6">
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                    <Link 
                      to={`/objective/${obj.id}/edit`} 
                      className="flex-grow text-white hover:text-green-400 transition-colors duration-200 text-base lg:text-lg"
                      title="Editar detalles del objetivo"
                    >
                      {obj.textoObjetivo}
                    </Link>
                    <div className="flex gap-2 w-full lg:w-auto">
                      <button 
                        onClick={() => navigate(`/objective/${obj.id}/edit`)} 
                        className="flex-1 lg:flex-initial px-4 py-2 bg-gradient-to-r from-green-500/20 to-cyan-500/20 hover:from-green-500/30 hover:to-cyan-500/30 text-green-400 font-semibold rounded-lg transition-all duration-200 border border-green-500/30 hover:border-green-500/50"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteObjective(obj.id)} 
                        className="flex-1 lg:flex-initial px-4 py-2 bg-red-900/20 hover:bg-red-800/30 text-red-400 font-semibold rounded-lg transition-all duration-200 border border-red-800/30 hover:border-red-600/50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400 mb-2">Mover a:</p>
                    <div className="flex flex-wrap gap-2">
                      {obj.estado !== 'actual-progreso' && (
                        <button 
                          onClick={() => handleChangeEstado(obj.id, 'actual-progreso')} 
                          disabled={actualObjectivesCount >= MAX_ACTIVE_OBJECTIVES} 
                          className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 disabled:bg-gray-700/20 disabled:text-gray-500 text-blue-400 font-medium rounded-lg transition-all duration-200 border border-blue-500/30 hover:border-blue-500/50 disabled:border-gray-700 text-sm"
                        >
                          Actual/En Progreso
                        </button>
                      )}
                      {obj.estado !== 'consolidacion' && (
                        <button 
                          onClick={() => handleChangeEstado(obj.id, 'consolidacion')} 
                          className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 font-medium rounded-lg transition-all duration-200 border border-yellow-500/30 hover:border-yellow-500/50 text-sm"
                        >
                          En Consolidación
                        </button>
                      )}
                      {obj.estado !== 'incorporado' && (
                        <button 
                          onClick={() => handleChangeEstado(obj.id, 'incorporado')} 
                          className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-medium rounded-lg transition-all duration-200 border border-green-500/30 hover:border-green-500/50 text-sm"
                        >
                          Incorporado
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 lg:p-8 border border-gray-800 text-center">
            <p className="text-gray-400">No hay objetivos en este estado.</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Efectos de fondo animados sutiles */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px] bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 lg:w-[500px] lg:h-[500px] bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10 max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Header */}
        <div className="mb-8 lg:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Gestionar Objetivos
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-400">
            Jugador: <span className="text-white font-semibold">{player.name}</span>
          </p>
        </div>

        {/* Grid layout para desktop */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Columna principal */}
          <div className="lg:col-span-8">
            {/* Formulario para añadir objetivo */}
            <form onSubmit={handleAddNewObjective} className="mb-8 lg:mb-10">
              <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl shadow-2xl shadow-green-500/10">
                <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-6 lg:p-8 space-y-4">
                  <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                    Añadir Nuevo Objetivo
                  </h2>
                  <p className="text-sm lg:text-base text-gray-400">
                    El objetivo se agregará automáticamente a "Actual/En Progreso"
                  </p>
                  
                  <div>
                    <label htmlFor="objectiveText" className="block text-sm lg:text-base font-medium text-gray-400 mb-2">
                      Título del Nuevo Objetivo
                    </label>
                    <textarea
                      id="objectiveText"
                      value={newObjectiveText}
                      onChange={e => setNewObjectiveText(e.target.value)}
                      rows={3}
                      className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"
                      placeholder="Ej: Mejorar primer saque (este es solo el título, edita detalles luego)"
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    disabled={actualObjectivesCount >= MAX_ACTIVE_OBJECTIVES}
                    className="w-full px-6 py-3 lg:py-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 disabled:from-gray-700 disabled:to-gray-700 text-black disabled:text-gray-500 font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none shadow-lg shadow-green-500/25 disabled:shadow-none"
                  >
                    {actualObjectivesCount >= MAX_ACTIVE_OBJECTIVES 
                      ? `Límite alcanzado (${MAX_ACTIVE_OBJECTIVES}/${MAX_ACTIVE_OBJECTIVES})`
                      : 'Guardar Nuevo Objetivo'
                    }
                  </button>
                </div>
              </div>
            </form>

            {/* Lista de objetivos por estado */}
            <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 lg:p-8 border border-gray-800 shadow-lg">
              {renderObjectiveList('actual-progreso')}
              {renderObjectiveList('consolidacion')}
              {renderObjectiveList('incorporado')}
            </div>
          </div>

          {/* Sidebar para desktop */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="sticky top-8 space-y-6">
              {/* Panel de resumen */}
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 shadow-lg">
                <h3 className="text-xl font-semibold text-gray-300 mb-4">Resumen de Objetivos</h3>
                <div className="space-y-3">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-gray-400 text-sm mb-1">Total de objetivos</p>
                    <p className="text-2xl font-bold text-white">{playerObjectives.length}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                      <span className="text-blue-400">Actual/En Progreso</span>
                      <span className="font-bold text-white">{objectivesByEstado('actual-progreso').length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                      <span className="text-yellow-400">En Consolidación</span>
                      <span className="font-bold text-white">{objectivesByEstado('consolidacion').length}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                      <span className="text-green-400">Incorporado</span>
                      <span className="font-bold text-white">{objectivesByEstado('incorporado').length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel de información */}
              <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 shadow-lg">
                <h4 className="text-lg font-semibold text-gray-300 mb-3">Guía de Estados</h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-blue-400 font-medium">🎯 Actual/En Progreso</p>
                    <p className="text-gray-500 mt-1">Objetivos en los que se está trabajando activamente</p>
                  </div>
                  <div>
                    <p className="text-yellow-400 font-medium">⚡ En Consolidación</p>
                    <p className="text-gray-500 mt-1">Objetivos casi logrados que necesitan refuerzo</p>
                  </div>
                  <div>
                    <p className="text-green-400 font-medium">✅ Incorporado</p>
                    <p className="text-gray-500 mt-1">Objetivos completamente integrados al juego</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con enlace de retorno */}
        <div className="mt-8 lg:mt-12 text-center">
          <Link 
            to={`/player/${player.id}`} 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors duration-200 font-medium text-lg group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Volver al Perfil de {player.name}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EditObjectivesPage;