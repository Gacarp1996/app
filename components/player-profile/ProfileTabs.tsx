import React from 'react';
import { MAX_ACTIVE_OBJECTIVES } from '../../constants';

type Tab = "perfil" | "trainings" | "objectives" | "tournaments" | "planificacion";

interface ProfileTabsProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  playerActualObjectivesCount: number;
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({ activeTab, setActiveTab, playerActualObjectivesCount }) => {
  return (
    <div className="mb-6 lg:mb-10 border-b border-gray-800 overflow-x-auto">
      <nav className="flex space-x-1 sm:space-x-4 lg:space-x-8 min-w-max px-2 sm:px-0">
        <button 
          onClick={() => setActiveTab("perfil")} 
          className={`py-3 px-3 sm:px-4 lg:px-6 font-medium text-sm sm:text-base lg:text-lg transition-all duration-200 ${
            activeTab === "perfil" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Perfil
        </button>
        <button 
          onClick={() => setActiveTab("trainings")} 
          className={`py-3 px-3 sm:px-4 lg:px-6 font-medium text-sm sm:text-base lg:text-lg transition-all duration-200 ${
            activeTab === "trainings" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Entrenamientos
        </button>
        <button 
          onClick={() => setActiveTab("objectives")} 
          className={`py-3 px-3 sm:px-4 lg:px-6 font-medium text-sm sm:text-base lg:text-lg transition-all duration-200 ${
            activeTab === "objectives" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Objetivos ({playerActualObjectivesCount}/{MAX_ACTIVE_OBJECTIVES})
        </button>
        <button 
          onClick={() => setActiveTab("tournaments")} 
          className={`py-3 px-3 sm:px-4 lg:px-6 font-medium text-sm sm:text-base lg:text-lg transition-all duration-200 ${
            activeTab === "tournaments" ? "border-b-2 border-green-400 text-green-400" : "text-gray-400 hover:text-gray-300"
          }`}
        >
          Torneos
        </button>
        <button 
          onClick={() => setActiveTab("planificacion")} 
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

export default ProfileTabs;