import React, { useState } from 'react';
import Modal from '../shared/Modal';
import { rateLimiter } from '@/utils/rateLimiter';

interface AddSpecificExerciseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (exerciseName: string) => void;
  currentTipo: string;
  currentArea: string;
  currentEjercicio: string;
}

// Función de sanitización para prevenir XSS y limitar entrada
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/[<>]/g, '') // Remove HTML tags básicos
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .slice(0, 100); // Limitar longitud máxima
};

const AddSpecificExerciseModal: React.FC<AddSpecificExerciseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentTipo,
  currentArea,
  currentEjercicio
}) => {
  const [exerciseName, setExerciseName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting para prevenir múltiples envíos
    if (!rateLimiter.canExecute('add-specific-exercise', 2000)) {
      return;
    }

    // Prevenir submit si ya está procesando
    if (isSubmitting) {
      return;
    }

    const sanitized = sanitizeInput(exerciseName);
    
    if (sanitized && sanitized.length >= 2) { // Mínimo 2 caracteres
      setIsSubmitting(true);
      
      try {
        onSubmit(sanitized);
        setExerciseName('');
        onClose();
      } finally {
        // Reset estado después de un pequeño delay
        setTimeout(() => {
          setIsSubmitting(false);
        }, 500);
      }
    }
  };

  const handleClose = () => {
    // Rate limiting para cerrar
    if (!rateLimiter.canExecute('close-specific-exercise-modal', 500)) {
      return;
    }
    
    setExerciseName('');
    setIsSubmitting(false);
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Validación en tiempo real: limitar longitud y caracteres especiales peligrosos
    if (value.length <= 100) {
      // Permitir solo caracteres seguros mientras se escribe
      const cleanValue = value.replace(/[<>]/g, '');
      setExerciseName(cleanValue);
    }
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
            <div>
              <span className="text-gray-500">Tipo:</span> 
              <span className="text-white ml-2">{currentTipo || 'No definido'}</span>
            </div>
            <div>
              <span className="text-gray-500">Área:</span> 
              <span className="text-white ml-2">{currentArea || 'No definida'}</span>
            </div>
            <div>
              <span className="text-gray-500">Ejercicio:</span> 
              <span className="text-white ml-2">{currentEjercicio || 'No definido'}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Nombre del ejercicio específico
              <span className="text-xs text-gray-500 ml-2">
                ({exerciseName.length}/100 caracteres)
              </span>
            </label>
            <input
              type="text"
              value={exerciseName}
              onChange={handleInputChange}
              placeholder="Ej: Volea cruzada desde fondo"
              maxLength={100}
              minLength={2}
              required
              disabled={isSubmitting}
              className="w-full p-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              autoFocus
              autoComplete="off"
            />
            {exerciseName.length > 0 && exerciseName.length < 2 && (
              <p className="text-xs text-yellow-400 mt-1">
                Mínimo 2 caracteres requeridos
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={!exerciseName.trim() || exerciseName.length < 2 || isSubmitting}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-green-500/25"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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