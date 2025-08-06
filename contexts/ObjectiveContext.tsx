// contexts/ObjectiveContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useAcademia } from './AcademiaContext';
import { Objective, ObjectiveEstado } from '../types';
import { 
  getObjectives as getObjectivesFromDB,
  addObjective as addObjectiveToDB,
  updateObjective as updateObjectiveInDB,
  deleteObjective as deleteObjectiveFromDB
} from '../Database/FirebaseObjectives';
import { MAX_ACTIVE_OBJECTIVES } from '../constants';

interface ObjectiveContextType {
  // Estado
  objectives: Objective[];
  loadingObjectives: boolean;
  objectivesError: string | null;
  
  // Funciones de carga
  loadObjectives: () => Promise<void>;
  refreshObjectives: () => Promise<void>;
  
  // Funciones de consulta
  getObjectiveById: (objectiveId: string) => Objective | undefined;
  getObjectivesByPlayer: (playerId: string) => Objective[];
  getObjectivesByState: (playerId: string, estado: ObjectiveEstado) => Objective[];
  getActiveObjectivesCount: (playerId: string) => number;
  canAddActiveObjective: (playerId: string) => boolean;
  
  // Funciones CRUD con validaciones
  addObjective: (objectiveData: Omit<Objective, 'id'>) => Promise<void>;
  updateObjective: (objectiveId: string, updates: Partial<Objective>) => Promise<void>;
  deleteObjective: (objectiveId: string) => Promise<void>;
  changeObjectiveState: (objectiveId: string, newState: ObjectiveEstado) => Promise<void>;
}

const ObjectiveContext = createContext<ObjectiveContextType | undefined>(undefined);

export const ObjectiveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { academiaActual } = useAcademia();
  
  // Estados principales
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loadingObjectives, setLoadingObjectives] = useState(false);
  const [objectivesError, setObjectivesError] = useState<string | null>(null);
  
  // Cache de objetivos por jugador para optimización
  const objectivesByPlayer = useMemo(() => {
    const map = new Map<string, Objective[]>();
    objectives.forEach(objective => {
      const playerObjectives = map.get(objective.jugadorId) || [];
      playerObjectives.push(objective);
      map.set(objective.jugadorId, playerObjectives);
    });
    return map;
  }, [objectives]);
  
  // Función para cargar objetivos
  const loadObjectives = useCallback(async () => {
    if (!academiaActual) {
      setObjectives([]);
      return;
    }
    
    setLoadingObjectives(true);
    setObjectivesError(null);
    
    try {
      const loadedObjectives = await getObjectivesFromDB(academiaActual.id);
      
      // Ordenar objetivos: actual-progreso primero, luego consolidacion, finalmente incorporado
      const sortedObjectives = loadedObjectives.sort((a, b) => {
        const stateOrder: Record<ObjectiveEstado, number> = {
          'actual-progreso': 0,
          'consolidacion': 1,
          'incorporado': 2
        };
        
        // Primero ordenar por jugador
        if (a.jugadorId !== b.jugadorId) {
          return a.jugadorId.localeCompare(b.jugadorId);
        }
        
        // Luego por estado
        return stateOrder[a.estado] - stateOrder[b.estado];
      });
      
      setObjectives(sortedObjectives);
    } catch (error) {
      console.error('Error cargando objetivos:', error);
      setObjectivesError('Error al cargar los objetivos');
      setObjectives([]);
    } finally {
      setLoadingObjectives(false);
    }
  }, [academiaActual]);
  
  // Cargar objetivos cuando cambie la academia
  useEffect(() => {
    if (academiaActual) {
      loadObjectives();
    } else {
      // Limpiar estado cuando no hay academia
      setObjectives([]);
      setObjectivesError(null);
    }
  }, [academiaActual?.id]); // Solo recargar cuando cambie el ID
  
  // Función para refrescar objetivos
  const refreshObjectives = useCallback(async () => {
    await loadObjectives();
  }, [loadObjectives]);
  
  // FUNCIONES DE CONSULTA
  
  // Obtener objetivo por ID
  const getObjectiveById = useCallback((objectiveId: string): Objective | undefined => {
    return objectives.find(obj => obj.id === objectiveId);
  }, [objectives]);
  
  // Obtener objetivos por jugador
  const getObjectivesByPlayer = useCallback((playerId: string): Objective[] => {
    return objectivesByPlayer.get(playerId) || [];
  }, [objectivesByPlayer]);
  
  // Obtener objetivos por estado
  const getObjectivesByState = useCallback((playerId: string, estado: ObjectiveEstado): Objective[] => {
    const playerObjectives = getObjectivesByPlayer(playerId);
    return playerObjectives.filter(obj => obj.estado === estado);
  }, [getObjectivesByPlayer]);
  
  // Obtener cantidad de objetivos activos
  const getActiveObjectivesCount = useCallback((playerId: string): number => {
    return getObjectivesByState(playerId, 'actual-progreso').length;
  }, [getObjectivesByState]);
  
  // Verificar si se puede agregar objetivo activo
  const canAddActiveObjective = useCallback((playerId: string): boolean => {
    const activeCount = getActiveObjectivesCount(playerId);
    return activeCount < MAX_ACTIVE_OBJECTIVES;
  }, [getActiveObjectivesCount]);
  
  // FUNCIONES CRUD
  
  // Agregar objetivo con validación
  const addObjective = useCallback(async (objectiveData: Omit<Objective, 'id'>) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    // Validar límite si es objetivo activo
    if (objectiveData.estado === 'actual-progreso') {
      const currentActiveCount = getActiveObjectivesCount(objectiveData.jugadorId);
      if (currentActiveCount >= MAX_ACTIVE_OBJECTIVES) {
        throw new Error(
          `No se puede agregar más objetivos activos. El jugador ya tiene ${currentActiveCount} de ${MAX_ACTIVE_OBJECTIVES} objetivos en 'Actual/En Progreso'.`
        );
      }
    }
    
    try {
      await addObjectiveToDB(academiaActual.id, objectiveData);
      
      // Actualización optimista del estado local
      const tempObjective: Objective = {
        ...objectiveData,
        id: `temp_${Date.now()}` // ID temporal hasta recargar
      };
      setObjectives(prev => [...prev, tempObjective]);
      
      // Recargar desde la BD para obtener el ID real
      await refreshObjectives();
    } catch (error) {
      console.error('Error agregando objetivo:', error);
      // Revertir cambio optimista recargando
      await refreshObjectives();
      throw error;
    }
  }, [academiaActual, getActiveObjectivesCount, refreshObjectives]);
  
  // Actualizar objetivo con validación
  const updateObjective = useCallback(async (objectiveId: string, updates: Partial<Objective>) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    const currentObjective = getObjectiveById(objectiveId);
    if (!currentObjective) {
      throw new Error('Objetivo no encontrado');
    }
    
    // Si se está cambiando el estado a 'actual-progreso', validar límite
    if (updates.estado === 'actual-progreso' && currentObjective.estado !== 'actual-progreso') {
      const currentActiveCount = getActiveObjectivesCount(currentObjective.jugadorId);
      if (currentActiveCount >= MAX_ACTIVE_OBJECTIVES) {
        throw new Error(
          `No se puede cambiar el objetivo a 'Actual/En Progreso'. El jugador ya tiene ${currentActiveCount} de ${MAX_ACTIVE_OBJECTIVES} objetivos activos.`
        );
      }
    }
    
    try {
      await updateObjectiveInDB(academiaActual.id, objectiveId, updates);
      
      // Actualización optimista del estado local
      setObjectives(prevObjectives =>
        prevObjectives.map(obj =>
          obj.id === objectiveId ? { ...obj, ...updates } : obj
        )
      );
      
      // Recargar para asegurar consistencia
      await refreshObjectives();
    } catch (error) {
      console.error('Error actualizando objetivo:', error);
      // Revertir cambio optimista recargando
      await refreshObjectives();
      throw error;
    }
  }, [academiaActual, getObjectiveById, getActiveObjectivesCount, refreshObjectives]);
  
  // Eliminar objetivo
  const deleteObjective = useCallback(async (objectiveId: string) => {
    if (!academiaActual) {
      throw new Error('No hay academia seleccionada');
    }
    
    // Guardar objetivo para poder revertir si falla
    const objectiveToDelete = getObjectiveById(objectiveId);
    
    try {
      // Actualización optimista
      setObjectives(prev => prev.filter(obj => obj.id !== objectiveId));
      
      await deleteObjectiveFromDB(academiaActual.id, objectiveId);
      
      // Recargar para asegurar consistencia
      await refreshObjectives();
    } catch (error) {
      console.error('Error eliminando objetivo:', error);
      
      // Revertir cambio optimista
      if (objectiveToDelete) {
        setObjectives(prev => [...prev, objectiveToDelete]);
      }
      await refreshObjectives();
      throw error;
    }
  }, [academiaActual, getObjectiveById, refreshObjectives]);
  
  // Función helper para cambiar estado con validación
  const changeObjectiveState = useCallback(async (objectiveId: string, newState: ObjectiveEstado) => {
    const objective = getObjectiveById(objectiveId);
    if (!objective) {
      throw new Error('Objetivo no encontrado');
    }
    
    // Solo validar si se está cambiando a 'actual-progreso'
    if (newState === 'actual-progreso' && objective.estado !== 'actual-progreso') {
      if (!canAddActiveObjective(objective.jugadorId)) {
        const activeCount = getActiveObjectivesCount(objective.jugadorId);
        throw new Error(
          `No se puede cambiar el objetivo a 'Actual/En Progreso'. El jugador ya tiene ${activeCount} de ${MAX_ACTIVE_OBJECTIVES} objetivos activos.`
        );
      }
    }
    
    await updateObjective(objectiveId, { estado: newState });
  }, [getObjectiveById, canAddActiveObjective, getActiveObjectivesCount, updateObjective]);
  
  const value: ObjectiveContextType = {
    // Estado
    objectives,
    loadingObjectives,
    objectivesError,
    
    // Funciones de carga
    loadObjectives,
    refreshObjectives,
    
    // Funciones de consulta
    getObjectiveById,
    getObjectivesByPlayer,
    getObjectivesByState,
    getActiveObjectivesCount,
    canAddActiveObjective,
    
    // Funciones CRUD
    addObjective,
    updateObjective,
    deleteObjective,
    changeObjectiveState
  };
  
  return (
    <ObjectiveContext.Provider value={value}>
      {children}
    </ObjectiveContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useObjective = (): ObjectiveContextType => {
  const context = useContext(ObjectiveContext);
  if (context === undefined) {
    throw new Error('useObjective debe ser usado dentro de ObjectiveProvider');
  }
  return context;
};