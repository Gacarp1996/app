import { rateLimiter } from '@/utils/rateLimiter';
import React from 'react';

interface SurveySettingsProps {
  askForSurveys: boolean;
  onAskForSurveysChange: (value: boolean) => void;
}

const SurveySettings: React.FC<SurveySettingsProps> = ({
  askForSurveys,
  onAskForSurveysChange
}) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg lg:text-xl font-semibold text-green-400">Encuestas Post-Entrenamiento</h3>
          <p className="text-sm lg:text-base text-gray-400 mt-1">Las encuestas ayudan a monitorear el estado de los jugadores</p>
        </div>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={askForSurveys}
            onChange={(e) => {if (!rateLimiter.canExecute('survey-settings-toggle', 1000)) {
            return;
            }
             onAskForSurveysChange(e.target.checked)
            }}
            className="h-5 w-5 lg:h-6 lg:w-6 rounded text-green-400 bg-gray-800 border-gray-600 focus:ring-2 focus:ring-green-500/20 focus:ring-offset-0"
          />
          <span className="text-sm lg:text-base text-white">Preguntar al finalizar</span>
        </label>
      </div>
    </div>
  );
};

export default SurveySettings;