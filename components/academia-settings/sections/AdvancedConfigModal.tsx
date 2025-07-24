// components/academia-settings/sections/AdvancedConfigModal.tsx
import React from 'react';
import { AcademiaConfig } from '../../../Database/FirebaseAcademiaConfig';
import { ExerciseStructureConfig } from './ExerciseStructureConfig';
import { SurveyConfig } from './SurveyConfig';

interface AdvancedConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  surveyConfig: AcademiaConfig | null;
  loadingSurveyConfig: boolean;
  savingSurveyConfig: boolean;
  onToggleSurveys: (enabled: boolean) => void;
  onSurveyConfigChange: (key: keyof AcademiaConfig['preguntasEncuesta'], checked: boolean) => void;
  onSaveSurveyConfig: () => Promise<void>;
}

export const AdvancedConfigModal: React.FC<AdvancedConfigModalProps> = ({
  isOpen,
  onClose,
  surveyConfig,
  loadingSurveyConfig,
  savingSurveyConfig,
  onToggleSurveys,
  onSurveyConfigChange,
  onSaveSurveyConfig
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay con mayor z-index */}
      <div 
        className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[110]"
        onClick={onClose}
      />
      
      {/* Modal container */}
      <div className="fixed inset-0 flex items-center justify-center z-[111] p-4 pointer-events-none">
        <div
          className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl w-full max-w-[800px] max-h-[90vh] shadow-2xl shadow-green-500/20 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-800 flex-shrink-0">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                Configuración Avanzada
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-green-400 transition-all duration-200 hover:rotate-90 transform"
                aria-label="Cerrar modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content with scroll */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-8">
                {/* Primera sección: Estructura de ejercicios */}
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                  <ExerciseStructureConfig />
                </div>

                {/* Separador */}
                <div className="border-t border-gray-700"></div>

                {/* Segunda sección: Encuestas */}
                <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                  <SurveyConfig
                    surveyConfig={surveyConfig}
                    loading={loadingSurveyConfig}
                    saving={savingSurveyConfig}
                    onToggleSurveys={onToggleSurveys}
                    onConfigChange={onSurveyConfigChange}
                    onSave={onSaveSurveyConfig}
                  />
                </div>
              </div>
            </div>

            {/* Footer con botón de cerrar */}
            <div className="p-6 border-t border-gray-800 flex-shrink-0">
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};