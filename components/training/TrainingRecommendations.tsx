import React, { useEffect, useState } from 'react';
import { Player } from '../../types/types';
import { getTrainingPlan } from '../../Database/FirebaseTrainingPlans';
import { useSession } from '../../contexts/SessionContext'; // ✅ USAR CONTEXTO
import { useAcademia } from '../../contexts/AcademiaContext';
import PlanningAccordion from '../PlanningAccordion';

interface TrainingRecommendationsProps {
  players: Player[];
}

const TrainingRecommendations: React.FC<TrainingRecommendationsProps> = ({ players }) => {
  const { academiaActual } = useAcademia();
  const { getSessionsByPlayer } = useSession(); // ✅ USAR CONTEXTO
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playersWithPlan, setPlayersWithPlan] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (academiaActual && players.length > 0) {
      checkPlayersPlans();
    }
  }, [academiaActual, players]);

  const checkPlayersPlans = async () => {
    if (!academiaActual) return;
    
    setLoading(true);
    const playersWithValidPlan = new Set<string>();
    
    for (const player of players) {
      try {
        const plan = await getTrainingPlan(academiaActual.id, player.id);
        if (plan && plan.planificacion) {
          // ✅ ACTUALIZADO: Verificación más flexible de planes
          const tienePorcentajes = Object.values(plan.planificacion).some(tipo => {
            // Aceptar si tiene porcentajeTotal
            if (tipo && tipo.porcentajeTotal > 0) return true;
            
            // O si tiene áreas con porcentajes definidos
            if (tipo?.areas) {
              return Object.values(tipo.areas).some(
                (area: any) => area.porcentajeDelTotal > 0
              );
            }
            return false;
          });
          
          if (tienePorcentajes) {
            // ✅ USAR FUNCIÓN DEL CONTEXTO
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - (plan.rangoAnalisis || 30));
            
            const recentSessions = getSessionsByPlayer(player.id, {
              start: cutoffDate,
              end: new Date()
            });
            
            if (recentSessions.length > 0) {
              playersWithValidPlan.add(player.id);
            }
          }
        }
      } catch (error) {
        console.error(`Error verificando plan de ${player.name}:`, error);
      }
    }
    
    setPlayersWithPlan(playersWithValidPlan);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
        <p className="mt-2 text-gray-400 text-sm">Verificando planificaciones...</p>
      </div>
    );
  }

  if (playersWithPlan.size === 0) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-green-400">
          📊 Análisis de Planificación
        </h3>
        <div className="bg-yellow-900/20 border border-yellow-800 p-4 rounded-lg">
          <p className="text-sm text-yellow-300">
            No hay análisis disponibles. Esto puede deberse a:
          </p>
          <ul className="list-disc list-inside text-sm text-yellow-400 mt-2">
            <li>No hay planes de entrenamiento configurados</li>
            <li>Los planes no tienen porcentajes asignados</li>
            <li>No hay sesiones registradas en el período de análisis</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-green-400">
        📊 Análisis de Planificación
      </h3>
      
      {/* Lista de jugadores con botones */}
      <div className="grid gap-3">
        {players.map(player => {
          const hasPlan = playersWithPlan.has(player.id);
          
          return (
            <div 
              key={player.id} 
              className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-white">{player.name}</span>
                {hasPlan && (
                  <span className="text-xs bg-green-900/30 text-green-300 px-2 py-0.5 rounded">
                    Plan activo
                  </span>
                )}
              </div>
              
              <button
                onClick={() => setSelectedPlayer(player)}
                disabled={!hasPlan}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all
                  ${hasPlan 
                    ? 'bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold shadow-lg shadow-green-500/25' 
                    : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {hasPlan ? '📊 Ver análisis' : 'Sin plan'}
              </button>
            </div>
          );
        })}
      </div>
      
      {/* Modal o vista expandida con el análisis */}
      {selectedPlayer && academiaActual && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-green-400">
                  {selectedPlayer.name} - Análisis de Planificación
                </h2>
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <PlanningAccordion 
                player={selectedPlayer} 
                academiaId={academiaActual.id} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingRecommendations;