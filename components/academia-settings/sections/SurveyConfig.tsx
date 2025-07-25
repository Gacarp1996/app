// components/academia-settings/sections/SurveyConfig.tsx
import React from 'react';
import { AcademiaConfig } from '../../../Database/FirebaseAcademiaConfig';

interface SurveyConfigProps {
  surveyConfig: AcademiaConfig | null;
  loading: boolean;
  saving: boolean;
  onToggleSurveys: (enabled: boolean) => void;
  onConfigChange: (key: keyof AcademiaConfig['preguntasEncuesta'], checked: boolean) => void;
  onSave: () => Promise<void>;
}

export const SurveyConfig: React.FC<SurveyConfigProps> = ({
  surveyConfig,
  loading,
  saving,
  onToggleSurveys,
  onConfigChange,
  onSave
}) => {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
        <p className="mt-2 text-gray-400">Cargando configuración...</p>
      </div>
    );
  }

  if (!surveyConfig) {
    return (
      <div className="text-center py-8 text-gray-400">
        Error cargando la configuración de encuestas
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white text-center">
        Configuración de encuestas post-entrenamiento
      </h3>
      
      {/* Habilitar/Deshabilitar encuestas */}
      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input 
            type="checkbox" 
            checked={surveyConfig.encuestasHabilitadas}
            onChange={(e) => onToggleSurveys(e.target.checked)}
            className="w-5 h-5 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500" 
          />
          <div>
            <span className="text-white font-medium">Habilitar encuestas post-entrenamiento</span>
            <p className="text-sm text-gray-400">
              Los jugadores completarán encuestas al finalizar cada entrenamiento
            </p>
          </div>
        </label>
      </div>
      
      {surveyConfig.encuestasHabilitadas && (
        <>
          <div className="space-y-3">
            <p className="text-gray-300 font-medium">Selecciona las preguntas a incluir:</p>
            
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600 flex items-start space-x-3">
              <input 
                type="checkbox" 
                checked={surveyConfig.preguntasEncuesta.cansancioFisico}
                onChange={(e) => onConfigChange('cansancioFisico', e.target.checked)}
                className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500 mt-1 flex-shrink-0" 
              />
              <div>
                <span className="text-gray-300">Energía Física</span>
                <p className="text-sm text-gray-500">
                  ¿Cómo te sentiste físicamente durante el entrenamiento?
                </p>
              </div>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600 flex items-start space-x-3">
              <input 
                type="checkbox" 
                checked={surveyConfig.preguntasEncuesta.concentracion}
                onChange={(e) => onConfigChange('concentracion', e.target.checked)}
                className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500 mt-1 flex-shrink-0" 
              />
              <div>
                <span className="text-gray-300">Concentración</span>
                <p className="text-sm text-gray-500">
                  ¿Qué tan concentrado te sentiste durante la práctica?
                </p>
              </div>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600 flex items-start space-x-3">
              <input 
                type="checkbox" 
                checked={surveyConfig.preguntasEncuesta.actitudMental}
                onChange={(e) => onConfigChange('actitudMental', e.target.checked)}
                className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500 mt-1 flex-shrink-0" 
              />
              <div>
                <span className="text-gray-300">Actitud Mental</span>
                <p className="text-sm text-gray-500">
                  ¿Cómo evalúas tu actitud mental durante el entrenamiento?
                </p>
              </div>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600 flex items-start space-x-3">
              <input 
                type="checkbox" 
                checked={surveyConfig.preguntasEncuesta.sensacionesTenisticas}
                onChange={(e) => onConfigChange('sensacionesTenisticas', e.target.checked)}
                className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500 mt-1 flex-shrink-0" 
              />
              <div>
                <span className="text-gray-300">Sensaciones Tenísticas</span>
                <p className="text-sm text-gray-500">
                  ¿Cómo te sentiste técnicamente durante la práctica?
                </p>
              </div>
            </div>
          </div>

          {/* Información de escala */}
          <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
            <p className="text-sm text-blue-300">
              <strong>Escala de respuestas:</strong> Todas las preguntas utilizan una escala de 1 a 5, 
              donde 1 es la valoración más baja y 5 la más alta.
            </p>
          </div>

          {/* Botón para guardar */}
          <div className="flex justify-end pt-4">
            <button
              onClick={onSave}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none shadow-lg shadow-green-500/25"
            >
              {saving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};