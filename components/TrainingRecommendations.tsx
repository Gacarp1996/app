import React, { useEffect, useState } from 'react';
import { Player } from '../types';
import { getTrainingPlan } from '../Database/FirebaseTrainingPlans';
import { getSessions } from '../Database/FirebaseSessions';
import { useAcademia } from '../contexts/AcademiaContext';
import PlanningAccordion from './PlanningAccordion';
import Modal from './Modal'; // <<< IMPORTANTE: Importamos el Modal estándar

const TrainingRecommendations: React.FC<{ players: Player[] }> = ({ players }) => {
  const { academiaActual } = useAcademia();
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [playersWithPlan, setPlayersWithPlan] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (academiaActual && players.length > 0) {
      checkPlayersPlans();
    } else {
      setLoading(false);
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
          const tienePorcentajes = Object.values(plan.planificacion).some(t => t && t.porcentajeTotal > 0);
          if (tienePorcentajes) {
            const sessions = await getSessions(academiaActual.id);
            const playerSessions = sessions.filter(s => s.jugadorId === player.id);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - (plan.rangoAnalisis || 30));
            if (playerSessions.some(s => new Date(s.fecha) >= cutoffDate)) {
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
  
  const Card: React.FC<{ title: string; children: React.ReactNode, className?: string }> = ({ title, children, className }) => (
    <div className={`relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl ${className}`}>
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 h-full">
            <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">{title}</h3>
            {children}
        </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (playersWithPlan.size === 0) {
    return (
      <div className="relative bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-[1px] rounded-2xl">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6">
          <h3 className="text-xl font-bold text-yellow-300 mb-2">📊 No hay Análisis Disponibles</h3>
          <p className="text-sm text-yellow-200/80">
            Esto puede deberse a que ningún jugador tiene un plan de entrenamiento con porcentajes asignados y sesiones de entrenamiento recientes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card title="📊 Análisis de Planificación">
      <div className="space-y-3">
        {players.map(player => {
          const hasPlan = playersWithPlan.has(player.id);
          return (
            <div key={player.id} className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-3">
                <span className="font-medium text-white">{player.name}</span>
                {hasPlan && (
                  <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-semibold">
                    Plan Activo
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedPlayer(player)}
                disabled={!hasPlan}
                className="app-button btn-primary text-sm py-1.5 px-3 disabled:bg-gray-700 disabled:shadow-none disabled:text-gray-500"
              >
                {hasPlan ? 'Ver análisis' : 'Sin datos'}
              </button>
            </div>
          );
        })}
      </div>
      
      {/* USO DEL MODAL ESTÁNDAR */}
      <Modal 
        isOpen={!!selectedPlayer} 
        onClose={() => setSelectedPlayer(null)}
        title={selectedPlayer ? `Análisis de: ${selectedPlayer.name}` : ''}
      >
        {selectedPlayer && academiaActual && (
          <PlanningAccordion 
            player={selectedPlayer} 
            academiaId={academiaActual.id} 
          />
        )}
      </Modal>
    </Card> // <<< ETIQUETA DE CIERRE AÑADIDA
  );
};

export default TrainingRecommendations;