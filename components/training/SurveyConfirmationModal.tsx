import React from 'react';
import Modal from '../shared/Modal';

interface SurveyConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  playersCount: number;
}

const SurveyConfirmationModal: React.FC<SurveyConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  playersCount
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Completar Encuestas Post-Entrenamiento"
    >
      <div className="space-y-6">
        {/* Icono y mensaje principal */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-green-500/20 to-cyan-500/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3-6h3.75m-3 3h3.75m-3 3h3.75M9 21H6.75A2.25 2.25 0 014.5 18.75V6.75A2.25 2.25 0 016.75 4.5h10.5A2.25 2.25 0 0119.5 6.75v12A2.25 2.25 0 0117.25 21H9z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Entrenamiento Finalizado
          </h3>
          <p className="text-gray-400">
            Entrenamiento guardado para {playersCount} {playersCount === 1 ? 'jugador' : 'jugadores'}.
          </p>
        </div>

        {/* Información sobre las encuestas */}
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-lg border border-blue-500/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-blue-400 mb-1">¿Por qué completar las encuestas?</h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                Las encuestas post-entrenamiento nos ayudan a monitorear el estado físico y mental de los jugadores, 
                permitiendo ajustar futuros entrenamientos para un mejor rendimiento.
              </p>
            </div>
          </div>
        </div>

        {/* Información sobre las preguntas */}
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <h4 className="font-medium text-gray-300 mb-3">Se evaluarán estos aspectos:</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-gray-400">Energía Física</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-gray-400">Concentración</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span className="text-gray-400">Actitud Mental</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span className="text-gray-400">Sensaciones Tenísticas</span>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
          >
            Completar Encuestas
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-gray-600"
          >
            Omitir por Ahora
          </button>
        </div>

        {/* Nota al pie */}
        <p className="text-xs text-gray-500 text-center">
          Las encuestas toman aproximadamente 1-2 minutos por jugador
        </p>
      </div>
    </Modal>
  );
};

export default SurveyConfirmationModal;
