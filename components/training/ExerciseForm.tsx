import React from 'react';
import { SpecificExercise } from '@/types';
import { TipoType, AreaType, UI_LABELS } from '@/constants/training';

interface ExerciseFormProps {
  currentTipo: TipoType | '';
  currentArea: AreaType | '';
  currentEjercicio: string;
  currentEjercicioEspecifico: string;
  tiempoCantidad: string;
  intensidad: number;
  availableTipos: TipoType[];
  availableAreas: AreaType[];
  availableEjercicios: string[];
  availableSpecificExercises: SpecificExercise[];
  onTipoChange: (value: string) => void;
  onAreaChange: (value: string) => void;
  onEjercicioChange: (value: string) => void;
  onEjercicioEspecificoChange: (value: string) => void;
  onTiempoCantidadChange: (value: string) => void;
  onIntensidadChange: (value: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onAddSpecificExercise: () => void;
}

const ExerciseForm: React.FC<ExerciseFormProps> = ({
  currentTipo,
  currentArea,
  currentEjercicio,
  currentEjercicioEspecifico,
  tiempoCantidad,
  intensidad,
  availableTipos,
  availableAreas,
  availableEjercicios,
  availableSpecificExercises,
  onTipoChange,
  onAreaChange,
  onEjercicioChange,
  onEjercicioEspecificoChange,
  onTiempoCantidadChange,
  onIntensidadChange,
  onSubmit,
  onAddSpecificExercise
}) => {
  // NUEVO: Determinar si se deben mostrar ejercicios
  const shouldShowExercises = currentTipo !== TipoType.PUNTOS;
  const isExerciseDisabled = !currentArea || !shouldShowExercises;

  return (
    <form onSubmit={onSubmit} className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 lg:p-8 border border-gray-800 shadow-lg space-y-6">
      <h2 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Registrar Ejercicio</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div>
          <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Tipo</label>
          <select 
            value={currentTipo} 
            onChange={e => onTipoChange(e.target.value)} 
            className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
          >
            <option value="">Selecciona tipo</option>
            {availableTipos.map(tipo => (
              <option key={tipo} value={tipo}>
                {UI_LABELS.TIPOS[tipo]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">Área</label>
          <select 
            value={currentArea} 
            onChange={e => onAreaChange(e.target.value)} 
            disabled={!currentTipo} 
            className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Selecciona área</option>
            {availableAreas.map(area => (
              <option key={area} value={area}>
                {UI_LABELS.AREAS[area]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">
            Ejercicio
            {currentTipo === TipoType.PUNTOS && (
              <span className="text-xs text-gray-500 ml-2">(No aplica para Puntos)</span>
            )}
          </label>
          <select 
            value={currentEjercicio} 
            onChange={e => onEjercicioChange(e.target.value)} 
            disabled={isExerciseDisabled}  // MODIFICADO: Deshabilitado para PUNTOS
            className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {currentTipo === TipoType.PUNTOS ? "No disponible" : "Selecciona ejercicio"}
            </option>
            {availableEjercicios.map(ejercicio => (
              <option key={ejercicio} value={ejercicio}>{ejercicio}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sección de ejercicios específicos - MODIFICADO: Solo mostrar si hay ejercicio y no es PUNTOS */}
      {currentEjercicio && shouldShowExercises && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm lg:text-base font-medium text-gray-400">Ejercicio Específico (Opcional)</label>
            <button
              type="button"
              onClick={onAddSpecificExercise}
              className="px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-400 font-semibold rounded-lg transition-all duration-200 border border-purple-500/30 hover:border-purple-500/50 text-sm"
            >
              + Agregar Ejercicio Específico
            </button>
          </div>
          
          {availableSpecificExercises.length > 0 && (
            <select 
              value={currentEjercicioEspecifico} 
              onChange={e => onEjercicioEspecificoChange(e.target.value)} 
              className="w-full p-3 lg:p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
            >
              <option value="">Selecciona ejercicio específico</option>
              {availableSpecificExercises.map(exercise => (
                <option key={exercise.id} value={exercise.name}>{exercise.name}</option>
              ))}
            </select>
          )}
          
          {availableSpecificExercises.length === 0 && (
            <div className="text-sm text-gray-500 italic p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
              No hay ejercicios específicos creados para esta combinación. Haz clic en "Agregar Ejercicio Específico" para crear uno.
            </div>
          )}
        </div>
      )}
      
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