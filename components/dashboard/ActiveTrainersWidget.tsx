import React from 'react';

interface ActiveTrainer {
  id: string;
  name: string;
  email: string;
  sessionsToday: number;
}

interface ActiveTrainersWidgetProps {
  activeTrainers: ActiveTrainer[];
}

const ActiveTrainersWidget: React.FC<ActiveTrainersWidgetProps> = ({ activeTrainers }) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">Entrenadores Activos</h3>
      </div>
      
      {activeTrainers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No hay entrenadores activos hoy</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeTrainers.slice(0, 5).map((trainer) => (
            <div key={trainer.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div>
                  <p className="text-white font-medium">{trainer.name}</p>
                  <p className="text-xs text-gray-400">{trainer.sessionsToday} sesiones hoy</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          ))}
          {activeTrainers.length > 5 && (
            <p className="text-center text-sm text-gray-400 mt-3">
              +{activeTrainers.length - 5} entrenadores más
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ActiveTrainersWidget;