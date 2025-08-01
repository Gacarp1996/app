// hooks/useExerciseOptions.ts
import { useMemo } from 'react';
import { EXERCISE_HIERARCHY } from '../constants';
import { TrainingType, TrainingArea } from '../types';

export const useExerciseOptions = (currentTipoKey: string, currentAreaKey: string) => {
  const availableTipoKeys = useMemo(() => 
    Object.values(TrainingType), 
    []
  );
  
  const availableAreaKeys = useMemo(() => 
    currentTipoKey 
      ? Object.values(TrainingArea).filter(area => 
          EXERCISE_HIERARCHY[currentTipoKey as TrainingType]?.[area] !== undefined
        )
      : [],
    [currentTipoKey]
  );
  
  const availableEjercicioNames = useMemo(() => 
    currentTipoKey && currentAreaKey 
      ? EXERCISE_HIERARCHY[currentTipoKey as TrainingType]?.[currentAreaKey as TrainingArea] || []
      : [],
    [currentTipoKey, currentAreaKey]
  );
  
  return {
    availableTipoKeys,
    availableAreaKeys,
    availableEjercicioNames
  };
};