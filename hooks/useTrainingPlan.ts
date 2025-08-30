// hooks/useTrainingPlan.ts - COMPLETAMENTE MIGRADO A SONNER
import { useState, useEffect } from 'react';
import { useNotification } from './useNotification'; // ✅ IMPORT AGREGADO
import { 
  TrainingPlan, 
  getTrainingPlan, 
  saveTrainingPlan,
  validateStrictPlan,
  canGenerateRecommendations,
  getPlanStatus,
  StrictValidationResult
} from '../Database/FirebaseTrainingPlans';
import { TipoType, AreaType, getAreasForTipo, getEjerciciosForTipoArea } from '../constants/training';

interface UseTrainingPlanProps {
  playerId: string | undefined;
  academiaId: string;
  activeTab: string;
}

// ✅ FUNCIONES DE CONVERSIÓN MANTENIDAS
const convertRelativeToAbsolute = (relativeValue: number, parentValue: number): number => {
  return (relativeValue * parentValue) / 100;
};

const convertAbsoluteToRelative = (absoluteValue: number, parentValue: number): number => {
  if (parentValue === 0) return 0;
  return (absoluteValue / parentValue) * 100;
};

export const useTrainingPlan = ({ playerId, academiaId, activeTab }: UseTrainingPlanProps) => {
  const notification = useNotification(); // ✅ HOOK DE NOTIFICACIONES
  
  const [planLoading, setPlanLoading] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [rangoAnalisis, setRangoAnalisis] = useState(30);
  const [planificacion, setPlanificacion] = useState<TrainingPlan['planificacion']>({});
  
  // Estados para validación estricta
  const [strictValidation, setStrictValidation] = useState<StrictValidationResult | null>(null);
  const [canGenerateRecs, setCanGenerateRecs] = useState(false);

  useEffect(() => {
    if (activeTab === 'planificacion' && playerId) {
      loadExistingPlan();
    }
  }, [activeTab, playerId]);

  // Validar plan en tiempo real cuando cambie
  useEffect(() => {
    if (Object.keys(planificacion).length > 0 && playerId) {
      const tempPlan: TrainingPlan = {
        jugadorId: playerId,
        planificacion,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        rangoAnalisis
      };
      
      const validation = validateStrictPlan(tempPlan);
      setStrictValidation(validation);
      
      const recValidation = canGenerateRecommendations(tempPlan);
      setCanGenerateRecs(recValidation.canGenerate);
    }
  }, [planificacion, playerId, rangoAnalisis]);

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
      
      initializeEmptyPlan();
    } finally {
      setPlanLoading(false);
    }
  };

  const initializeEmptyPlan = () => {
    const newPlan: TrainingPlan['planificacion'] = {};
    
    Object.values(TipoType).forEach(tipo => {
      newPlan[tipo] = {
        porcentajeTotal: 0,
        areas: {}
      };
      
      const areasForTipo = getAreasForTipo(tipo as TipoType);
      
      areasForTipo.forEach(area => {
        newPlan[tipo].areas[area] = {
          porcentajeDelTotal: 0,
          ejercicios: {}
        };
        
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

  const handleAreaPercentageChange = (tipo: string, area: string, relativeValue: number) => {
    const tipoPorcentaje = planificacion[tipo]?.porcentajeTotal || 0;
    const absoluteValue = convertRelativeToAbsolute(relativeValue, tipoPorcentaje);
    
    setPlanificacion(prev => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        areas: {
          ...prev[tipo].areas,
          [area]: {
            porcentajeDelTotal: absoluteValue,
            ejercicios: prev[tipo]?.areas[area]?.ejercicios || {}
          }
        }
      }
    }));
  };

  const handleEjercicioPercentageChange = (tipo: string, area: string, ejercicio: string, relativeValue: number) => {
    const areaPorcentaje = planificacion[tipo]?.areas[area]?.porcentajeDelTotal || 0;
    const absoluteValue = convertRelativeToAbsolute(relativeValue, areaPorcentaje);
    
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
                porcentajeDelTotal: absoluteValue
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

  // Validación local del plan
  const validateCurrentPlan = (): StrictValidationResult => {
    if (!playerId) {
      return {
        isValid: false,
        isComplete: false,
        errors: ['ID de jugador requerido'],
        warnings: [],
        totalPercentage: 0,
        granularityLevel: 'TIPO',
        canGenerateRecommendations: false
      };
    }

    const tempPlan: TrainingPlan = {
      jugadorId: playerId,
      planificacion,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      rangoAnalisis
    };
    
    return validateStrictPlan(tempPlan);
  };

  // ✅ COMPLETAMENTE MIGRADO: Save usando Sonner
  const handleSavePlan = async () => {
    if (!playerId) return;
    
    const validation = validateCurrentPlan();
    
    if (!validation.isValid) {
      // MIGRADO: alert → notification.error
      notification.error(
        'No se puede guardar el plan',
        validation.errors.join(' • ')
      );
      return;
    }

    if (!validation.isComplete) {
      // MIGRADO: window.confirm → notification.confirm
      const shouldSaveIncomplete = await notification.confirm({
        title: 'Plan incompleto',
        message: `Plan válido pero incompleto (${validation.totalPercentage.toFixed(1)}% de 100%). 
                 
                 ${validation.errors.length > 0 ? 'Errores pendientes:\n' + validation.errors.join('\n') + '\n\n' : ''}¿Desea guardar como borrador? (No se podrán generar recomendaciones hasta completarlo)`,
        type: 'warning',
        confirmText: 'Sí, guardar borrador',
        cancelText: 'Cancelar'
      });
      
      if (!shouldSaveIncomplete) return;
    }

    if (validation.warnings.length > 0) {
      // MIGRADO: window.confirm → notification.confirm
      const confirmMessage = await notification.confirm({
        title: 'Plan completo con notas',
        message: validation.warnings.join('\n') + '\n\n¿Guardar plan?',
        type: 'info',
        confirmText: 'Sí, guardar',
        cancelText: 'Revisar'
      });
      
      if (!confirmMessage) return;
    }

    setPlanSaving(true);
    
    try {
      const basicPlanData: Omit<TrainingPlan, 'fechaCreacion'> = {
        jugadorId: playerId,
        fechaActualizacion: new Date().toISOString(),
        rangoAnalisis,
        planificacion
      };
      
      // ✅ MIGRADO: alert → notification.promise (la notificación de la imagen)
      await notification.promise(
        saveTrainingPlan(academiaId, playerId, basicPlanData),
        {
          loading: 'Guardando plan...',
          success: validation.isComplete
            ? 'Plan completo guardado exitosamente. Recomendaciones habilitadas.'
            : 'Borrador guardado. Complete el plan para habilitar recomendaciones.',
          error: (error: any) => `Error al guardar: ${error?.message || 'Error desconocido'}`
        }
      );
  
      
    } catch (error) {
      
      // El error ya se muestra automáticamente con notification.promise
    } finally {
      setPlanSaving(false);
    }
  };

  // Helper para obtener estado del plan
  const getPlanStatusInfo = () => {
    if (!playerId) return null;
    
    const tempPlan: TrainingPlan = {
      jugadorId: playerId,
      planificacion,
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      rangoAnalisis
    };
    
    return getPlanStatus(tempPlan);
  };

  // Validación en tiempo real para UI
  const getRealTimeValidation = () => {
    const validation = validateCurrentPlan();
    
    return {
      fieldErrors: {}, // Implementar específicos si necesitas
      globalErrors: validation.errors,
      isValidForSave: validation.isValid,
      totalPercentage: validation.totalPercentage
    };
  };

  return {
    // Estados básicos
    planLoading,
    planSaving,
    rangoAnalisis,
    planificacion,
    setRangoAnalisis,
    
    // Estados de validación
    strictValidation,
    canGenerateRecommendations: canGenerateRecs,
    planStatus: getPlanStatusInfo(),
    realTimeValidation: getRealTimeValidation(),
    
    // Handlers
    handlers: {
      handleTipoPercentageChange,
      handleAreaPercentageChange,
      handleEjercicioPercentageChange,
      handleSavePlan, // ✅ COMPLETAMENTE MIGRADO
    },
    
    // Calculations
    calculations: {
      calculateTotalPercentage,
      calculateAreasTotalPercentage,
      calculateEjerciciosTotalPercentage,
      hasDetailAtLevel,
      validateStrictPlan: validateCurrentPlan,
    }
  };
};