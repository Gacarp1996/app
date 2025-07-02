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
  // Nuevo campo opcional para indicar si el plan usa distribución flexible
  usaDistribucionFlexible?: boolean;
}

export const getTrainingPlan = async (academiaId: string, playerId: string): Promise<TrainingPlan | null> => {
  try {
    const planDoc = doc(db, "academias", academiaId, "trainingPlans", playerId);
    const docSnap = await getDoc(planDoc);
    
    if (docSnap.exists()) {
      const planData = docSnap.data() as TrainingPlan;
      
      // Detectar automáticamente si usa distribución flexible
      if (planData && !planData.hasOwnProperty('usaDistribucionFlexible')) {
        planData.usaDistribucionFlexible = detectarDistribucionFlexible(planData);
      }
      
      return planData;
    }
    return null;
  } catch (error) {
    console.error("Error al obtener plan de entrenamiento:", error);
    return null;
  }
};

export const saveTrainingPlan = async (academiaId: string, playerId: string, planData: Omit<TrainingPlan, 'fechaCreacion'>): Promise<void> => {
  try {
    // Validar datos básicos
    if (!academiaId || !playerId) {
      throw new Error('Academia ID y Player ID son requeridos');
    }
    
    // Asegurar que la estructura esté completa
    const planToSave = {
      ...planData,
      planificacion: planData.planificacion || {},
      rangoAnalisis: planData.rangoAnalisis || 30
    };
    
    const planDoc = doc(db, "academias", academiaId, "trainingPlans", playerId);
    const existingPlan = await getDoc(planDoc);
    
    // Detectar si el plan usa distribución flexible
    const usaDistribucionFlexible = detectarDistribucionFlexible(planToSave);
    
    if (existingPlan.exists()) {
      // Actualizar plan existente
      await setDoc(planDoc, {
        ...planToSave,
        usaDistribucionFlexible,
        fechaCreacion: existingPlan.data().fechaCreacion,
        fechaActualizacion: new Date().toISOString()
      });
    } else {
      // Crear nuevo plan
      await setDoc(planDoc, {
        ...planToSave,
        usaDistribucionFlexible,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
      });
    }
    
    console.log("Plan de entrenamiento guardado exitosamente");
  } catch (error) {
    console.error("Error al guardar plan de entrenamiento:", error);
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

// Función auxiliar para detectar si un plan usa distribución flexible
const detectarDistribucionFlexible = (plan: Partial<TrainingPlan>): boolean => {
  if (!plan.planificacion) return false;
  
  try {
    for (const tipo of Object.values(plan.planificacion)) {
      if (!tipo || typeof tipo.porcentajeTotal !== 'number') continue;
      
      if (tipo.porcentajeTotal > 0) {
        // Verificar si hay áreas sin detallar
        if (!tipo.areas || Object.keys(tipo.areas).length === 0) {
          return true; // No hay áreas definidas pero hay porcentaje en el tipo
        }
        
        const totalAreas = Object.values(tipo.areas).reduce((sum, area) => {
          if (!area || typeof area.porcentajeDelTotal !== 'number') return sum;
          return sum + area.porcentajeDelTotal;
        }, 0);
        
        if (totalAreas < tipo.porcentajeTotal - 0.01) {
          return true; // Hay porcentaje sin detallar en áreas
        }
        
        // Verificar si hay ejercicios sin detallar en alguna área
        for (const area of Object.values(tipo.areas)) {
          if (!area || typeof area.porcentajeDelTotal !== 'number') continue;
          
          if (area.porcentajeDelTotal > 0) {
            if (!area.ejercicios || Object.keys(area.ejercicios).length === 0) {
              return true; // No hay ejercicios definidos pero hay porcentaje en el área
            }
            
            const totalEjercicios = Object.values(area.ejercicios).reduce(
              (sum, ej) => {
                if (!ej || typeof ej.porcentajeDelTotal !== 'number') return sum;
                return sum + ej.porcentajeDelTotal;
              }, 0
            );
            
            if (totalEjercicios < area.porcentajeDelTotal - 0.01) {
              return true; // Hay porcentaje sin detallar en ejercicios
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error en detectarDistribucionFlexible:', error);
    return false;
  }
  
  return false;
};

// Función auxiliar para validar un plan de forma flexible
export const validateFlexiblePlan = (plan: Partial<TrainingPlan>): { isValid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!plan.planificacion) {
    errors.push("El plan debe tener una estructura de planificación");
    return { isValid: false, errors, warnings };
  }
  
  try {
    // Calcular total general
    const totalGeneral = Object.values(plan.planificacion).reduce((sum, tipo) => {
      if (!tipo || typeof tipo.porcentajeTotal !== 'number') return sum;
      return sum + tipo.porcentajeTotal;
    }, 0);
    
    // Solo es error si el total no es 100%
    if (Math.abs(totalGeneral - 100) > 0.01) {
      errors.push(`El total general debe ser 100%. Actualmente es: ${totalGeneral.toFixed(2)}%`);
    }
    
    // Validaciones flexibles (solo advertencias)
    Object.entries(plan.planificacion).forEach(([tipoNombre, tipo]) => {
      if (!tipo || typeof tipo.porcentajeTotal !== 'number') return;
      
      if (tipo.porcentajeTotal > 0) {
        if (!tipo.areas || Object.keys(tipo.areas).length === 0) {
          warnings.push(`${tipoNombre}: ${tipo.porcentajeTotal}% sin detallar por áreas`);
          return;
        }
        
        const totalAreas = Object.values(tipo.areas).reduce((sum, area) => {
          if (!area || typeof area.porcentajeDelTotal !== 'number') return sum;
          return sum + area.porcentajeDelTotal;
        }, 0);
        
        if (totalAreas > tipo.porcentajeTotal + 0.01) {
          errors.push(`${tipoNombre}: Las áreas (${totalAreas.toFixed(1)}%) exceden el total del tipo (${tipo.porcentajeTotal}%)`);
        } else if (totalAreas < tipo.porcentajeTotal - 0.01) {
          warnings.push(`${tipoNombre}: ${(tipo.porcentajeTotal - totalAreas).toFixed(1)}% sin detallar por áreas`);
        }
        
        // Validar ejercicios dentro de cada área
        Object.entries(tipo.areas).forEach(([areaNombre, area]) => {
          if (!area || typeof area.porcentajeDelTotal !== 'number') return;
          
          if (area.porcentajeDelTotal > 0) {
            if (!area.ejercicios || Object.keys(area.ejercicios).length === 0) {
              warnings.push(`${tipoNombre} > ${areaNombre}: ${area.porcentajeDelTotal}% sin detallar por ejercicios`);
              return;
            }
            
            const totalEjercicios = Object.values(area.ejercicios).reduce(
              (sum, ej) => {
                if (!ej || typeof ej.porcentajeDelTotal !== 'number') return sum;
                return sum + ej.porcentajeDelTotal;
              }, 0
            );
            
            if (totalEjercicios > area.porcentajeDelTotal + 0.01) {
              errors.push(`${tipoNombre} > ${areaNombre}: Los ejercicios (${totalEjercicios.toFixed(1)}%) exceden el total del área (${area.porcentajeDelTotal}%)`);
            } else if (totalEjercicios < area.porcentajeDelTotal - 0.01) {
              warnings.push(`${tipoNombre} > ${areaNombre}: ${(area.porcentajeDelTotal - totalEjercicios).toFixed(1)}% sin detallar por ejercicios`);
            }
          }
        });
      }
    });
  } catch (error) {
    console.error('Error en validateFlexiblePlan:', error);
    errors.push('Error al validar el plan');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};