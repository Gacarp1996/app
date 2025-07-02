import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { TrainingSession, Player, PostTrainingSurvey } from '../types';
import { getSurveyBySessionId, addPostTrainingSurvey, updateSurvey } from '../Database/FirebaseSurveys';
import { useAcademia } from '../contexts/AcademiaContext';
import { useTraining } from '../contexts/TrainingContext';
import PostTrainingSurveyModal from '../components/PostTrainingSurveyModal';
import { NEW_EXERCISE_HIERARCHY_MAPPING } from '../constants';

interface SessionDetailPageProps {
  sessions: TrainingSession[];
  players: Player[];
}

const Card: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl ${className}`}>
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 h-full">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">{title}</h2>
            {children}
        </div>
    </div>
);

const SurveyStat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="bg-gray-900 border border-gray-700/50 rounded-lg p-3 text-center">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-green-400">{value}<span className="text-lg text-gray-500">/5</span></p>
    </div>
);

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
      setSurvey(await getSurveyBySessionId(academiaActual.id, sessionId));
    } catch (error) {
      console.error('Error cargando encuesta:', error);
    } finally {
      setLoadingSurvey(false);
    }
  };

  const handleModifySession = () => {
    if (!session || !player) return;
    const exercisesForContext = session.ejercicios.map(ex => ({ ...ex, loggedForPlayerId: player.id, loggedForPlayerName: player.name }));
    loadSessionForEdit([player], exercisesForContext);
    navigate(`/training/${player.id}?edit=${sessionId}`);
  };

  const handleSurveySubmit = async (playerId: string, responses: any) => {
    if (!academiaActual || !sessionId) return;
    try {
      const action = isEditingSurvey && survey 
        ? updateSurvey(academiaActual.id, survey.id, responses) 
        : addPostTrainingSurvey(academiaActual.id, { jugadorId: playerId, sessionId, fecha: new Date().toISOString(), ...responses });
      await action;
      alert(`Encuesta ${isEditingSurvey ? 'actualizada' : 'guardada'} exitosamente`);
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
  
  const getTypeKey = (tipo: string) => Object.entries(NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP).find(([_, v]) => v === tipo)?.[0] || tipo;
  const getAreaKey = (area: string) => Object.entries(NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP).find(([_, v]) => v === area)?.[0] || area;

  if (!session || !player) {
    return <div className="flex items-center justify-center min-h-screen bg-black"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div></div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        <div className="text-center">
            <h1 className="text-4xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Detalles del Entrenamiento</h1>
            <p className="text-lg text-gray-400 mt-2">
                {player.name} &bull; {new Date(session.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
        </div>

        <Card title="Acciones">
            <button onClick={handleModifySession} className="app-button btn-primary w-full sm:w-auto">
                <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                    Modificar Entrenamiento
                </span>
            </button>
        </Card>

        <Card title="Ejercicios Realizados">
          {session.ejercicios.length > 0 ? (
            <ul className="space-y-3">
              {session.ejercicios.map((ex, index) => (
                <li key={index} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700/50">
                  <p className="font-semibold text-white">{ex.ejercicio}</p>
                  <p className="text-sm text-gray-400 mt-1">{getTypeKey(ex.tipo)} &bull; {getAreaKey(ex.area)}</p>
                  <p className="text-sm text-gray-400 mt-1">Tiempo: {ex.tiempoCantidad} min | Intensidad: {ex.intensidad}/10</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-gray-500">No se registraron ejercicios en esta sesión.</p>}
        </Card>

        {session.observaciones && (
          <Card title="Observaciones"><p className="text-gray-300 whitespace-pre-wrap">{session.observaciones}</p></Card>
        )}

        <Card title="Encuesta Post-Entrenamiento">
          {loadingSurvey ? <div className="text-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500 mx-auto"></div></div> :
           survey ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SurveyStat label="Energía Física" value={survey.cansancioFisico} />
                <SurveyStat label="Concentración" value={survey.concentracion} />
                <SurveyStat label="Actitud Mental" value={survey.actitudMental} />
                <SurveyStat label="Sensaciones" value={survey.sensacionesTenisticas} />
              </div>
              <button onClick={() => handleOpenSurvey(true)} className="app-button btn-secondary w-full sm:w-auto mt-4">Modificar encuesta</button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400 mb-4">No se ha completado la encuesta.</p>
              <button onClick={() => handleOpenSurvey(false)} className="app-button btn-success">Realizar encuesta ahora</button>
            </div>
          )}
        </Card>

        <div className="mt-8 text-center"><Link to={`/player/${player.id}`} className="app-link font-medium">&larr; Volver al Perfil de {player.name}</Link></div>
      </div>

      {isSurveyModalOpen && player && (
        <PostTrainingSurveyModal
          isOpen={isSurveyModalOpen}
          onClose={() => setIsSurveyModalOpen(false)}
          player={player}
          onSubmit={handleSurveySubmit}
          initialValues={isEditingSurvey && survey ? survey : undefined}
        />
      )}
    </div>
  );
};

export default SessionDetailPage;