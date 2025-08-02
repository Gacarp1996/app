// hooks/useTrainingPlan.ts
import { useState, useEffect } from 'react';
import { 
  TrainingPlan, 
  getTrainingPlan, 
  saveTrainingPlan, 
  validateFlexiblePlan as validatePlan 
} from '../Database/FirebaseTrainingPlans';
import { TipoType, AreaType, getAreasForTipo, getEjerciciosForTipoArea } from '../constants/training';

interface UseTrainingPlanProps {
  playerId: string | undefined;
  academiaId: string;
  activeTab: string;
}

export const useTrainingPlan = ({ playerId, academiaId, activeTab }: UseTrainingPlanProps) => {
  const [planLoading, setPlanLoading] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [rangoAnalisis, setRangoAnalisis] = useState(30);
  const [planificacion, setPlanificacion] = useState<TrainingPlan['planificacion']>({});

  useEffect(() => {
    if (activeTab === 'planificacion' && playerId) {
      loadExistingPlan();
    }
  }, [activeTab, playerId]);

  const loadExistingPlan = async () => {
    if (!playerId || !academiaId) return;
    
    setPlanLoading(true);
    try {
      const existingPlan = await getTrainingPlan(academiaId, playerId);
      
      if (existingPlan && existingPlan.planificacion) {
        setPlanificacion(existingPlan.planificacion);
        setRangoAnalisis(existingPlan.rangoAnalisis || 30);
      } else {
        initializeEmptyPlan();
      }
    } catch (error) {
      console.error('Error cargando plan:', error);
      initializeEmptyPlan();
    } finally {
      setPlanLoading(false);
    }
  };

  const initializeEmptyPlan = () => {
    const newPlan: TrainingPlan['planificacion'] = {};
    
    // Usar los enums de tipos directamente
    Object.values(TipoType).forEach(tipo => {
      newPlan[tipo] = {
        porcentajeTotal: 0,
        areas: {}
      };
      
      // Obtener áreas válidas para este tipo
      const areasForTipo = getAreasForTipo(tipo);
      
      areasForTipo.forEach(area => {
        newPlan[tipo].areas[area] = {
          porcentajeDelTotal: 0,
          ejercicios: {}
        };
        
        // Obtener ejercicios válidos para esta combinación tipo/área
        const ejerciciosForArea = getEjerciciosForTipoArea(tipo, area);
        
        if (ejerciciosForArea && ejerciciosForArea.length > 0) {
          ejerciciosForArea.forEach(ejercicio => {
            if (!newPlan[tipo].areas[area].ejercicios) {
              newPlan[tipo].areas[area].ejercicios = {};
            }
            newPlan[tipo].areas[area].ejercicios[ejercicio] = {
              porcentajeDelTotal: 0
            };
          });
        }
      });
    });
    
    setPlanificacion(newPlan);
  };

  const handleTipoPercentageChange = (tipo: string, value: number) => {
    setPlanificacion(prev => ({
      ...prev,
      [tipo]: {
        porcentajeTotal: value,
        areas: prev[tipo]?.areas || {}
      }
    }));
  };

  const handleAreaPercentageChange = (tipo: string, area: string, value: number) => {
    setPlanificacion(prev => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        areas: {
          ...prev[tipo].areas,
          [area]: {
            porcentajeDelTotal: value,
            ejercicios: prev[tipo]?.areas[area]?.ejercicios || {}
          }
        }
      }
    }));
  };

  const handleEjercicioPercentageChange = (tipo: string, area: string, ejercicio: string, value: number) => {
    setPlanificacion(prev => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        areas: {
          ...prev[tipo].areas,
          [area]: {
            ...prev[tipo].areas[area],
            ejercicios: {
              ...prev[tipo].areas[area].ejercicios || {},
              [ejercicio]: {
                porcentajeDelTotal: value
              }
            }
          }
        }
      }
    }));
  };

  const calculateTotalPercentage = (): number => {
    return Object.values(planificacion || {}).reduce((sum, tipo) => {
      if (!tipo || typeof tipo.porcentajeTotal !== 'number') return sum;
      return sum + tipo.porcentajeTotal;
    }, 0);
  };

  const calculateAreasTotalPercentage = (tipo: string): number => {
    if (!planificacion[tipo]?.areas) return 0;
    return Object.values(planificacion[tipo].areas).reduce(
      (sum, area) => {
        if (!area || typeof area.porcentajeDelTotal !== 'number') return sum;
        return sum + area.porcentajeDelTotal;
      }, 0
    );
  };

  const calculateEjerciciosTotalPercentage = (tipo: string, area: string): number => {
    if (!planificacion[tipo]?.areas[area]?.ejercicios) return 0;
    return Object.values(planificacion[tipo].areas[area].ejercicios).reduce(
      (sum, ej) => {
        if (!ej || typeof ej.porcentajeDelTotal !== 'number') return sum;
        return sum + ej.porcentajeDelTotal;
      }, 0
    );
  };

  const hasDetailAtLevel = (tipo: string, area?: string): boolean => {
    if (!planificacion[tipo]) return false;
    
    if (!area) {
      if (!planificacion[tipo].areas) return false;
      return Object.values(planificacion[tipo].areas).some(a => 
        a && typeof a.porcentajeDelTotal === 'number' && a.porcentajeDelTotal > 0
      );
    } else {
      if (!planificacion[tipo].areas[area]?.ejercicios) return false;
      return Object.values(planificacion[tipo].areas[area].ejercicios).some(e => 
        e && typeof e.porcentajeDelTotal === 'number' && e.porcentajeDelTotal > 0
      );
    }
  };

  const validateFlexiblePlan = (): { isValid: boolean; warnings: string[] } => {
    const planData: Partial<TrainingPlan> = {
      jugadorId: playerId!,
      rangoAnalisis,
      planificacion
    };
    
    const result = validatePlan(planData);
    
    if (!result.isValid) {
      return {
        isValid: false,
        warnings: result.errors
      };
    }
    
    return {
      isValid: true,
      warnings: result.warnings
    };
  };

  const handleSavePlan = async () => {
    if (!playerId) return;
    
    const validation = validateFlexiblePlan();
    
    if (!validation.isValid) {
      alert(validation.warnings.join('\n'));
      return;
    }

    if (validation.warnings.length > 0) {
      const confirmMessage = `Plan válido con las siguientes notas:\n\n${validation.warnings.join('\n')}\n\n¿Desea guardar el plan?`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    setPlanSaving(true);
    try {
      const planData: Omit<TrainingPlan, 'fechaCreacion'> = {
        jugadorId: playerId,
        fechaActualizacion: new Date().toISOString(),
        rangoAnalisis,
        planificacion
      };
      
      await saveTrainingPlan(academiaId, playerId, planData);
      alert('Plan de entrenamiento guardado exitosamente');
    } catch (error) {
      console.error('Error guardando plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al guardar el plan de entrenamiento:\n${errorMessage}\n\nRevise la consola para más detalles.`);
    } finally {
      setPlanSaving(false);
    }
  };

  return {
    planLoading,
    planSaving,
    rangoAnalisis,
    planificacion,
    setRangoAnalisis,
    handlers: {
      handleTipoPercentageChange,
      handleAreaPercentageChange,
      handleEjercicioPercentageChange,
      handleSavePlan,
    },
    calculations: {
      calculateTotalPercentage,
      calculateAreasTotalPercentage,
      calculateEjerciciosTotalPercentage,
      hasDetailAtLevel,
      validateFlexiblePlan,
    }
  };
};