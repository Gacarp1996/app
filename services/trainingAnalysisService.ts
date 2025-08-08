// services/trainingAnalysisService.ts
import { TrainingPlan } from '../Database/FirebaseTrainingPlans';
import { TipoType, AreaType } from '../constants/training';
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
        if (plan) {
          // El plan viene de Firebase sin id ni academiaId
          // No es necesario agregarlos ya que son opcionales
          plansMap[participant.id] = plan;
        } else if (participants.length > 1) {
          // Adaptar plan de otro jugador si no tiene plan propio
          for (const otherParticipant of participants) {
            if (otherParticipant.id !== participant.id) {
              const otherPlan = await getTrainingPlan(academiaId, otherParticipant.id);
              if (otherPlan) {
                console.log(`Adaptando plan de ${otherParticipant.name} para ${participant.name}`);
                plansMap[participant.id] = otherPlan;
                break;
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error cargando plan para ${participant.name}:`, error);
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
      const hasPlan = !!plans[participant.id];
      
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