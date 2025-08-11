// hooks/useActiveSessionRecommendations.ts
import { useState, useEffect, useCallback } from 'react';
import { useAcademia } from '../contexts/AcademiaContext';
import { useSession } from '../contexts/SessionContext';
import { TrainingAnalysisService, DataPreview } from '../services/trainingAnalysisService';
import { SessionService } from '../services/sessionService';
import { RecommendationEngine } from '../services/recommendationEngine';
import { EngineInput, EngineOutput } from '../types/recommendations';
import { getDefaultDateRange } from '../utils/dateHelpers';
import { SessionExercise } from '../contexts/TrainingContext';

interface Participant {
  id: string;
  name: string;
}

interface UseActiveSessionRecommendationsProps {
  participants: Participant[];
  currentSessionExercises?: SessionExercise[];  // NUEVO: Ejercicios de sesión actual
}

// FASE 3: Interface para estado de bloqueos
interface BlockedPlayersState {
  count: number;
  players: Array<{
    playerId: string;
    playerName: string;
    reasons: string[];
  }>;
  hasBlockedPlayers: boolean;
}

export const useActiveSessionRecommendations = ({
  participants,
  currentSessionExercises = []  // NUEVO: Recibir ejercicios actuales
}: UseActiveSessionRecommendationsProps) => {
  const { academiaActual } = useAcademia();
  const { getSessionsByPlayer, refreshSessions: refreshSessionsFromContext } = useSession();
  
  const academiaId = academiaActual?.id || '';
  
  // Estados
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [trainingPlans, setTrainingPlans] = useState<{[playerId: string]: any}>({});
  const [recommendationsGenerated, setRecommendationsGenerated] = useState(false);
  const [engineOutput, setEngineOutput] = useState<EngineOutput | null>(null);
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);
  
  // FASE 3: Estado para jugadores bloqueados
  const [blockedPlayers, setBlockedPlayers] = useState<BlockedPlayersState>({
    count: 0,
    players: [],
    hasBlockedPlayers: false
  });

  // FASE 3: Logger para debugging
  const logEngineOutput = (output: EngineOutput, input: EngineInput) => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      input: {
        totalPlayers: input.players.length,
        playerNames: input.players.map(p => p.name),
        hasCurrentExercises: input.currentSessionExercises && input.currentSessionExercises.length > 0,
        configDays: input.config.rangeDays
      },
      output: {
        analyzedPlayers: output.group.analyzedPlayers,
        totalPlayers: output.group.totalPlayers,
        blockedCount: output.group.blocked?.length || 0,
        warnings: output.group.warnings || [],
        recommendation: output.group.recommendation,
        individualCount: Object.keys(output.individual).length
      },
      blocked: output.group.blocked || []
    };
    
    console.group('🔍 Motor de Recomendaciones - Debug Output');
    console.log('📊 Resumen:', {
      procesados: `${debugInfo.output.analyzedPlayers}/${debugInfo.output.totalPlayers}`,
      bloqueados: debugInfo.output.blockedCount,
      advertencias: debugInfo.output.warnings.length
    });
    
    if (debugInfo.output.blockedCount > 0) {
      console.warn('⚠️ Jugadores bloqueados:', debugInfo.blocked);
    }
    
    console.log('📋 Detalles completos:', debugInfo);
    console.groupEnd();
    
    return debugInfo;
  };

  // Generar recomendaciones usando el motor único
  const generateRecommendations = async () => {
    setRecommendationsLoading(true);
    
    // FASE 3: Reset estado de bloqueados
    setBlockedPlayers({
      count: 0,
      players: [],
      hasBlockedPlayers: false
    });
    
    try {
      // 1. Cargar planes de entrenamiento
      console.log('🔄 Cargando planes de entrenamiento...');
      const plans = await TrainingAnalysisService.loadTrainingPlansWithAdaptation(
        academiaId,
        participants
      );
      setTrainingPlans(plans);
      
      // FASE 3: Log planes cargados
      console.log('📚 Planes cargados:', {
        total: Object.keys(plans).length,
        jugadores: Object.entries(plans).map(([id, plan]) => ({
          id,
          tienePlan: !!plan,
          tienesPlanificacion: !!(plan?.planificacion && Object.keys(plan.planificacion).length > 0)
        }))
      });
      
      // 2. Obtener sesiones históricas para cada jugador
      const dateRange = getDefaultDateRange(30);
      const historicalSessions = participants.map(p => ({
        playerId: p.id,
        sessions: getSessionsByPlayer(p.id, {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end)
        })
      }));
      
      // FASE 3: Log sesiones históricas
      console.log('📅 Sesiones históricas:', historicalSessions.map(h => ({
        jugador: participants.find(p => p.id === h.playerId)?.name,
        sesiones: h.sessions.length
      })));
      
      // 3. Preparar input para el motor
      const engineInput: EngineInput = {
        players: participants,
        historicalSessions,
        currentSessionExercises,  // Incluir ejercicios de sesión actual
        plans,
        config: {
          rangeDays: 30,
          timeZone: 'America/Santiago',
          includeCurrentSession: currentSessionExercises.length > 0
        }
      };
      
      // 4. Ejecutar motor de recomendaciones
      console.log('⚙️ Ejecutando motor de recomendaciones...');
      const output = RecommendationEngine.buildRecommendations(engineInput);
      
      // FASE 3: Log detallado del output
      const debugInfo = logEngineOutput(output, engineInput);
      
      // FASE 3: Actualizar estado de bloqueados
      if (output.group.blocked && output.group.blocked.length > 0) {
        setBlockedPlayers({
          count: output.group.blocked.length,
          players: output.group.blocked,
          hasBlockedPlayers: true
        });
        
        // Log específico para bloqueados
        console.warn('⚠️ Jugadores sin plan válido:', 
          output.group.blocked.map(b => ({
            nombre: b.playerName,
            razones: b.reasons
          }))
        );
      }
      
      setEngineOutput(output);
      setRecommendationsGenerated(true);
      
      // FASE 3: Notificación si hay jugadores bloqueados
      if (output.group.blocked && output.group.blocked.length > 0) {
        const blockedNames = output.group.blocked.map(b => b.playerName).join(', ');
        console.info(`ℹ️ Recomendaciones generadas. ${output.group.blocked.length} jugador(es) excluido(s): ${blockedNames}`);
      }
      
    } catch (error) {
      console.error('❌ Error generando recomendaciones:', error);
      
      // FASE 3: Log detallado del error
      console.error('Detalles del error:', {
        mensaje: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack : undefined,
        participantes: participants.map(p => p.name),
        academiaId
      });
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Refrescar recomendaciones
  const refreshRecommendations = async () => {
    console.log('🔄 Refrescando recomendaciones...');
    setRecommendationsGenerated(false);
    setRecommendationsLoading(true);

    try {
      await refreshSessionsFromContext();
      await generateRecommendations();
    } catch (error) {
      console.error('❌ Error recargando:', error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // FASE 3: Helper para obtener resumen de bloqueos
  const getBlockedSummary = useCallback(() => {
    if (!engineOutput?.group.blocked || engineOutput.group.blocked.length === 0) {
      return null;
    }
    
    return {
      count: engineOutput.group.blocked.length,
      percentage: Math.round((engineOutput.group.blocked.length / engineOutput.group.totalPlayers) * 100),
      players: engineOutput.group.blocked.map(b => ({
        name: b.playerName,
        mainReason: b.reasons[0] || 'Sin plan definido'
      }))
    };
  }, [engineOutput]);

  // Actualizar recomendaciones individuales cuando cambia el jugador seleccionado
  const updateIndividualRecommendations = useCallback((playerId: string) => {
    if (!engineOutput || !playerId) {
      console.log(`📊 Sin datos para jugador ${playerId}`);
      return null;
    }
    
    const playerData = engineOutput.individual[playerId];
    
    // FASE 3: Log si el jugador está bloqueado
    if (!playerData) {
      const blocked = engineOutput.group.blocked?.find(b => b.playerId === playerId);
      if (blocked) {
        console.warn(`⚠️ Jugador ${blocked.playerName} bloqueado:`, blocked.reasons);
      }
    }
    
    return playerData;
  }, [engineOutput]);

  // Analizar ejercicios de un jugador (para compatibilidad)
  const analyzePlayerExercises = useCallback((playerId: string) => {
    if (!engineOutput) {
      return { 
        recommendations: [], 
        totalExercises: 0, 
        totalMinutes: 0,
        typeStats: {}, 
        areaStats: {},
        sessionsAnalyzed: 0,
        planUsed: 'default' as const
      };
    }

    const playerData = engineOutput.individual[playerId];
    
    // FASE 3: Check si está bloqueado
    if (!playerData) {
      const blocked = engineOutput.group.blocked?.find(b => b.playerId === playerId);
      if (blocked) {
        console.log(`ℹ️ Jugador ${blocked.playerName} no tiene análisis (bloqueado)`);
      }
      
      return { 
        recommendations: [], 
        totalExercises: 0, 
        totalMinutes: 0,
        typeStats: {}, 
        areaStats: {},
        sessionsAnalyzed: 0,
        planUsed: 'default' as const,
        // FASE 3: Agregar info de bloqueo
        isBlocked: !!blocked,
        blockReason: blocked?.reasons[0]
      };
    }

    // Convertir RecItem[] al formato legacy para compatibilidad
    const recommendations = playerData.items.map(item => ({
      level: item.level,
      type: item.action === 'INCREMENTAR' ? 'INCREMENTAR' : item.action === 'REDUCIR' ? 'REDUCIR' : 'OPTIMO',
      area: item.area,
      parentType: item.parentType,
      currentPercentage: item.currentPercentage,
      plannedPercentage: item.plannedPercentage,
      difference: Math.abs(item.gap),  // Compatibilidad: usar abs
      priority: item.priority,
      reason: item.reason,
      basedOnExercises: item.basedOn.exercises,
      isStatus: item.action === 'OPTIMO'
    }));

    return {
      recommendations,
      totalExercises: playerData.summary.totalExercises,
      totalMinutes: playerData.summary.totalMinutes,
      typeStats: {}, // TODO: Extraer de engineOutput si es necesario
      areaStats: {}, // TODO: Extraer de engineOutput si es necesario
      sessionsAnalyzed: playerData.summary.sessionsAnalyzed,
      planUsed: playerData.summary.planUsed
    };
  }, [engineOutput]);

  // Analizar sesiones de un jugador (para compatibilidad)
  const analyzePlayerSessions = useCallback((playerId: string) => {
    const dateRange = getDefaultDateRange(30);
    const playerSessions = getSessionsByPlayer(playerId, { 
      start: new Date(dateRange.start), 
      end: new Date(dateRange.end) 
    });

    if (playerSessions.length === 0) {
      return { totalSessions: 0, dateRange: null };
    }

    const dates = playerSessions.map(s => new Date(s.fecha));
    const formattedRange = TrainingAnalysisService.formatDateRange(dates);

    return { totalSessions: playerSessions.length, dateRange: formattedRange };
  }, [getSessionsByPlayer]);

  // Generar preview de datos
  const updateDataPreview = useCallback(() => {
    const dateRange = getDefaultDateRange(30);
    const sessionData = participants.map(p => {
      const sessions = getSessionsByPlayer(p.id, {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      });
      return SessionService.countPlayerSessions(sessions, p.id);
    });

    const preview = TrainingAnalysisService.generateDataPreview(
      participants,
      sessionData.map((data, i) => ({ ...data, playerId: participants[i].id })),
      trainingPlans
    );
    
    setDataPreview(preview);
  }, [participants, getSessionsByPlayer, trainingPlans]);

  // Cargar planes cuando cambien participantes
  useEffect(() => {
    if (academiaId && participants.length > 0) {
      console.log('📋 Cargando planes para participantes:', participants.map(p => p.name));
      TrainingAnalysisService.loadTrainingPlansWithAdaptation(academiaId, participants)
        .then(plans => {
          setTrainingPlans(plans);
          updateDataPreview();
        });
    }
  }, [academiaId, participants.map(p => p.id).join(',')]);

  // Actualizar preview cuando cambien los planes
  useEffect(() => {
    if (Object.keys(trainingPlans).length > 0) {
      updateDataPreview();
    }
  }, [trainingPlans, updateDataPreview]);

  // Re-generar cuando cambien los ejercicios de sesión actual
  useEffect(() => {
    if (recommendationsGenerated && currentSessionExercises.length > 0) {
      console.log('📝 Ejercicios de sesión actual cambiaron, regenerando...');
      generateRecommendations();
    }
  }, [currentSessionExercises]);

  // FASE 3: Log cuando cambien los jugadores bloqueados
  useEffect(() => {
    if (blockedPlayers.hasBlockedPlayers) {
      console.group('⚠️ Estado de Jugadores Bloqueados');
      console.log('Total bloqueados:', blockedPlayers.count);
      console.table(blockedPlayers.players.map(p => ({
        Jugador: p.playerName,
        'Razón principal': p.reasons[0],
        'Total razones': p.reasons.length
      })));
      console.groupEnd();
    }
  }, [blockedPlayers]);

  // Helpers para compatibilidad con componentes existentes
  const getIdealPercentageForType = (type: string, playerId: string) => {
    return TrainingAnalysisService.getIdealPercentageForType(type, trainingPlans[playerId]);
  };

  const getIdealPercentageForAreaInType = (area: string, type: string, playerId: string) => {
    return TrainingAnalysisService.getIdealPercentageForAreaInType(area, type, trainingPlans[playerId]);
  };

  // FASE 3: Helper para verificar si un jugador está bloqueado
  const isPlayerBlocked = useCallback((playerId: string): boolean => {
    return engineOutput?.group.blocked?.some(b => b.playerId === playerId) || false;
  }, [engineOutput]);

  // FASE 3: Helper para obtener razón de bloqueo
  const getPlayerBlockReason = useCallback((playerId: string): string | null => {
    const blocked = engineOutput?.group.blocked?.find(b => b.playerId === playerId);
    return blocked ? blocked.reasons[0] : null;
  }, [engineOutput]);

  return {
    // Estados
    recommendationsGenerated,
    recommendationsLoading,
    trainingPlans,
    dataPreview,
    
    // FASE 3: Estado de bloqueos
    blockedPlayers,
    hasBlockedPlayers: blockedPlayers.hasBlockedPlayers,
    blockedCount: blockedPlayers.count,
    
    // Datos del motor
    engineOutput,
    individualRecommendations: engineOutput?.individual[participants[0]?.id] || null,
    groupRecommendations: engineOutput?.group || null,
    
    // Funciones
    generateRecommendations,
    refreshRecommendations,
    updateIndividualRecommendations,
    
    // FASE 3: Funciones nuevas para bloqueos
    getBlockedSummary,
    isPlayerBlocked,
    getPlayerBlockReason,
    
    // Compatibilidad con componentes existentes
    analyzePlayerExercises,
    analyzePlayerSessions,
    getIdealPercentageForType,
    getIdealPercentageForAreaInType
  };
};