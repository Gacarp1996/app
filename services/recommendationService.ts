// services/recommendationService.ts
import { LoggedExercise } from '@/types';
import { TrainingPlan } from '../Database/FirebaseTrainingPlans';
import { TipoType, AreaType } from '../constants/training';
import { calculateExerciseStatsByTime } from '../utils/calculations';
import { TrainingStructureService } from './trainingStructure';

export interface Recommendation {
  level: 'TIPO' | 'AREA' | 'EJERCICIO';
  type: 'INCREMENTAR' | 'REDUCIR';
  area: string;
  parentType?: string;
  currentPercentage: number;
  plannedPercentage: number;
  difference: number;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  basedOnExercises: number;
  parentArea?: string;
  isStatus?: boolean;
  details?: any;
}

export interface PlayerAnalysis {
  playerId: string;
  playerName: string;
  analysis: {
    recommendations: Recommendation[];
    totalExercises: number;
    totalMinutes: number;
    typeStats: any;
    areaStats: any;
    sessionsAnalyzed: number;
    planUsed: 'real' | 'default';
  };
  sessions: {
    totalSessions: number;
    dateRange: { from: string; to: string } | null;
  };
}

export interface GroupCoincidence {
  level: 'TIPO' | 'AREA' | 'EJERCICIO';
  type: 'INCREMENTAR' | 'REDUCIR';
  area: string;
  parentType?: string;
  players: Array<{
    name: string;
    diferencia: number;
    currentPercentage: number;
    plannedPercentage: number;
  }>;
  playerCount: number;
  promedioDiferencia: number;
  priority: 'high' | 'medium';
}

export interface GroupRecommendations {
  analyzedPlayers: number;
  totalPlayers: number;
  sessionAnalysis: {
    totalSessionsAnalyzed: number;
    averageSessionsPerPlayer: number;
    playersWithSessions: number;
    sessionsPerPlayer: Array<{
      playerName: string;
      sessionCount: number;
      dateRange: string;
    }>;
  };
  groupAverages: { [key: string]: number };
  participantsWithData: Array<{
    playerName: string;
    totalExercises: number;
    totalMinutes: number;
    sessionsCount: number;
    planUsed: 'real' | 'default';
  }>;
  coincidencias: GroupCoincidence[];
  individuales: Array<{
    playerName: string;
    playerId: string;
    deficits: Array<{
      area: string;
      level: string;
      parentType?: string;
      diferencia: number;
      currentPercentage: number;
      plannedPercentage: number;
    }>;
    excesos: Array<{
      area: string;
      level: string;
      parentType?: string;
      diferencia: number;
      currentPercentage: number;
      plannedPercentage: number;
    }>;
  }>;
  hasStrongCoincidences: boolean;
  recommendation: string;
}

export class RecommendationService {
  /**
   * Analiza ejercicios de un jugador y genera recomendaciones
   */
  static analyzePlayerExercises(
    exercises: LoggedExercise[],
    trainingPlan?: TrainingPlan
  ): {
    recommendations: Recommendation[];
    totalExercises: number;
    totalMinutes: number;
    typeStats: any;
    areaStats: any;
    planUsed: 'real' | 'default';
  } {
    if (exercises.length === 0) {
      return {
        recommendations: [],
        totalExercises: 0,
        totalMinutes: 0,
        typeStats: {},
        areaStats: {},
        planUsed: 'default'
      };
    }

    const stats = calculateExerciseStatsByTime(exercises);
    const recommendations = this.generateRecommendations(
      stats.typeStats,
      stats.areaStats,
      trainingPlan,
      exercises.length
    );

    return {
      recommendations,
      totalExercises: exercises.length,
      totalMinutes: Math.round(stats.totalMinutes),
      typeStats: this.formatTypeStats(stats.typeStats),
      areaStats: this.formatAreaStats(stats.areaStats),
      planUsed: trainingPlan ? 'real' : 'default'
    };
  }

  /**
   * Genera recomendaciones grupales
   */
  static generateGroupRecommendations(
    participantsAnalysis: PlayerAnalysis[]
  ): GroupRecommendations | null {
    const participantsWithData = participantsAnalysis.filter(
      p => p.analysis.totalExercises > 0
    );

    if (participantsWithData.length === 0) {
      return null;
    }

    // Detectar coincidencias
    const coincidencias = this.detectGroupCoincidences(participantsWithData);
    
    // Obtener déficits individuales
    const individuales = this.getTopDeficitsPerPlayer(participantsWithData);

    // Calcular estadísticas grupales
    const totalSessions = participantsWithData.reduce(
      (sum, p) => sum + p.sessions.totalSessions, 0
    );
    const avgSessionsPerPlayer = Math.round(totalSessions / participantsWithData.length);

    // Calcular promedios de tipos
    const groupAverages = this.calculateGroupAverages(participantsWithData);

    // Generar texto de recomendación
    const recommendation = this.generateGroupRecommendationText(coincidencias, individuales);

    return {
      analyzedPlayers: participantsWithData.length,
      totalPlayers: participantsAnalysis.length,
      sessionAnalysis: {
        totalSessionsAnalyzed: totalSessions,
        averageSessionsPerPlayer: avgSessionsPerPlayer,
        playersWithSessions: participantsWithData.length,
        sessionsPerPlayer: participantsWithData.map(p => ({
          playerName: p.playerName,
          sessionCount: p.sessions.totalSessions,
          dateRange: p.sessions.dateRange ? 
            `${p.sessions.dateRange.from} - ${p.sessions.dateRange.to}` : 
            "Sin datos"
        }))
      },
      groupAverages,
      participantsWithData: participantsWithData.map(p => ({
        playerName: p.playerName,
        totalExercises: p.analysis.totalExercises,
        totalMinutes: p.analysis.totalMinutes,
        sessionsCount: p.sessions.totalSessions,
        planUsed: p.analysis.planUsed
      })),
      coincidencias,
      individuales,
      hasStrongCoincidences: coincidencias.length > 0,
      recommendation
    };
  }

  /**
   * Genera recomendaciones basadas en estadísticas
   */
  private static generateRecommendations(
    typeStats: any,
    areaStats: any,
    trainingPlan: TrainingPlan | undefined,
    totalExercises: number
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const defaultPercentages = TrainingStructureService.getDefaultTypePercentages();
    const defaultAreaPercentages = TrainingStructureService.getDefaultAreaPercentages();

    // Iterar sobre tipos dinámicamente
    Object.values(TipoType).forEach(tipo => {
      const stats = typeStats[tipo];
      if (!stats) return;

      const plannedPercentage = trainingPlan?.planificacion?.[tipo]?.porcentajeTotal 
        || defaultPercentages[tipo] 
        || 50;

      const difference = Math.abs(stats.percentage - plannedPercentage);

      if (difference > 5) {
        recommendations.push({
          level: 'TIPO',
          type: stats.percentage < plannedPercentage ? 'INCREMENTAR' : 'REDUCIR',
          area: tipo,
          parentType: tipo,
          currentPercentage: Math.round(stats.percentage),
          plannedPercentage,
          difference: Math.round(difference),
          priority: difference > 15 ? 'high' : difference > 10 ? 'medium' : 'low',
          reason: `${stats.percentage < plannedPercentage ? 'Déficit' : 'Exceso'} en tipo ${tipo}`,
          basedOnExercises: totalExercises
        });
      }

      // Recomendaciones por áreas
      if (stats.areas) {
        Object.entries(stats.areas).forEach(([area, areaStats]: [string, any]) => {
          const plannedAreaPercentage = 
            trainingPlan?.planificacion?.[tipo]?.areas?.[area as AreaType]?.porcentajeDelTotal
            || defaultAreaPercentages[tipo]?.[area as AreaType]
            || 15;

          const areaDifference = Math.abs(areaStats.percentage - plannedAreaPercentage);

          if (areaDifference > 8) {
            recommendations.push({
              level: 'AREA',
              type: areaStats.percentage < plannedAreaPercentage ? 'INCREMENTAR' : 'REDUCIR',
              area,
              parentType: tipo,
              currentPercentage: Math.round(areaStats.percentage),
              plannedPercentage: plannedAreaPercentage,
              difference: Math.round(areaDifference),
              priority: areaDifference > 15 ? 'high' : areaDifference > 10 ? 'medium' : 'low',
              reason: `${areaStats.percentage < plannedAreaPercentage ? 'Déficit' : 'Exceso'} en ${area}`,
              basedOnExercises: Math.round(areaStats.total / 60), // convertir a minutos
              parentArea: area
            });
          }
        });
      }
    });

    return recommendations;
  }

  /**
   * Detecta coincidencias grupales
   */
  private static detectGroupCoincidences(
    participantsWithData: PlayerAnalysis[]
  ): GroupCoincidence[] {
    const coincidencesMap = new Map<string, any>();

    participantsWithData.forEach(participant => {
      participant.analysis.recommendations.forEach(recommendation => {
        const key = `${recommendation.level}-${recommendation.type}-${recommendation.area}`;
        
        if (!coincidencesMap.has(key)) {
          coincidencesMap.set(key, {
            level: recommendation.level,
            type: recommendation.type,
            area: recommendation.area,
            parentType: recommendation.parentType,
            players: [],
            totalDiferencia: 0
          });
        }
        
        const coincidence = coincidencesMap.get(key);
        coincidence.players.push({
          name: participant.playerName,
          diferencia: recommendation.difference,
          currentPercentage: recommendation.currentPercentage,
          plannedPercentage: recommendation.plannedPercentage
        });
        coincidence.totalDiferencia += recommendation.difference;
      });
    });

    return Array.from(coincidencesMap.values())
      .filter(c => c.players.length >= 2)
      .map(c => ({
        ...c,
        playerCount: c.players.length,
        promedioDiferencia: Math.round(c.totalDiferencia / c.players.length * 10) / 10,
        priority: c.players.length >= 3 ? 'high' : 'medium'
      }))
      .sort((a, b) => {
        if (b.playerCount !== a.playerCount) {
          return b.playerCount - a.playerCount;
        }
        return b.promedioDiferencia - a.promedioDiferencia;
      });
  }

  /**
   * Obtiene los principales déficits por jugador
   */
  private static getTopDeficitsPerPlayer(
    participantsWithData: PlayerAnalysis[]
  ) {
    return participantsWithData.map(participant => ({
      playerName: participant.playerName,
      playerId: participant.playerId,
      deficits: participant.analysis.recommendations
        .filter(r => r.type === 'INCREMENTAR')
        .sort((a, b) => b.difference - a.difference)
        .slice(0, 2)
        .map(r => ({
          area: r.area,
          level: r.level,
          parentType: r.parentType,
          diferencia: r.difference,
          currentPercentage: r.currentPercentage,
          plannedPercentage: r.plannedPercentage
        })),
      excesos: participant.analysis.recommendations
        .filter(r => r.type === 'REDUCIR')
        .sort((a, b) => b.difference - a.difference)
        .slice(0, 1)
        .map(r => ({
          area: r.area,
          level: r.level,
          parentType: r.parentType,
          diferencia: r.difference,
          currentPercentage: r.currentPercentage,
          plannedPercentage: r.plannedPercentage
        }))
    })).filter(player => player.deficits.length > 0 || player.excesos.length > 0);
  }

  /**
   * Calcula promedios grupales
   */
  private static calculateGroupAverages(
    participantsWithData: PlayerAnalysis[]
  ): { [key: string]: number } {
    const groupTypeStats: { [key: string]: { totalPercentage: number; count: number } } = {};
    
    participantsWithData.forEach(participant => {
      Object.entries(participant.analysis.typeStats || {}).forEach(([tipo, stats]: [string, any]) => {
        if (!groupTypeStats[tipo]) {
          groupTypeStats[tipo] = { totalPercentage: 0, count: 0 };
        }
        groupTypeStats[tipo].totalPercentage += stats.percentage;
        groupTypeStats[tipo].count += 1;
      });
    });

    const groupAverages: { [key: string]: number } = {};
    Object.entries(groupTypeStats).forEach(([tipo, data]) => {
      groupAverages[tipo] = Math.round(data.totalPercentage / data.count);
    });

    return groupAverages;
  }

  /**
   * Genera texto de recomendación grupal
   */
  private static generateGroupRecommendationText(
    coincidencias: GroupCoincidence[],
    individuales: any[]
  ): string {
    if (coincidencias.length > 0) {
      const topCoincidence = coincidencias[0];
      const action = topCoincidence.type === 'INCREMENTAR' ? 'incrementar' : 'reducir';

      if (topCoincidence.type === 'REDUCIR') {
        // Determinar alternativa dinámica
        const alternativo = this.getAlternativeType(topCoincidence.parentType);
        return `Sugerencia: Hay un exceso de ${topCoincidence.area}. Inicia la sesión con ejercicios de ${alternativo} para balancear el entrenamiento. (${topCoincidence.playerCount} jugadores, diferencia promedio de ${topCoincidence.promedioDiferencia}%)`;
      } else {
        return `Sugerencia: Iniciar con ejercicios de "${topCoincidence.area}" (${action}) que afecta a ${topCoincidence.playerCount} jugadores con una diferencia promedio de ${topCoincidence.promedioDiferencia}%.`;
      }
    } else if (individuales.length > 0) {
      const playersWithDeficits = individuales.filter(p => p.deficits.length > 0);
      if (playersWithDeficits.length > 0) {
        return `Sugerencia: Alternar entre ejercicios según déficits individuales. ${playersWithDeficits.length} jugadores necesitan trabajo específico.`;
      }
    }
    return "El grupo está balanceado. Mantener variedad en los ejercicios.";
  }

  /**
   * Obtiene el tipo alternativo para balancear
   */
  private static getAlternativeType(currentType?: string): string {
    const types = Object.values(TipoType);
    if (!currentType || !types.includes(currentType as TipoType)) {
      return 'otro tipo de ejercicio';
    }
    
    // Retornar el primer tipo que no sea el actual
    const alternative = types.find(t => t !== currentType);
    return alternative || 'otro tipo de ejercicio';
  }

  /**
   * Formatea estadísticas de tipo
   */
  private static formatTypeStats(typeStats: any): any {
    const formatted: any = {};
    
    Object.keys(typeStats).forEach(tipo => {
      formatted[tipo] = {
        total: Math.round(typeStats[tipo].total),
        percentage: Math.round(typeStats[tipo].percentage),
        areas: {}
      };
      
      if (typeStats[tipo].areas) {
        Object.keys(typeStats[tipo].areas).forEach(area => {
          const areaData = typeStats[tipo].areas[area];
          formatted[tipo].areas[area] = {
            total: Math.round(areaData.total),
            percentage: Math.round(areaData.percentage),
            exercises: areaData.exercises
          };
        });
      }
    });
    
    return formatted;
  }

  /**
   * Formatea estadísticas de área
   */
  private static formatAreaStats(areaStats: any): any {
    const formatted: any = {};
    
    Object.keys(areaStats).forEach(area => {
      formatted[area] = {
        total: Math.round(areaStats[area].total),
        percentage: Math.round(areaStats[area].percentage)
      };
    });
    
    return formatted;
  }
}