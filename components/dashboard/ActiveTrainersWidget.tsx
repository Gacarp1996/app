import React, { useState } from 'react';
import { TrainingSession, Player } from '../../types';
import { getPlayerName } from './helpers';
import { useSession } from '../../contexts/SessionContext'; // ✅ NUEVO IMPORT

interface ActiveTrainer {
  id: string;
  name: string;
  email: string;
  sessionsToday: number;
}

// ✅ INTERFACE ACTUALIZADA - Sin todaySessions prop
interface ActiveTrainersWidgetProps {
  activeTrainers: ActiveTrainer[];
  players: Player[];
}

const ActiveTrainersWidget: React.FC<ActiveTrainersWidgetProps> = ({ 
  activeTrainers,
  players
}) => {
  // ✅ OBTENER SESIONES DE HOY DEL CONTEXTO
  const { getTodaySessions } = useSession();
  const todaySessions = getTodaySessions();
  
  const [selectedTrainer, setSelectedTrainer] = useState<ActiveTrainer | null>(null);
  const [trainerSessions, setTrainerSessions] = useState<TrainingSession[]>([]);

  const handleTrainerClick = (trainer: ActiveTrainer) => {
    // Filtrar las sesiones del entrenador seleccionado
    const filteredSessions = todaySessions.filter(s => s.entrenadorId === trainer.id);
    setTrainerSessions(filteredSessions);
    setSelectedTrainer(trainer);
  };

  const closeModal = () => {
    setSelectedTrainer(null);
    setTrainerSessions([]);
  };

  
  // Agrupar sesiones por hora
  const groupSessionsByTime = (sessions: TrainingSession[]) => {
    return sessions.reduce((acc, session) => {
      // Extraer la hora de la fecha ISO
      const date = new Date(session.fecha);
      const time = date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      if (!acc[time]) {
        acc[time] = [];
      }
      acc[time].push(session);
      return acc;
    }, {} as Record<string, TrainingSession[]>);
  };

  // Obtener jugadores únicos de las sesiones
  const getUniquePlayers = (sessions: TrainingSession[]) => {
    const playerIds = [...new Set(sessions.map(s => s.jugadorId))];
    return players.filter(p => playerIds.includes(p.id));
  };

  // Calcular duración total de ejercicios
  const calculateTotalDuration = (session: TrainingSession) => {
    let totalMinutes = 0;
    session.ejercicios.forEach((ejercicio) => {
      const time = ejercicio.tiempoCantidad;
      if (time.includes(':')) {
        const [minutes, seconds] = time.split(':').map(Number);
        totalMinutes += minutes + (seconds / 60);
      } else if (time.includes("'")) {
        totalMinutes += parseInt(time.replace("'", ""));
      }
    });
    return Math.round(totalMinutes);
  };

  return (
    <>
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
              <div 
                key={trainer.id} 
                onClick={() => handleTrainerClick(trainer)}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <div>
                    <p className="text-white font-medium hover:text-green-400 transition-colors">
                      {trainer.name}
                    </p>
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

      {/* Modal de detalles del entrenador */}
      {selectedTrainer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col border border-gray-800">
            {/* Header del modal */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {selectedTrainer.name}
                  </h2>
                  <p className="text-gray-400">
                    {selectedTrainer.sessionsToday} sesiones hoy
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="flex-1 overflow-y-auto p-6">
              {trainerSessions.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No se encontraron sesiones para hoy</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Sesiones agrupadas por hora */}
                  {Object.entries(groupSessionsByTime(trainerSessions))
                    .sort(([timeA], [timeB]) => timeA.localeCompare(timeB))
                    .map(([time, sessionsGroup]) => (
                    <div key={time} className="bg-gray-800/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-green-400">{time}</h3>
                      </div>
                      
                      <div className="space-y-3 ml-7">
                        {sessionsGroup.map((session: TrainingSession) => (
                          <div key={session.id} className="border-l-2 border-gray-700 pl-4">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-white font-medium">
                                {getPlayerName(players, session.jugadorId)}
                              </p>
                              <span className="text-xs text-gray-500">
                                • {calculateTotalDuration(session)} min
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs">
                              <span className="text-gray-400">
                                {session.ejercicios.length} ejercicios
                              </span>
                              {session.observaciones && (
                                <span className="text-blue-400">
                                  • Con observaciones
                                </span>
                              )}
                            </div>
                            {/* Mostrar tipos de ejercicios */}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {[...new Set(session.ejercicios.map((e) => e.tipo))].map((tipo: string) => (
                                <span 
                                  key={tipo}
                                  className="px-2 py-1 bg-gray-700/50 text-gray-300 rounded text-xs"
                                >
                                  {tipo}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Resumen de jugadores únicos */}
                  <div className="mt-6 pt-6 border-t border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-400 mb-3">
                      JUGADORES ENTRENADOS HOY ({getUniquePlayers(trainerSessions).length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {getUniquePlayers(trainerSessions).map((player) => (
                        <span
                          key={player.id}
                          className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm hover:bg-gray-700 transition-colors"
                        >
                          {player.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Estadísticas del día */}
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Total ejercicios</p>
                      <p className="text-2xl font-bold text-white">
                        {trainerSessions.reduce((sum, s) => sum + s.ejercicios.length, 0)}
                      </p>
                    </div>
                    <div className="bg-gray-800/30 rounded-lg p-4">
                      <p className="text-gray-400 text-sm mb-1">Tiempo total</p>
                      <p className="text-2xl font-bold text-white">
                        {trainerSessions.reduce((sum, s) => sum + calculateTotalDuration(s), 0)} min
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ActiveTrainersWidget;