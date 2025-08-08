import React from 'react';
import { SessionExercise } from '../../contexts/TrainingContext';
import { Player } from '../../types';

interface SessionSummaryProps {
  exercises: SessionExercise[];
  participants: Player[];
}

const SessionSummary: React.FC<SessionSummaryProps> = ({
  exercises,
  participants
}) => {
  const totalMinutes = exercises.reduce((total, ex) => {
    const minutes = parseInt(ex.tiempoCantidad) || 0;
    return total + minutes;
  }, 0);

  return (
    <div className="lg:col-span-4 mt-6 lg:mt-0">
      <div className="sticky top-8 space-y-6">
        {/* Lista de ejercicios */}
        {exercises.length > 0 && (
          <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg">
            <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              Ejercicios Registrados ({exercises.length})
            </h2>
            <ul className="space-y-3 max-h-[400px] lg:max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {exercises.map((ex, index) => {
                // Debug log para diagnosticar datos inconsistentes
                if (!ex.tipo || !ex.area) {
                  console.warn('🚨 Ejercicio con datos incompletos:', {
                    id: ex.id,
                    tipo: ex.tipo,
                    area: ex.area,
                    ejercicio: ex.ejercicio,
                    completeObject: ex
                  });
                }
                
                return (
                  <li 
                    key={`${index}-${ex.id}`} 
                    className="bg-gray-800/50 p-3 lg:p-4 rounded-lg border border-gray-700"
                  >
                    <p className="font-semibold text-green-400">{ex.loggedForPlayerName}</p>
                    <p className="text-sm lg:text-base text-gray-300 mt-1">
                      {ex.tipo?.toString() || 'Tipo no definido'} - {ex.area?.toString() || 'Área no definida'} - {ex.ejercicio || 'Ejercicio no definido'}
                    </p>
                    {ex.ejercicioEspecifico && (
                      <p className="text-sm text-purple-400 mt-1 font-medium">
                        📋 {ex.ejercicioEspecifico}
                      </p>
                    )}
                    <p className="text-xs lg:text-sm text-gray-500 mt-1">
                      Tiempo: {ex.tiempoCantidad} min | Intensidad: {ex.intensidad}/10
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Resumen de la sesión */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg">
          <h3 className="text-lg lg:text-xl font-semibold text-gray-300 mb-4">Resumen de la Sesión</h3>
          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded-lg p-3 lg:p-4">
              <p className="text-gray-400 text-sm">Participantes</p>
              <p className="text-xl lg:text-2xl font-bold text-white">{participants.length}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 lg:p-4">
              <p className="text-gray-400 text-sm">Ejercicios registrados</p>
              <p className="text-xl lg:text-2xl font-bold text-green-400">{exercises.length}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 lg:p-4">
              <p className="text-gray-400 text-sm">Tiempo total estimado</p>
              <p className="text-xl lg:text-2xl font-bold text-cyan-400">
                {totalMinutes} min
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionSummary;