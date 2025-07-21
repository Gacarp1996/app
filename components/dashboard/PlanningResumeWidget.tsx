import { Player } from '@/types';
import React from 'react';


interface PlayerStatus {
  active: Player[];
  inactive: Player[];
  withoutPlan: Player[];
}

interface PlanningResumeWidgetProps {
  playerStatus: PlayerStatus;
}

const PlanningResumeWidget: React.FC<PlanningResumeWidgetProps> = ({ playerStatus }) => {
  const withPlanCount = (playerStatus.active.length + playerStatus.inactive.length) - playerStatus.withoutPlan.length;
  
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-orange-500/20 rounded-lg">
          <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white">Resumen de Planificación</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Con planificación</p>
          <p className="text-green-400 text-2xl font-semibold">{withPlanCount}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm">Sin planificación</p>
          <p className="text-red-400 text-2xl font-semibold">{playerStatus.withoutPlan.length}</p>
        </div>
      </div>
      
      {playerStatus.withoutPlan.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 mb-2">Requieren atención:</p>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {playerStatus.withoutPlan.slice(0, 3).map((player) => (
              <p key={player.id} className="text-xs text-red-300">{player.name}</p>
            ))}
            {playerStatus.withoutPlan.length > 3 && (
              <p className="text-xs text-gray-500">+{playerStatus.withoutPlan.length - 3} más</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningResumeWidget;