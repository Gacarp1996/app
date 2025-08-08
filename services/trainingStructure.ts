// services/trainingStructure.ts
import { TipoType, AreaType, getAreasForTipo, getEjerciciosForTipoArea } from '../constants/training';
import { SpecificExercise } from '../types';

/**
 * Servicio para manejar la estructura jerárquica de entrenamientos
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
   * MODIFICADO: Obtiene porcentajes ideales por defecto para tipos
   * Ahora calcula dinámicamente basado en los tipos disponibles
   */
  static getDefaultTypePercentages(): Record<string, number> {
    const types = Object.values(TipoType);
    const percentagePerType = Math.floor(100 / types.length);
    const remainder = 100 - (percentagePerType * types.length);
    
    const percentages: Record<string, number> = {};
    
    types.forEach((type, index) => {
      // Distribuir el resto en los primeros tipos
      percentages[type] = percentagePerType + (index < remainder ? 1 : 0);
    });
    
    return percentages;
  }
  
  /**
   * MODIFICADO: Obtiene porcentajes ideales por defecto para áreas dentro de tipos
   * Ahora calcula dinámicamente basado en las áreas disponibles por tipo
   */
  static getDefaultAreaPercentages(): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    
    Object.values(TipoType).forEach(tipo => {
      const areas = getAreasForTipo(tipo);
      const percentagePerArea = Math.floor(100 / areas.length);
      const remainder = 100 - (percentagePerArea * areas.length);
      
      result[tipo] = {};
      
      areas.forEach((area, index) => {
        // Distribuir el resto en las primeras áreas
        result[tipo][area] = percentagePerArea + (index < remainder ? 1 : 0);
      });
    });
    
    return result;
  }
  
  /**
   * NUEVO: Verifica si un tipo requiere ejercicios
   */
  static requiresExercise(tipo: TipoType | ''): boolean {
    return tipo !== TipoType.PUNTOS;
  }
}