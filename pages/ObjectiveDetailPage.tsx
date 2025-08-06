import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Objective } from '../types';
import { useTraining } from '../contexts/TrainingContext';
import { usePlayer } from '../contexts/PlayerContext';
import { useObjective } from '../contexts/ObjectiveContext';

// ✅ SIMPLIFICADO: Ya no necesita props obligatorias
const ObjectiveDetailPage: React.FC<{ onDataChange?: () => void }> = ({ onDataChange }) => {
  const { objectiveId } = useParams<{ objectiveId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // ✅ USAR CONTEXTOS
  const { players } = usePlayer();
  const { 
    getObjectiveById, 
    updateObjective,
    loadingObjectives 
  } = useObjective();
  const { isSessionActive, participants } = useTraining();

  const [objective, setObjective] = useState<Objective | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [editText, setEditText] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ DETECTAR SI VENIMOS DESDE UN ENTRENAMIENTO
  const isFromTraining = location.pathname.includes('/training/') || isSessionActive;

  useEffect(() => {
    if (!objectiveId) {
      navigate('/players');
      return;
    }
    
    const foundObjective = getObjectiveById(objectiveId);
    
    if (foundObjective) {
      setObjective(foundObjective);
      setEditText(foundObjective.textoObjetivo);
      setEditBody(foundObjective.cuerpoObjetivo || '');
      const foundPlayer = players.find(p => p.id === foundObjective.jugadorId);
      setPlayer(foundPlayer || null);
    } else if (!loadingObjectives) {
      navigate('/players');
    }
  }, [objectiveId, getObjectiveById, players, navigate, loadingObjectives]);
  
  // ✅ FUNCIÓN MEJORADA PARA VOLVER AL ENTRENAMIENTO
  const handleReturnToTraining = () => {
    // Si hay sesión activa, volver atrás en el historial
    if (isSessionActive || isFromTraining) {
      navigate(-1);
    } else if (participants.length > 0) {
      // Si hay participantes pero no sesión activa, intentar navegar
      const playerIds = participants.map(p => p.id).join(',');
      navigate(`/training/${playerIds}`);
    } else {
      // Si no hay nada, ir a start-training
      navigate('/start-training');
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objective) return;
    
    if (!editText.trim()) {
      setError('El título del objetivo no puede estar vacío.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updatedData = {
        textoObjetivo: editText.trim(),
        cuerpoObjetivo: editBody.trim() || undefined
      };

      await updateObjective(objective.id, updatedData);
      
      if (onDataChange) {
        await onDataChange();
      }
      
      alert('Objetivo actualizado con éxito.');

      // ✅ NAVEGACIÓN MEJORADA
      if (isFromTraining) {
        // Si venimos del entrenamiento, volver atrás
        navigate(-1);
      } else if (player) {
        // Si no, ir al perfil del jugador
        navigate(`/player/${player.id}`);
      }
    } catch (err) {
      console.error('Error actualizando objetivo:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar el objetivo');
    } finally {
      setSaving(false);
    }
  };

  // ✅ FUNCIÓN PARA CANCELAR
  const handleCancel = () => {
    if (isFromTraining) {
      navigate(-1);
    } else if (player) {
      navigate(`/player/${player.id}`);
    } else {
      navigate('/players');
    }
  };

  if (loadingObjectives || !objective || !player) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Cargando objetivo...</p>
        </div>
      </div>
    );
  }

  // ✅ DISEÑO MEJORADO
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Efectos de fondo sutiles */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 sm:w-96 sm:h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"></div>
      
      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Header mejorado */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-800/50 rounded-lg transition-colors group"
              title="Volver"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div className="text-sm text-gray-400">
              {isFromTraining ? 'Volver al entrenamiento' : `Volver al perfil de ${player.name}`}
            </div>
          </div>
          
          <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Detalle del Objetivo
          </h1>
          <p className="text-xl text-gray-400">
            Jugador: <span className="text-white font-semibold">{player.name}</span>
          </p>
        </div>
        
        {/* Mensaje de error si existe */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-red-400 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          </div>
        )}
        
        {/* Formulario mejorado */}
        <form onSubmit={handleSaveChanges} className="space-y-6">
          <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl shadow-2xl">
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-6 lg:p-8 space-y-6">
              {/* Campo de título */}
              <div>
                <label htmlFor="objectiveTitle" className="block text-sm font-medium text-gray-400 mb-2">
                  Título del Objetivo (Resumen)
                </label>
                <input
                  type="text"
                  id="objectiveTitle"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                  required
                  disabled={saving}
                  placeholder="Ej: Mejorar el primer saque"
                />
              </div>
              
              {/* Campo de descripción */}
              <div>
                <label htmlFor="objectiveBody" className="block text-sm font-medium text-gray-400 mb-2">
                  Descripción Detallada (Opcional)
                </label>
                <textarea
                  id="objectiveBody"
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  rows={6}
                  className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 resize-none"
                  placeholder="Añade aquí más detalles, criterios de éxito, ejercicios específicos, etc."
                  disabled={saving}
                />
              </div>
              
              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 disabled:from-gray-700 disabled:to-gray-700 text-black disabled:text-gray-500 font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none shadow-lg shadow-green-500/25 disabled:shadow-none"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Guardando...
                    </span>
                  ) : (
                    'Guardar Cambios'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 text-white disabled:text-gray-600 font-semibold rounded-lg transition-all duration-200 border border-gray-700"
                >
                  {isFromTraining ? 'Volver al Entrenamiento' : 'Cancelar'}
                </button>
              </div>
            </div>
          </div>
        </form>
        
        {/* Información adicional */}
        {objective.cuerpoObjetivo && (
          <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <p className="text-sm text-gray-400">
              <span className="font-medium">Nota:</span> Los cambios se guardarán inmediatamente y estarán disponibles en todas las secciones de la aplicación.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ObjectiveDetailPage;