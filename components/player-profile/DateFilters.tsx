// components/player-profile/DateFilters.tsx
import React from 'react';

interface DateFiltersProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onReset: () => void;
}

const DateFilters: React.FC<DateFiltersProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onReset
}) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-4 lg:p-6 rounded-xl shadow-lg border border-gray-800">
      <h3 className="text-lg lg:text-xl font-semibold text-green-400 mb-4">Filtrar por Fecha</h3>
      <div className="w-full">
        {/* Móvil: Diseño vertical */}
        <div className="flex flex-col gap-4 sm:hidden">
          <div className="w-full">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-400 mb-2">Desde</label>
            <input 
              type="date" 
              id="startDate" 
              value={startDate} 
              onChange={e => onStartDateChange(e.target.value)} 
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
            />
          </div>
          <div className="w-full">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-400 mb-2">Hasta</label>
            <input 
              type="date" 
              id="endDate" 
              value={endDate} 
              onChange={e => onEndDateChange(e.target.value)} 
              className="w-full p-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
            />
          </div>
          <button 
            onClick={onReset} 
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50"
          >
            Restablecer
          </button>
        </div>

        {/* Tablet/Desktop: Diseño horizontal */}
        <div className="hidden sm:flex sm:items-end sm:gap-4">
          <div className="flex-1">
            <label htmlFor="startDate-lg" className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Desde</label>
            <input 
              type="date" 
              id="startDate-lg" 
              value={startDate} 
              onChange={e => onStartDateChange(e.target.value)} 
              className="w-full p-2 lg:p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="endDate-lg" className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Hasta</label>
            <input 
              type="date" 
              id="endDate-lg" 
              value={endDate} 
              onChange={e => onEndDateChange(e.target.value)} 
              className="w-full p-2 lg:p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
            />
          </div>
          <button 
            onClick={onReset} 
            className="px-4 py-2 lg:px-6 lg:py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50 h-[42px] lg:h-[50px] whitespace-nowrap"
          >
            Restablecer
          </button>
        </div>
      </div>
    </div>
  );
};

export default DateFilters;