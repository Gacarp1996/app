// hooks/useTrainingPlan.ts - HOOK REACT (NO funciones Firebase)
import { useState, useEffect } from 'react';
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
  const [planLoading, setPlanLoading] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [rangoAnalisis, setRangoAnalisis] = useState(30);
  const [planificacion, setPlanificacion] = useState<TrainingPlan['planificacion']>({});
  
  // ✅ NUEVOS: Estados para validación estricta
  const [strictValidation, setStrictValidation] = useState<StrictValidationResult | null>(null);
  const [canGenerateRecs, setCanGenerateRecs] = useState(false);

  useEffect(() => {
    if (activeTab === 'planificacion' && playerId) {
      loadExistingPlan();
    }
  }, [activeTab, playerId]);

  // ✅ NUEVO: Validar plan en tiempo real cuando cambie
  useEffect(() => {
    if (Object.keys(planificacion).length > 0 && playerId) {
      const tempPlan: TrainingPlan = {
        jugadorId: playerId,
        planificacion,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString(),
        rangoAnalisis
      };
      
      // ✅ USAR FUNCIÓN IMPORTADA (no la local)
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
      console.error('Error cargando plan:', error);
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

  // ✅ NUEVO: Validación local del plan (diferente nombre para evitar conflicto)
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
    
    // ✅ USAR FUNCIÓN IMPORTADA
    return validateStrictPlan(tempPlan);
  };

  // ✅ CORREGIDO: Save usando solo propiedades básicas
  const handleSavePlan = async () => {
    if (!playerId) return;
    
    // ✅ USAR FUNCIÓN LOCAL CON NOMBRE CORREGIDO
    const validation = validateCurrentPlan();
    
    if (!validation.isValid) {
      alert(`❌ No se puede guardar el plan:\n\n${validation.errors.join('\n')}`);
      return;
    }

    if (!validation.isComplete) {
      const shouldSaveIncomplete = window.confirm(
        `⚠️ Plan válido pero incompleto (${validation.totalPercentage.toFixed(1)}% de 100%)\n\n` +
        `Errores pendientes:\n${validation.errors.join('\n')}\n\n` +
        `¿Desea guardar como borrador? (No se podrán generar recomendaciones hasta completarlo)`
      );
      
      if (!shouldSaveIncomplete) return;
    }

    if (validation.warnings.length > 0) {
      const confirmMessage = `✅ Plan completo con notas:\n\n${validation.warnings.join('\n')}\n\n¿Guardar plan?`;
      if (!window.confirm(confirmMessage)) return;
    }

    setPlanSaving(true);
    try {
      // ✅ SOLUCIÓN: Solo usar propiedades básicas que acepta saveTrainingPlan
      const basicPlanData: Omit<TrainingPlan, 'fechaCreacion'> = {
        jugadorId: playerId,
        fechaActualizacion: new Date().toISOString(),
        rangoAnalisis,
        planificacion
      };
      
      await saveTrainingPlan(academiaId, playerId, basicPlanData);
      
      // ✅ OPCIONAL: Guardar metadatos de validación por separado si es necesario
      // Esto podría ir a una colección separada o como parte de los metadatos del plan
      console.log('Plan guardado con validación:', {
        isComplete: validation.isComplete,
        granularityLevel: validation.granularityLevel,
        validationErrors: validation.errors,
        version: 2
      });
      
      const successMessage = validation.isComplete
        ? '✅ Plan completo guardado exitosamente. Recomendaciones habilitadas.'
        : '💾 Borrador guardado. Complete el plan para habilitar recomendaciones.';
        
      alert(successMessage);
    } catch (error) {
      console.error('Error guardando plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      alert(`❌ Error al guardar:\n${errorMessage}\n\nRevise la consola para más detalles.`);
    } finally {
      setPlanSaving(false);
    }
  };

  // ✅ NUEVO: Helper para obtener estado del plan
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

  // ✅ NUEVO: Validación en tiempo real para UI
  const getRealTimeValidation = () => {
    // ✅ USAR FUNCIÓN LOCAL CON NOMBRE CORREGIDO
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
    
    // ✅ NUEVOS: Estados de validación
    strictValidation,
    canGenerateRecommendations: canGenerateRecs,
    planStatus: getPlanStatusInfo(),
    realTimeValidation: getRealTimeValidation(),
    
    // Handlers
    handlers: {
      handleTipoPercentageChange,
      handleAreaPercentageChange,
      handleEjercicioPercentageChange,
      handleSavePlan,
    },
    
    // Calculations
    calculations: {
      calculateTotalPercentage,
      calculateAreasTotalPercentage,
      calculateEjerciciosTotalPercentage,
      hasDetailAtLevel,
      validateStrictPlan: validateCurrentPlan, // ✅ USAR FUNCIÓN LOCAL CON NOMBRE CORREGIDO
    }
  };
};