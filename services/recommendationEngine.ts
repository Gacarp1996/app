// services/recommendationEngine.ts
import { 
  RecItem, 
  EngineInput, 
  EngineOutput, 
  PlayerStats 
} from '../types/recommendations';
import { 
  GapAction, 
  getActionFromGap, 
  getPriorityFromGap 
} from '../constants/recommendationThresholds';
import { TipoType, AreaType } from '../constants/training';
import { calculateExerciseStatsByTime } from '../utils/calculations';
import { SessionService } from './sessionService';
import { TrainingStructureService } from './trainingStructure';
import { LoggedExercise } from '../types/types';

/**
 * Motor único de recomendaciones
 * Mantiene el signo del gap y centraliza toda la lógica
 */
export class RecommendationEngine {
  
  /**
   * Punto de entrada principal del motor
   */
  static buildRecommendations(input: EngineInput): EngineOutput {
    // 1. Calcular estadísticas por jugador
    const playerStats = this.calculatePlayerStats(input);
    
    // 2. Generar recomendaciones individuales
    const individual = this.generateIndividualRecommendations(playerStats, input.plans);
    
    // 3. Generar recomendaciones grupales
    const group = this.generateGroupRecommendations(playerStats, individual, input.players);
    
    return { individual, group };
  }
  
  /**
   * Calcula estadísticas para cada jugador
   */
  private static calculatePlayerStats(input: EngineInput): PlayerStats[] {
    const results: PlayerStats[] = [];
    
    for (const player of input.players) {
      // Recopilar ejercicios del jugador
      const exercises: LoggedExercise[] = [];
      
      // 1. Ejercicios de sesiones históricas
      const playerHistory = input.historicalSessions.find(h => h.playerId === player.id);
      if (playerHistory) {
        playerHistory.sessions.forEach(session => {
          if (session.ejercicios && Array.isArray(session.ejercicios)) {
            exercises.push(...session.ejercicios);
          }
        });
      }
      
      // 2. Ejercicios de la sesión actual (si aplica)
      if (input.config.includeCurrentSession && input.currentSessionExercises) {
        const currentExercises = SessionService.sessionExercisesToLogged(
          input.currentSessionExercises,
          player.id
        );
        exercises.push(...currentExercises);
      }
      
      // 3. Calcular estadísticas usando la función centralizada
      const stats = calculateExerciseStatsByTime(exercises);
      
      results.push({
        playerId: player.id,
        playerName: player.name,
        exercises,
        totalMinutes: stats.totalMinutes,
        typeStats: stats.typeStats,
        areaStats: stats.areaStats,
        sessionsCount: playerHistory?.sessions.length || 0
      });
    }
    
    return results;
  }
  
  /**
   * Genera recomendaciones individuales para cada jugador
   */
  private static generateIndividualRecommendations(
    playerStats: PlayerStats[],
    plans: Record<string, any>
  ): EngineOutput['individual'] {
    const result: EngineOutput['individual'] = {};
    
    for (const stats of playerStats) {
      const plan = plans[stats.playerId];
      const items: RecItem[] = [];
      
      // Obtener porcentajes por defecto
      const defaultTypePercentages = TrainingStructureService.getDefaultTypePercentages();
      const defaultAreaPercentages = TrainingStructureService.getDefaultAreaPercentages();
      
      // Analizar por TIPO
      Object.values(TipoType).forEach(tipo => {
        const typeStats = stats.typeStats[tipo];
        const currentPercentage = typeStats?.percentage || 0;
        
        // Obtener meta del plan o usar default
        let plannedPercentage: number;
        let isDefault = false;
        
        if (plan?.planificacion?.[tipo]?.porcentajeTotal) {
          plannedPercentage = plan.planificacion[tipo].porcentajeTotal;
        } else {
          plannedPercentage = defaultTypePercentages[tipo] || 33;
          isDefault = true;
        }
        
        // MANTENER EL SIGNO: gap = plan - real
        const gap = plannedPercentage - currentPercentage;
        const action = getActionFromGap(gap);
        const priority = getPriorityFromGap(gap);
        
        // Solo agregar si no es óptimo o si hay ejercicios
        if (action !== 'OPTIMO' || typeStats?.total > 0) {
          items.push({
            level: 'TIPO',
            parentType: tipo,
            area: tipo,
            currentPercentage: Math.round(currentPercentage),
            plannedPercentage: Math.round(plannedPercentage),
            gap: Math.round(gap * 10) / 10,  // Redondear a 1 decimal
            action,
            priority,
            reason: this.generateReason(action, tipo, 'TIPO', isDefault),
            basedOn: {
              exercises: stats.exercises.filter(e => e.tipo === tipo).length,
              minutes: Math.round(typeStats?.total || 0)
            },
            isDefault
          });
        }
        
        // Analizar por ÁREA dentro del tipo
        if (typeStats?.areas) {
          const areasForTipo = Object.keys(typeStats.areas) as AreaType[];
          
          areasForTipo.forEach(area => {
            const areaStats = typeStats.areas[area];
            const areaCurrentPercentage = areaStats.percentage; // % dentro del tipo
            
            // Meta del área
            let areaPlannedPercentage: number;
            let areaIsDefault = false;
            
            if (plan?.planificacion?.[tipo]?.areas?.[area]?.porcentajeDelTotal) {
              // Nota: porcentajeDelTotal es relativo al TOTAL, no al tipo
              // Necesitamos convertirlo a % dentro del tipo
              const areaAbsolutePlanned = plan.planificacion[tipo].areas[area].porcentajeDelTotal;
              areaPlannedPercentage = (areaAbsolutePlanned / plannedPercentage) * 100;
            } else {
              areaPlannedPercentage = defaultAreaPercentages[tipo]?.[area] || 25;
              areaIsDefault = true;
            }
            
            const areaGap = areaPlannedPercentage - areaCurrentPercentage;
            const areaAction = getActionFromGap(areaGap);
            const areaPriority = getPriorityFromGap(areaGap);
            
            if (areaAction !== 'OPTIMO' || areaStats.total > 0) {
              items.push({
                level: 'AREA',
                parentType: tipo,
                area,
                currentPercentage: Math.round(areaCurrentPercentage),
                plannedPercentage: Math.round(areaPlannedPercentage),
                gap: Math.round(areaGap * 10) / 10,
                action: areaAction,
                priority: areaPriority,
                reason: this.generateReason(areaAction, area, 'AREA', areaIsDefault),
                basedOn: {
                  exercises: Object.keys(areaStats.exercises || {}).length,
                  minutes: Math.round(areaStats.total)
                },
                isDefault: areaIsDefault
              });
            }
          });
        }
      });
      
      // Ordenar por prioridad y magnitud del gap
      items.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return Math.abs(b.gap) - Math.abs(a.gap);
      });
      
      result[stats.playerId] = {
        items,
        summary: {
          totalExercises: stats.exercises.length,
          totalMinutes: Math.round(stats.totalMinutes),
          sessionsAnalyzed: stats.sessionsCount,
          planUsed: plan ? 'real' : 'default'
        }
      };
    }
    
    return result;
  }
  
  /**
   * Genera recomendaciones grupales
   */
  private static generateGroupRecommendations(
    playerStats: PlayerStats[],
    individual: EngineOutput['individual'],
    players: EngineInput['players']
  ): EngineOutput['group'] {
    
    // Calcular promedios grupales por tipo
    const averages: Record<string, number> = {};
    const typeTotals: Record<string, { sum: number; count: number }> = {};
    
    playerStats.forEach(stats => {
      Object.values(TipoType).forEach(tipo => {
        if (!typeTotals[tipo]) {
          typeTotals[tipo] = { sum: 0, count: 0 };
        }
        const percentage = stats.typeStats[tipo]?.percentage || 0;
        typeTotals[tipo].sum += percentage;
        typeTotals[tipo].count += 1;
      });
    });
    
    Object.entries(typeTotals).forEach(([tipo, data]) => {
      averages[tipo as TipoType] = data.count > 0 
        ? Math.round(data.sum / data.count) 
        : 0;
    });
    
    // Detectar coincidencias fuertes
    const coincidenceMap = new Map<string, any>();
    
    Object.values(individual).forEach(playerAnalysis => {
      playerAnalysis.items.forEach(item => {
        if (item.action !== 'OPTIMO') {
          const key = `${item.level}-${item.area}-${item.action}`;
          
          if (!coincidenceMap.has(key)) {
            coincidenceMap.set(key, {
              area: item.area,
              level: item.level,
              action: item.action,
              gaps: [],
              players: []
            });
          }
          
          const coincidence = coincidenceMap.get(key);
          coincidence.gaps.push(item.gap);
          coincidence.players.push(item);
        }
      });
    });
    
    const strongCoincidences = Array.from(coincidenceMap.values())
      .filter(c => c.players.length >= 2)  // Al menos 2 jugadores
      .map(c => ({
        area: c.area,
        level: c.level,
        action: c.action,
        playerCount: c.players.length,
        averageGap: Math.round(
          c.gaps.reduce((sum: number, g: number) => sum + g, 0) / c.gaps.length * 10
        ) / 10
      }))
      .sort((a, b) => b.playerCount - a.playerCount);
    
    // Generar items grupales basados en promedios
    const groupItems: RecItem[] = [];
    const defaultPercentages = TrainingStructureService.getDefaultTypePercentages();
    
    Object.values(TipoType).forEach(tipo => {
      const currentPercentage = averages[tipo] || 0;
      
      // Calcular meta grupal (promedio de metas individuales)
      let totalPlanned = 0;
      let validPlayers = 0;
      
      players.forEach(player => {
        const playerData = individual[player.id];
        if (playerData) {
          const tipoItem = playerData.items.find(
            item => item.level === 'TIPO' && item.area === tipo
          );
          if (tipoItem) {
            totalPlanned += tipoItem.plannedPercentage;
            validPlayers++;
          }
        }
      });
      
      const plannedPercentage = validPlayers > 0 
        ? Math.round(totalPlanned / validPlayers)
        : defaultPercentages[tipo] || 33;
      
      const gap = plannedPercentage - currentPercentage;
      const action = getActionFromGap(gap);
      const priority = getPriorityFromGap(gap);
      
      groupItems.push({
        level: 'TIPO',
        parentType: tipo,
        area: tipo,
        currentPercentage,
        plannedPercentage,
        gap: Math.round(gap * 10) / 10,
        action,
        priority,
        reason: this.generateReason(action, tipo, 'TIPO', false),
        basedOn: {
          exercises: playerStats.reduce((sum, s) => 
            sum + s.exercises.filter(e => e.tipo === tipo).length, 0
          ),
          minutes: playerStats.reduce((sum, s) => 
            sum + (s.typeStats[tipo]?.total || 0), 0
          )
        }
      });
    });
    
    // Generar texto de recomendación
    const recommendation = this.generateGroupRecommendationText(
      strongCoincidences,
      groupItems
    );
    
    return {
      items: groupItems,
      analyzedPlayers: playerStats.filter(p => p.exercises.length > 0).length,
      totalPlayers: players.length,
      averages: averages as Record<TipoType, number>,
      recommendation,
      strongCoincidences
    };
  }
  
  /**
   * Genera el texto de razón para una recomendación
   */
  private static generateReason(
    action: GapAction,
    area: string,
    level: 'TIPO' | 'AREA' | 'EJERCICIO',
    isDefault: boolean
  ): string {
    const suffix = isDefault ? ' (usando valores por defecto)' : '';
    
    switch (action) {
      case 'OPTIMO':
        return `${area} está dentro del rango óptimo${suffix}`;
      case 'INCREMENTAR':
        return `Déficit en ${level === 'TIPO' ? 'tipo' : 'área'} ${area}${suffix}`;
      case 'REDUCIR':
        return `Exceso en ${level === 'TIPO' ? 'tipo' : 'área'} ${area}${suffix}`;
      default:
        return `${area} requiere ajuste${suffix}`;
    }
  }
  
  /**
   * Genera texto de recomendación grupal
   */
  private static generateGroupRecommendationText(
    coincidences: any[],
    groupItems: RecItem[]
  ): string {
    if (coincidences.length > 0) {
      const top = coincidences[0];
      const action = top.action === 'INCREMENTAR' ? 'incrementar' : 'reducir';
      
      if (top.action === 'REDUCIR') {
        // Buscar qué tipo necesita más trabajo
        const deficit = groupItems.find(item => 
          item.action === 'INCREMENTAR' && item.level === 'TIPO'
        );
        const alternative = deficit ? deficit.area : 'otro tipo de ejercicio';
        
        return `Sugerencia: Hay un exceso de ${top.area}. ` +
               `Inicia la sesión con ejercicios de ${alternative} para balancear el entrenamiento. ` +
               `(${top.playerCount} jugadores, diferencia promedio de ${Math.abs(top.averageGap)}%)`;
      } else {
        return `Sugerencia: Iniciar con ejercicios de "${top.area}" (${action}) ` +
               `que afecta a ${top.playerCount} jugadores con una diferencia promedio de ${Math.abs(top.averageGap)}%.`;
      }
    }
    
    // Si no hay coincidencias fuertes, buscar la mayor necesidad
    const highPriority = groupItems.find(item => 
      item.priority === 'high' && item.action !== 'OPTIMO'
    );
    
    if (highPriority) {
      const action = highPriority.action === 'INCREMENTAR' ? 'incrementar' : 'reducir';
      return `Sugerencia: Priorizar ${highPriority.area} (${action} ${Math.abs(highPriority.gap)}%)`;
    }
    
    return "El grupo está balanceado. Mantener variedad en los ejercicios.";
  }
}