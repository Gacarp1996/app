import React from 'react';

interface ExerciseFormProps {
  currentTipoKey: string;
  currentAreaKey: string;
  currentEjercicioName: string;
  tiempoCantidad: string;
  intensidad: number;
  availableTipoKeys: string[];
  availableAreaKeys: string[];
  availableEjercicioNames: string[];
  onTipoChange: (value: string) => void;
  onAreaChange: (value: string) => void;
  onEjercicioChange: (value: string) => void;
  onTiempoCantidadChange: (value: string) => void;
  onIntensidadChange: (value: number) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const ExerciseForm: React.FC<ExerciseFormProps> = ({
  currentTipoKey,
  currentAreaKey,
  currentEjercicioName,
  tiempoCantidad,
  intensidad,
  availableTipoKeys,
  availableAreaKeys,
  availableEjercicioNames,
  onTipoChange,
  onAreaChange,
  onEjercicioChange,
  onTiempoCantidadChange,
  onIntensidadChange,
  onSubmit
}) => {
  return (
    <form onSubmit={onSubmit} className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg space-y-6">
      <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Registrar Ejercicio</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div>
          <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Tipo</label>
          <select 
            value={currentTipoKey} 
            onChange={e => onTipoChange(e.target.value)} 
            className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
          >
            <option value="">Selecciona tipo</option>
            {availableTipoKeys.map(tipo => (<option key={tipo} value={tipo}>{tipo}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Área</label>
          <select 
            value={currentAreaKey} 
            onChange={e => onAreaChange(e.target.value)} 
            disabled={!currentTipoKey} 
            className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Selecciona área</option>
            {availableAreaKeys.map(area => (<option key={area} value={area}>{area}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Ejercicio</label>
          <select 
            value={currentEjercicioName} 
            onChange={e => onEjercicioChange(e.target.value)} 
            disabled={!currentAreaKey} 
            className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Selecciona ejercicio</option>
            {availableEjercicioNames.map(exName => (<option key={exName} value={exName}>{exName}</option>))}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <div>
          <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Tiempo (minutos)</label>
          <input 
            type="text"
            inputMode="numeric"
            value={tiempoCantidad} 
            onChange={e => onTiempoCantidadChange(e.target.value)} 
            placeholder="Ej: 30" 
            className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
          />
        </div>
        <div>
          <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">
            Intensidad 
            <span className="text-green-400 font-bold ml-2">({intensidad}/10)</span>
          </label>
          <div className="relative pt-2">
            <input 
              type="range" 
              min="1" 
              max="10" 
              value={intensidad} 
              onChange={e => onIntensidadChange(Number(e.target.value))} 
              className="w-full h-2 lg:h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
            <div className="flex justify-between text-xs lg:text-sm text-gray-500 mt-2">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>
        </div>
      </div>
      
      <button 
        type="submit" 
        className="w-full px-6 py-3 lg:py-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold text-base lg:text-lg rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
      >
        <span className="flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 lg:w-6 lg:h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Agregar Ejercicio
        </span>
      </button>
    </form>
  );
};

export default ExerciseForm;