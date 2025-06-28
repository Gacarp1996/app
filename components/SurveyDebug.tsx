// components/SurveyDebug.tsx
import React from 'react';
import { PostTrainingSurvey } from '../types';

interface SurveyDebugProps {
  surveys: PostTrainingSurvey[];
  loading: boolean;
  playerId: string | undefined;
  startDate: string;
  endDate: string;
}

const SurveyDebug: React.FC<SurveyDebugProps> = ({ 
  surveys, 
  loading, 
  playerId,
  startDate,
  endDate 
}) => {
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg mb-4">
      <h4 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
        🔍 Debug Info - Encuestas
      </h4>
      <div className="text-sm space-y-1 text-yellow-600 dark:text-yellow-400">
        <p>• Player ID: {playerId || 'No definido'}</p>
        <p>• Fecha inicio: {startDate || 'No definida'}</p>
        <p>• Fecha fin: {endDate || 'No definida'}</p>
        <p>• Estado de carga: {loading ? 'Cargando...' : 'Completado'}</p>
        <p>• Número de encuestas cargadas: {surveys.length}</p>
        {surveys.length > 0 && (
          <>
            <p className="mt-2 font-semibold">Primeras 3 encuestas:</p>
            {surveys.slice(0, 3).map((survey, idx) => (
              <div key={idx} className="ml-4 p-2 bg-yellow-100 dark:bg-yellow-800/30 rounded mt-1">
                <p>- ID: {survey.id}</p>
                <p>- SessionID: {survey.sessionId}</p>
                <p>- Fecha: {new Date(survey.fecha).toLocaleString('es-ES')}</p>
                <p>- Valores: CF={survey.cansancioFisico}, C={survey.concentracion}, 
                   AM={survey.actitudMental}, ST={survey.sensacionesTenisticas}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default SurveyDebug;