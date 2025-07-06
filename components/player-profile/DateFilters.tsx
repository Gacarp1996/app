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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 lg:gap-4 items-end">
        <div>
          <label htmlFor="startDate" className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Desde</label>
          <input 
            type="date" 
            id="startDate" 
            value={startDate} 
            onChange={e => onStartDateChange(e.target.value)} 
            className="w-full p-2 lg:p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Hasta</label>
          <input 
            type="date" 
            id="endDate" 
            value={endDate} 
            onChange={e => onEndDateChange(e.target.value)} 
            className="w-full p-2 lg:p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
          />
        </div>
        <button 
          onClick={onReset} 
          className="px-4 py-2 lg:px-6 lg:py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50 h-[42px] lg:h-[50px]"
        >
          Restablecer (últimos 7 días)
        </button>
      </div>
    </div>
  );
};

export default DateFilters;