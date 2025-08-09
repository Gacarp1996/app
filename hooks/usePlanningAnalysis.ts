// hooks/usePlanningAnalysis.ts
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

// Variable de debug - cambiar a false para producción
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

  // Calcular estadísticas reales usando la función centralizada
  const realStats = useMemo(() => {
    if (!enabled || (!sessions.length && !currentSessionExercises.length)) {
      return {};
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
    const currentExercisesAsLogged = SessionService.sessionExercisesToLogged(currentSessionExercises, player.id);
    allExercises.push(...currentExercisesAsLogged);

    // ✅ USAR FUNCIÓN CENTRALIZADA
    const stats = calculateExerciseStatsByTime(allExercises);
    
    // Convertir a formato esperado por el componente
    const percentageStats: Record<string, Record<string, Record<string, number>>> = {};
    
    Object.keys(stats.typeStats).forEach(tipo => {
      percentageStats[tipo] = {};
      Object.keys(stats.typeStats[tipo].areas).forEach(area => {
        percentageStats[tipo][area] = {};
        Object.keys(stats.typeStats[tipo].areas[area].exercises).forEach(ejercicio => {
          // Usar porcentaje ya calculado
          const tiempo = stats.typeStats[tipo].areas[area].exercises[ejercicio];
          percentageStats[tipo][area][ejercicio] = (tiempo / stats.totalMinutes) * 100;
        });
      });
    });

    if (DEBUG_MODE && stats.totalMinutes > 0) {
      console.log(`📊 [PLANNING] Stats calculadas para ${player.name}: ${sessions.length} sesiones, ${stats.totalMinutes.toFixed(0)} min totales`);
    }

    return percentageStats;
  }, [sessions, currentSessionExercises, enabled, player.id, player.name]);

  // Construir árbol de análisis
  const analysisTree = useMemo((): AnalysisNode[] => {
    if (!enabled || !trainingPlan || !realStats) {
      return [];
    }

    const tree: AnalysisNode[] = [];

    Object.keys(trainingPlan.planificacion).forEach(tipoKey => {
      const tipoPlan = trainingPlan.planificacion[tipoKey];
      const tipoReal = realStats[tipoKey] || {};
      
      // Calcular total realizado para este tipo
      let tipoRealizadoTotal = 0;
      Object.keys(tipoReal).forEach(areaKey => {
        Object.values(tipoReal[areaKey]).forEach(ejercicioValue => {
          tipoRealizadoTotal += ejercicioValue;
        });
      });

      const tipoNode: AnalysisNode = {
        name: tipoKey,
        planificado: tipoPlan.porcentajeTotal,
        realizado: tipoRealizadoTotal,
        diferencia: tipoPlan.porcentajeTotal - tipoRealizadoTotal,
        children: []
      };

      // Construir nodos de área
      Object.keys(tipoPlan.areas).forEach(areaKey => {
        const areaPlan = tipoPlan.areas[areaKey];
        const areaReal = tipoReal[areaKey] || {};
        
        // Calcular total realizado para esta área
        let areaRealizadaTotal = 0;
        Object.values(areaReal).forEach(ejercicioValue => {
          areaRealizadaTotal += ejercicioValue;
        });

        const areaNode: AnalysisNode = {
          name: areaKey,
          planificado: areaPlan.porcentajeDelTotal,
          realizado: areaRealizadaTotal,
          diferencia: areaPlan.porcentajeDelTotal - areaRealizadaTotal,
          esDistribucionLibre: !areaPlan.ejercicios,
          children: []
        };

        // Si hay ejercicios específicos planificados, agregarlos
        if (areaPlan.ejercicios) {
          Object.keys(areaPlan.ejercicios).forEach(ejercicioName => {
            const ejercicioPlan = areaPlan.ejercicios![ejercicioName];
            const ejercicioReal = areaReal[ejercicioName] || 0;

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

      tree.push(tipoNode);
    });

    if (DEBUG_MODE) {
      console.log(`🌳 [PLANNING] Árbol de análisis construido para ${player.name}`);
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