import React, { useEffect, useState } from 'react';
import { Player } from '../types';
import { getTrainingPlan, TrainingPlan } from '../Database/FirebaseTrainingPlans';
import { getSessions } from '../Database/FirebaseSessions';
import { useAcademia } from '../contexts/AcademiaContext';
import PlanningAccordion from './PlanningAccordion';
import { NEW_EXERCISE_HIERARCHY_MAPPING } from '../constants';

interface PlayerRecommendation {
  player: Player;
  hasValidPlan: boolean;
  mainRecommendation: string;
  mainDifference: number;
  statusIcon: string;
  statusColor: string;
}

const TrainingRecommendationsInline: React.FC<{ players: Player[] }> = ({ players }) => {
  const { academiaActual } = useAcademia();
  const [recommendations, setRecommendations] = useState<PlayerRecommendation[]>([]);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (academiaActual && players.length > 0) {
      loadRecommendations();
    } else {
      setLoading(false);
    }
  }, [academiaActual, players]);

  const loadRecommendations = async () => {
    if (!academiaActual) return;
    setLoading(true);
    
    const playerRecommendations: PlayerRecommendation[] = [];
    
    for (const player of players) {
      try {
        const plan = await getTrainingPlan(academiaActual.id, player.id);
        
        if (plan && plan.planificacion) {
          const tienePorcentajes = Object.values(plan.planificacion).some(t => t && t.porcentajeTotal > 0);
          
          if (tienePorcentajes) {
            const sessions = await getSessions(academiaActual.id);
            const playerSessions = sessions.filter(s => s.jugadorId === player.id);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - (plan.rangoAnalisis || 30));
            const recentSessions = playerSessions.filter(s => new Date(s.fecha) >= cutoffDate);
            
            if (recentSessions.length > 0) {
              // Calcular el análisis
              const analysis = await calculateMainRecommendation(plan, recentSessions);
              playerRecommendations.push({
                player,
                hasValidPlan: true,
                ...analysis
              });
            } else {
              playerRecommendations.push({
                player,
                hasValidPlan: false,
                mainRecommendation: 'Sin sesiones recientes',
                mainDifference: 0,
                statusIcon: '❓',
                statusColor: 'text-gray-400'
              });
            }
          } else {
            playerRecommendations.push({
              player,
              hasValidPlan: false,
              mainRecommendation: 'Plan sin configurar',
              mainDifference: 0,
              statusIcon: '⚠️',
              statusColor: 'text-yellow-400'
            });
          }
        } else {
          playerRecommendations.push({
            player,
            hasValidPlan: false,
            mainRecommendation: 'Sin plan de entrenamiento',
            mainDifference: 0,
            statusIcon: '❌',
            statusColor: 'text-red-400'
          });
        }
      } catch (error) {
        console.error(`Error cargando recomendación para ${player.name}:`, error);
        playerRecommendations.push({
          player,
          hasValidPlan: false,
          mainRecommendation: 'Error al cargar datos',
          mainDifference: 0,
          statusIcon: '⚠️',
          statusColor: 'text-red-400'
        });
      }
    }
    
    setRecommendations(playerRecommendations);
    setLoading(false);
  };

  const calculateMainRecommendation = async (plan: TrainingPlan, sessions: any[]): Promise<{
    mainRecommendation: string;
    mainDifference: number;
    statusIcon: string;
    statusColor: string;
  }> => {
    let totalMinutes = 0;
    const exerciseMinutes: Record<string, Record<string, Record<string, number>>> = {};
    
    // Calcular minutos por ejercicio (misma lógica que PlanningAccordion)
    sessions.forEach(session => {
      session.ejercicios.forEach((ex: any) => {
        const minutes = parseTimeToMinutes(ex.tiempoCantidad);
        totalMinutes += minutes;
        
        const tipoKey = Object.entries(NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP).find(([_, value]) => value === ex.tipo)?.[0] || ex.tipo;
        const areaKey = Object.entries(NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP).find(([_, value]) => value === ex.area)?.[0] || ex.area;
        
        if (!exerciseMinutes[tipoKey]) exerciseMinutes[tipoKey] = {};
        if (!exerciseMinutes[tipoKey][areaKey]) exerciseMinutes[tipoKey][areaKey] = {};
        if (!exerciseMinutes[tipoKey][areaKey][ex.ejercicio]) exerciseMinutes[tipoKey][areaKey][ex.ejercicio] = 0;
        
        exerciseMinutes[tipoKey][areaKey][ex.ejercicio] += minutes;
      });
    });
    
    if (totalMinutes === 0) {
      return {
        mainRecommendation: 'Sin entrenamientos registrados',
        mainDifference: 0,
        statusIcon: '❓',
        statusColor: 'text-gray-400'
      };
    }
    
    // Encontrar el mayor desequilibrio
    let maxDifference = 0;
    let maxDifferenceInfo = {
      name: '',
      difference: 0,
      isPositive: true
    };
    
    // Analizar tipos
    Object.entries(plan.planificacion || {}).forEach(([tipo, tipoConfig]) => {
      if (!tipoConfig || tipoConfig.porcentajeTotal === 0) return;
      
      const tipoRealizado = Object.values(exerciseMinutes[tipo] || {}).reduce((sum, areas) => 
        sum + Object.values(areas).reduce((areaSum, mins) => areaSum + mins, 0), 0
      ) / totalMinutes * 100;
      
      const diferencia = tipoConfig.porcentajeTotal - tipoRealizado;
      
      if (Math.abs(diferencia) > Math.abs(maxDifference) && Math.abs(diferencia) > 5) {
        maxDifference = diferencia;
        maxDifferenceInfo = {
          name: tipo,
          difference: diferencia,
          isPositive: diferencia > 0
        };
      }
      
      // Analizar áreas dentro del tipo
      Object.entries(tipoConfig.areas || {}).forEach(([area, areaConfig]) => {
        if (!areaConfig || areaConfig.porcentajeDelTotal === 0) return;
        
        const areaRealizado = Object.values(exerciseMinutes[tipo]?.[area] || {}).reduce((sum, mins) => sum + mins, 0) / totalMinutes * 100;
        const areaDiferencia = areaConfig.porcentajeDelTotal - areaRealizado;
        
        if (Math.abs(areaDiferencia) > Math.abs(maxDifference) && Math.abs(areaDiferencia) > 5) {
          maxDifference = areaDiferencia;
          maxDifferenceInfo = {
            name: area,
            difference: areaDiferencia,
            isPositive: areaDiferencia > 0
          };
        }
      });
    });
    
    // Generar recomendación
    let recommendation = '';
    let statusIcon = '✅';
    let statusColor = 'text-green-400';
    
    if (Math.abs(maxDifference) <= 5) {
      recommendation = 'Plan equilibrado';
    } else {
      if (maxDifferenceInfo.isPositive) {
        recommendation = `Trabajar más ${maxDifferenceInfo.name}`;
        statusIcon = '🔻';
        statusColor = 'text-red-400';
      } else {
        recommendation = `Reducir ${maxDifferenceInfo.name}`;
        statusIcon = '🔺';
        statusColor = 'text-orange-400';
      }
    }
    
    return {
      mainRecommendation: recommendation,
      mainDifference: maxDifference,
      statusIcon,
      statusColor
    };
  };

  const parseTimeToMinutes = (tiempoCantidad: string): number => {
    const cleanTime = tiempoCantidad.trim().toLowerCase();
    const pureNumber = parseFloat(cleanTime);
    if (!isNaN(pureNumber) && cleanTime === pureNumber.toString()) {
      return pureNumber;
    }
    const minuteMatch = cleanTime.match(/(\d+\.?\d*)\s*(m|min|mins|minuto|minutos)/);
    if (minuteMatch) {
      return parseFloat(minuteMatch[1]);
    }
    const hourMatch = cleanTime.match(/(\d+\.?\d*)\s*(h|hr|hrs|hora|horas)/);
    if (hourMatch) {
      return parseFloat(hourMatch[1]) * 60;
    }
    return 0;
  };

  const toggleExpanded = (playerId: string) => {
    setExpandedPlayerId(expandedPlayerId === playerId ? null : playerId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {recommendations.map(({ player, hasValidPlan, mainRecommendation, mainDifference, statusIcon, statusColor }) => (
        <div key={player.id} className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 shadow-lg overflow-hidden">
          <div 
            className={`p-4 sm:p-5 lg:p-6 ${expandedPlayerId === player.id ? 'border-b border-gray-700' : ''}`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Info del jugador y recomendación */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white text-lg mb-1">{player.name}</h4>
                <div className="flex items-center gap-2 text-sm lg:text-base">
                  {/* Ícono indicador */}
                  <span className="text-xl">{statusIcon}</span>
                  {/* Recomendación principal */}
                  <span className="text-gray-300">{mainRecommendation}</span>
                  {/* Badge con porcentaje */}
                  {Math.abs(mainDifference) > 5 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      Math.abs(mainDifference) <= 5 ? 'bg-green-500/20 text-green-300' :
                      mainDifference > 0 ? 'bg-red-500/20 text-red-300' : 
                      'bg-orange-500/20 text-orange-300'
                    }`}>
                      {mainDifference > 0 ? '+' : ''}{mainDifference.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              
              {/* Botón para ver análisis completo */}
              {hasValidPlan && (
                <button
                  onClick={() => toggleExpanded(player.id)}
                  className="px-3 py-1.5 lg:px-4 lg:py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm lg:text-base rounded-lg transition-all flex items-center gap-1 font-medium"
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${expandedPlayerId === player.id ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className="hidden sm:inline">
                    {expandedPlayerId === player.id ? 'Ocultar' : 'Ver'} análisis
                  </span>
                  <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Análisis expandible */}
          {expandedPlayerId === player.id && academiaActual && (
            <div className="p-4 sm:p-6 bg-gray-800/30 animate-in slide-in-from-top duration-300">
              <PlanningAccordion 
                player={player} 
                academiaId={academiaActual.id} 
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TrainingRecommendationsInline;