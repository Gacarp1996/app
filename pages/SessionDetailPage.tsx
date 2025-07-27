import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { TrainingSession, Player, PostTrainingSurvey } from '../types';
import { getSurveyBySessionId, addPostTrainingSurvey, updateSurvey } from '../Database/FirebaseSurveys';
import { useAcademia } from '../contexts/AcademiaContext';
import { useTraining } from '../contexts/TrainingContext';

import { NEW_EXERCISE_HIERARCHY_MAPPING } from '../constants/index';
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

  // Función para volver al perfil del jugador
  const handleGoBack = () => {
    if (player) {
      navigate(`/player/${player.id}`);
    } else {
      navigate('/players');
    }
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
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Sesión no encontrada o cargando...</p>
          <button 
            onClick={() => navigate('/players')} 
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200"
          >
            Volver a Jugadores
          </button>
        </div>
      </div>
    );
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
    <div className="min-h-screen bg-black relative">
      {/* Efectos de fondo sutiles - REDUCIDOS */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="fixed top-20 left-20 w-64 h-64 lg:w-96 lg:h-96 bg-green-500/3 rounded-full blur-3xl"></div>
      <div className="fixed bottom-20 right-20 w-64 h-64 lg:w-96 lg:h-96 bg-cyan-500/3 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        
        {/* Header con navegación - BRILLO REDUCIDO */}
        <div className="mb-6 lg:mb-8">
          <div className="bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
            
            {/* Botón volver y breadcrumb */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={handleGoBack}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200 group"
                title="Volver al perfil del jugador"
              >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span className="hidden sm:inline">Volver al Perfil</span>
              </button>
              
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm text-gray-400">
                <span>{player.name}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span>Entrenamientos</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-green-400">Detalles</span>
              </nav>
            </div>

            {/* Título y fecha */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-green-400 mb-2">
                  Detalles del Entrenamiento
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <p className="text-lg lg:text-xl text-gray-300 font-medium">
                    Jugador: {player.name}
                  </p>
                  <span className="hidden sm:inline text-gray-600">•</span>
                  <p className="text-base lg:text-lg text-gray-400">
                    {new Date(session.fecha).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              {/* Botón cerrar para escritorio */}
              <button
                onClick={handleGoBack}
                className="hidden lg:flex items-center justify-center w-10 h-10 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all duration-200"
                title="Cerrar detalles"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Botón para modificar entrenamiento */}
        <div className="mb-6">
          <button
            onClick={handleModifySession}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
          >
            <span className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Modificar entrenamiento
            </span>
          </button>
        </div>

        {/* Ejercicios realizados */}
        <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800 mb-6">
          <h2 className="text-xl lg:text-2xl font-semibold text-green-400 mb-6">Ejercicios Realizados</h2>
          {session.ejercicios.length > 0 ? (
            <div className="space-y-4">
              {session.ejercicios.map((ex, index) => (
                <div key={index} className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700 hover:border-green-500/30 transition-all duration-200">
                  <h3 className="text-lg font-medium text-white mb-2">
                    {getTypeKey(ex.tipo)} - {getAreaKey(ex.area)} - {ex.ejercicio}
                  </h3>
                  {ex.ejercicioEspecifico && (
                    <p className="text-cyan-400 font-medium mb-2">
                      Específico: {ex.ejercicioEspecifico}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-4 text-sm lg:text-base">
                    <span className="flex items-center gap-2 text-gray-300">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Tiempo: {ex.tiempoCantidad} min
                    </span>
                    <span className="flex items-center gap-2 text-gray-300">
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Intensidad: {ex.intensidad}/10
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-400 text-lg">No se registraron ejercicios en esta sesión.</p>
            </div>
          )}
        </div>

        {/* Observaciones */}
        {session.observaciones && (
          <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800 mb-6">
            <h2 className="text-xl lg:text-2xl font-semibold text-green-400 mb-4">Observaciones</h2>
            <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
              <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{session.observaciones}</p>
            </div>
          </div>
        )}

        {/* Sección de Encuesta Post-Entrenamiento */}
        <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800 mb-8">
          <h2 className="text-xl lg:text-2xl font-semibold text-green-400 mb-6">Encuesta Post-Entrenamiento</h2>
          
          {loadingSurvey ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
              <p className="mt-4 text-gray-400">Cargando encuesta...</p>
            </div>
          ) : survey ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-300 font-medium">
                  Encuesta completada el {new Date(survey.fecha).toLocaleDateString('es-ES')}
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Energía Física</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-green-400">{survey.cansancioFisico}/5</p>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i < survey.cansancioFisico ? 'bg-green-400' : 'bg-gray-600'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Concentración</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-blue-400">{survey.concentracion}/5</p>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i < survey.concentracion ? 'bg-blue-400' : 'bg-gray-600'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Actitud Mental</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-purple-400">{survey.actitudMental}/5</p>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i < survey.actitudMental ? 'bg-purple-400' : 'bg-gray-600'}`} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Sensaciones Tenísticas</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-cyan-400">{survey.sensacionesTenisticas}/5</p>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i < survey.sensacionesTenisticas ? 'bg-cyan-400' : 'bg-gray-600'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleOpenSurvey(true)}
                className="w-full sm:w-auto px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50"
              >
                Modificar encuesta
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <p className="text-gray-400 text-lg mb-4">No se ha completado la encuesta para este entrenamiento</p>
              <button
                onClick={() => handleOpenSurvey(false)}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
              >
                Realizar encuesta
              </button>
            </div>
          )}
        </div>

        {/* Link de vuelta mejorado */}
        <div className="text-center">
          <Link 
            to={`/player/${player.id}`} 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors duration-200 font-medium text-lg lg:text-xl group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 lg:w-6 lg:h-6 group-hover:-translate-x-1 transition-transform duration-200">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Volver al Perfil de {player.name}</span>
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
    </div>
  );
};

export default SessionDetailPage;