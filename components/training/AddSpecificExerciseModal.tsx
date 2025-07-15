import React, { useState } from 'react';
import Modal from '../shared/Modal';

interface AddSpecificExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (exerciseName: string) => void;
  currentTipo: string;
  currentArea: string;
  currentEjercicio: string;
}

const AddSpecificExerciseModal: React.FC<AddSpecificExerciseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentTipo,
  currentArea,
  currentEjercicio
}) => {
  const [exerciseName, setExerciseName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (exerciseName.trim()) {
      onSubmit(exerciseName.trim());
      setExerciseName('');
      onClose();
    }
  };

  const handleClose = () => {
    setExerciseName('');
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Agregar Ejercicio Específico"
    >
      <div className="space-y-6">
        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          <h3 className="text-green-400 font-semibold mb-3">Configuración actual:</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <div><span className="text-gray-500">Tipo:</span> <span className="text-white">{currentTipo}</span></div>
            <div><span className="text-gray-500">Área:</span> <span className="text-white">{currentArea}</span></div>
            <div><span className="text-gray-500">Ejercicio:</span> <span className="text-white">{currentEjercicio}</span></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Nombre del ejercicio específico
            </label>
            <input
              type="text"
              value={exerciseName}
              onChange={(e) => setExerciseName(e.target.value)}
              placeholder="Ej: Volea cruzada desde fondo"
              className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={!exerciseName.trim()}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-green-500/25"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddSpecificExerciseModal;
