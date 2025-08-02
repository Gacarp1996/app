import { useMemo } from 'react';
import { TipoType, AreaType, getAreasForTipo, getEjerciciosForTipoArea, isTipoType, isAreaType } from '../constants/training';

export const useExerciseOptions = (currentTipo: string, currentArea: string) => {
  const availableTipos = useMemo(() => 
    Object.values(TipoType), 
    []
  );
  
  const availableAreas = useMemo(() => 
    currentTipo && isTipoType(currentTipo)
      ? getAreasForTipo(currentTipo)
      : [],
    [currentTipo]
  );
  
  const availableEjercicios = useMemo(() => 
    currentTipo && currentArea && isTipoType(currentTipo) && isAreaType(currentArea)
      ? getEjerciciosForTipoArea(currentTipo, currentArea)
      : [],
    [currentTipo, currentArea]
  );
  
  return {
    availableTipos,
    availableAreas,
    availableEjercicios
  };
};