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
    <div className="relative bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-[1px] rounded-2xl shadow-lg shadow-yellow-500/10 mb-4">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-4">
        <h4 className="font-bold text-yellow-300 mb-3 flex items-center gap-2">
          <span className='text-lg'>🔍</span>
          <span>Debug Info - Encuestas</span>
        </h4>
        <div className="text-sm space-y-1 text-gray-400 font-mono">
          <p>• Player ID: <span className='text-yellow-400'>{playerId || 'No definido'}</span></p>
          <p>• Fecha inicio: <span className='text-yellow-400'>{startDate || 'No definida'}</span></p>
          <p>• Fecha fin: <span className='text-yellow-400'>{endDate || 'No definida'}</span></p>
          <p>• Estado: <span className='text-yellow-400'>{loading ? 'Cargando...' : 'Completado'}</span></p>
          <p>• Encuestas cargadas: <span className='text-yellow-400'>{surveys.length}</span></p>
          
          {surveys.length > 0 && (
            <div className='pt-2'>
              <p className="font-semibold text-gray-300">Primeras 3 encuestas:</p>
              {surveys.slice(0, 3).map((survey, idx) => (
                <div key={idx} className="ml-4 mt-2 p-2 bg-gray-900 border border-gray-700/50 rounded-lg">
                  <p><span className='text-gray-500'>ID:</span> {survey.id}</p>
                  <p><span className='text-gray-500'>SessionID:</span> {survey.sessionId}</p>
                  <p><span className='text-gray-500'>Fecha:</span> {new Date(survey.fecha).toLocaleString('es-ES')}</p>
                  <p><span className='text-gray-500'>Valores:</span> CF={survey.cansancioFisico}, C={survey.concentracion}, AM={survey.actitudMental}, ST={survey.sensacionesTenisticas}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SurveyDebug;