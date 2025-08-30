// components/academia-settings/sections/ExerciseStructureConfig.tsx
import React, { useState } from 'react';

interface ExerciseStructureConfigProps {
  // Aquí puedes agregar props para el estado de ejercicios cuando lo implementes
}

export const ExerciseStructureConfig: React.FC<ExerciseStructureConfigProps> = () => {
  const [newExerciseName, setNewExerciseName] = useState('');

  const handleAddExercise = () => {
    if (newExerciseName.trim()) {
      // TODO: Implementar lógica para agregar ejercicio
     
      setNewExerciseName('');
    }
  };

  const handleEditExercise = (exerciseName: string) => {
  
  };

  const handleDeleteExercise = (exerciseName: string) => {

  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg sm:text-lg font-semibold text-white text-center">
        Configuración de estructura de ejercicios
      </h3>
      
      {/* Headers horizontales centrados con flechas */}
      <div className="bg-gray-900/50 p-3 sm:p-4 rounded-lg border border-gray-600">
        <div className="flex items-center justify-between text-sm sm:text-sm text-gray-300 font-medium">
          <div className="text-center flex-1">
            <span>Tipo</span>
          </div>
          <svg className="w-4 h-4 sm:w-4 sm:h-4 text-gray-500 mx-2 sm:mx-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="text-center flex-1">
            <span>Área</span>
          </div>
          <svg className="w-4 h-4 sm:w-4 sm:h-4 text-gray-500 mx-2 sm:mx-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="text-center flex-1">
            <span>Ejercicio</span>
          </div>
          <svg className="w-4 h-4 sm:w-4 sm:h-4 text-gray-500 mx-2 sm:mx-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="text-center flex-1">
            <span className="hidden sm:inline">Ejercicio específico (opcional)</span>
            <span className="sm:hidden">Específico</span>
          </div>
        </div>
      </div>

      {/* Checkboxes apilados verticalmente */}
      <div className="space-y-3 sm:space-y-3">
        <div className="bg-gray-900/50 p-4 sm:p-4 rounded-lg border border-gray-600">
          <div className="flex items-center space-x-3">
            <input 
              type="checkbox" 
              checked={true} 
              readOnly 
              className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500" 
            />
            <span className="text-gray-300 text-sm sm:text-base">Registrar hasta Área</span>
          </div>
        </div>
        
        <div className="bg-gray-900/50 p-4 sm:p-4 rounded-lg border border-gray-600">
          <div className="flex items-center space-x-3">
            <input 
              type="checkbox" 
              checked={true} 
              readOnly 
              className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500" 
            />
            <span className="text-gray-300 text-sm sm:text-base">Registrar hasta Ejercicio</span>
          </div>
        </div>
        
        <div className="bg-gray-900/50 p-4 sm:p-4 rounded-lg border border-gray-600">
          <div className="flex items-center space-x-3">
            <input 
              type="checkbox" 
              checked={true} 
              readOnly 
              className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500" 
            />
            <span className="text-gray-300 text-sm sm:text-base">Registrar hasta Ejercicio específico</span>
          </div>
        </div>
      </div>

      {/* Input para agregar ejercicio */}
      <div className="bg-gray-800/50 p-3 sm:p-4 rounded-lg border border-gray-700">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <input 
            type="text" 
            placeholder="Nombre del ejercicio específico"
            value={newExerciseName}
            onChange={(e) => setNewExerciseName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddExercise()}
            className="flex-1 p-2.5 sm:p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm sm:text-base"
          />
          {/* Botón en desktop - oculto en móvil */}
          <button 
            onClick={handleAddExercise}
            className="hidden sm:block px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Agregar
          </button>
        </div>
        
        {/* Botón en móvil - debajo del input */}
        <div className="block sm:hidden mt-3">
          <button 
            onClick={handleAddExercise}
            className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Agregar Ejercicio Específico
          </button>
        </div>
      </div>
        
      {/* Ejercicios existentes apilados verticalmente */}
      <div className="space-y-3 sm:space-y-3">
        <div className="bg-gray-800/50 p-4 sm:p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm sm:text-base">Volea profunda con efecto</span>
            <div className="flex items-center space-x-2 sm:space-x-2">
              <button 
                onClick={() => handleEditExercise('Volea profunda con efecto')}
                className="p-2 sm:p-2 text-yellow-400 hover:text-yellow-300"
                title="Editar ejercicio"
              >
                <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                </svg>
              </button>
              <button 
                onClick={() => handleDeleteExercise('Volea profunda con efecto')}
                className="p-2 sm:p-2 text-red-400 hover:text-red-300"
                title="Eliminar ejercicio"
              >
                <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
          
        <div className="bg-gray-800/50 p-4 sm:p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 text-sm sm:text-base">Saque plano al cuerpo</span>
            <div className="flex items-center space-x-2 sm:space-x-2">
              <button 
                onClick={() => handleEditExercise('Saque plano al cuerpo')}
                className="p-2 sm:p-2 text-yellow-400 hover:text-yellow-300"
                title="Editar ejercicio"
              >
                <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                </svg>
              </button>
              <button 
                onClick={() => handleDeleteExercise('Saque plano al cuerpo')}
                className="p-2 sm:p-2 text-red-400 hover:text-red-300"
                title="Eliminar ejercicio"
              >
                <svg className="w-4 h-4 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Texto explicativo y gráfico apilados verticalmente */}
      <div className="bg-gray-900/70 p-4 sm:p-4 rounded-lg border border-gray-700">
        <p className="text-sm sm:text-sm text-gray-400 text-center sm:text-left">Este nivel es personalizable por cada entrenador</p>
      </div>
      
      <div className="flex justify-center">
        <div 
          className="w-20 h-20 sm:w-20 sm:h-20 rounded-full border-4 border-gray-600" 
          style={{
            background: 'conic-gradient(from 0deg, #10b981 0deg 120deg, #f59e0b 120deg 240deg, #8b5cf6 240deg 360deg)'
          }}
        ></div>
      </div>
    </div>
  );
};