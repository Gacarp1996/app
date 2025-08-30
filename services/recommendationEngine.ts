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
import { TipoType, AreaType, tipoRequiereEjercicios } from '../constants/training';
import { calculateExerciseStatsByTime } from '../utils/calculations';
import { SessionService } from './sessionService';
import { MigrationService } from './migrationService';
import { validateStrictTrainingPlan, canGenerateRecommendations } from '../utils/validation';
import { LoggedExercise } from '../types/types';

/**
 * Motor de recomendaciones SIN HARDCODE - Fase 1
 * SOLO funciona con planes completos y validados
 * ✅ ACTUALIZADO: Maneja correctamente tipo "Puntos" sin ejercicios
 */
export class RecommendationEngine {
  
  /**
   * Punto de entrada principal del motor
   * FASE 2: Procesa jugadores válidos y reporta bloqueados
   */
  static buildRecommendations(input: EngineInput): EngineOutput {
    // 1. Validar jugadores individualmente (no todos-o-nada)
    const validationResult = this.validatePlayersIndividually(input);
    
    // Si NO hay jugadores válidos, retornar output vacío
    if (!validationResult.canProceed) {
      return this.createEmptyOutput(
        validationResult.blockedPlayers,
        input.players.length
      );
    }
    
    // Filtrar solo jugadores válidos para procesamiento
    const validPlayersData = input.players.filter(p => 
      validationResult.validPlayers.includes(p.id)
    );
    const validPlans: Record<string, any> = {};
    validationResult.validPlayers.forEach(playerId => {
      if (input.plans[playerId]) {
        validPlans[playerId] = input.plans[playerId];
      }
    });
    
    // 2. Migrar planes válidos si es necesario
    const migratedPlans = this.migratePlansIfNeeded(validPlans);
    
    // 3. Calcular estadísticas (solo jugadores válidos)
    const playerStats = this.calculatePlayerStats({
      ...input,
      players: validPlayersData
    });
    
    // 4. Generar recomendaciones individuales
    const individual = this.generateIndividualRecommendations(
      playerStats, 
      migratedPlans
    );
    
    // 5. Generar recomendaciones grupales con información de bloqueados
    const group = this.generateGroupRecommendations(
      playerStats, 
      individual, 
      validPlayersData,
      validationResult.blockedPlayers,
      input.players.length
    );
    
    return { individual, group };
  }
  
  /**
   * FASE 2: Validar jugadores individualmente
   * Procesa jugadores válidos y reporta bloqueados con sus razones
   */
  private static validatePlayersIndividually(input: EngineInput): {
    canProceed: boolean;
    validPlayers: string[];
    blockedPlayers: Array<{
      playerId: string;
      playerName: string;
      reasons: string[];
    }>;
  } {
    const validPlayers: string[] = [];
    const blockedPlayers: Array<{
      playerId: string;
      playerName: string;
      reasons: string[];
    }> = [];
    
    for (const player of input.players) {
      const plan = input.plans[player.id];
      const validation = canGenerateRecommendations(plan);
      
      if (!validation.canGenerate) {
        // Extraer razones específicas del bloqueo
        const reasons: string[] = [];
        
        // Razón principal
        if (validation.reason) {
          reasons.push(validation.reason);
        }
        
        // Errores adicionales si existen
        if (validation.blockingErrors && validation.blockingErrors.length > 0) {
          // Tomar máximo 3 errores más específicos para no saturar
          validation.blockingErrors.slice(0, 3).forEach(error => {
            if (!reasons.includes(error)) {
              reasons.push(error);
            }
          });
        }
        
        blockedPlayers.push({
          playerId: player.id,
          playerName: player.name,
          reasons
        });
      } else {
        validPlayers.push(player.id);
      }
    }
    
    // CAMBIO CLAVE: Proceder si hay AL MENOS UN jugador válido
    const canProceed = validPlayers.length > 0;
    
    return {
      canProceed,
      validPlayers,
      blockedPlayers
    };
  }
  
  /**
   * FASE 2: Crear salida vacía con información detallada de bloqueos
   */
  private static createEmptyOutput(
    blockedPlayers: Array<{
      playerId: string;
      playerName: string;
      reasons: string[];
    }>,
    totalPlayers: number
  ): EngineOutput {
    const mainMessage = blockedPlayers.length === totalPlayers
      ? "No se pueden generar recomendaciones porque ningún jugador tiene un plan válido."
      : `No se pueden generar recomendaciones. ${blockedPlayers.length} jugador(es) sin plan válido.`;
    
    return {
      individual: {},
      group: {
        items: [],
        analyzedPlayers: 0,
        totalPlayers,
        averages: {} as Record<TipoType, number>,
        recommendation: mainMessage,
        strongCoincidences: [],
        // NUEVO: Incluir información de bloqueados
        blocked: blockedPlayers,
        warnings: blockedPlayers.length > 0 
          ? [`${blockedPlayers.length} jugador(es) excluido(s) del análisis por falta de plan válido`]
          : []
      }
    };
  }
  
  /**
   * Migra planes antiguos sin generar defaults
   */
  private static migratePlansIfNeeded(plans: Record<string, any>): Record<string, any> {
    const migrated: Record<string, any> = {};
    
    Object.entries(plans).forEach(([playerId, plan]) => {
      if (plan) {
        migrated[playerId] = MigrationService.migrateTrainingPlan(plan);
      }
    });
    
    return migrated;
  }
  
  /**
   * Calcula estadísticas para cada jugador
   * ✅ ACTUALIZADO: Maneja correctamente ejercicios de tipo Puntos
   */
  private static calculatePlayerStats(input: EngineInput): PlayerStats[] {
    const results: PlayerStats[] = [];
    
    for (const player of input.players) {
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
      
      // 3. Calcular estadísticas
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
   * Genera recomendaciones individuales SIN DEFAULTS
   * ✅ ACTUALIZADO: Maneja correctamente tipo Puntos sin ejercicios
   */
  private static generateIndividualRecommendations(
    playerStats: PlayerStats[],
    plans: Record<string, any>
  ): EngineOutput['individual'] {
    const result: EngineOutput['individual'] = {};
    
    for (const stats of playerStats) {
      const plan = plans[stats.playerId];
      const items: RecItem[] = [];
      
      // CRÍTICO: Solo procesar si hay plan válido
      if (!plan) {
        result[stats.playerId] = {
          items: [],
          summary: {
            totalExercises: stats.exercises.length,
            totalMinutes: Math.round(stats.totalMinutes),
            sessionsAnalyzed: stats.sessionsCount,
            planUsed: 'default'  // Indica que no hay plan
          }
        };
        continue;
      }
      
      const validation = validateStrictTrainingPlan(plan);
      

      if (!validation.canGenerateRecommendations) {
        result[stats.playerId] = {
          items: [],
          summary: {
            totalExercises: stats.exercises.length,
            totalMinutes: Math.round(stats.totalMinutes),
            sessionsAnalyzed: stats.sessionsCount,
            planUsed: 'default'  // Plan inválido
          }
        };
        continue;
      }
      
      // Analizar por TIPO (solo los definidos en el plan)
      Object.entries(plan.planificacion).forEach(([tipo, tipoData]: [string, any]) => {
        if (!tipoData || tipoData.porcentajeTotal === undefined) return;
        
        const typeStats = stats.typeStats[tipo];
        const currentPercentage = typeStats?.percentage || 0;
        const plannedPercentage = tipoData.porcentajeTotal;
        
        // Gap: plan - real
        const gap = plannedPercentage - currentPercentage;
        const action = getActionFromGap(gap);
        const priority = getPriorityFromGap(gap);
        
        // ✅ NUEVO: Determinar si este tipo requiere ejercicios
        const requiresExercises = tipoRequiereEjercicios(tipo as TipoType);
        
        
        // Agregar recomendación de tipo si hay gap significativo o datos
        if (Math.abs(gap) > 5 || typeStats?.total > 0) {
          items.push({
            level: 'TIPO',
            parentType: tipo as TipoType,
            area: tipo,
            currentPercentage: Math.round(currentPercentage),
            plannedPercentage: Math.round(plannedPercentage),
            gap: Math.round(gap * 10) / 10,
            action,
            priority,
            reason: this.generateReason(action, tipo, 'TIPO', false),
            basedOn: {
              exercises: stats.exercises.filter(e => e.tipo === tipo).length,
              minutes: Math.round(typeStats?.total || 0)
            },
            isDefault: false
          });
        }
        
        // Analizar por ÁREA
        if (tipoData.areas && (validation.granularityLevel === 'AREA' || validation.granularityLevel === 'EJERCICIO')) {
          Object.entries(tipoData.areas).forEach(([area, areaData]: [string, any]) => {
            if (!areaData || areaData.porcentajeDelTotal === undefined) return;
            
            const areaStats = typeStats?.areas?.[area];
            const areaCurrentPercentage = areaStats?.percentage || 0;  // Absoluto
            const areaPlannedPercentage = areaData.porcentajeDelTotal;  // Absoluto
            
            const areaGap = areaPlannedPercentage - areaCurrentPercentage;
            const areaAction = getActionFromGap(areaGap);
            const areaPriority = getPriorityFromGap(areaGap);
            
            // Agregar recomendación de área si hay gap significativo o datos
            if (Math.abs(areaGap) > 5 || (areaStats?.total || 0) > 0) {
              items.push({
                level: 'AREA',
                parentType: tipo as TipoType,
                area,
                currentPercentage: Math.round(areaCurrentPercentage),
                plannedPercentage: Math.round(areaPlannedPercentage),
                gap: Math.round(areaGap * 10) / 10,
                action: areaAction,
                priority: areaPriority,
                reason: this.generateReason(areaAction, area, 'AREA', false),
                basedOn: {
                  // ✅ ACTUALIZADO: Para Puntos, contar ejercicios a nivel de área
                  exercises: requiresExercises 
                    ? Object.keys(areaStats?.exercises || {}).length
                    : stats.exercises.filter(e => e.tipo === tipo && e.area === area).length,
                  minutes: Math.round(areaStats?.total || 0)
                },
                isDefault: false
              });
            }
            
            // ✅ IMPORTANTE: Solo analizar ejercicios si el tipo los requiere
            // Para tipo "Puntos", NO intentar analizar nivel de ejercicios
            if (requiresExercises && validation.granularityLevel === 'EJERCICIO' && areaData.ejercicios) {
              // Aquí iría el análisis de ejercicios para Peloteo y Canasto
              // (No incluido en este fragmento por brevedad, pero seguiría la misma lógica)
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
          planUsed: 'real'  // Plan válido usado
        }
      };
    }
    
    return result;
  }
  
  /**
   * Genera recomendaciones grupales
   * FASE 2: Incluye información de jugadores bloqueados
   */
  private static generateGroupRecommendations(
    playerStats: PlayerStats[],
    individual: EngineOutput['individual'],
    validPlayers: EngineInput['players'],
    blockedPlayers: Array<{
      playerId: string;
      playerName: string;
      reasons: string[];
    }>,
    totalPlayers: number
  ): EngineOutput['group'] {
    
    // Si no hay jugadores válidos (edge case)
    if (validPlayers.length === 0) {
      return {
        items: [],
        analyzedPlayers: 0,
        totalPlayers,
        averages: {} as Record<TipoType, number>,
        recommendation: "No se pueden generar recomendaciones grupales porque ningún jugador tiene un plan válido.",
        strongCoincidences: [],
        blocked: blockedPlayers,
        warnings: [`Todos los jugadores (${totalPlayers}) fueron excluidos por falta de planes válidos`]
      };
    }
    
    // Calcular promedios grupales por tipo (solo jugadores válidos)
    const averages: Record<string, number> = {};
    const typeTotals: Record<string, { sum: number; count: number }> = {};
    
    const validPlayerStats = playerStats.filter(stats => 
      validPlayers.some(p => p.id === stats.playerId)
    );
    
    validPlayerStats.forEach(stats => {
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
    
    // Detectar coincidencias fuertes (solo entre jugadores válidos)
    const coincidenceMap = new Map<string, any>();
    
    validPlayers.forEach(player => {
      const playerAnalysis = individual[player.id];
      if (playerAnalysis) {
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
      }
    });
    
    const strongCoincidences = Array.from(coincidenceMap.values())
      .filter(c => c.players.length >= 2)
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
    
    // Generar items grupales basados en promedios reales (sin defaults)
    const groupItems: RecItem[] = [];
    
    Object.values(TipoType).forEach(tipo => {
      const currentPercentage = averages[tipo] || 0;
      
      // Calcular meta grupal (promedio de metas reales de planes válidos)
      let totalPlanned = 0;
      let validCount = 0;
      
      validPlayers.forEach(player => {
        const playerData = individual[player.id];
        if (playerData) {
          const tipoItem = playerData.items.find(
            item => item.level === 'TIPO' && item.area === tipo
          );
          if (tipoItem) {
            totalPlanned += tipoItem.plannedPercentage;
            validCount++;
          }
        }
      });
      
      // Solo crear item si hay datos reales
      if (validCount > 0) {
        const plannedPercentage = Math.round(totalPlanned / validCount);
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
            exercises: validPlayerStats.reduce((sum, s) => 
              sum + s.exercises.filter(e => e.tipo === tipo).length, 0
            ),
            minutes: validPlayerStats.reduce((sum, s) => 
              sum + (s.typeStats[tipo]?.total || 0), 0
            )
          }
        });
      }
    });
    
    // Generar texto de recomendación
    const recommendation = this.generateGroupRecommendationText(
      strongCoincidences,
      groupItems,
      validPlayers.length,
      totalPlayers
    );
    
    return {
      items: groupItems,
      analyzedPlayers: validPlayers.length,
      totalPlayers,
      averages: averages as Record<TipoType, number>,
      recommendation,
      strongCoincidences,
      // NUEVO: Incluir jugadores bloqueados si los hay
      blocked: blockedPlayers.length > 0 ? blockedPlayers : undefined,
      warnings: blockedPlayers.length > 0 
        ? [`${blockedPlayers.length} jugador(es) excluido(s) del análisis grupal`]
        : undefined
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
    // Ya no hay defaults en Fase 1
    switch (action) {
      case 'OPTIMO':
        return `${area} está dentro del rango óptimo`;
      case 'INCREMENTAR':
        return `Déficit en ${level === 'TIPO' ? 'tipo' : 'área'} ${area}`;
      case 'REDUCIR':
        return `Exceso en ${level === 'TIPO' ? 'tipo' : 'área'} ${area}`;
      default:
        return `${area} requiere ajuste`;
    }
  }
  
  /**
   * Genera texto de recomendación grupal
   * FASE 2: Considera jugadores válidos vs totales
   */
  private static generateGroupRecommendationText(
    coincidences: any[],
    groupItems: RecItem[],
    validPlayersCount: number,
    totalPlayersCount: number
  ): string {
    if (validPlayersCount === 0) {
      return "No se pueden generar recomendaciones porque ningún jugador tiene un plan válido.";
    }
    
    // Prefijo si hay jugadores excluidos
    const prefix = validPlayersCount < totalPlayersCount
      ? `Análisis de ${validPlayersCount}/${totalPlayersCount} jugadores. `
      : '';
    
    if (coincidences.length > 0) {
      const top = coincidences[0];
      const action = top.action === 'INCREMENTAR' ? 'incrementar' : 'reducir';
      
      if (top.action === 'REDUCIR') {
        const deficit = groupItems.find(item => 
          item.action === 'INCREMENTAR' && item.level === 'TIPO'
        );
        const alternative = deficit ? deficit.area : 'otro tipo de ejercicio';
        
        return prefix +
          `Sugerencia: Hay un exceso de ${top.area}. ` +
          `Inicia la sesión con ejercicios de ${alternative} para balancear el entrenamiento. ` +
          `(${top.playerCount} jugadores, diferencia promedio de ${Math.abs(top.averageGap)}%)`;
      } else {
        return prefix +
          `Sugerencia: Iniciar con ejercicios de "${top.area}" (${action}) ` +
          `que afecta a ${top.playerCount} jugadores con una diferencia promedio de ${Math.abs(top.averageGap)}%.`;
      }
    }
    
    const highPriority = groupItems.find(item => 
      item.priority === 'high' && item.action !== 'OPTIMO'
    );
    
    if (highPriority) {
      const action = highPriority.action === 'INCREMENTAR' ? 'incrementar' : 'reducir';
      return prefix + 
        `Sugerencia: Priorizar ${highPriority.area} (${action} ${Math.abs(highPriority.gap)}%)`;
    }
    
    return prefix + 
      `El grupo está balanceado (${validPlayersCount} jugador${validPlayersCount !== 1 ? 'es' : ''} con plan${validPlayersCount !== 1 ? 'es' : ''} válido${validPlayersCount !== 1 ? 's' : ''}). ` +
      `Mantener variedad en los ejercicios.`;
  }
}