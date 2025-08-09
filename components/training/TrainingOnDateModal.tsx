// components/training/TrainingsOnDateModal.tsx
import { TrainingSession } from '@/types/types';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../shared/Modal';

// ✅ INTERFACE ACTUALIZADA - sessions sigue siendo prop porque viene filtrada del componente padre
interface TrainingsOnDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  sessions: TrainingSession[]; // Este componente recibe las sesiones ya filtradas por fecha
}

const TrainingsOnDateModal: React.FC<TrainingsOnDateModalProps> = ({ isOpen, onClose, date, sessions }) => {
  const navigate = useNavigate();

  if (!date) return null;

  const handleSessionClick = (sessionId: string) => {
    navigate(`/session/${sessionId}`);
    onClose();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Entrenamientos del ${formatDate(date)}`}
    >
      <div className="space-y-4">
        {sessions.length > 0 ? (
          <>
            <p className="text-gray-400 text-sm mb-6">
              {sessions.length} entrenamiento{sessions.length > 1 ? 's' : ''} registrado{sessions.length > 1 ? 's' : ''} para esta fecha
            </p>
            
            <div className="space-y-3">
              {sessions.map((session, index) => (
                <div
                  key={session.id}
                  onClick={() => handleSessionClick(session.id)}
                  className="bg-gray-800/50 hover:bg-gray-700/50 p-4 lg:p-6 rounded-lg border border-gray-700 hover:border-green-500/50 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-full border border-green-500/30 flex items-center justify-center">
                          <span className="text-green-400 font-semibold text-sm">
                            {index + 1}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors">
                          Entrenamiento #{index + 1}
                        </h3>
                      </div>
                      
                      <div className="space-y-2 text-sm lg:text-base">
                        <div className="flex items-center gap-2 text-gray-300">
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span>
                            {session.ejercicios.length} ejercicio{session.ejercicios.length !== 1 ? 's' : ''} registrado{session.ejercicios.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        {session.ejercicios.length > 0 && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>
                              Duración total: {session.ejercicios.reduce((total, ex) => total + parseInt(ex.tiempoCantidad || '0'), 0)} min
                            </span>
                          </div>
                        )}
                        
                        {session.observaciones && (
                          <div className="flex items-start gap-2 text-gray-400">
                            <svg className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                            </svg>
                            <span className="text-sm line-clamp-2">
                              {session.observaciones}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2 text-gray-400 text-sm">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            Registrado: {new Date(session.fecha).toLocaleDateString('es-ES')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Flecha indicando que es clickeable */}
                    <div className="flex-shrink-0 ml-4">
                      <svg className="w-5 h-5 text-gray-500 group-hover:text-green-400 group-hover:translate-x-1 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500 text-center">
                💡 Haz click en cualquier entrenamiento para ver sus detalles
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-800/50 rounded-full border border-gray-700 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">No hay entrenamientos</h3>
            <p className="text-gray-400">
              No se registraron entrenamientos para esta fecha.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TrainingsOnDateModal;