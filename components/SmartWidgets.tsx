import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Player, TrainingSession, Objective, PostTrainingSurvey } from '../types';
import { getPlayerSurveys } from '../Database/FirebaseSurveys';
import { getTrainingPlan } from '../Database/FirebaseTrainingPlans';

interface WidgetProps {
  academiaId: string;
  players: Player[];
  sessions: TrainingSession[];
  objectives: Objective[];
  onDataChange: () => void;
}

// Widget 1: Jugadores sin actualizaciones recientes
export const PlayersWithoutRecentUpdates: React.FC<WidgetProps> = ({ 
  academiaId, 
  players, 
  sessions
}) => {
  const [inactivePlayers, setInactivePlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const DAYS_THRESHOLD = 7;

  useEffect(() => {
    const checkInactivePlayers = async () => {
      setLoading(true);
      const now = new Date();
      const thresholdDate = new Date(now.getTime() - DAYS_THRESHOLD * 24 * 60 * 60 * 1000);
      
      const inactive: Player[] = [];
      
      for (const player of players.filter(p => p.estado === 'activo')) {
        // Verificar sesiones recientes
        const recentSessions = sessions.filter(s => 
          s.jugadorId === player.id && 
          new Date(s.fecha) > thresholdDate
        );
        
        // Verificar encuestas recientes
        let recentSurveys: PostTrainingSurvey[] = [];
        try {
          recentSurveys = await getPlayerSurveys(academiaId, player.id, thresholdDate);
        } catch (error) {
          console.error('Error checking surveys:', error);
        }
        
        // Verificar plan de entrenamiento actualizado
        let hasRecentPlan = false;
        try {
          const plan = await getTrainingPlan(academiaId, player.id);
          if (plan && plan.fechaActualizacion) {
            hasRecentPlan = new Date(plan.fechaActualizacion) > thresholdDate;
          }
        } catch (error) {
          console.error('Error checking training plan:', error);
        }
        
        if (recentSessions.length === 0 && recentSurveys.length === 0 && !hasRecentPlan) {
          inactive.push(player);
        }
      }
      
      setInactivePlayers(inactive);
      setLoading(false);
    };

    checkInactivePlayers();
  }, [academiaId, players, sessions]);

  if (loading) return null;
  if (inactivePlayers.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-[1px] rounded-xl shadow-lg">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-yellow-400 flex items-center gap-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Sin actividad reciente
          </h3>
          <span className="text-sm text-gray-400">{DAYS_THRESHOLD} días</span>
        </div>
        <div className="space-y-2">
          {inactivePlayers.map(player => (
            <Link 
              key={player.id} 
              to={`/player/${player.id}`}
              className="block p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-all duration-200 border border-gray-700 hover:border-yellow-500/50"
            >
              <div className="flex justify-between items-center">
                <span className="text-white font-medium">{player.name}</span>
                <span className="text-xs text-gray-400">Ver perfil →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

// Widget 2: Jugadores sin planificación
export const PlayersWithoutPlan: React.FC<WidgetProps> = ({ 
  academiaId, 
  players, 
  objectives 
}) => {
  const [playersNeedingPlan, setPlayersNeedingPlan] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPlans = async () => {
      setLoading(true);
      const needsPlan: Player[] = [];
      
      for (const player of players.filter(p => p.estado === 'activo')) {
        // Por defecto, si no está definido, asumimos que SÍ requiere planificación
        const requiresPlan = player.requierePlanificacion !== false;
        
        if (requiresPlan) {
          // Verificar si tiene objetivos activos
          const activeObjectives = objectives.filter(o => 
            o.jugadorId === player.id && 
            o.estado === 'actual-progreso'
          );
          
          // Verificar si tiene plan de entrenamiento
          let hasPlan = false;
          try {
            const plan = await getTrainingPlan(academiaId, player.id);
            hasPlan = !!(plan && plan.planificacion && Object.keys(plan.planificacion).length > 0);
          } catch (error) {
            console.error('Error checking plan:', error);
          }
          
          if (activeObjectives.length === 0 && !hasPlan) {
            needsPlan.push(player);
          }
        }
      }
      
      setPlayersNeedingPlan(needsPlan);
      setLoading(false);
    };

    checkPlans();
  }, [academiaId, players, objectives]);

  if (loading) return null;
  if (playersNeedingPlan.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-[1px] rounded-xl shadow-lg">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-blue-400 flex items-center gap-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Sin planificación
          </h3>
        </div>
        <div className="space-y-2">
          {playersNeedingPlan.map(player => (
            <div 
              key={player.id} 
              className="flex justify-between items-center p-3 bg-gray-800/50 rounded-lg border border-gray-700"
            >
              <span className="text-white font-medium">{player.name}</span>
              <div className="flex gap-2">
                <Link 
                  to={`/player/${player.id}/edit-objectives`}
                  className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-all duration-200 border border-blue-500/30"
                >
                  + Objetivos
                </Link>
                <Link 
                  to={`/player/${player.id}#planificacion`}
                  className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-medium transition-all duration-200 border border-purple-500/30"
                >
                  + Plan
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Widget 3: Desvío entre planificación y ejecución
export const PlanDeviationWidget: React.FC<WidgetProps> = ({ 
  academiaId, 
  players, 
  sessions 
}) => {
  const [deviations, setDeviations] = useState<{
    player: Player;
    compliance: number;
    missingAreas: string[];
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const DEVIATION_THRESHOLD = 60; // Mostrar si cumplimiento < 60%

  useEffect(() => {
    const analyzeDeviations = async () => {
      setLoading(true);
      const deviatedPlayers: typeof deviations = [];
      
      for (const player of players.filter(p => p.estado === 'activo')) {
        try {
          const plan = await getTrainingPlan(academiaId, player.id);
          if (!plan || !plan.planificacion) continue;
          
          // Analizar sesiones de los últimos días según el rango del plan
          const daysToAnalyze = plan.rangoAnalisis || 30;
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - daysToAnalyze);
          
          const playerSessions = sessions.filter(s => 
            s.jugadorId === player.id && 
            new Date(s.fecha) >= startDate
          );
          
          if (playerSessions.length === 0) continue;
          
          // Calcular tiempo real por tipo/área
          const realTime: Record<string, Record<string, number>> = {};
          let totalRealTime = 0;
          
          playerSessions.forEach(session => {
            session.ejercicios.forEach(ex => {
              const tipo = ex.tipo.toString();
              const area = ex.area.toString();
              
              if (!realTime[tipo]) realTime[tipo] = {};
              if (!realTime[tipo][area]) realTime[tipo][area] = 0;
              
              const minutes = parseInt(ex.tiempoCantidad) || 0;
              realTime[tipo][area] += minutes;
              totalRealTime += minutes;
            });
          });
          
          // Comparar con plan
          let totalCompliance = 0;
          let complianceCount = 0;
          const missingAreas: Set<string> = new Set();
          
          Object.entries(plan.planificacion).forEach(([tipo, tipoData]) => {
            if (tipoData.porcentajeTotal > 0) {
              const plannedPercentage = tipoData.porcentajeTotal;
              const realPercentage = totalRealTime > 0 
                ? ((realTime[tipo] ? Object.values(realTime[tipo]).reduce((a, b) => a + b, 0) : 0) / totalRealTime) * 100
                : 0;
              
              const tipoCompliance = Math.min((realPercentage / plannedPercentage) * 100, 100);
              totalCompliance += tipoCompliance;
              complianceCount++;
              
              // Verificar áreas faltantes
              Object.entries(tipoData.areas || {}).forEach(([area, areaData]) => {
                if (areaData.porcentajeDelTotal > 0) {
                  const hasActivity = realTime[tipo]?.[area] > 0;
                  if (!hasActivity) {
                    missingAreas.add(`${tipo} - ${area}`);
                  }
                }
              });
            }
          });
          
          const avgCompliance = complianceCount > 0 ? totalCompliance / complianceCount : 0;
          
          if (avgCompliance < DEVIATION_THRESHOLD && avgCompliance > 0) {
            deviatedPlayers.push({
              player,
              compliance: Math.round(avgCompliance),
              missingAreas: Array.from(missingAreas).slice(0, 3) // Máximo 3 áreas
            });
          }
        } catch (error) {
          console.error('Error analyzing deviation:', error);
        }
      }
      
      setDeviations(deviatedPlayers.sort((a, b) => a.compliance - b.compliance));
      setLoading(false);
    };

    analyzeDeviations();
  }, [academiaId, players, sessions]);

  if (loading) return null;
  if (deviations.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-red-500/10 to-pink-500/10 p-[1px] rounded-xl shadow-lg">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-red-400 flex items-center gap-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Desvío del plan
          </h3>
        </div>
        <div className="space-y-3">
          {deviations.map(({ player, compliance, missingAreas }) => (
            <Link 
              key={player.id}
              to={`/player/${player.id}#planificacion`}
              className="block p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-all duration-200 border border-gray-700 hover:border-red-500/50"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-white font-medium">{player.name}</span>
                <span className={`text-sm font-bold ${
                  compliance < 30 ? 'text-red-400' : compliance < 50 ? 'text-orange-400' : 'text-yellow-400'
                }`}>
                  {compliance}%
                </span>
              </div>
              {missingAreas.length > 0 && (
                <p className="text-xs text-gray-400">
                  Falta: {missingAreas.join(', ')}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

// Widget 4: Rendimiento subjetivo bajo
export const LowPerformanceWidget: React.FC<WidgetProps> = ({ 
  academiaId, 
  players 
}) => {
  const [lowPerformancePlayers, setLowPerformancePlayers] = useState<{
    player: Player;
    metrics: {
      energia?: number;
      concentracion?: number;
      actitud?: number;
      sensaciones?: number;
    };
    avgScore: number;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const PERFORMANCE_THRESHOLD = 3.5; // Mostrar si promedio < 3.5
  const DAYS_TO_CHECK = 7;

  useEffect(() => {
    const checkPerformance = async () => {
      setLoading(true);
      const lowPerformers: typeof lowPerformancePlayers = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - DAYS_TO_CHECK);
      
      for (const player of players.filter(p => p.estado === 'activo')) {
        try {
          const surveys = await getPlayerSurveys(academiaId, player.id, startDate);
          
          if (surveys.length > 0) {
            // Calcular promedios de las métricas
            const totals = surveys.reduce((acc, survey) => ({
              energia: acc.energia + survey.cansancioFisico,
              concentracion: acc.concentracion + survey.concentracion,
              actitud: acc.actitud + survey.actitudMental,
              sensaciones: acc.sensaciones + survey.sensacionesTenisticas,
            }), { energia: 0, concentracion: 0, actitud: 0, sensaciones: 0 });
            
            const count = surveys.length;
            const metrics = {
              energia: totals.energia / count,
              concentracion: totals.concentracion / count,
              actitud: totals.actitud / count,
              sensaciones: totals.sensaciones / count,
            };
            
            const avgScore = (metrics.energia + metrics.concentracion + metrics.actitud + metrics.sensaciones) / 4;
            
            if (avgScore < PERFORMANCE_THRESHOLD) {
              lowPerformers.push({
                player,
                metrics,
                avgScore
              });
            }
          }
        } catch (error) {
          console.error('Error checking performance:', error);
        }
      }
      
      setLowPerformancePlayers(lowPerformers.sort((a, b) => a.avgScore - b.avgScore));
      setLoading(false);
    };

    checkPerformance();
  }, [academiaId, players]);

  if (loading) return null;
  if (lowPerformancePlayers.length === 0) return null;

  const getMetricIcon = (value: number) => {
    if (value >= 4) return '🟢';
    if (value >= 3) return '🟡';
    if (value >= 2) return '🟠';
    return '🔴';
  };

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 p-[1px] rounded-xl shadow-lg">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-purple-400 flex items-center gap-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Rendimiento bajo
          </h3>
          <span className="text-sm text-gray-400">Últimos {DAYS_TO_CHECK} días</span>
        </div>
        <div className="space-y-3">
          {lowPerformancePlayers.map(({ player, metrics, avgScore }) => (
            <Link 
              key={player.id}
              to={`/player/${player.id}#trainings`}
              className="block p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-all duration-200 border border-gray-700 hover:border-purple-500/50"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-white font-medium">{player.name}</span>
                <span className="text-sm font-bold text-purple-400">
                  Ø {avgScore.toFixed(1)}/5
                </span>
              </div>
              <div className="flex gap-3 text-xs">
                <span title="Energía">{getMetricIcon(metrics.energia!)} E: {metrics.energia!.toFixed(1)}</span>
                <span title="Concentración">{getMetricIcon(metrics.concentracion!)} C: {metrics.concentracion!.toFixed(1)}</span>
                <span title="Actitud">{getMetricIcon(metrics.actitud!)} A: {metrics.actitud!.toFixed(1)}</span>
                <span title="Sensaciones">{getMetricIcon(metrics.sensaciones!)} S: {metrics.sensaciones!.toFixed(1)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

// Componente contenedor para todos los widgets
export const SmartWidgetsContainer: React.FC<WidgetProps> = (props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6 mb-8 lg:mb-12">
      <PlayersWithoutRecentUpdates {...props} />
      <PlayersWithoutPlan {...props} />
      <PlanDeviationWidget {...props} />
      <LowPerformanceWidget {...props} />
    </div>
  );
};