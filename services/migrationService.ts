// services/migrationService.ts
import { TrainingPlan } from '../types/types';
import { TipoType, AreaType } from '../constants/training';
import { TrainingStructureService } from './trainingStructure';

/**
 * Servicio para migrar datos antiguos al nuevo formato de porcentajes absolutos
 */
export class MigrationService {
  
  /**
   * Migra un plan de entrenamiento al formato de porcentajes absolutos
   */
  static migrateTrainingPlan(plan: any): TrainingPlan {
    // Si ya tiene versión 2, no necesita migración
    if (plan?.version === 2) {
      return plan;
    }
    
    // Crear copia para no mutar el original
    const migrated: TrainingPlan = {
      ...plan,
      version: 2,
      fechaActualizacion: new Date().toISOString()
    };
    
    // Si no tiene planificación, crear una por defecto
    if (!migrated.planificacion) {
      migrated.planificacion = TrainingStructureService.generateDefaultPlan().planificacion;
      return migrated;
    }
    
    // Migrar cada tipo y área
    Object.entries(migrated.planificacion).forEach(([tipo, tipoData]) => {
      if (!tipoData) return;
      
      // Asegurar que el tipo tenga porcentajeTotal
      if (!tipoData.porcentajeTotal) {
        // Calcular sumando las áreas si existen
        let tipoTotal = 0;
        if (tipoData.areas) {
          Object.values(tipoData.areas).forEach((areaData: any) => {
            tipoTotal += areaData.porcentajeDelTotal || areaData.porcentajeAbsoluto || 0;
          });
        }
        tipoData.porcentajeTotal = tipoTotal || 33; // Default si no hay datos
      }
      
      // Migrar áreas
      if (tipoData.areas) {
        Object.entries(tipoData.areas).forEach(([area, areaData]: [string, any]) => {
          // Detectar formato antiguo
          if (this.isOldFormat(areaData)) {
            // Convertir porcentaje relativo a absoluto
            const converted = this.convertToAbsolute(areaData, tipoData.porcentajeTotal, tipo as TipoType);
            tipoData.areas![area as AreaType] = converted;
          } else if (!areaData.porcentajeAbsoluto && areaData.porcentajeDelTotal) {
            // Simple renombrado si ya era absoluto
            areaData.porcentajeAbsoluto = areaData.porcentajeDelTotal;
            delete areaData.porcentajeDelTotal;
          }
        });
      }
    });
    
    // Validar y ajustar para que sume 100%
    this.adjustToHundredPercent(migrated);
    
    return migrated;
  }
  
  /**
   * Detecta si los datos están en formato antiguo (porcentajes relativos)
   */
  private static isOldFormat(areaData: any): boolean {
    // Si no tiene version marker y tiene porcentajeDelTotal > 50, 
    // probablemente es relativo (ya que un área rara vez tiene > 50% del total)
    if (!areaData.porcentajeAbsoluto && areaData.porcentajeDelTotal) {
      // Heurística: si es mayor a 50, probablemente es relativo al tipo
      return areaData.porcentajeDelTotal > 50;
    }
    return false;
  }
  
  /**
   * Convierte porcentaje relativo a absoluto
   */
  private static convertToAbsolute(
    areaData: any,
    tipoPercentage: number,
    tipo: TipoType
  ): any {
    const result = { ...areaData };
    
    // Convertir de relativo (% del tipo) a absoluto (% del total)
    if (areaData.porcentajeDelTotal) {
      // Fórmula: absoluto = (relativo * tipoPercentage) / 100
      result.porcentajeAbsoluto = (areaData.porcentajeDelTotal * tipoPercentage) / 100;
      delete result.porcentajeDelTotal;
    }
    
    // Migrar ejercicios si existen
    if (result.ejercicios) {
      Object.entries(result.ejercicios).forEach(([ejercicio, ejercicioData]: [string, any]) => {
        if (ejercicioData.porcentajeDelTotal) {
          // Los ejercicios también se convierten a absolutos
          ejercicioData.porcentajeAbsoluto = 
            (ejercicioData.porcentajeDelTotal * result.porcentajeAbsoluto) / 100;
          delete ejercicioData.porcentajeDelTotal;
        }
      });
    }
    
    return result;
  }
  
  /**
   * Ajusta los porcentajes para que sumen exactamente 100%
   */
  private static adjustToHundredPercent(plan: TrainingPlan): void {
    let total = 0;
    const areas: Array<{ tipo: TipoType; area: AreaType; data: any }> = [];
    
    // Calcular total actual
    Object.entries(plan.planificacion).forEach(([tipo, tipoData]) => {
      if (!tipoData?.areas) return;
      
      Object.entries(tipoData.areas).forEach(([area, areaData]: [string, any]) => {
        const porcentaje = areaData.porcentajeAbsoluto || 0;
        total += porcentaje;
        areas.push({
          tipo: tipo as TipoType,
          area: area as AreaType,
          data: areaData
        });
      });
    });
    
    // Si está muy lejos del 100%, usar distribución por defecto
    if (Math.abs(total - 100) > 20) {
      console.warn(`Plan suma ${total}%, muy lejos del 100%. Usando valores por defecto.`);
      const defaultPlan = TrainingStructureService.generateDefaultPlan();
      plan.planificacion = defaultPlan.planificacion;
      return;
    }
    
    // Ajuste proporcional si la diferencia es pequeña
    if (Math.abs(total - 100) > 0.1 && areas.length > 0) {
      const factor = 100 / total;
      
      areas.forEach(({ data }) => {
        if (data.porcentajeAbsoluto) {
          data.porcentajeAbsoluto = Math.round(data.porcentajeAbsoluto * factor * 10) / 10;
        }
      });
      
      // Verificar y ajustar el último elemento para que sume exactamente 100
      let newTotal = 0;
      areas.forEach(({ data }) => {
        newTotal += data.porcentajeAbsoluto || 0;
      });
      
      if (Math.abs(newTotal - 100) > 0.01 && areas.length > 0) {
        const lastArea = areas[areas.length - 1];
        lastArea.data.porcentajeAbsoluto += (100 - newTotal);
        lastArea.data.porcentajeAbsoluto = Math.round(lastArea.data.porcentajeAbsoluto * 10) / 10;
      }
    }
    
    // Actualizar porcentajeTotal de cada tipo
    Object.entries(plan.planificacion).forEach(([tipo, tipoData]) => {
      if (!tipoData) return;
      
      let tipoTotal = 0;
      if (tipoData.areas) {
        Object.values(tipoData.areas).forEach((areaData: any) => {
          tipoTotal += areaData.porcentajeAbsoluto || 0;
        });
      }
      tipoData.porcentajeTotal = Math.round(tipoTotal * 10) / 10;
    });
  }
  
  /**
   * Migra múltiples planes
   */
  static migratePlans(plans: Record<string, any>): Record<string, TrainingPlan> {
    const migrated: Record<string, TrainingPlan> = {};
    
    Object.entries(plans).forEach(([playerId, plan]) => {
      migrated[playerId] = this.migrateTrainingPlan(plan);
    });
    
    return migrated;
  }
  
  /**
   * Verifica si un plan necesita migración
   */
  static needsMigration(plan: any): boolean {
    // Si tiene versión 2, no necesita migración
    if (plan?.version === 2) return false;
    
    // Si no tiene planificación, necesita migración
    if (!plan?.planificacion) return true;
    
    // Verificar si usa el formato antiguo
    let needsMigration = false;
    
    Object.values(plan.planificacion).forEach((tipoData: any) => {
      if (!tipoData?.areas) return;
      
      Object.values(tipoData.areas).forEach((areaData: any) => {
        // Si tiene porcentajeDelTotal pero no porcentajeAbsoluto
        if (areaData.porcentajeDelTotal && !areaData.porcentajeAbsoluto) {
          needsMigration = true;
        }
      });
    });
    
    return needsMigration;
  }
  
  /**
   * Genera reporte de migración
   */
  static generateMigrationReport(
    originalPlan: any,
    migratedPlan: TrainingPlan
  ): {
    changes: string[];
    warnings: string[];
    oldTotal: number;
    newTotal: number;
  } {
    const changes: string[] = [];
    const warnings: string[] = [];
    let oldTotal = 0;
    let newTotal = 0;
    
    // Calcular totales
    Object.entries(originalPlan?.planificacion || {}).forEach(([tipo, tipoData]: [string, any]) => {
      if (!tipoData?.areas) return;
      
      Object.values(tipoData.areas).forEach((areaData: any) => {
        oldTotal += areaData.porcentajeDelTotal || areaData.porcentajeAbsoluto || 0;
      });
    });
    
    Object.entries(migratedPlan.planificacion).forEach(([tipo, tipoData]) => {
      if (!tipoData?.areas) return;
      
      Object.values(tipoData.areas).forEach((areaData: any) => {
        newTotal += areaData.porcentajeAbsoluto || 0;
      });
    });
    
    // Registrar cambios
    if (!originalPlan?.version && migratedPlan.version === 2) {
      changes.push('Plan actualizado a versión 2 (porcentajes absolutos)');
    }
    
    if (Math.abs(oldTotal - newTotal) > 0.1) {
      changes.push(`Total ajustado de ${oldTotal.toFixed(1)}% a ${newTotal.toFixed(1)}%`);
    }
    
    // Verificar warnings
    if (oldTotal > 150) {
      warnings.push('Los porcentajes originales parecían ser relativos (sumaban > 150%)');
    }
    
    if (Math.abs(newTotal - 100) > 0.1) {
      warnings.push(`El total final es ${newTotal.toFixed(1)}% en lugar de 100%`);
    }
    
    return {
      changes,
      warnings,
      oldTotal,
      newTotal
    };
  }
}