import { useState, useEffect, useMemo } from 'react';
import { TrainingSession, Player, LoggedExercise } from '../types';
import { TrainingPlan, getTrainingPlan } from '../Database/FirebaseTrainingPlans';
import { getSessions } from '../Database/FirebaseSessions';
import { NEW_EXERCISE_HIERARCHY_MAPPING } from '../constants';

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
  rangoAnalisis?: number; // días hacia atrás
}

export const usePlanningAnalysis = ({ 
  player, 
  academiaId, 
  rangoAnalisis = 30 
}: UsePlanningAnalysisProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [trainingPlan, setTrainingPlan] = useState<TrainingPlan | null>(null);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        // Cargar plan de entrenamiento
        const plan = await getTrainingPlan(academiaId, player.id);
        if (!plan) {
          setError('No se encontró un plan de entrenamiento para este jugador');
          return;
        }
        setTrainingPlan(plan);

        // Cargar sesiones de entrenamiento
        const allSessions = await getSessions(academiaId);
        
        // Filtrar sesiones del jugador en el rango de tiempo
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - rangoAnalisis);
        
        const playerSessions = allSessions.filter(session => {
          const sessionDate = new Date(session.fecha);
          return session.jugadorId === player.id && sessionDate >= fechaInicio;
        });
        
        setSessions(playerSessions);
      } catch (err) {
        console.error('Error cargando datos:', err);
        setError('Error al cargar los datos de análisis');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [player.id, academiaId, rangoAnalisis]);

  // Calcular estadísticas reales
  const realStats = useMemo(() => {
    if (!sessions.length) return {};

    const stats: Record<string, Record<string, Record<string, number>>> = {};
    let totalMinutes = 0;

    sessions.forEach(session => {
      session.ejercicios.forEach(ejercicio => {
        // Convertir tiempo a minutos
        const tiempo = parseFloat(ejercicio.tiempoCantidad.replace(/[^\d.]/g, '')) || 0;
        totalMinutes += tiempo;

        // Mapear a las claves de display
        const tipoKey = Object.keys(NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP).find(
          key => NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP[key] === ejercicio.tipo
        ) || ejercicio.tipo.toString();
        
        const areaKey = Object.keys(NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP).find(
          key => NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP[key] === ejercicio.area
        ) || ejercicio.area.toString();

        if (!stats[tipoKey]) stats[tipoKey] = {};
        if (!stats[tipoKey][areaKey]) stats[tipoKey][areaKey] = {};
        if (!stats[tipoKey][areaKey][ejercicio.ejercicio]) {
          stats[tipoKey][areaKey][ejercicio.ejercicio] = 0;
        }

        stats[tipoKey][areaKey][ejercicio.ejercicio] += tiempo;
      });
    });

    // Convertir a porcentajes
    const percentageStats: Record<string, Record<string, Record<string, number>>> = {};
    
    Object.keys(stats).forEach(tipo => {
      percentageStats[tipo] = {};
      Object.keys(stats[tipo]).forEach(area => {
        percentageStats[tipo][area] = {};
        Object.keys(stats[tipo][area]).forEach(ejercicio => {
          percentageStats[tipo][area][ejercicio] = 
            totalMinutes > 0 ? (stats[tipo][area][ejercicio] / totalMinutes) * 100 : 0;
        });
      });
    });

    return percentageStats;
  }, [sessions]);

  // Construir árbol de análisis
  const analysisTree = useMemo((): AnalysisNode[] => {
    if (!trainingPlan || !realStats) return [];

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
          esDistribucionLibre: !areaPlan.ejercicios, // Si no tiene ejercicios específicos, es distribución libre
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

    return tree;
  }, [trainingPlan, realStats]);

  return {
    loading,
    error,
    analysisTree,
    trainingPlan,
    sessions,
    rangoAnalisis
  };
};
