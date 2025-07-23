import { useState, useEffect, useMemo } from 'react';
import { TrainingSession, Player, LoggedExercise } from '../types';
import { TrainingPlan, getTrainingPlan } from '../Database/FirebaseTrainingPlans';
import { getSessions } from '../Database/FirebaseSessions';
import { NEW_EXERCISE_HIERARCHY_MAPPING } from '../constants';
import { SessionExercise } from '../contexts/TrainingContext';

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
  const [sessions, setSessions] = useState<TrainingSession[]>([]);

  // DEBUG: Log cuando cambian los ejercicios actuales
  useEffect(() => {
    console.log('🔄 [PLANNING] Ejercicios actuales cambiaron:', {
      playerId: player.id,
      playerName: player.name,
      totalExercises: currentSessionExercises.length,
      playerExercises: currentSessionExercises.filter(ex => ex.loggedForPlayerId === player.id),
      enabled
    });
  }, [currentSessionExercises, player.id, enabled]);

  // Solo cargar datos cuando esté habilitado
  useEffect(() => {
    if (!enabled) {
      console.log('🚫 [PLANNING] Hook deshabilitado para', player.name);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        console.log('📋 [PLANNING] Cargando plan para', player.name);

        // Cargar plan de entrenamiento
        const plan = await getTrainingPlan(academiaId, player.id);
        console.log('📋 [PLANNING] Plan cargado:', plan);
        
        if (!plan) {
          setError('No se encontró un plan de entrenamiento para este jugador');
          console.log('❌ [PLANNING] No hay plan para', player.name);
          return;
        }
        setTrainingPlan(plan);

        // Cargar sesiones de entrenamiento
        const allSessions = await getSessions(academiaId);
        console.log('📚 [PLANNING] Total sesiones academia:', allSessions.length);
        
        // Filtrar sesiones del jugador en el rango de tiempo
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - rangoAnalisis);
        
        const playerSessions = allSessions.filter(session => {
          const sessionDate = new Date(session.fecha);
          const isPlayerMatch = session.jugadorId === player.id;
          const isInRange = sessionDate >= fechaInicio;
          
          if (isPlayerMatch) {
            console.log('📊 [PLANNING] Sesión del jugador:', {
              fecha: session.fecha,
              ejercicios: session.ejercicios.length,
              enRango: isInRange
            });
          }
          
          return isPlayerMatch && isInRange;
        });
        
        console.log('✅ [PLANNING] Sesiones filtradas para', player.name, ':', playerSessions.length);
        setSessions(playerSessions);
      } catch (err) {
        console.error('❌ [PLANNING] Error cargando datos:', err);
        setError('Error al cargar los datos de análisis');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [player.id, academiaId, rangoAnalisis, enabled]);

  // Convertir ejercicios de sesión actual a formato compatible
  const currentSessionAsLoggedExercises = useMemo((): LoggedExercise[] => {
    const playerCurrentExercises = currentSessionExercises
      .filter(ex => ex.loggedForPlayerId === player.id)
      .map(ex => ({
        id: ex.id,
        tipo: ex.tipo,
        area: ex.area,
        ejercicio: ex.ejercicio,
        ejercicioEspecifico: ex.ejercicioEspecifico,
        tiempoCantidad: ex.tiempoCantidad,
        intensidad: ex.intensidad
      }));
    
    console.log('🔄 [PLANNING] Ejercicios actuales convertidos:', {
      player: player.name,
      total: playerCurrentExercises.length,
      exercises: playerCurrentExercises.map(ex => ({
        tipo: ex.tipo,
        area: ex.area,
        ejercicio: ex.ejercicio,
        tiempo: ex.tiempoCantidad
      }))
    });
    
    return playerCurrentExercises;
  }, [currentSessionExercises, player.id]);

  // Calcular estadísticas reales incluyendo sesión actual
  const realStats = useMemo(() => {
    if (!enabled || (!sessions.length && !currentSessionAsLoggedExercises.length)) {
      console.log('📊 [PLANNING] Sin datos para calcular stats:', {
        enabled,
        sessionsLength: sessions.length,
        currentExercisesLength: currentSessionAsLoggedExercises.length
      });
      return {};
    }

    console.log('🧮 [PLANNING] Calculando estadísticas para', player.name);

    const stats: Record<string, Record<string, Record<string, number>>> = {};
    let totalMinutes = 0;

    // Procesar sesiones guardadas
    sessions.forEach((session, sessionIndex) => {
      console.log(`📋 [PLANNING] Procesando sesión ${sessionIndex + 1}:`, {
        fecha: session.fecha,
        ejercicios: session.ejercicios.length
      });

      session.ejercicios.forEach((ejercicio, exerciseIndex) => {
        const tiempo = parseFloat(ejercicio.tiempoCantidad.replace(/[^\d.]/g, '')) || 0;
        totalMinutes += tiempo;

        console.log(`🏃 [PLANNING] Ejercicio histórico ${exerciseIndex + 1}:`, {
          tipo: ejercicio.tipo,
          area: ejercicio.area,
          ejercicio: ejercicio.ejercicio,
          tiempo: tiempo
        });

        const tipoKey = Object.keys(NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP).find(
          key => NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP[key] === ejercicio.tipo
        ) || ejercicio.tipo.toString();
        
        const areaKey = Object.keys(NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP).find(
          key => NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP[key] === ejercicio.area
        ) || ejercicio.area.toString();

        console.log(`🔄 [PLANNING] Mapeo histórico:`, {
          tipoOriginal: ejercicio.tipo,
          tipoMapeado: tipoKey,
          areaOriginal: ejercicio.area,
          areaMapeada: areaKey
        });

        if (!stats[tipoKey]) stats[tipoKey] = {};
        if (!stats[tipoKey][areaKey]) stats[tipoKey][areaKey] = {};
        if (!stats[tipoKey][areaKey][ejercicio.ejercicio]) {
          stats[tipoKey][areaKey][ejercicio.ejercicio] = 0;
        }

        stats[tipoKey][areaKey][ejercicio.ejercicio] += tiempo;
      });
    });

    // NUEVO: Procesar ejercicios de la sesión actual
    console.log('🔥 [PLANNING] Procesando ejercicios de sesión actual:', currentSessionAsLoggedExercises.length);
    
    currentSessionAsLoggedExercises.forEach((ejercicio, exerciseIndex) => {
      const tiempo = parseFloat(ejercicio.tiempoCantidad.replace(/[^\d.]/g, '')) || 0;
      totalMinutes += tiempo;

      console.log(`🏃 [PLANNING] Ejercicio actual ${exerciseIndex + 1}:`, {
        tipo: ejercicio.tipo,
        area: ejercicio.area,
        ejercicio: ejercicio.ejercicio,
        tiempo: tiempo
      });

      const tipoKey = Object.keys(NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP).find(
        key => NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP[key] === ejercicio.tipo
      ) || ejercicio.tipo.toString();
      
      const areaKey = Object.keys(NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP).find(
        key => NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP[key] === ejercicio.area
      ) || ejercicio.area.toString();

      console.log(`🔄 [PLANNING] Mapeo actual:`, {
        tipoOriginal: ejercicio.tipo,
        tipoMapeado: tipoKey,
        areaOriginal: ejercicio.area,
        areaMapeada: areaKey
      });

      if (!stats[tipoKey]) stats[tipoKey] = {};
      if (!stats[tipoKey][areaKey]) stats[tipoKey][areaKey] = {};
      if (!stats[tipoKey][areaKey][ejercicio.ejercicio]) {
        stats[tipoKey][areaKey][ejercicio.ejercicio] = 0;
      }

      stats[tipoKey][areaKey][ejercicio.ejercicio] += tiempo;
    });

    console.log('⏱️ [PLANNING] Total minutos calculados:', totalMinutes);
    console.log('📈 [PLANNING] Stats en minutos:', stats);

    // Convertir a porcentajes
    const percentageStats: Record<string, Record<string, Record<string, number>>> = {};
    
    Object.keys(stats).forEach(tipo => {
      percentageStats[tipo] = {};
      Object.keys(stats[tipo]).forEach(area => {
        percentageStats[tipo][area] = {};
        Object.keys(stats[tipo][area]).forEach(ejercicio => {
          const percentage = totalMinutes > 0 ? (stats[tipo][area][ejercicio] / totalMinutes) * 100 : 0;
          percentageStats[tipo][area][ejercicio] = percentage;
          
          console.log(`📊 [PLANNING] ${tipo}/${area}/${ejercicio}: ${stats[tipo][area][ejercicio]}min = ${percentage.toFixed(1)}%`);
        });
      });
    });

    console.log('💯 [PLANNING] Stats finales en porcentajes:', percentageStats);
    return percentageStats;
  }, [sessions, currentSessionAsLoggedExercises, enabled, player.name]);

  // Construir árbol de análisis
  const analysisTree = useMemo((): AnalysisNode[] => {
    if (!enabled || !trainingPlan || !realStats) {
      console.log('🚫 [PLANNING] No se puede construir árbol:', {
        enabled,
        hasPlan: !!trainingPlan,
        hasStats: !!realStats && Object.keys(realStats).length > 0
      });
      return [];
    }

    console.log('🌳 [PLANNING] Construyendo árbol de análisis para', player.name);
    console.log('📋 [PLANNING] Plan de entrenamiento:', trainingPlan.planificacion);
    console.log('📊 [PLANNING] Stats reales:', realStats);

    const tree: AnalysisNode[] = [];

    Object.keys(trainingPlan.planificacion).forEach(tipoKey => {
      const tipoPlan = trainingPlan.planificacion[tipoKey];
      const tipoReal = realStats[tipoKey] || {};
      
      console.log(`🏗️ [PLANNING] Procesando tipo: ${tipoKey}`);
      console.log(`📋 [PLANNING] Plan del tipo:`, tipoPlan);
      console.log(`📊 [PLANNING] Real del tipo:`, tipoReal);
      
      // Calcular total realizado para este tipo
      let tipoRealizadoTotal = 0;
      Object.keys(tipoReal).forEach(areaKey => {
        Object.values(tipoReal[areaKey]).forEach(ejercicioValue => {
          tipoRealizadoTotal += ejercicioValue;
        });
      });

      console.log(`📈 [PLANNING] ${tipoKey}: Planificado ${tipoPlan.porcentajeTotal}% vs Realizado ${tipoRealizadoTotal.toFixed(1)}%`);

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
        
        console.log(`🏗️ [PLANNING] Procesando área: ${areaKey}`);
        
        // Calcular total realizado para esta área
        let areaRealizadaTotal = 0;
        Object.values(areaReal).forEach(ejercicioValue => {
          areaRealizadaTotal += ejercicioValue;
        });

        console.log(`📈 [PLANNING] ${tipoKey}/${areaKey}: Planificado ${areaPlan.porcentajeDelTotal}% vs Realizado ${areaRealizadaTotal.toFixed(1)}%`);

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

            console.log(`📈 [PLANNING] ${tipoKey}/${areaKey}/${ejercicioName}: Planificado ${ejercicioPlan.porcentajeDelTotal}% vs Realizado ${ejercicioReal.toFixed(1)}%`);

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

    console.log('🌳 [PLANNING] Árbol final construido:', tree);
    return tree;
  }, [trainingPlan, realStats, enabled, player.name]);

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