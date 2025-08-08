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
   * Obtiene porcentajes ideales por defecto para tipos
   */
  static getDefaultTypePercentages(): Record<TipoType, number> {
    return {
      [TipoType.CANASTO]: 50,
      [TipoType.PELOTEO]: 50
    };
  }
  
  /**
   * Obtiene porcentajes ideales por defecto para áreas dentro de tipos
   */
  static getDefaultAreaPercentages(): Record<TipoType, Record<AreaType, number>> {
    return {
      [TipoType.CANASTO]: {
        [AreaType.JUEGO_DE_BASE]: 17,
        [AreaType.JUEGO_DE_RED]: 17,
        [AreaType.PRIMERAS_PELOTAS]: 16,
        [AreaType.PUNTOS]: 0
      },
      [TipoType.PELOTEO]: {
        [AreaType.JUEGO_DE_BASE]: 15,
        [AreaType.JUEGO_DE_RED]: 10,
        [AreaType.PUNTOS]: 15,
        [AreaType.PRIMERAS_PELOTAS]: 10
      }
    };
  }
}