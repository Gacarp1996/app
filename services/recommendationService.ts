// services/recommendationService.ts - ACTUALIZADO SIN DEFAULTS
import { LoggedExercise, TrainingPlan } from '@/types/types';
import { TipoType, AreaType } from '../constants/training';
import { calculateExerciseStatsByTime } from '../utils/calculations';
import { MigrationService } from './migrationService';
import { validateStrictTrainingPlan, canGenerateRecommendations } from '../utils/validation';

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
    planUsed: 'real' | 'invalid';  // CAMBIO: 'default' -> 'invalid'
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
    planUsed: 'real' | 'invalid';
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
  hasValidPlans: boolean;  // NUEVO: Indica si hay planes válidos
}

export class RecommendationService {
  /**
   * Analiza ejercicios de un jugador y genera recomendaciones
   * ACTUALIZADO: Solo funciona con planes válidos, no genera defaults
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
    planUsed: 'real' | 'invalid';
  } {
    if (exercises.length === 0) {
      return {
        recommendations: [],
        totalExercises: 0,
        totalMinutes: 0,
        typeStats: {},
        areaStats: {},
        planUsed: 'invalid'
      };
    }

    // NUEVO: Validar plan antes de usarlo
    const planValidation = canGenerateRecommendations(trainingPlan);
    if (!planValidation.canGenerate) {
      console.warn('No se pueden generar recomendaciones:', planValidation.reason);
      
      // Devolver estadísticas sin recomendaciones
      const stats = calculateExerciseStatsByTime(exercises);
      return {
        recommendations: [],
        totalExercises: exercises.length,
        totalMinutes: Math.round(stats.totalMinutes),
        typeStats: this.formatTypeStats(stats.typeStats),
        areaStats: this.formatAreaStats(stats.areaStats),
        planUsed: 'invalid'
      };
    }

    // Migrar plan si es necesario
    const migratedPlan = MigrationService.migrateTrainingPlan(trainingPlan!);

    // Calcular estadísticas (con porcentajes absolutos)
    const stats = calculateExerciseStatsByTime(exercises);
    
    const recommendations = this.generateRecommendations(
      stats.typeStats,
      stats.areaStats,
      migratedPlan,
      exercises.length
    );

    return {
      recommendations,
      totalExercises: exercises.length,
      totalMinutes: Math.round(stats.totalMinutes),
      typeStats: this.formatTypeStats(stats.typeStats),
      areaStats: this.formatAreaStats(stats.areaStats),
      planUsed: 'real'
    };
  }

  /**
   * Genera recomendaciones grupales
   * ACTUALIZADO: Solo con jugadores que tienen planes válidos
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

    // NUEVO: Separar jugadores con planes válidos vs inválidos
    const participantsWithValidPlans = participantsWithData.filter(
      p => p.analysis.planUsed === 'real'
    );
    
    const hasValidPlans = participantsWithValidPlans.length > 0;

    // Detectar coincidencias (solo entre jugadores con planes válidos)
    const coincidencias = hasValidPlans 
      ? this.detectGroupCoincidences(participantsWithValidPlans)
      : [];
    
    // Obtener déficits individuales (solo jugadores con planes válidos)
    const individuales = hasValidPlans
      ? this.getTopDeficitsPerPlayer(participantsWithValidPlans)
      : [];

    // Calcular estadísticas grupales
    const totalSessions = participantsWithData.reduce(
      (sum, p) => sum + p.sessions.totalSessions, 0
    );
    const avgSessionsPerPlayer = participantsWithData.length > 0 
      ? Math.round(totalSessions / participantsWithData.length)
      : 0;

    // Calcular promedios de tipos (solo jugadores con planes válidos)
    const groupAverages = hasValidPlans
      ? this.calculateGroupAverages(participantsWithValidPlans)
      : {};

    // Generar texto de recomendación
    const recommendation = this.generateGroupRecommendationText(
      coincidencias, 
      individuales, 
      hasValidPlans,
      participantsWithValidPlans.length,
      participantsWithData.length
    );

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
      recommendation,
      hasValidPlans
    };
  }

  /**
   * Genera recomendaciones basadas en estadísticas
   * ACTUALIZADO: Solo trabaja con planes válidos, sin defaults
   */
  private static generateRecommendations(
    typeStats: any,
    areaStats: any,
    trainingPlan: TrainingPlan,
    totalExercises: number
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Validar que el plan sea válido
    const validation = validateStrictTrainingPlan(trainingPlan);
    if (!validation.canGenerateRecommendations) {
      console.warn('Plan inválido para generar recomendaciones:', validation.errors);
      return [];
    }

    // Iterar sobre tipos definidos en el plan (no todos los tipos)
    Object.entries(trainingPlan.planificacion).forEach(([tipo, tipoData]) => {
      if (!tipoData || tipoData.porcentajeTotal === undefined) return;

      const stats = typeStats[tipo];
      const currentPercentage = stats?.percentage || 0;
      const plannedPercentage = tipoData.porcentajeTotal;

      const difference = Math.abs(currentPercentage - plannedPercentage);

      if (difference > 5) {
        recommendations.push({
          level: 'TIPO',
          type: currentPercentage < plannedPercentage ? 'INCREMENTAR' : 'REDUCIR',
          area: tipo,
          parentType: tipo,
          currentPercentage: Math.round(currentPercentage),
          plannedPercentage,
          difference: Math.round(difference),
          priority: difference > 15 ? 'high' : difference > 10 ? 'medium' : 'low',
          reason: `${currentPercentage < plannedPercentage ? 'Déficit' : 'Exceso'} en tipo ${tipo} según plan`,
          basedOnExercises: totalExercises
        });
      }

      // Recomendaciones por áreas (solo si están definidas en el plan)
      if (tipoData.areas && (validation.granularityLevel === 'AREA' || validation.granularityLevel === 'EJERCICIO')) {
        Object.entries(tipoData.areas).forEach(([area, areaData]: [string, any]) => {
          if (!areaData || areaData.porcentajeDelTotal === undefined) return;

          const areaStats = stats?.areas?.[area];
          const areaCurrentPercentage = areaStats?.percentage || 0;
          const areaPlannedPercentage = areaData.porcentajeDelTotal;

          const areaDifference = Math.abs(areaCurrentPercentage - areaPlannedPercentage);

          if (areaDifference > 5) {
            recommendations.push({
              level: 'AREA',
              type: areaCurrentPercentage < areaPlannedPercentage ? 'INCREMENTAR' : 'REDUCIR',
              area,
              parentType: tipo,
              currentPercentage: Math.round(areaCurrentPercentage),
              plannedPercentage: areaPlannedPercentage,
              difference: Math.round(areaDifference),
              priority: areaDifference > 10 ? 'high' : areaDifference > 7 ? 'medium' : 'low',
              reason: `${areaCurrentPercentage < areaPlannedPercentage ? 'Déficit' : 'Exceso'} en ${area} según plan`,
              basedOnExercises: Object.keys(areaStats?.exercises || {}).length,
              parentArea: area
            });
          }
        });
      }
    });

    return recommendations;
  }

  /**
   * Detecta coincidencias grupales (sin cambios significativos)
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
   * Obtiene los principales déficits por jugador (sin cambios)
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
   * Calcula promedios grupales (sin cambios)
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
   * ACTUALIZADO: Considera jugadores sin planes válidos
   */
  private static generateGroupRecommendationText(
    coincidencias: GroupCoincidence[],
    individuales: any[],
    hasValidPlans: boolean,
    validPlayersCount: number,
    totalPlayersCount: number
  ): string {
    if (!hasValidPlans) {
      return "No se pueden generar recomendaciones porque ningún jugador tiene un plan de entrenamiento completo definido.";
    }

    if (validPlayersCount < totalPlayersCount) {
      const invalidCount = totalPlayersCount - validPlayersCount;
      const prefix = `⚠️ Solo ${validPlayersCount} de ${totalPlayersCount} jugadores tienen planes válidos (${invalidCount} sin plan completo). `;
      
      if (coincidencias.length > 0) {
        const topCoincidence = coincidencias[0];
        const action = topCoincidence.type === 'INCREMENTAR' ? 'incrementar' : 'reducir';
        return prefix + `Sugerencia para los jugadores con plan: Iniciar con ejercicios de "${topCoincidence.area}" (${action}).`;
      }
      
      return prefix + "Definir planes completos para generar recomendaciones específicas.";
    }

    // Lógica original para cuando todos tienen planes válidos
    if (coincidencias.length > 0) {
      const topCoincidence = coincidencias[0];
      const action = topCoincidence.type === 'INCREMENTAR' ? 'incrementar' : 'reducir';

      if (topCoincidence.type === 'REDUCIR') {
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
   * Obtiene el tipo alternativo para balancear (sin cambios)
   */
  private static getAlternativeType(currentType?: string): string {
    const types = Object.values(TipoType);
    if (!currentType || !types.includes(currentType as TipoType)) {
      return 'otro tipo de ejercicio';
    }
    
    const alternative = types.find(t => t !== currentType);
    return alternative || 'otro tipo de ejercicio';
  }

  /**
   * Formatea estadísticas de tipo (sin cambios)
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
            percentageWithinType: Math.round(areaData.percentageWithinType || 0),
            exercises: areaData.exercises
          };
        });
      }
    });
    
    return formatted;
  }

  /**
   * Formatea estadísticas de área (sin cambios)
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