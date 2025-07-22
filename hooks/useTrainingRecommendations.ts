// src/hooks/useTrainingRecommendations.ts
import { useState, useCallback } from 'react';
import { Player, TrainingSession } from '../types';
import { getTrainingPlan } from '../Database/FirebaseTrainingPlans';
import { ConsolidatedRecommendation, generateRecommendationsForPlayers } from '@/utils/recomendations';


interface TrainingRecommendations {
  isNewPlayer: boolean;
  hasActivePlan: boolean;
  hasSessions: boolean;
  recommendations: ConsolidatedRecommendation[];
  summary: string;
  loading: boolean;
  error: string | null;
}

interface UseTrainingRecommendationsProps {
  players: Player[];
  sessions: TrainingSession[];
  academiaId: string;
  manualMode?: boolean;
}

/**
 * Hook coordinador para recomendaciones de entrenamiento
 * Se encarga de:
 * - Obtener datos (planes de Firebase)
 * - Coordinar la generación de recomendaciones
 * - Manejar estado y loading
 * - NO contiene lógica de negocio
 */
export const useTrainingRecommendations = ({
  players,
  sessions,
  academiaId,
  manualMode = false
}: UseTrainingRecommendationsProps) => {
  const [recommendations, setRecommendations] = useState<Record<string, TrainingRecommendations>>({});
  const [loading, setLoading] = useState(false);

  /**
   * Genera recomendaciones para los jugadores con ejercicios específicos
   */
  const generateRecommendationsWithExercises = useCallback(async (
    playerIds: string[], 
    exercises: any[]
  ) => {
    console.log('🚀 generateRecommendationsWithExercises llamado:', {
      playerIds,
      exercisesCount: exercises.length,
      exercises: exercises.map(ex => ({ 
        tipo: ex.tipo, 
        area: ex.area, 
        tiempo: ex.tiempoCantidad 
      }))
    });

    setLoading(true);

    try {
      // 1. Preparar datos de jugadores con sus planes
      const playersWithPlans = await Promise.all(
        playerIds.map(async (playerId) => {
          const player = players.find(p => p.id === playerId);
          if (!player) return null;

          const plan = await getTrainingPlan(academiaId, playerId);
          
          return {
            id: playerId,
            name: player.name,
            plan
          };
        })
      );

      // Filtrar nulls
      const validPlayers = playersWithPlans.filter(p => p !== null) as Array<{
        id: string;
        name: string;
        plan: any;
      }>;

      if (validPlayers.length === 0) {
        console.warn('No se encontraron jugadores válidos');
        return;
      }

      // 2. Generar recomendaciones usando la función pura
      const results = await generateRecommendationsForPlayers(
        validPlayers,
        exercises,
        {
          maxDeficitRecommendations: 2,
          minDifferenceThreshold: 5,
          debugMode: true // 🐛 DEBUG ACTIVADO - Cambiar a false en producción
        }
      );

      // 3. Actualizar estado con los resultados
      const newRecommendations: Record<string, TrainingRecommendations> = {};

      Object.entries(results).forEach(([playerId, result]) => {
        newRecommendations[playerId] = {
          isNewPlayer: false,
          hasActivePlan: !!validPlayers.find(p => p.id === playerId)?.plan,
          hasSessions: true,
          recommendations: result.recommendations,
          summary: result.summary,
          loading: false,
          error: null
        };
      });

      setRecommendations(newRecommendations);

    } catch (error) {
      console.error('Error generando recomendaciones:', error);
      
      // Establecer error para todos los jugadores
      const errorRecommendations: Record<string, TrainingRecommendations> = {};
      
      playerIds.forEach(playerId => {
        errorRecommendations[playerId] = {
          isNewPlayer: false,
          hasActivePlan: false,
          hasSessions: false,
          recommendations: [],
          summary: 'Error al generar recomendaciones',
          loading: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        };
      });
      
      setRecommendations(errorRecommendations);
      
    } finally {
      setLoading(false);
    }
  }, [players, academiaId]);

  /**
   * Limpia todas las recomendaciones
   */
  const clearRecommendations = useCallback(() => {
    console.log('🧹 Limpiando recomendaciones');
    setRecommendations({});
  }, []);

  /**
   * Placeholder para mantener compatibilidad con código existente
   * @deprecated Usar generateRecommendationsWithExercises en su lugar
   */
  const getRecommendationsForPlayers = useCallback(async (playerIds: string[]) => {
    console.warn('⚠️ getRecommendationsForPlayers está deprecado. Usar generateRecommendationsWithExercises');
  }, []);

  /**
   * Placeholder para mantener compatibilidad con código existente
   * @deprecated
   */
  const getRecommendationsForPlayer = useCallback(async () => {
    console.warn('⚠️ getRecommendationsForPlayer está deprecado');
    return {} as TrainingRecommendations;
  }, []);

  return {
    recommendations,
    loading,
    generateRecommendationsWithExercises,
    clearRecommendations,
    // Mantener para compatibilidad
    getRecommendationsForPlayer,
    getRecommendationsForPlayers,
    manualMode
  };
};