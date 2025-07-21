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
    <div 
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[110] p-4"
      onClick={onClose}
    >
      {/* Efectos de fondo animados */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      {/* Contenedor del modal */}
      <div
        className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl w-[90vw] max-w-[1200px] shadow-2xl shadow-green-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl flex flex-col max-h-[90vh]">
          {/* Encabezado del Modal */}
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-800">
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
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
          
          {/* Contenido del Modal */}
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            <div className="space-y-6">
              
              {/* PRIMERA SECCIÓN: Configuración de estructura de ejercicios */}
              <ExerciseStructureConfig />

              {/* SEGUNDA SECCIÓN: Configuración de encuestas post-entrenamiento */}
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
      </div>
    </div>
  );
};