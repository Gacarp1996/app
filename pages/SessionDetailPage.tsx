import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { TrainingSession, Player, PostTrainingSurvey } from '../types';
import { getSurveyBySessionId, addPostTrainingSurvey, updateSurvey } from '../Database/FirebaseSurveys';
import { useAcademia } from '../contexts/AcademiaContext';
import { useTraining } from '../contexts/TrainingContext';

import { NEW_EXERCISE_HIERARCHY_MAPPING } from '../constants';
import PostTrainingSurveyModal from '@/components/training/PostTrainingSurveyModal';

interface SessionDetailPageProps {
  sessions: TrainingSession[];
  players: Player[];
}

const SessionDetailPage: React.FC<SessionDetailPageProps> = ({ sessions, players }) => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { academiaActual } = useAcademia();
  const { loadSessionForEdit } = useTraining();
  
  const [survey, setSurvey] = useState<PostTrainingSurvey | null>(null);
  const [loadingSurvey, setLoadingSurvey] = useState(true);
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [isEditingSurvey, setIsEditingSurvey] = useState(false);

  const session = sessions.find(s => s.id === sessionId);
  const player = session ? players.find(p => p.id === session.jugadorId) : null;

  useEffect(() => {
    if (sessionId && academiaActual) {
      loadSurvey();
    }
  }, [sessionId, academiaActual]);

  const loadSurvey = async () => {
    if (!sessionId || !academiaActual) return;
    
    setLoadingSurvey(true);
    try {
      const surveyData = await getSurveyBySessionId(academiaActual.id, sessionId);
      setSurvey(surveyData);
    } catch (error) {
      console.error('Error cargando encuesta:', error);
    } finally {
      setLoadingSurvey(false);
    }
  };

  const handleModifySession = () => {
    if (!session || !player) return;
    
    // Convertir los ejercicios al formato del contexto
    const exercisesForContext = session.ejercicios.map(ex => ({
      ...ex,
      loggedForPlayerId: player.id,
      loggedForPlayerName: player.name
    }));
    
    // Cargar la sesión en el contexto
    loadSessionForEdit([player], exercisesForContext);
    
    // Navegar a la página de entrenamiento con un parámetro especial
    navigate(`/training/${player.id}?edit=${sessionId}`);
  };

  // CORREGIDO: Actualizado para aceptar respuestas opcionales
  const handleSurveySubmit = async (playerId: string, responses: {
    cansancioFisico?: number;
    concentracion?: number;
    actitudMental?: number;
    sensacionesTenisticas?: number;
  }) => {
    if (!academiaActual || !sessionId) return;
    
    // Validar que todas las respuestas estén presentes
    if (!responses.cansancioFisico || !responses.concentracion || 
        !responses.actitudMental || !responses.sensacionesTenisticas) {
      alert('Por favor completa todas las preguntas de la encuesta');
      return;
    }
    
    try {
      if (isEditingSurvey && survey) {
        // Actualizar encuesta existente
        await updateSurvey(academiaActual.id, survey.id, {
          cansancioFisico: responses.cansancioFisico,
          concentracion: responses.concentracion,
          actitudMental: responses.actitudMental,
          sensacionesTenisticas: responses.sensacionesTenisticas
        });
        alert('Encuesta actualizada exitosamente');
      } else {
        // Crear nueva encuesta
        await addPostTrainingSurvey(academiaActual.id, {
          jugadorId: playerId,
          sessionId: sessionId,
          fecha: new Date().toISOString(),
          cansancioFisico: responses.cansancioFisico,
          concentracion: responses.concentracion,
          actitudMental: responses.actitudMental,
          sensacionesTenisticas: responses.sensacionesTenisticas
        });
        alert('Encuesta guardada exitosamente');
      }
      
      setIsSurveyModalOpen(false);
      await loadSurvey();
    } catch (error) {
      console.error('Error guardando encuesta:', error);
      alert('Error al guardar la encuesta');
    }
  };

  const handleOpenSurvey = (editing: boolean) => {
    setIsEditingSurvey(editing);
    setIsSurveyModalOpen(true);
  };

  if (!session || !player) {
    return <div className="text-center py-10 text-app-secondary">Sesión no encontrada o cargando...</div>;
  }

  // Función para obtener el key del NEW_EXERCISE_HIERARCHY_CONST a partir del enum
  const getTypeKey = (tipo: string): string => {
  return Object.entries(NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP)
    .find(([_, value]) => value === tipo)?.[0] || tipo;
};

const getAreaKey = (area: string): string => {
  return Object.entries(NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP)
    .find(([_, value]) => value === area)?.[0] || area;
};


  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-app-accent mb-2">Detalles del Entrenamiento</h1>
      <p className="text-xl text-app-secondary mb-6">
        Jugador: {player.name} | Fecha: {new Date(session.fecha).toLocaleDateString('es-ES')}
      </p>

      {/* Botón para modificar entrenamiento */}
      <div className="mb-6">
        <button
          onClick={handleModifySession}
          className="app-button btn-primary w-full sm:w-auto"
        >
          <span className="flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Modificar entrenamiento
          </span>
        </button>
      </div>

      <div className="bg-app-surface p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-2xl font-semibold text-app-accent mb-4">Ejercicios Realizados</h2>
        {session.ejercicios.length > 0 ? (
          <ul className="space-y-3">
            {session.ejercicios.map((ex, index) => (
              <li key={index} className="bg-app-surface-alt p-4 rounded-md">
                <p className="text-app-primary font-medium">
                  {getTypeKey(ex.tipo)} - {getAreaKey(ex.area)} - {ex.ejercicio}
                </p>
                <p className="text-app-secondary text-sm mt-1">
                  Tiempo: {ex.tiempoCantidad} min | Intensidad: {ex.intensidad}/10
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-app-secondary">No se registraron ejercicios en esta sesión.</p>
        )}
      </div>

      {session.observaciones && (
        <div className="bg-app-surface p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-2xl font-semibold text-app-accent mb-4">Observaciones</h2>
          <p className="text-app-primary whitespace-pre-wrap">{session.observaciones}</p>
        </div>
      )}

      {/* Sección de Encuesta Post-Entrenamiento */}
      <div className="bg-app-surface p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-2xl font-semibold text-app-accent mb-4">Encuesta Post-Entrenamiento</h2>
        
        {loadingSurvey ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent mx-auto"></div>
            <p className="mt-2 text-app-secondary">Cargando encuesta...</p>
          </div>
        ) : survey ? (
          <div className="space-y-4">
            <p className="text-app-secondary">Encuesta completada el {new Date(survey.fecha).toLocaleDateString('es-ES')}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-app-surface-alt p-3 rounded">
                <p className="text-sm text-app-secondary">Energía Física</p>
                <p className="text-xl font-semibold text-app-accent">{survey.cansancioFisico}/5</p>
              </div>
              <div className="bg-app-surface-alt p-3 rounded">
                <p className="text-sm text-app-secondary">Concentración</p>
                <p className="text-xl font-semibold text-app-accent">{survey.concentracion}/5</p>
              </div>
              <div className="bg-app-surface-alt p-3 rounded">
                <p className="text-sm text-app-secondary">Actitud Mental</p>
                <p className="text-xl font-semibold text-app-accent">{survey.actitudMental}/5</p>
              </div>
              <div className="bg-app-surface-alt p-3 rounded">
                <p className="text-sm text-app-secondary">Sensaciones Tenísticas</p>
                <p className="text-xl font-semibold text-app-accent">{survey.sensacionesTenisticas}/5</p>
              </div>
            </div>
            
            <button
              onClick={() => handleOpenSurvey(true)}
              className="app-button btn-secondary w-full sm:w-auto"
            >
              Modificar encuesta
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-app-secondary mb-4">No se ha completado la encuesta para este entrenamiento</p>
            <button
              onClick={() => handleOpenSurvey(false)}
              className="app-button btn-success"
            >
              Realizar encuesta
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link to={`/player/${player.id}`} className="app-link font-medium">
          &larr; Volver al Perfil de {player.name}
        </Link>
      </div>

      {/* Modal de Encuesta */}
      {isSurveyModalOpen && player && (
        <PostTrainingSurveyModal
          isOpen={isSurveyModalOpen}
          onClose={() => setIsSurveyModalOpen(false)}
          player={player}
          onSubmit={handleSurveySubmit}
          currentIndex={0}
          totalPlayers={1}
          initialValues={isEditingSurvey && survey ? {
            cansancioFisico: survey.cansancioFisico,
            concentracion: survey.concentracion,
            actitudMental: survey.actitudMental,
            sensacionesTenisticas: survey.sensacionesTenisticas
          } : undefined}
        />
      )}
    </div>
  );
};

export default SessionDetailPage;