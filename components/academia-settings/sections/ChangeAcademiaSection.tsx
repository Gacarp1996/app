// components/academia-settings/sections/ChangeAcademiaSection.tsx
import React from 'react';

interface ChangeAcademiaSectionProps {
  onChangeAcademia: () => void;
}

export const ChangeAcademiaSection: React.FC<ChangeAcademiaSectionProps> = ({ 
  onChangeAcademia 
}) => {
  return (
    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Cambiar de Academia</h2>
      </div>
      
      <div className="space-y-4">
        <p className="text-gray-300">
          Si necesitas acceder a otra academia, puedes cambiar desde aquí.
        </p>
        <button
          onClick={onChangeAcademia}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105"
        >
          Cambiar Academia
        </button>
      </div>
    </div>
  );
};