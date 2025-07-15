import React from 'react';
import Modal from '../shared/Modal';

interface SurveyExitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
  completedSurveys: number;
  totalSurveys: number;
  currentPlayerName?: string;
}

const SurveyExitConfirmModal: React.FC<SurveyExitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmExit,
  completedSurveys,
  totalSurveys,
  currentPlayerName
}) => {
  const remainingSurveys = totalSurveys - completedSurveys;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="¿Salir sin Completar las Encuestas?"
    >
      <div className="space-y-6">
        {/* Icono de advertencia */}
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-orange-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Encuestas Incompletas
          </h3>
        </div>

        {/* Estado de progreso */}
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-300 font-medium">Progreso de Encuestas</span>
            <span className="text-sm text-gray-400">
              {completedSurveys} de {totalSurveys} completadas
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedSurveys / totalSurveys) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Información del jugador actual */}
        {currentPlayerName && remainingSurveys > 0 && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-lg border border-blue-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-blue-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <p className="text-blue-400 font-medium">Siguiente: {currentPlayerName}</p>
                <p className="text-sm text-gray-400">
                  {remainingSurveys} {remainingSurveys === 1 ? 'encuesta pendiente' : 'encuestas pendientes'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de advertencia */}
        <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 p-4 rounded-lg border border-orange-500/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-orange-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-orange-400 mb-1">Información Importante</h4>
              <p className="text-sm text-gray-300 leading-relaxed">
                Si sales ahora, perderás la oportunidad de recopilar datos valiosos sobre el estado de los jugadores. 
                Estas encuestas ayudan a mejorar futuros entrenamientos.
              </p>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
          >
            Continuar Encuestas
          </button>
          <button
            onClick={onConfirmExit}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] border border-red-500/30"
          >
            Salir de Todas Formas
          </button>
        </div>

        {/* Nota informativa */}
        {remainingSurveys > 0 && (
          <p className="text-xs text-gray-500 text-center">
            Tiempo restante estimado: {remainingSurveys * 1}-{remainingSurveys * 2} minutos
          </p>
        )}
      </div>
    </Modal>
  );
};

export default SurveyExitConfirmModal;
