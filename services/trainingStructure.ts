// services/trainingStructure.ts - SIN DEFAULTS, SOLO UTILIDADES
import { TipoType, AreaType, getAreasForTipo, getEjerciciosForTipoArea } from '../constants/training';
import { SpecificExercise } from '../types/types';

/**
 * Servicio para manejar la estructura jerárquica de entrenamientos
 * FASE 1: ELIMINADOS todos los defaults - solo utilidades de estructura
 */
export class TrainingStructureService {
  /**
   * Obtiene todos los tipos disponibles
   */
  static getAvailableTypes(): TipoType[] {
    return Object.values(TipoType);
  }
  
  /**
   * Obtiene las áreas disponibles para un tipo
   */
  static getAvailableAreas(tipo: TipoType | ''): AreaType[] {
    if (!tipo) return [];
    return getAreasForTipo(tipo);
  }
  
  /**
   * Obtiene los ejercicios disponibles para tipo y área
   */
  static getAvailableExercises(tipo: TipoType | '', area: AreaType | ''): string[] {
    if (!tipo || !area) return [];
    return getEjerciciosForTipoArea(tipo, area);
  }
  
  /**
   * Filtra ejercicios específicos según la selección actual
   */
  static filterSpecificExercises(
    exercises: SpecificExercise[],
    tipo: TipoType | '',
    area: AreaType | '',
    ejercicio: string
  ): SpecificExercise[] {
    if (!tipo || !area || !ejercicio) {
      return [];
    }
    
    return exercises.filter(exercise => 
      exercise.tipo === tipo && 
      exercise.area === area && 
      exercise.ejercicio === ejercicio
    );
  }
  
  /**
   * Resetea la selección cuando cambia el tipo
   */
  static resetSelectionOnTypeChange(): {
    area: '';
    ejercicio: '';
    ejercicioEspecifico: '';
  } {
    return {
      area: '',
      ejercicio: '',
      ejercicioEspecifico: ''
    };
  }
  
  /**
   * Resetea la selección cuando cambia el área
   */
  static resetSelectionOnAreaChange(): {
    ejercicio: '';
    ejercicioEspecifico: '';
  } {
    return {
      ejercicio: '',
      ejercicioEspecifico: ''
    };
  }
  
  /**
   * Crea un ejercicio específico nuevo
   */
  static createSpecificExercise(
    name: string,
    tipo: TipoType,
    area: AreaType,
    ejercicio: string
  ): SpecificExercise {
    return {
      id: crypto.randomUUID(),
      name,
      tipo,
      area,
      ejercicio
    };
  }
  
  /**
   * Verifica si un tipo requiere ejercicios
   */
  static requiresExercise(tipo: TipoType | ''): boolean {
    return tipo !== TipoType.PUNTOS;
  }
  
  /**
   * NUEVO: Valida que los porcentajes de un plan sumen 100%
   */
  static validatePlanPercentages(planificacion: any): {
    isValid: boolean;
    total: number;
    errors: string[];
  } {
    let total = 0;
    const errors: string[] = [];
    
    Object.entries(planificacion).forEach(([tipo, tipoData]: [string, any]) => {
      if (!tipoData) return;
      
      let tipoTotal = 0;
      
      // Sumar porcentajes de áreas
      if (tipoData.areas) {
        Object.entries(tipoData.areas).forEach(([area, areaData]: [string, any]) => {
          const porcentaje = areaData.porcentajeDelTotal || 0;
          tipoTotal += porcentaje;
          total += porcentaje;
        });
      } else if (tipoData.porcentajeTotal) {
        // Si no hay áreas definidas, usar porcentajeTotal del tipo
        total += tipoData.porcentajeTotal;
      }
      
      // Validar coherencia entre tipo y áreas
      if (tipoData.porcentajeTotal && tipoData.areas && Math.abs(tipoTotal - tipoData.porcentajeTotal) > 0.5) {
        errors.push(
          `${tipo}: las áreas suman ${tipoTotal.toFixed(1)}% pero el tipo declara ${tipoData.porcentajeTotal}%`
        );
      }
    });
    
    // Validar que todo sume 100%
    const isValid = Math.abs(total - 100) < 0.5;
    if (!isValid) {
      errors.push(`El total suma ${total.toFixed(1)}% en lugar de 100%`);
    }
    
    return {
      isValid,
      total,
      errors
    };
  }
  
  /**
   * NUEVO: Detecta el nivel de granularidad de un plan
   */
  static detectGranularityLevel(planificacion: any): 'TIPO' | 'AREA' | 'EJERCICIO' {
    let hasAreas = false;
    let hasEjercicios = false;
    
    Object.values(planificacion).forEach((tipoData: any) => {
      if (tipoData?.areas && Object.keys(tipoData.areas).length > 0) {
        hasAreas = true;
        Object.values(tipoData.areas).forEach((areaData: any) => {
          if (areaData?.ejercicios && Object.keys(areaData.ejercicios).length > 0) {
            hasEjercicios = true;
          }
        });
      }
    });
    
    if (hasEjercicios) return 'EJERCICIO';
    if (hasAreas) return 'AREA';
    return 'TIPO';
  }
  
  /**
   * NUEVO: Valida la estructura jerárquica de un plan
   */
  static validateHierarchy(planificacion: any): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    Object.entries(planificacion).forEach(([tipo, tipoData]: [string, any]) => {
      if (!tipoData) {
        errors.push(`Tipo ${tipo}: datos faltantes`);
        return;
      }
      
      // Validar tipo
      if (!Object.values(TipoType).includes(tipo as TipoType)) {
        errors.push(`Tipo ${tipo}: no es un tipo válido`);
        return;
      }
      
      // Validar áreas si existen
      if (tipoData.areas) {
        const validAreas = getAreasForTipo(tipo as TipoType);
        
        Object.entries(tipoData.areas).forEach(([area, areaData]: [string, any]) => {
          if (!validAreas.includes(area as AreaType)) {
            errors.push(`Tipo ${tipo}, área ${area}: no es válida para este tipo`);
            return;
          }
          
          // Validar ejercicios si existen
          if (areaData?.ejercicios) {
            const validEjercicios = getEjerciciosForTipoArea(tipo as TipoType, area as AreaType);
            
            Object.keys(areaData.ejercicios).forEach(ejercicio => {
              if (!validEjercicios.includes(ejercicio)) {
                errors.push(`Tipo ${tipo}, área ${area}, ejercicio ${ejercicio}: no es válido para esta combinación`);
              }
            });
          }
        });
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  // ❌ ELIMINADOS: Métodos que generaban defaults
  // - getDefaultTypePercentages()
  // - getDefaultAreaPercentages()
  // - getDefaultAreaPercentagesAbsolute()
  // - generateDefaultPlan()
  
  // ⚠️ DEPRECADOS: Mantenidos solo para evitar errores de compilación
  /**
   * @deprecated Eliminado en Fase 1 - No usar defaults
   */
  static getDefaultTypePercentages(): Record<string, number> {
    console.error('getDefaultTypePercentages() eliminado en Fase 1. Los planes deben ser definidos completamente por el entrenador.');
    return {};
  }
  
  /**
   * @deprecated Eliminado en Fase 1 - No usar defaults
   */
  static getDefaultAreaPercentages(): Record<string, Record<string, number>> {
    console.error('getDefaultAreaPercentages() eliminado en Fase 1. Los planes deben ser definidos completamente por el entrenador.');
    return {};
  }
  
  /**
   * @deprecated Eliminado en Fase 1 - No usar defaults
   */
  static getDefaultAreaPercentagesAbsolute(): Record<string, Record<string, number>> {
    console.error('getDefaultAreaPercentagesAbsolute() eliminado en Fase 1. Los planes deben ser definidos completamente por el entrenador.');
    return {};
  }
  
  /**
   * @deprecated Eliminado en Fase 1 - No usar defaults
   */
  static generateDefaultPlan(): any {
    console.error('generateDefaultPlan() eliminado en Fase 1. Los planes deben ser creados manualmente por el entrenador.');
    return null;
  }
}