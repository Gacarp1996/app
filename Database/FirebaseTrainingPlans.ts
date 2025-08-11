import { db } from "../firebase/firebase-config";
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";

export interface TrainingPlan {
  jugadorId: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  rangoAnalisis: number; // días hacia atrás para analizar (default: 30)
  planificacion: {
    [tipoKey: string]: {  // "Canasto" o "Peloteo"
      porcentajeTotal: number;
      areas: {
        [areaKey: string]: {  // "Juego de base", etc.
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
  // ✅ NUEVOS CAMPOS para validación estricta
  version?: number;
  isComplete?: boolean;
  granularityLevel?: 'TIPO' | 'AREA' | 'EJERCICIO';
  validationErrors?: string[];
}

// ✅ NUEVA: Interface para resultado de validación estricta
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

// ✅ ACTUALIZADO: saveTrainingPlan con validación estricta obligatoria
export const saveTrainingPlan = async (
  academiaId: string, 
  playerId: string, 
  planData: Omit<TrainingPlan, 'fechaCreacion'>
): Promise<void> => {
  try {
    // Validar datos básicos
    if (!academiaId || !playerId) {
      throw new Error('Academia ID y Player ID son requeridos');
    }
    
    // ✅ VALIDACIÓN ESTRICTA OBLIGATORIA antes de guardar
    const validation = validateStrictPlan(planData);
    
    if (!validation.isValid) {
      throw new Error(`❌ Plan inválido:\n${validation.errors.join('\n')}`);
    }
    
    if (!validation.isComplete) {
      throw new Error(`❌ Plan incompleto - Complete todos los campos obligatorios:\n${validation.errors.join('\n')}`);
    }
    
    // Preparar plan para guardar
    const planToSave = {
      ...planData,
      planificacion: planData.planificacion || {},
      rangoAnalisis: planData.rangoAnalisis || 30,
      // ✅ AGREGAR metadatos de validación
      version: 2, // Versión estricta
      isComplete: validation.isComplete,
      granularityLevel: validation.granularityLevel,
      validationErrors: validation.errors
    };
    
    const planDoc = doc(db, "academias", academiaId, "trainingPlans", playerId);
    const existingPlan = await getDoc(planDoc);
    
    if (existingPlan.exists()) {
      // Actualizar plan existente
      await setDoc(planDoc, {
        ...planToSave,
        fechaCreacion: existingPlan.data().fechaCreacion,
        fechaActualizacion: new Date().toISOString()
      });
    } else {
      // Crear nuevo plan
      await setDoc(planDoc, {
        ...planToSave,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
      });
    }
    
    console.log("✅ Plan de entrenamiento VÁLIDO guardado exitosamente");
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

// ✅ CORREGIDA: Validación estricta con soporte para granularidad flexible
export const validateStrictPlan = (plan: Partial<TrainingPlan>): StrictValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
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
  
  try {
    // ✅ NUEVO: Detectar granularidad ANTES de validar
    const granularityLevel = determineGranularityLevel(plan.planificacion);
    
    // 1. VALIDAR TOTAL GENERAL = 100%
    const totalGeneral = Object.values(plan.planificacion).reduce((sum, tipo) => {
      if (!tipo || typeof tipo.porcentajeTotal !== 'number') return sum;
      return sum + tipo.porcentajeTotal;
    }, 0);
    
    if (Math.abs(totalGeneral - 100) > 0.5) {
      errors.push(`❌ El total debe ser 100%. Actual: ${totalGeneral.toFixed(1)}%`);
    }
    
    // 2. VALIDAR CADA TIPO
    Object.entries(plan.planificacion).forEach(([tipoNombre, tipo]) => {
      if (!tipo || typeof tipo.porcentajeTotal !== 'number') {
        errors.push(`❌ Tipo ${tipoNombre}: porcentaje total no definido`);
        return;
      }
      
      if (tipo.porcentajeTotal > 0) {
        // SI HAY PORCENTAJE EN TIPO, DEBE TENER ÁREAS DEFINIDAS
        if (!tipo.areas || Object.keys(tipo.areas).length === 0) {
          errors.push(`❌ ${tipoNombre}: ${tipo.porcentajeTotal}% requiere definir áreas`);
          return;
        }
        
        // VALIDAR SUMA DE ÁREAS = PORCENTAJE DEL TIPO
        const totalAreas = Object.values(tipo.areas).reduce((sum, area) => {
          if (!area || typeof area.porcentajeDelTotal !== 'number') return sum;
          return sum + area.porcentajeDelTotal;
        }, 0);
        
        if (Math.abs(totalAreas - tipo.porcentajeTotal) > 0.5) {
          errors.push(`❌ ${tipoNombre}: Las áreas (${totalAreas.toFixed(1)}%) deben sumar exactamente ${tipo.porcentajeTotal}%`);
        }
        
        // 3. VALIDAR CADA ÁREA
        Object.entries(tipo.areas).forEach(([areaNombre, area]) => {
          if (!area || typeof area.porcentajeDelTotal !== 'number') {
            errors.push(`❌ Tipo ${tipoNombre}, área ${areaNombre}: porcentaje no definido`);
            return;
          }
          
          if (area.porcentajeDelTotal > 0) {
            // ✅ CAMBIO CLAVE: Solo exigir ejercicios si el plan usa granularidad EJERCICIO
            if (granularityLevel === 'EJERCICIO') {
              // El plan tiene ejercicios en alguna parte, entonces TODAS las áreas con % deben tenerlos
              if (!area.ejercicios || Object.keys(area.ejercicios).length === 0) {
                errors.push(`❌ ${tipoNombre} > ${areaNombre}: ${area.porcentajeDelTotal}% requiere definir ejercicios (plan usa granularidad de ejercicio)`);
                return;
              }
              
              // VALIDAR SUMA DE EJERCICIOS = PORCENTAJE DEL ÁREA
              const totalEjercicios = Object.values(area.ejercicios).reduce(
                (sum, ej) => {
                  if (!ej || typeof ej.porcentajeDelTotal !== 'number') return sum;
                  return sum + ej.porcentajeDelTotal;
                }, 0
              );
              
              if (Math.abs(totalEjercicios - area.porcentajeDelTotal) > 0.5) {
                errors.push(`❌ ${tipoNombre} > ${areaNombre}: Los ejercicios (${totalEjercicios.toFixed(1)}%) deben sumar exactamente ${area.porcentajeDelTotal}%`);
              }
              
              // VALIDAR QUE CADA EJERCICIO TENGA PORCENTAJE DEFINIDO
              Object.entries(area.ejercicios).forEach(([ejercicioNombre, ejercicio]) => {
                if (!ejercicio || typeof ejercicio.porcentajeDelTotal !== 'number') {
                  errors.push(`❌ ${tipoNombre} > ${areaNombre} > ${ejercicioNombre}: porcentaje no definido`);
                }
              });
            } else if (granularityLevel === 'AREA') {
              // ✅ NUEVO: Nivel ÁREA es válido sin ejercicios
              // Si hay ejercicios parciales definidos (no debería en nivel ÁREA puro), validarlos
              if (area.ejercicios && Object.keys(area.ejercicios).length > 0) {
                const totalEjercicios = Object.values(area.ejercicios).reduce(
                  (sum, ej) => {
                    if (!ej || typeof ej.porcentajeDelTotal !== 'number') return sum;
                    return sum + ej.porcentajeDelTotal;
                  }, 0
                );
                
                if (Math.abs(totalEjercicios - area.porcentajeDelTotal) > 0.5) {
                  errors.push(`❌ ${tipoNombre} > ${areaNombre}: Los ejercicios (${totalEjercicios.toFixed(1)}%) deben sumar exactamente ${area.porcentajeDelTotal}%`);
                }
              }
              // NO exigir ejercicios si no existen
            }
            // Para nivel TIPO, no validar ejercicios en absoluto
          }
        });
      }
    });
    
    // 5. RESULTADO FINAL
    const isValid = errors.length === 0;
    const isComplete = isValid && totalGeneral === 100;
    
    return {
      isValid,
      isComplete,
      errors,
      warnings,
      totalPercentage: totalGeneral,
      granularityLevel, // Ya calculado al inicio
      canGenerateRecommendations: isComplete
    };
    
  } catch (error) {
    console.error('Error en validateStrictPlan:', error);
    return {
      isValid: false,
      isComplete: false,
      errors: ['Error interno al validar el plan'],
      warnings: [],
      totalPercentage: 0,
      granularityLevel: 'TIPO',
      canGenerateRecommendations: false
    };
  }
};

// ✅ HELPER: Determinar nivel de granularidad
const determineGranularityLevel = (planificacion: TrainingPlan['planificacion']): 'TIPO' | 'AREA' | 'EJERCICIO' => {
  let hasAreas = false;
  let hasEjercicios = false;
  
  Object.values(planificacion).forEach(tipo => {
    if (tipo?.areas && Object.keys(tipo.areas).length > 0) {
      hasAreas = true;
      Object.values(tipo.areas).forEach(area => {
        if (area?.ejercicios && Object.keys(area.ejercicios).length > 0) {
          hasEjercicios = true;
        }
      });
    }
  });
  
  if (hasEjercicios) return 'EJERCICIO';
  if (hasAreas) return 'AREA';
  return 'TIPO';
};

// ✅ HELPER: Verificar si se pueden generar recomendaciones
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

// ✅ HELPER: Obtener estado del plan
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