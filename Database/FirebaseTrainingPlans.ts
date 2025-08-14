import { db } from "../firebase/firebase-config";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { TipoType, getAreasForTipo, getEjerciciosForTipoArea, tipoRequiereEjercicios } from "../constants/training";

export interface TrainingPlan {
  jugadorId: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  rangoAnalisis: number;
  planificacion: {
    [tipoKey: string]: {
      porcentajeTotal: number;
      areas: {
        [areaKey: string]: {
          porcentajeDelTotal: number;
          ejercicios?: {
            [ejercicioName: string]: {
              porcentajeDelTotal: number;
            }
          }
        }
      }
    }
  };
  version?: number;
  isComplete?: boolean;
  granularityLevel?: 'TIPO' | 'AREA' | 'EJERCICIO';
  validationErrors?: string[];
}

export interface StrictValidationResult {
  isValid: boolean;
  isComplete: boolean;
  errors: string[];
  warnings: string[];
  totalPercentage: number;
  granularityLevel: 'TIPO' | 'AREA' | 'EJERCICIO';
  canGenerateRecommendations: boolean;
}

export const getTrainingPlan = async (academiaId: string, playerId: string): Promise<TrainingPlan | null> => {
  try {
    const planDoc = doc(db, "academias", academiaId, "trainingPlans", playerId);
    const docSnap = await getDoc(planDoc);
    
    if (docSnap.exists()) {
      const planData = docSnap.data() as TrainingPlan;
      return planData;
    }
    return null;
  } catch (error) {
    console.error("Error al obtener plan de entrenamiento:", error);
    return null;
  }
};

export const saveTrainingPlan = async (
  academiaId: string, 
  playerId: string, 
  planData: Omit<TrainingPlan, 'fechaCreacion'>
): Promise<void> => {
  try {
    if (!academiaId || !playerId) {
      throw new Error('Academia ID y Player ID son requeridos');
    }
    
    const validation = validateStrictPlan(planData);
    
    if (!validation.isValid) {
      throw new Error(`❌ Plan inválido:\n${validation.errors.join('\n')}`);
    }
    
    const planToSave = {
      ...planData,
      planificacion: planData.planificacion || {},
      rangoAnalisis: planData.rangoAnalisis || 30,
      version: 2,
      isComplete: validation.isComplete,
      granularityLevel: validation.granularityLevel,
      validationErrors: validation.errors
    };
    
    const planDoc = doc(db, "academias", academiaId, "trainingPlans", playerId);
    const existingPlan = await getDoc(planDoc);
    
    if (existingPlan.exists()) {
      await setDoc(planDoc, {
        ...planToSave,
        fechaCreacion: existingPlan.data().fechaCreacion,
        fechaActualizacion: new Date().toISOString()
      });
    } else {
      await setDoc(planDoc, {
        ...planToSave,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
      });
    }
    
    console.log("✅ Plan de entrenamiento guardado exitosamente");
  } catch (error) {
    console.error("❌ Error al guardar plan de entrenamiento:", error);
    throw error;
  }
};

export const deleteTrainingPlan = async (academiaId: string, playerId: string): Promise<void> => {
  try {
    const planDoc = doc(db, "academias", academiaId, "trainingPlans", playerId);
    await deleteDoc(planDoc);
    console.log("Plan de entrenamiento eliminado exitosamente");
  } catch (error) {
    console.error("Error al eliminar plan de entrenamiento:", error);
    throw error;
  }
};

// ✅ ACTUALIZADA: Validación que reconoce que Puntos no requiere ejercicios
export const validateStrictPlan = (plan: Partial<TrainingPlan>): StrictValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalSum = 0;
  let granularityLevel: 'TIPO' | 'AREA' | 'EJERCICIO' = 'TIPO';
  let hasAreaDetail = false;
  let hasEjercicioDetail = false;
  
  if (!plan.planificacion) {
    return {
      isValid: false,
      isComplete: false,
      errors: ['El plan debe tener una estructura de planificación'],
      warnings: [],
      totalPercentage: 0,
      granularityLevel: 'TIPO',
      canGenerateRecommendations: false
    };
  }
  
  // Validar cada tipo
  for (const tipo of Object.values(TipoType)) {
    const tipoPlan = plan.planificacion[tipo];
    const tipoPorcentaje = tipoPlan?.porcentajeTotal || 0;
    
    // ✅ IMPORTANTE: Determinar si este tipo requiere ejercicios
    const requiresExercises = tipoRequiereEjercicios(tipo as TipoType);
    
    if (tipoPorcentaje === undefined || tipoPorcentaje === null) {
      errors.push(`Tipo ${tipo}: porcentaje total no definido`);
      continue;
    }
    
    totalSum += tipoPorcentaje;
    
    if (tipoPorcentaje > 0) {
      const areas = getAreasForTipo(tipo as TipoType);
      let areaSum = 0;
      let allAreasHaveValues = true;
      
      for (const area of areas) {
        const areaPlan = tipoPlan?.areas?.[area];
        const areaPorcentaje = areaPlan?.porcentajeDelTotal || 0;
        
        if (areaPorcentaje === undefined || areaPorcentaje === null) {
          errors.push(`Tipo ${tipo}, área ${area}: porcentaje no definido`);
          allAreasHaveValues = false;
          continue;
        }
        
        areaSum += areaPorcentaje;
        
        if (areaPorcentaje > 0) {
          hasAreaDetail = true;
          
          // ✅ CLAVE: Solo validar ejercicios si el tipo los requiere
          if (requiresExercises) {
            const ejercicios = getEjerciciosForTipoArea(tipo as TipoType, area as any);
            
            if (ejercicios.length > 0) {
              let ejercicioSum = 0;
              let allEjerciciosHaveValues = true;
              
              for (const ejercicio of ejercicios) {
                const ejercicioPorcentaje = areaPlan?.ejercicios?.[ejercicio]?.porcentajeDelTotal || 0;
                
                if (ejercicioPorcentaje === undefined || ejercicioPorcentaje === null) {
                  errors.push(`Tipo ${tipo}, área ${area}, ejercicio ${ejercicio}: porcentaje no definido`);
                  allEjerciciosHaveValues = false;
                  continue;
                }
                
                ejercicioSum += ejercicioPorcentaje;
                if (ejercicioPorcentaje > 0) {
                  hasEjercicioDetail = true;
                }
              }
              
              if (allEjerciciosHaveValues && ejercicios.length > 0) {
                const diff = Math.abs(ejercicioSum - areaPorcentaje);
                if (diff > 0.5) {
                  errors.push(`Tipo ${tipo}, área ${area}: ejercicios suman ${ejercicioSum.toFixed(1)}% pero el área indica ${areaPorcentaje.toFixed(1)}% (diferencia debe ser ≤0.5%)`);
                }
              }
            }
          } else {
            // ✅ Para Puntos: considerarlo completo sin necesidad de ejercicios
            // No agregar errores por falta de ejercicios
            hasEjercicioDetail = true; // Marcar como completo a este nivel
          }
        }
      }
      
      if (allAreasHaveValues) {
        const diff = Math.abs(areaSum - tipoPorcentaje);
        if (diff > 0.5) {
          errors.push(`Tipo ${tipo}: áreas suman ${areaSum.toFixed(1)}% pero el tipo indica ${tipoPorcentaje.toFixed(1)}% (diferencia debe ser ≤0.5%)`);
        }
      }
    }
  }
  
  // Validar total general
  const totalDiff = Math.abs(totalSum - 100);
  if (totalDiff > 0.5) {
    errors.push(`Total general suma ${totalSum.toFixed(1)}% pero debe ser 100% (diferencia debe ser ≤0.5%)`);
  }
  
  const isComplete = errors.length === 0 && totalDiff <= 0.5;
  
  // Determinar nivel de granularidad
  if (hasEjercicioDetail) {
    granularityLevel = 'EJERCICIO';
  } else if (hasAreaDetail) {
    granularityLevel = 'AREA';
  }
  
  return {
    isValid: errors.length === 0,
    isComplete,
    errors,
    warnings,
    totalPercentage: totalSum,
    granularityLevel,
    canGenerateRecommendations: isComplete
  };
};

export const canGenerateRecommendations = (plan: TrainingPlan): { canGenerate: boolean; reason?: string } => {
  const validation = validateStrictPlan(plan);
  
  if (!validation.isValid) {
    return { canGenerate: false, reason: 'Plan inválido - hay errores que corregir' };
  }
  
  if (!validation.isComplete) {
    return { canGenerate: false, reason: 'Plan incompleto - faltan campos obligatorios' };
  }
  
  return { canGenerate: true };
};

export const getPlanStatus = (plan: TrainingPlan): {
  status: 'COMPLETE' | 'INCOMPLETE' | 'INVALID' | 'EMPTY';
  message: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
} => {
  if (!plan.planificacion || Object.keys(plan.planificacion).length === 0) {
    return {
      status: 'EMPTY',
      message: 'No hay plan definido',
      color: 'gray'
    };
  }
  
  const validation = validateStrictPlan(plan);
  
  if (!validation.isValid) {
    return {
      status: 'INVALID',
      message: `Plan inválido - ${validation.errors.length} error(es)`,
      color: 'red'
    };
  }
  
  if (!validation.isComplete) {
    return {
      status: 'INCOMPLETE',
      message: `Plan incompleto - ${validation.totalPercentage.toFixed(1)}% de 100%`,
      color: 'yellow'
    };
  }
  
  return {
    status: 'COMPLETE',
    message: 'Plan completo - Recomendaciones habilitadas',
    color: 'green'
  };
};