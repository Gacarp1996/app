import { useMemo } from 'react';
import { NEW_EXERCISE_HIERARCHY_CONST } from '../constants/index';

export const useExerciseOptions = (currentTipoKey: string, currentAreaKey: string) => {
  const availableTipoKeys = useMemo(() => 
    Object.keys(NEW_EXERCISE_HIERARCHY_CONST), 
    []
  );
  
  const availableAreaKeys = useMemo(() => 
    currentTipoKey 
      ? Object.keys(NEW_EXERCISE_HIERARCHY_CONST[currentTipoKey] || {}) 
      : [],
    [currentTipoKey]
  );
  
  const availableEjercicioNames = useMemo(() => 
    currentTipoKey && currentAreaKey 
      ? NEW_EXERCISE_HIERARCHY_CONST[currentTipoKey]?.[currentAreaKey] || []
      : [],
    [currentTipoKey, currentAreaKey]
  );
  
  return {
    availableTipoKeys,
    availableAreaKeys,
    availableEjercicioNames
  };
};