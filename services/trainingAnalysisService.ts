// services/trainingAnalysisService.ts
import { TrainingPlan } from '../Database/FirebaseTrainingPlans';
import { TipoType, AreaType, tipoRequiereEjercicios } from '../constants/training';
import { TrainingStructureService } from './trainingStructure';
import { getTrainingPlan } from '../Database/FirebaseTrainingPlans';

export interface DataPreview {
  totalParticipants: number;
  playersWithData: number;
  playersWithPlans: number;
  totalSessions: number;
  totalExercises: number;
  participantsPreviews: Array<{
    playerId: string;
    playerName: string;
    sessionsCount: number;
    exercisesCount: number;
    hasPlan: boolean;
    hasData: boolean;
  }>;
  canGenerateRecommendations: boolean;
}

export class TrainingAnalysisService {
  /**
   * Obtiene el porcentaje ideal para un tipo
   */
  static getIdealPercentageForType(
    type: string,
    trainingPlan?: TrainingPlan
  ): number {
    if (trainingPlan?.planificacion?.[type as TipoType]?.porcentajeTotal) {
      return trainingPlan.planificacion[type as TipoType]!.porcentajeTotal;
    }
    
    // ✅ NUEVO: Si no hay porcentajeTotal pero hay áreas definidas, calcularlo
    const tipoData = trainingPlan?.planificacion?.[type as TipoType];
    if (!tipoData?.porcentajeTotal && tipoData?.areas) {
      const areasTotal = Object.values(tipoData.areas).reduce(
        (sum, area: any) => sum + (area.porcentajeDelTotal || 0), 
        0
      );
      if (areasTotal > 0) {
        return areasTotal;
      }
    }
    
    const defaultPercentages = TrainingStructureService.getDefaultTypePercentages();
    return defaultPercentages[type as TipoType] || 50;
  }

  /**
   * Obtiene el porcentaje ideal para un área dentro de un tipo
   */
  static getIdealPercentageForAreaInType(
    area: string,
    type: string,
    trainingPlan?: TrainingPlan
  ): number {
    const tipoData = trainingPlan?.planificacion?.[type as TipoType];
    const areaData = tipoData?.areas?.[area as AreaType];
    
    if (areaData?.porcentajeDelTotal) {
      return areaData.porcentajeDelTotal;
    }
    
    const defaultPercentages = TrainingStructureService.getDefaultAreaPercentages();
    return defaultPercentages[type as TipoType]?.[area as AreaType] || 15;
  }

  /**
   * ✅ NUEVO: Obtiene el porcentaje ideal para un ejercicio dentro de un área
   * Maneja correctamente el caso de Puntos que no tiene ejercicios
   */
  static getIdealPercentageForExerciseInArea(
    exercise: string,
    area: string,
    type: string,
    trainingPlan?: TrainingPlan
  ): number {
    // ✅ IMPORTANTE: Si es tipo Puntos, no hay ejercicios
    if (!tipoRequiereEjercicios(type as TipoType)) {
      return 0;
    }

    const tipoData = trainingPlan?.planificacion?.[type as TipoType];
    const areaData = tipoData?.areas?.[area as AreaType];
    const exerciseData = areaData?.ejercicios?.[exercise];
    
    if (exerciseData?.porcentajeDelTotal) {
      return exerciseData.porcentajeDelTotal;
    }
    
    // Valor por defecto si no está definido
    return 5;
  }

  /**
   * ✅ NUEVO: Valida si un plan es válido para recomendaciones
   * Considera que Puntos no requiere ejercicios
   */
  static isPlanValidForRecommendations(plan: TrainingPlan | undefined): boolean {
    if (!plan || !plan.planificacion) {
      return false;
    }

    // Verificar que al menos un tipo tenga configuración
    const hasValidTypes = Object.entries(plan.planificacion).some(([tipo, tipoData]) => {
      if (!tipoData || tipoData.porcentajeTotal === 0) {
        return false;
      }

      // Verificar que tenga áreas definidas
      if (!tipoData.areas || Object.keys(tipoData.areas).length === 0) {
        return false;
      }

      // ✅ NUEVO: Para Puntos, solo verificar que tenga áreas con porcentajes
      if (!tipoRequiereEjercicios(tipo as TipoType)) {
        return Object.values(tipoData.areas).some((area: any) => 
          area.porcentajeDelTotal > 0
        );
      }

      // Para otros tipos, verificar que tenga ejercicios definidos
      return Object.values(tipoData.areas).some((area: any) => {
        if (!area.porcentajeDelTotal || area.porcentajeDelTotal === 0) {
          return false;
        }
        return area.ejercicios && Object.keys(area.ejercicios).length > 0;
      });
    });

    return hasValidTypes;
  }

  /**
   * Carga planes de entrenamiento con adaptación para grupos
   * Si un jugador no tiene plan, se adapta el plan de otro jugador del grupo
   */
  static async loadTrainingPlansWithAdaptation(
    academiaId: string,
    participants: Array<{ id: string; name: string }>
  ): Promise<{ [playerId: string]: TrainingPlan }> {
    const plansMap: { [playerId: string]: TrainingPlan } = {};
    
    for (const participant of participants) {
      try {
        const plan = await getTrainingPlan(academiaId, participant.id);
        
        // ✅ NUEVO: Validar que el plan sea válido para recomendaciones
        if (plan && this.isPlanValidForRecommendations(plan)) {
          plansMap[participant.id] = plan;
        } else if (participants.length > 1) {
          // Adaptar plan de otro jugador si no tiene plan propio
          for (const otherParticipant of participants) {
            if (otherParticipant.id !== participant.id) {
              const otherPlan = await getTrainingPlan(academiaId, otherParticipant.id);
              
              // ✅ NUEVO: Solo adaptar si el otro plan es válido
              if (otherPlan && this.isPlanValidForRecommendations(otherPlan)) {
                plansMap[participant.id] = otherPlan;
                break;
              }
            }
          }
        }
        
        // ✅ NUEVO: Log si no se pudo obtener plan válido
        if (!plansMap[participant.id]) {
        }
      } catch (error) {
      }
    }
    
    return plansMap;
  }

  /**
   * Genera preview de datos disponibles para análisis
   */
  static generateDataPreview(
    participants: Array<{ id: string; name: string }>,
    sessionData: Array<{
      playerId: string;
      sessionsCount: number;
      exercisesCount: number;
    }>,
    plans: { [playerId: string]: TrainingPlan }
  ): DataPreview {
    const participantsPreviews = participants.map(participant => {
      const playerData = sessionData.find(d => d.playerId === participant.id);
      
      // ✅ NUEVO: Usar validación mejorada para planes
      const hasPlan = !!plans[participant.id] && 
                      this.isPlanValidForRecommendations(plans[participant.id]);
      
      return {
        playerId: participant.id,
        playerName: participant.name,
        sessionsCount: playerData?.sessionsCount || 0,
        exercisesCount: playerData?.exercisesCount || 0,
        hasPlan,
        hasData: (playerData?.exercisesCount || 0) > 0
      };
    });
    
    const playersWithData = participantsPreviews.filter(p => p.hasData);
    const totalSessions = playersWithData.reduce((sum, p) => sum + p.sessionsCount, 0);
    const totalExercises = playersWithData.reduce((sum, p) => sum + p.exercisesCount, 0);
    const playersWithPlans = playersWithData.filter(p => p.hasPlan).length;
    
    return {
      totalParticipants: participants.length,
      playersWithData: playersWithData.length,
      playersWithPlans,
      totalSessions,
      totalExercises,
      participantsPreviews,
      canGenerateRecommendations: playersWithData.length > 0
    };
  }

  /**
   * ✅ NUEVO: Analiza la distribución de ejercicios considerando tipos sin ejercicios
   */
  static analyzeExerciseDistribution(
    exercises: any[],
    plan?: TrainingPlan
  ): any {
    const distribution: any = {};
    
    if (!plan?.planificacion) {
      return distribution;
    }

    // Inicializar estructura para cada tipo en el plan
    Object.entries(plan.planificacion).forEach(([tipo, tipoData]) => {
      if (!tipoData || tipoData.porcentajeTotal === 0) return;
      
      distribution[tipo] = {
        planned: tipoData.porcentajeTotal,
        actual: 0,
        areas: {}
      };

      // ✅ IMPORTANTE: Determinar si este tipo requiere ejercicios
      const requiresExercises = tipoRequiereEjercicios(tipo as TipoType);

      // Inicializar áreas
      Object.entries(tipoData.areas || {}).forEach(([area, areaData]: [string, any]) => {
        if (areaData.porcentajeDelTotal === 0) return;
        
        distribution[tipo].areas[area] = {
          planned: areaData.porcentajeDelTotal,
          actual: 0,
          exercises: requiresExercises ? {} : null // null para Puntos
        };

        // Solo inicializar ejercicios si el tipo los requiere
        if (requiresExercises && areaData.ejercicios) {
          Object.entries(areaData.ejercicios).forEach(([ejercicio, ejercicioData]: [string, any]) => {
            if (ejercicioData.porcentajeDelTotal > 0) {
              distribution[tipo].areas[area].exercises[ejercicio] = {
                planned: ejercicioData.porcentajeDelTotal,
                actual: 0
              };
            }
          });
        }
      });
    });

    // Calcular distribución actual de ejercicios
    const totalMinutes = exercises.reduce((sum, ex) => sum + (ex.tiempoCantidad || 0), 0);
    
    if (totalMinutes > 0) {
      exercises.forEach(exercise => {
        const tipo = exercise.tipo;
        const area = exercise.area;
        const ejercicio = exercise.ejercicio;
        const minutes = exercise.tiempoCantidad || 0;
        const percentage = (minutes / totalMinutes) * 100;

        if (distribution[tipo]) {
          distribution[tipo].actual += percentage;
          
          if (distribution[tipo].areas[area]) {
            distribution[tipo].areas[area].actual += percentage;
            
            // ✅ Solo procesar ejercicios si el tipo los requiere
            if (tipoRequiereEjercicios(tipo as TipoType) && 
                distribution[tipo].areas[area].exercises && 
                ejercicio) {
              if (!distribution[tipo].areas[area].exercises[ejercicio]) {
                distribution[tipo].areas[area].exercises[ejercicio] = {
                  planned: 0,
                  actual: 0
                };
              }
              distribution[tipo].areas[area].exercises[ejercicio].actual += percentage;
            }
          }
        }
      });
    }

    return distribution;
  }

  /**
   * Formatea el rango de fechas para mostrar
   */
  static formatDateRange(dates: Date[]): { from: string; to: string } | null {
    if (dates.length === 0) return null;
    
    const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };
    
    return {
      from: formatDate(firstDate),
      to: formatDate(lastDate)
    };
  }
}