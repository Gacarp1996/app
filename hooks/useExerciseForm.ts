// hooks/useExerciseForm.ts
import { useState, useMemo, useCallback } from 'react';
import { TipoType, AreaType } from '../constants/training';
import { SpecificExercise } from '../types/types';
import { TrainingStructureService } from '../services/trainingStructure';
import { validateExerciseForm } from '../utils/validation';
import { toast } from 'sonner'; // ✅ AGREGADO: Import de sonner

interface UseExerciseFormProps {
  specificExercises: SpecificExercise[];
  setSpecificExercises: React.Dispatch<React.SetStateAction<SpecificExercise[]>>;
}

export const useExerciseForm = ({ specificExercises, setSpecificExercises }: UseExerciseFormProps) => {
  // Estados del formulario
  const [currentTipo, setCurrentTipo] = useState<TipoType | ''>('');
  const [currentArea, setCurrentArea] = useState<AreaType | ''>('');
  const [currentEjercicio, setCurrentEjercicio] = useState<string>('');
  const [currentEjercicioEspecifico, setCurrentEjercicioEspecifico] = useState<string>('');
  const [tiempoCantidad, setTiempoCantidad] = useState<string>('');
  const [intensidad, setIntensidad] = useState<number>(5);
  const [isAddSpecificExerciseModalOpen, setIsAddSpecificExerciseModalOpen] = useState(false);

  // NUEVO: Determinar si el tipo actual requiere ejercicios
  const requiresExercise = useMemo(() => 
    TrainingStructureService.requiresExercise(currentTipo),
    [currentTipo]
  );

  // Opciones disponibles basadas en selección actual
  const availableTipos = useMemo(() => TrainingStructureService.getAvailableTypes(), []);
  const availableAreas = useMemo(() => TrainingStructureService.getAvailableAreas(currentTipo), [currentTipo]);
  const availableEjercicios = useMemo(() => 
    TrainingStructureService.getAvailableExercises(currentTipo, currentArea), 
    [currentTipo, currentArea]
  );
  const availableSpecificExercises = useMemo(() => 
    TrainingStructureService.filterSpecificExercises(specificExercises, currentTipo, currentArea, currentEjercicio),
    [specificExercises, currentTipo, currentArea, currentEjercicio]
  );

  // Handlers para cambios en el formulario
  const handleTipoChange = useCallback((value: string) => {
    setCurrentTipo(value as TipoType);
    const reset = TrainingStructureService.resetSelectionOnTypeChange();
    setCurrentArea(reset.area);
    setCurrentEjercicio(reset.ejercicio);
    setCurrentEjercicioEspecifico(reset.ejercicioEspecifico);
  }, []);

  const handleAreaChange = useCallback((value: string) => {
    setCurrentArea(value as AreaType);
    const reset = TrainingStructureService.resetSelectionOnAreaChange();
    setCurrentEjercicio(reset.ejercicio);
    setCurrentEjercicioEspecifico(reset.ejercicioEspecifico);
  }, []);

  const handleEjercicioChange = useCallback((value: string) => {
    setCurrentEjercicio(value);
    setCurrentEjercicioEspecifico('');
  }, []);

  // Handlers para ejercicios específicos
  const handleAddSpecificExercise = useCallback(() => {
    // ✅ CORREGIDO: Usar toast en lugar de alert
    if (requiresExercise) {
      const validation = validateExerciseForm(
        currentTipo,
        currentArea,
        currentEjercicio,
        '1', // Dummy value para validación
        new Set(['dummy']) // Dummy value para validación
      );
      
      if (!validation.isValid) {
        toast.error('Por favor, selecciona tipo, área y ejercicio antes de crear un ejercicio específico.');
        return;
      }
    } else {
      // Para PUNTOS, solo validar tipo y área
      if (!currentTipo || !currentArea) {
        toast.error('Por favor, selecciona tipo y área antes de continuar.');
        return;
      }
    }
    setIsAddSpecificExerciseModalOpen(true);
  }, [currentTipo, currentArea, currentEjercicio, requiresExercise]);

  const handleSubmitSpecificExercise = useCallback((exerciseName: string) => {
    const newSpecificExercise = TrainingStructureService.createSpecificExercise(
      exerciseName,
      currentTipo as TipoType,
      currentArea as AreaType,
      currentEjercicio
    );
    setSpecificExercises(prev => [...prev, newSpecificExercise]);
    setCurrentEjercicioEspecifico(exerciseName);
  }, [currentTipo, currentArea, currentEjercicio, setSpecificExercises]);

  // Reset del formulario
  const resetForm = useCallback(() => {
    setCurrentEjercicio('');
    setCurrentEjercicioEspecifico('');
    setTiempoCantidad('');
    setIntensidad(5);
  }, []);

  // Validación del formulario
  const validateForm = useCallback((activePlayerIds: Set<string>) => {
    // MODIFICADO: Para tipo PUNTOS, no validar ejercicio
    if (currentTipo === TipoType.PUNTOS) {
      // Validación especial para PUNTOS
      if (!currentTipo || !currentArea || !tiempoCantidad || activePlayerIds.size === 0) {
        return {
          isValid: false,
          error: 'Completa tipo, área, tiempo y selecciona al menos un jugador'
        };
      }
      return { isValid: true };
    }
    
    // Validación normal para otros tipos
    return validateExerciseForm(
      currentTipo,
      currentArea,
      currentEjercicio,
      tiempoCantidad,
      activePlayerIds
    );
  }, [currentTipo, currentArea, currentEjercicio, tiempoCantidad]);

  return {
    // Estados
    currentTipo,
    currentArea,
    currentEjercicio,
    currentEjercicioEspecifico,
    tiempoCantidad,
    intensidad,
    isAddSpecificExerciseModalOpen,
    
    // NUEVO: Estado de requerimiento de ejercicio
    requiresExercise,
    
    // Opciones disponibles
    availableTipos,
    availableAreas,
    availableEjercicios,
    availableSpecificExercises,
    
    // Setters
    setCurrentEjercicio,
    setCurrentEjercicioEspecifico,
    setTiempoCantidad,
    setIntensidad,
    setIsAddSpecificExerciseModalOpen,
    
    // Handlers
    handleTipoChange,
    handleAreaChange,
    handleEjercicioChange,
    handleAddSpecificExercise,
    handleSubmitSpecificExercise,
    resetForm,
    validateForm
  };
};