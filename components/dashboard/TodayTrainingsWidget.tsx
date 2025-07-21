import React from 'react';

interface TodayTrainingsWidgetProps {
  todayTrainings: number;
}

const TodayTrainingsWidget: React.FC<TodayTrainingsWidgetProps> = ({ todayTrainings }) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">Entrenamientos Hoy</h3>
      </div>
      
      <div className="text-center">
        <p className="text-5xl font-bold text-green-400 mb-2">{todayTrainings}</p>
        <p className="text-gray-400 text-sm">
          {todayTrainings === 1 ? 'Sesión registrada' : 'Sesiones registradas'}
        </p>
        <div className="mt-4">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${
            todayTrainings > 0 ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
          }`}>
            {todayTrainings > 0 ? 'Activo' : 'Sin actividad'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TodayTrainingsWidget;