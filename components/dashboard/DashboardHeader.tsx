import React from 'react';

interface Academia {
  id: string;
  nombre: string;
}

interface DashboardHeaderProps {
  academiaActual: Academia;
  onRefresh: () => void;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ academiaActual, onRefresh }) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-xl border border-gray-800 mb-4 sm:mb-6 lg:mb-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-2">
            <span className="hidden sm:inline">{academiaActual.nombre} - Dashboard</span>
            <span className="sm:hidden">Dashboard</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400 mb-1">Panel de control y métricas en tiempo real</p>
          <p className="text-xs sm:text-sm text-gray-500">
            Última actualización: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-3 justify-end">
          <button 
            onClick={onRefresh}
            className="p-2 sm:p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700 hover:border-gray-600"
            title="Actualizar datos"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;