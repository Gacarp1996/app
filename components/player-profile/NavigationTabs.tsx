// components/player-profile/NavigationTabs.tsx
import React from 'react';
import { MAX_ACTIVE_OBJECTIVES } from '../../constants';

export type Tab = "perfil" | "trainings" | "objectives" | "tournaments" | "planificacion";

interface NavigationTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  playerActualObjectivesCount: number;
}

const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  playerActualObjectivesCount
}) => {
  return (
    <div className="mb-6 lg:mb-10 border-b border-gray-800 overflow-x-auto">
      <nav className="flex space-x-1 sm:space-x-4 lg:space-x-8 min-w-max px-2 sm:px-0">
        <button 
          onClick={() => onTabChange("perfil")} 
          className={`py-3 px-3 sm:px-4 lg:px-6 font-medium text-sm sm:text-base lg:text-lg transition-all duration-200 ${
            activeTab === "perfil" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Perfil
        </button>
        <button 
          onClick={() => onTabChange("trainings")} 
          className={`py-3 px-3 sm:px-4 lg:px-6 font-medium text-sm sm:text-base lg:text-lg transition-all duration-200 ${
            activeTab === "trainings" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Entrenamientos
        </button>
        <button 
          onClick={() => onTabChange("objectives")} 
          className={`py-3 px-3 sm:px-4 lg:px-6 font-medium text-sm sm:text-base lg:text-lg transition-all duration-200 ${
            activeTab === "objectives" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Objetivos ({playerActualObjectivesCount}/{MAX_ACTIVE_OBJECTIVES})
        </button>
        <button 
          onClick={() => onTabChange("tournaments")} 
          className={`py-3 px-3 sm:px-4 lg:px-6 font-medium text-sm sm:text-base lg:text-lg transition-all duration-200 ${
            activeTab === "tournaments" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Torneos
        </button>
        <button 
          onClick={() => onTabChange("planificacion")} 
          className={`py-3 px-3 sm:px-4 lg:px-6 font-medium text-sm sm:text-base lg:text-lg transition-all duration-200 ${
            activeTab === "planificacion" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Planificación
        </button>
      </nav>
    </div>
  );
};

export default NavigationTabs;