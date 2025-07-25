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
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800 mb-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            {academiaActual.nombre} - Dashboard
          </h1>
          <p className="text-gray-400">Panel de control y métricas en tiempo real</p>
          <p className="text-sm text-gray-500">
            Última actualización: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onRefresh}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title="Actualizar datos"
          >
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;