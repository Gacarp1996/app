// hooks/usePlanningAnalysis.ts - VERSIÓN CORREGIDA CON TIPOS

import { useState, useEffect, useMemo } from 'react';
import { TrainingSession, Player, LoggedExercise } from '../types/types';
import { TrainingPlan, getTrainingPlan } from '../Database/FirebaseTrainingPlans';
import { useSession } from '../contexts/SessionContext';
import { SessionExercise } from '../contexts/TrainingContext';
import { calculateExerciseStatsByTime } from '@/utils/calculations';
import { SessionService } from '@/services/sessionService';

export interface AnalysisNode {
  name: string;
  planificado: number;
  realizado: number;
  diferencia: number;
  esDistribucionLibre?: boolean;
  children?: AnalysisNode[];
}

interface UsePlanningAnalysisProps {
  player: Player;
  academiaId: string;
  rangoAnalisis?: number;
  currentSessionExercises?: SessionExercise[];
  enabled?: boolean;
}

// ✅ AGREGAR TIPO PARA LAS STATS
interface TypeStats {
  total: number;
  percentage: number;
  areas: Record<string, {
    total: number;
    percentage: number;
    percentageWithinType: number;
    exercises: Record<string, number>;
  }>;
}

const DEBUG_MODE = false;

export const usePlanningAnalysis = ({ 
  player, 
  academiaId, 
  rangoAnalisis = 30,
  currentSessionExercises = [],
  enabled = true
}: UsePlanningAnalysisProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan | null>(null);
  
  const { getSessionsByPlayer } = useSession();

  // Obtener sesiones del contexto
  const sessions = useMemo(() => {
    if (!enabled) return [];
    
    const fechaInicio = new Date();
    fechaInicio.setDate(fechaInicio.getDate() - rangoAnalisis);
    
    return getSessionsByPlayer(player.id, {
      start: fechaInicio,
      end: new Date()
    });
  }, [player.id, rangoAnalisis, enabled, getSessionsByPlayer]);

  // Solo cargar plan cuando esté habilitado
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        if (DEBUG_MODE) {
          console.log('📋 [PLANNING] Cargando plan para', player.name);
        }

        const plan = await getTrainingPlan(academiaId, player.id);
        
        if (!plan) {
          setError('No se encontró un plan de entrenamiento para este jugador');
          return;
        }
        setTrainingPlan(plan);
        
      } catch (err) {
        console.error('❌ [PLANNING] Error cargando datos:', err);
        setError('Error al cargar los datos de análisis');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [player.id, academiaId, enabled, player.name]);

  // ✅ CORREGIDO: Calcular estadísticas reales con tipo correcto
  const realStats = useMemo(() => {
    if (!enabled || (!sessions.length && !currentSessionExercises.length)) {
      return { 
        typeStats: {} as Record<string, TypeStats>, 
        totalMinutes: 0 
      };
    }

    // Recopilar todos los ejercicios
    const allExercises: LoggedExercise[] = [];
    
    // Ejercicios de sesiones guardadas
    sessions.forEach(session => {
      if (session.ejercicios && Array.isArray(session.ejercicios)) {
        allExercises.push(...session.ejercicios);
      }
    });
    
    // Ejercicios de la sesión actual
    const currentExercisesAsLogged = SessionService.sessionExercisesToLogged(
      currentSessionExercises, 
      player.id
    );
    allExercises.push(...currentExercisesAsLogged);

    // Usar función centralizada que YA CALCULA PORCENTAJES ABSOLUTOS
    const stats = calculateExerciseStatsByTime(allExercises);
    
    if (DEBUG_MODE && stats.totalMinutes > 0) {
      console.log(`📊 [PLANNING] Stats para ${player.name}:`, {
        totalMinutes: stats.totalMinutes,
        typeStats: stats.typeStats
      });
    }

    return {
      typeStats: stats.typeStats as Record<string, TypeStats>,
      totalMinutes: stats.totalMinutes
    };
  }, [sessions, currentSessionExercises, enabled, player.id, player.name]);

  // ✅ CORREGIDO: Construir árbol de análisis con cálculos correctos
  const analysisTree = useMemo((): AnalysisNode[] => {
    if (!enabled || !trainingPlan || !realStats.typeStats) {
      return [];
    }

    const tree: AnalysisNode[] = [];

    Object.keys(trainingPlan.planificacion).forEach(tipoKey => {
      const tipoPlan = trainingPlan.planificacion[tipoKey];
      
      // ✅ VERIFICAR QUE EXISTE ANTES DE ACCEDER
      const tipoStats = realStats.typeStats[tipoKey] as TypeStats | undefined;
      const tipoRealizadoTotal = tipoStats?.percentage || 0;

      const tipoNode: AnalysisNode = {
        name: tipoKey,
        planificado: tipoPlan.porcentajeTotal,
        realizado: tipoRealizadoTotal,
        diferencia: tipoPlan.porcentajeTotal - tipoRealizadoTotal,  // Plan - Real = positivo si falta
        children: []
      };

      if (DEBUG_MODE) {
        console.log(`📈 Tipo ${tipoKey}:`, {
          plan: tipoPlan.porcentajeTotal,
          real: tipoRealizadoTotal,
          diferencia: tipoNode.diferencia
        });
      }

      // Construir nodos de área
      if (tipoPlan.areas) {
        Object.keys(tipoPlan.areas).forEach(areaKey => {
          const areaPlan = tipoPlan.areas[areaKey];
          const areaStats = tipoStats?.areas?.[areaKey];
          
          // ✅ USAR EL PORCENTAJE ABSOLUTO YA CALCULADO
          const areaRealizadaTotal = areaStats?.percentage || 0;

          const areaNode: AnalysisNode = {
            name: areaKey,
            planificado: areaPlan.porcentajeDelTotal,
            realizado: areaRealizadaTotal,
            diferencia: areaPlan.porcentajeDelTotal - areaRealizadaTotal,  // Plan - Real
            esDistribucionLibre: !areaPlan.ejercicios || Object.keys(areaPlan.ejercicios).length === 0,
            children: []
          };

          if (DEBUG_MODE && areaRealizadaTotal > 0) {
            console.log(`  📊 Área ${areaKey}:`, {
              plan: areaPlan.porcentajeDelTotal,
              real: areaRealizadaTotal,
              diferencia: areaNode.diferencia
            });
          }

          // Si hay ejercicios específicos planificados, agregarlos
          if (areaPlan.ejercicios && Object.keys(areaPlan.ejercicios).length > 0) {
            Object.keys(areaPlan.ejercicios).forEach(ejercicioName => {
              const ejercicioPlan = areaPlan.ejercicios![ejercicioName];
              const ejercicioMinutes = areaStats?.exercises?.[ejercicioName] || 0;
              
              // ✅ Calcular porcentaje del ejercicio respecto al total
              const ejercicioReal = realStats.totalMinutes > 0 
                ? (ejercicioMinutes / realStats.totalMinutes) * 100 
                : 0;

              areaNode.children!.push({
                name: ejercicioName,
                planificado: ejercicioPlan.porcentajeDelTotal,
                realizado: ejercicioReal,
                diferencia: ejercicioPlan.porcentajeDelTotal - ejercicioReal
              });
            });
          }

          tipoNode.children!.push(areaNode);
        });
      }

      tree.push(tipoNode);
    });

    if (DEBUG_MODE) {
      console.log(`🌳 [PLANNING] Árbol final para ${player.name}:`, tree);
    }
    
    return tree;
  }, [trainingPlan, realStats, enabled, player.name]);

  // Convertir ejercicios de sesión actual para mostrar info
  const currentSessionAsLoggedExercises = useMemo((): LoggedExercise[] => {
    return SessionService.sessionExercisesToLogged(currentSessionExercises, player.id);
  }, [currentSessionExercises, player.id]);

  return {
    loading,
    error,
    analysisTree,
    trainingPlan,
    sessions,
    rangoAnalisis,
    hasCurrentSessionData: currentSessionAsLoggedExercises.length > 0,
    totalSessions: sessions.length + (currentSessionAsLoggedExercises.length > 0 ? 1 : 0)
  };
};