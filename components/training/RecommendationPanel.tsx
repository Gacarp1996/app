// components/training/RecommendationPanel.tsx
import React from 'react';
import { Player } from '../../types';

interface RecommendationItem {
  category: string;
  subcategory?: string;
  exercise?: string;
  currentPercentage: number;
  plannedPercentage: number;
  difference: number;
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
}

interface TrainingRecommendations {
  isNewPlayer: boolean;
  hasActivePlan: boolean;
  hasSessions: boolean;
  recommendations: RecommendationItem[];
  summary: string;
  loading: boolean;
  error: string | null;
}

interface RecommendationPanelProps {
  players: Player[];
  recommendations: Record<string, TrainingRecommendations>;
  selectedPlayerIds: Set<string>;
  loading: boolean;
}

const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  players,
  recommendations,
  selectedPlayerIds,
  loading
}) => {
  // Si no hay jugadores seleccionados, no mostrar nada
  if (selectedPlayerIds.size === 0) {
    return null;
  }

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 shadow-lg">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
          <span className="ml-3 text-gray-400">Analizando historial de entrenamientos...</span>
        </div>
      </div>
    );
  }

  const selectedPlayers = Array.from(selectedPlayerIds).map(id => 
    players.find(p => p.id === id)
  ).filter(Boolean) as Player[];

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': 
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'medium':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      case 'low':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 shadow-lg space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-lg">
          <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014.846 17H9.154a3.374 3.374 0 00-1.849-.553l-.548-.547z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white">Recomendaciones de Entrenamiento</h3>
      </div>

      {selectedPlayers.map(player => {
        const playerRecs = recommendations[player.id];
        
        if (!playerRecs) {
          return null;
        }

        return (
          <div key={player.id} className="border border-gray-700 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium text-green-400">{player.name}</h4>
              <div className="flex items-center gap-2">
                {playerRecs.isNewPlayer && (
                  <span className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-full">
                    Nuevo
                  </span>
                )}
                {!playerRecs.hasActivePlan && (
                  <span className="px-2 py-1 text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-full">
                    Sin Plan
                  </span>
                )}
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-gray-300 text-sm leading-relaxed">{playerRecs.summary}</p>
            </div>

            {/* Error */}
            {playerRecs.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{playerRecs.error}</p>
              </div>
            )}

            {/* Recomendaciones específicas */}
            {playerRecs.recommendations.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                  Ajustes Sugeridos ({playerRecs.recommendations.length})
                </h5>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {playerRecs.recommendations.slice(0, 5).map((rec, index) => (
                    <div key={index} className={`border rounded-lg p-3 ${getPriorityColor(rec.priority)}`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getPriorityIcon(rec.priority)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {rec.category}: {rec.subcategory}
                              {rec.exercise && ` > ${rec.exercise}`}
                            </span>
                            <span className="text-xs opacity-75">
                              ({rec.difference > 0 ? '+' : ''}{rec.difference}%)
                            </span>
                          </div>
                          <p className="text-xs opacity-90 leading-relaxed">
                            {rec.recommendation}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs opacity-75">
                            <span>Actual: {rec.currentPercentage}%</span>
                            <span>Plan: {rec.plannedPercentage}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {playerRecs.recommendations.length > 5 && (
                    <div className="text-center py-2">
                      <span className="text-xs text-gray-500">
                        Y {playerRecs.recommendations.length - 5} recomendación(es) más...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mensaje para jugadores nuevos */}
            {playerRecs.isNewPlayer && playerRecs.recommendations.length === 0 && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-blue-400 text-sm font-medium mb-1">Jugador nuevo detectado</p>
                    <p className="text-blue-300 text-xs leading-relaxed">
                      Comienza con una evaluación inicial y registra los datos del entrenamiento. 
                      Las recomendaciones aparecerán después de algunas sesiones.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Consejos generales */}
      <div className="bg-gradient-to-r from-green-500/5 to-cyan-500/5 border border-green-500/20 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189 6.01 6.01 0 001.5.189v5.25M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
          </svg>
          <div>
            <p className="text-green-400 text-sm font-medium mb-2">💡 Consejos para aplicar las recomendaciones:</p>
            <ul className="text-green-300 text-xs space-y-1 leading-relaxed">
              <li>• Prioriza los ajustes marcados como "alta prioridad" (rojos)</li>
              <li>• Implementa cambios gradualmente durante la sesión</li>
              <li>• Documenta los ejercicios realizados para análisis futuro</li>
              <li>• Las recomendaciones se actualizan basándose en los últimos 7 días</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationPanel;
