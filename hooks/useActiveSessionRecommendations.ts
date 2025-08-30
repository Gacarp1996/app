// hooks/useActiveSessionRecommendations.ts - ACTUALIZADO con configuración de ventana de análisis
import { useState, useEffect, useCallback } from 'react';
import { useAcademia } from '../contexts/AcademiaContext';
import { useSession } from '../contexts/SessionContext';
import { TrainingAnalysisService, DataPreview } from '../services/trainingAnalysisService';
import { SessionService } from '../services/sessionService';
import { RecommendationEngine } from '../services/recommendationEngine';
import { EngineInput, EngineOutput } from '../types/recommendations';
import { getDefaultDateRange } from '../utils/dateHelpers';
import { SessionExercise } from '../contexts/TrainingContext';
// ✅ NUEVO: Importar helper para obtener configuración
import { getRecommendationsAnalysisWindow } from '../Database/FirebaseAcademiaConfig';

interface Participant {
  id: string;
  name: string;
}

interface UseActiveSessionRecommendationsProps {
  participants: Participant[];
  currentSessionExercises?: SessionExercise[];  
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
  currentSessionExercises = []  
}: UseActiveSessionRecommendationsProps) => {
  const { academiaActual } = useAcademia();
  const { getSessionsByPlayer, refreshSessions: refreshSessionsFromContext, sessions } = useSession();
  
  const academiaId = academiaActual?.id || '';
  
  // Estados
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [trainingPlans, setTrainingPlans] = useState<{[playerId: string]: any}>({});
  const [recommendationsGenerated, setRecommendationsGenerated] = useState(false);
  const [engineOutput, setEngineOutput] = useState<EngineOutput | null>(null);
  const [dataPreview, setDataPreview] = useState<DataPreview | null>(null);
  
  // ✅ NUEVO: Estado para configuración de ventana de análisis
  const [analysisWindowDays, setAnalysisWindowDays] = useState<number>(7); // Default fallback
  const [loadingAnalysisConfig, setLoadingAnalysisConfig] = useState(true);
  
  // FASE 3: Estado para jugadores bloqueados
  const [blockedPlayers, setBlockedPlayers] = useState<BlockedPlayersState>({
    count: 0,
    players: [],
    hasBlockedPlayers: false
  });

  // ✅ NUEVO: Efecto para cargar configuración de ventana de análisis
  useEffect(() => {
    const loadAnalysisWindow = async () => {
      if (!academiaId) {
        setLoadingAnalysisConfig(false);
        return;
      }

      try {
        const configuredDays = await getRecommendationsAnalysisWindow(academiaId);
        setAnalysisWindowDays(configuredDays);
        
        //console.log('📊 Configuración de análisis cargada:', {
          //academia: academiaId,
          //dias: configuredDays
        //});
      } catch (error) {
        
        // Mantener default de 7 días si hay error
        setAnalysisWindowDays(7);
      } finally {
        setLoadingAnalysisConfig(false);
      }
    };

    loadAnalysisWindow();
  }, [academiaId]); // Re-cargar si cambia la academia



  // ✅ ACTUALIZADO: Generar recomendaciones usando configuración dinámica
  const generateRecommendations = async () => {
    // ✅ NUEVO: Esperar a que se cargue la configuración
    if (loadingAnalysisConfig) {
      return;
    }

    setRecommendationsLoading(true);
    
    // FASE 3: Reset estado de bloqueados
    setBlockedPlayers({
      count: 0,
      players: [],
      hasBlockedPlayers: false
    });
    
    try {
      // 1. Cargar planes de entrenamiento
      const plans = await TrainingAnalysisService.loadTrainingPlansWithAdaptation(
        academiaId,
        participants
      );
      setTrainingPlans(plans);
      
      // ✅ ACTUALIZADO: Usar ventana de análisis configurada
      const dateRange = getDefaultDateRange(analysisWindowDays);
      
      // Obtener sesiones históricas para cada participante
      const historicalSessions = participants.map(p => {
        const sessions = getSessionsByPlayer(p.id, {
          start: new Date(dateRange.start + 'T00:00:00'),
          end: new Date(dateRange.end + 'T23:59:59')
        });
        
        return {
          playerId: p.id,
          sessions
        };
      });
      
      // 3. Preparar input para el motor
      const engineInput: EngineInput = {
        players: participants,
        historicalSessions,
        currentSessionExercises,  
        plans,
        config: {
          rangeDays: analysisWindowDays, // ✅ ACTUALIZADO: Usar configuración
          timeZone: 'America/Santiago',
          includeCurrentSession: currentSessionExercises.length > 0
        }
      };
      
      // 4. Ejecutar motor de recomendaciones
      const output = RecommendationEngine.buildRecommendations(engineInput);
      
      // FASE 3: Actualizar estado de bloqueados
      if (output.group.blocked && output.group.blocked.length > 0) {
        setBlockedPlayers({
          count: output.group.blocked.length,
          players: output.group.blocked,
          hasBlockedPlayers: true
        });
      }
      
      setEngineOutput(output);
      setRecommendationsGenerated(true);
      
    } catch (error) {
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Refrescar recomendaciones
  const refreshRecommendations = async () => {
    setRecommendationsGenerated(false);
    setRecommendationsLoading(true);

    try {
      // ✅ NUEVO: Forzar recarga de sesiones para evitar problemas de cache
      await refreshSessionsFromContext(true); // Force refresh
      
      // Esperar un poco para que se actualice el estado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await generateRecommendations();
    } catch (error) {
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
      return null;
    }
    
    const playerData = engineOutput.individual[playerId];
    
    // FASE 3: Log si el jugador está bloqueado
    if (!playerData) {
      const blocked = engineOutput.group.blocked?.find(b => b.playerId === playerId);
      if (blocked) {
       // console.warn(`⚠️ Jugador ${blocked.playerName} bloqueado:`, blocked.reasons);
      }
    }
    
    return playerData;
  }, [engineOutput]);

  // ✅ ACTUALIZADO: Analizar ejercicios de un jugador con ventana configurada
  const analyzePlayerExercises = useCallback((playerId: string) => {
    if (!engineOutput) {
      return { 
        recommendations: [], 
        totalExercises: 0, 
        totalMinutes: 0,
        typeStats: {}, 
        areaStats: {},
        sessionsAnalyzed: 0,
        planUsed: 'default' as const,
        // ✅ NUEVO: Incluir info de ventana de análisis
        analysisWindowDays
      };
    }

    const playerData = engineOutput.individual[playerId];
    
    // FASE 3: Check si está bloqueado
    if (!playerData) {
      const blocked = engineOutput.group.blocked?.find(b => b.playerId === playerId);
      
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
        blockReason: blocked?.reasons[0],
        // ✅ NUEVO: Incluir ventana de análisis
        analysisWindowDays
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
      planUsed: playerData.summary.planUsed,
      // ✅ NUEVO: Incluir ventana de análisis usada
      analysisWindowDays
    };
  }, [engineOutput, analysisWindowDays]);

  // ✅ ACTUALIZADO: Analizar sesiones con ventana configurada
  const analyzePlayerSessions = useCallback((playerId: string) => {
    const dateRange = getDefaultDateRange(analysisWindowDays); // ✅ Usar configuración
    const playerSessions = getSessionsByPlayer(playerId, { 
      start: new Date(dateRange.start + 'T00:00:00'), 
      end: new Date(dateRange.end + 'T23:59:59') 
    });

    if (playerSessions.length === 0) {
      return { 
        totalSessions: 0, 
        dateRange: null,
        analysisWindowDays // ✅ NUEVO: Incluir ventana usada
      };
    }

    const dates = playerSessions.map(s => new Date(s.fecha));
    const formattedRange = TrainingAnalysisService.formatDateRange(dates);

    return { 
      totalSessions: playerSessions.length, 
      dateRange: formattedRange,
      analysisWindowDays // ✅ NUEVO: Incluir ventana usada
    };
  }, [getSessionsByPlayer, analysisWindowDays]);

  // ✅ ACTUALIZADO: Generar preview con ventana configurada
  const updateDataPreview = useCallback(() => {
    const dateRange = getDefaultDateRange(analysisWindowDays); // ✅ Usar configuración
    
    const sessionData = participants.map(p => {
      const sessions = getSessionsByPlayer(p.id, {
        start: new Date(dateRange.start + 'T00:00:00'),
        end: new Date(dateRange.end + 'T23:59:59')
      });
      
      return SessionService.countPlayerSessions(sessions, p.id);
    });

    const preview = TrainingAnalysisService.generateDataPreview(
      participants,
      sessionData.map((data, i) => ({ ...data, playerId: participants[i].id })),
      trainingPlans
    );
    
    setDataPreview(preview);
  }, [participants, getSessionsByPlayer, trainingPlans, analysisWindowDays]);

  // Cargar planes cuando cambien participantes
  useEffect(() => {
    if (academiaId && participants.length > 0) {
      TrainingAnalysisService.loadTrainingPlansWithAdaptation(academiaId, participants)
        .then(plans => {
          setTrainingPlans(plans);
          updateDataPreview();
        });
    }
  }, [academiaId, participants.map(p => p.id).join(',')]);

  // Actualizar preview cuando cambien los planes O la ventana de análisis
  useEffect(() => {
    if (Object.keys(trainingPlans).length > 0) {
      updateDataPreview();
    }
  }, [trainingPlans, updateDataPreview, analysisWindowDays]); // ✅ NUEVO: Re-calcular si cambia ventana

  // Re-generar cuando cambien los ejercicios de sesión actual
  useEffect(() => {
    if (recommendationsGenerated && currentSessionExercises.length > 0) {
      generateRecommendations();
    }
  }, [currentSessionExercises]);

  // ✅ NUEVO: Re-generar cuando cambie la configuración de ventana de análisis
  useEffect(() => {
    if (recommendationsGenerated && !loadingAnalysisConfig) {
      generateRecommendations();
    }
  }, [analysisWindowDays]); // Re-generar si cambia la ventana configurada

  // FASE 3: Log cuando cambien los jugadores bloqueados
  useEffect(() => {
    if (blockedPlayers.hasBlockedPlayers) {
      //console.warn('⚠️ Jugadores bloqueados:', blockedPlayers.players.map(p => p.playerName));
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
    
    // ✅ NUEVOS: Estados de configuración
    analysisWindowDays,
    loadingAnalysisConfig,
    
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