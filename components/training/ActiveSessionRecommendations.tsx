// components/training/ActiveSessionRecommendations.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Player } from '../../types';
import { useTrainingRecommendations } from '../../hooks/useTrainingRecommendations';

interface ActiveSessionRecommendationsProps {
  participants: Player[];
  academiaId: string;
  sessions: any[]; // TrainingSession array
}

const ActiveSessionRecommendations: React.FC<ActiveSessionRecommendationsProps> = ({
  participants,
  academiaId,
  sessions
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'individual' | 'group'>('individual');
  const [userHasInteractedWithTabs, setUserHasInteractedWithTabs] = useState(false);

  const {
    recommendations,
    loading: recommendationsLoading,
    getRecommendationsForPlayer,
    getRecommendationsForPlayers,
    clearRecommendations
  } = useTrainingRecommendations({
    players: participants,
    sessions,
    academiaId,
    analysisWindowDays: 7
  });

  // Auto-seleccionar el primer jugador y determinar tab inicial
  useEffect(() => {
    if (participants.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(participants[0].id);
    }
    // Solo establecer tab inicial automáticamente si el usuario no ha interactuado manualmente
    if (!userHasInteractedWithTabs) {
      if (participants.length > 1) {
        setActiveTab('group');
      } else {
        setActiveTab('individual');
      }
    }
  }, [participants.length, selectedPlayerId, userHasInteractedWithTabs]);

  // Cargar recomendaciones cuando cambien los participantes
  const participantIds = useMemo(() => participants.map(p => p.id).sort().join(','), [participants]);
  
  useEffect(() => {
    if (participants.length > 0 && academiaId) {
      console.log('🔄 Cargando recomendaciones para:', participants.map(p => p.name));
      
      // Usar la función que ya maneja todo el ciclo de carga
      getRecommendationsForPlayers(participants.map(p => p.id));
    }
  }, [participantIds, academiaId]); // Solo participant IDs y academiaId

  // Verificar si el jugador seleccionado aún está en la lista de participantes
  useEffect(() => {
    if (selectedPlayerId && !participants.some(p => p.id === selectedPlayerId)) {
      // Si el jugador seleccionado fue removido, seleccionar el primero disponible
      if (participants.length > 0) {
        setSelectedPlayerId(participants[0].id);
      } else {
        setSelectedPlayerId('');
      }
    }
  }, [participants, selectedPlayerId]);

  // Función para generar recomendaciones grupales mejoradas
  const generateGroupRecommendations = () => {
    if (participants.length === 0) return null;

    const allPlayerRecs = participants.map(player => ({
      player,
      recs: recommendations[player.id]
    }));

    // Separar jugadores con y sin recomendaciones
    const playersWithRecs = allPlayerRecs.filter(item => item.recs && item.recs.recommendations.length > 0);
    const playersWithoutRecs = allPlayerRecs.filter(item => 
      item.recs && (item.recs.isNewPlayer || !item.recs.hasActivePlan || item.recs.recommendations.length === 0)
    );

    // Agregar áreas que necesitan todos los jugadores
    const areaNeeds: Record<string, {
      count: number;
      totalDifference: number;
      players: string[];
      priority: 'high' | 'medium' | 'low';
      avgDifference: number;
      needsMore: boolean; // true si necesita más, false si necesita menos
    }> = {};

    playersWithRecs.forEach(({ player, recs }) => {
      recs.recommendations.forEach(rec => {
        const key = `${rec.category}.${rec.subcategory}`;
        
        if (!areaNeeds[key]) {
          areaNeeds[key] = {
            count: 0,
            totalDifference: 0,
            players: [],
            priority: 'low',
            avgDifference: 0,
            needsMore: rec.difference > 0
          };
        }

        // Solo contar el jugador una vez por área (evitar duplicados)
        if (!areaNeeds[key].players.includes(player.name)) {
          areaNeeds[key].count++;
          areaNeeds[key].players.push(player.name);
        }
        
        areaNeeds[key].totalDifference += Math.abs(rec.difference);
        
        // Si la mayoría necesita más de esta área, entonces needsMore = true
        if (rec.difference > 0) areaNeeds[key].needsMore = true;
      });
    });

    // Calcular prioridades grupales
    Object.keys(areaNeeds).forEach(key => {
      const need = areaNeeds[key];
      need.avgDifference = need.totalDifference / need.count;
      
      // Prioridad basada en: cuántos jugadores lo necesitan + magnitud promedio
      const playerPercentage = (need.count / participants.length) * 100;
      
      if (playerPercentage >= 75 && need.avgDifference > 15) {
        need.priority = 'high';
      } else if (playerPercentage >= 50 && need.avgDifference > 10) {
        need.priority = 'medium';
      } else {
        need.priority = 'low';
      }
    });

    // Ordenar por prioridad y déficit más grande (donde la realidad está más por debajo del plan)
    const sortedNeeds = Object.entries(areaNeeds)
      .sort(([, a], [, b]) => {
        // Ordenar por magnitud absoluta del desequilibrio (más importante primero)
        const absA = Math.abs(a.needsMore ? a.avgDifference : -a.avgDifference);
        const absB = Math.abs(b.needsMore ? b.avgDifference : -b.avgDifference);
        
        if (absB !== absA) {
          return absB - absA; // Mayor desequilibrio primero
        }
        
        // En caso de empate, priorizar por más jugadores afectados
        return b.count - a.count;
      })
      .filter(([, need]) => Math.abs(need.avgDifference) >= 5) // Solo diferencias significativas
      .slice(0, 3); // Solo las 3 recomendaciones más importantes

    return {
      totalPlayers: participants.length,
      analyzedPlayers: playersWithRecs.length,
      playersWithoutData: playersWithoutRecs.length,
      playersWithoutDataNames: playersWithoutRecs.map(p => p.player.name),
      groupRecommendations: sortedNeeds.map(([key, need]) => {
        const [category, subcategory] = key.split('.');
        return {
          area: subcategory,
          category,
          playersCount: need.count,
          playerNames: need.players.slice(0, 3), // Mostrar máximo 3 nombres
          morePlayersCount: Math.max(0, need.players.length - 3),
          priority: need.priority,
          avgDifference: Math.round(need.avgDifference),
          percentage: Math.round((need.count / participants.length) * 100),
          needsMore: need.needsMore,
          action: need.needsMore ? 'AUMENTAR' : 'REDUCIR'
        };
      })
    };
  };

  const selectedPlayerRecs = selectedPlayerId ? recommendations[selectedPlayerId] : null;
  const groupRecs = generateGroupRecommendations();

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
    <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl shadow-lg">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl">
        {/* Header colapsable */}
        <div 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/50 transition-colors rounded-t-xl"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-lg">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014.846 17H9.154a3.374 3.374 0 00-1.849-.553l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Recomendaciones de Entrenamiento</h3>
              <p className="text-sm text-gray-400">
                {participants.length === 1 
                  ? 'Basado en los últimos 7 días' 
                  : `${participants.length} jugadores - Análisis individual y grupal`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Indicador de recomendaciones */}
            {(() => {
              const totalRecs = Object.values(recommendations).reduce((sum, rec) => 
                sum + (rec?.recommendations?.length || 0), 0);
              return totalRecs > 0 ? (
                <span className="px-2 py-1 text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-full">
                  {totalRecs} sugerencias
                </span>
              ) : null;
            })()}
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2} 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Contenido expandible */}
        {isExpanded && (
          <div className="p-4 border-t border-gray-800">
            {/* Tabs para individual vs grupal (solo si hay múltiples jugadores) */}
            {participants.length > 1 && (
              <div className="flex mb-4 bg-gray-800/50 rounded-lg p-1">
                <button
                  onClick={() => {
                    setActiveTab('group');
                    setUserHasInteractedWithTabs(true);
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'group'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 3.197c0 .74.134 1.448.384 2.104A9.094 9.094 0 0012 21a9.094 9.094 0 005.676-1.976" />
                    </svg>
                    Plan Grupal
                  </div>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('individual');
                    setUserHasInteractedWithTabs(true);
                  }}
                  className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'individual'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    Individual
                  </div>
                </button>
              </div>
            )}

            {/* Estado de carga */}
            {recommendationsLoading && (
              <div className="flex items-center justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-400"></div>
                <span className="ml-3 text-gray-400">Analizando historial...</span>
              </div>
            )}

            {/* Contenido según tab activo */}
            {!recommendationsLoading && (
              <div className="space-y-4">
                {activeTab === 'group' && participants.length > 1 ? (
                  /* Vista grupal */
                  <div className="space-y-4">
                    {(() => {
                      const groupRecs = generateGroupRecommendations();
                      
                      if (!groupRecs) {
                        return (
                          <div className="bg-gray-800/50 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 3.197c0 .74.134 1.448.384 2.104A9.094 9.094 0 0012 21a9.094 9.094 0 005.676-1.976" />
                              </svg>
                              <div>
                                <p className="text-gray-400 text-sm font-medium mb-1">Sin datos para análisis grupal</p>
                                <p className="text-gray-500 text-xs leading-relaxed">
                                  Los jugadores no tienen suficiente información para generar recomendaciones grupales. 
                                  Asegúrate de que tengan planes de entrenamiento y sesiones registradas.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <>
                          {/* Resumen grupal */}
                          <div className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-3 mb-3">
                              <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 3.197c0 .74.134 1.448.384 2.104A9.094 9.094 0 0012 21a9.094 9.094 0 005.676-1.976" />
                              </svg>
                              <div>
                                <p className="text-green-400 font-medium mb-1">Plan de Entrenamiento Grupal</p>
                                <p className="text-green-300 text-sm">
                                  Sesión para {groupRecs.totalPlayers} jugador{groupRecs.totalPlayers > 1 ? 'es' : ''}
                                  {groupRecs.analyzedPlayers > 0 && (
                                    <> • {groupRecs.analyzedPlayers} con datos de análisis</>
                                  )}
                                  {groupRecs.playersWithoutData > 0 && (
                                    <> • {groupRecs.playersWithoutData} sin historial</>
                                  )}
                                </p>
                              </div>
                            </div>
                            
                            {/* Jugadores sin datos */}
                            {groupRecs.playersWithoutData > 0 && (
                              <div className="flex items-center gap-2 text-xs text-orange-300 bg-orange-500/10 rounded-lg p-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                                <span>
                                  Sin análisis: {groupRecs.playersWithoutDataNames.join(', ')}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Recomendaciones grupales principales */}
                          {groupRecs.groupRecommendations.length > 0 && (
                            <div className="space-y-3">
                              <h5 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                                🎯 Enfoque Recomendado para Esta Sesión
                              </h5>
                              
                              <div className="space-y-2">
                                {groupRecs.groupRecommendations.map((rec, index) => (
                                  <div key={index} className={`border rounded-lg p-3 ${getPriorityColor(rec.priority)}`}>
                                    <div className="flex items-start gap-3">
                                      <div className="flex-shrink-0 mt-0.5">
                                        {getPriorityIcon(rec.priority)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-medium text-sm">
                                            {rec.action} {rec.area}
                                          </span>
                                          <span className="text-xs font-medium px-2 py-0.5 bg-black/20 rounded-full">
                                            {rec.percentage}% del grupo
                                          </span>
                                        </div>
                                        <p className="text-xs opacity-90 mb-2">
                                          {rec.playersCount} de {groupRecs.totalPlayers} jugador{rec.playersCount > 1 ? 'es' : ''} necesita{rec.playersCount === 1 ? '' : 'n'} ajustar esta área
                                        </p>
                                        <div className="flex items-center gap-2 text-xs opacity-75">
                                          <span>Afecta a: {rec.playerNames.join(', ')}</span>
                                          {rec.morePlayersCount > 0 && (
                                            <span>+{rec.morePlayersCount} más</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Sugerencia práctica para el entrenador */}
                              <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-lg p-3">
                                <div className="flex items-start gap-3">
                                  <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189 6.01 6.01 0 001.5.189v5.25M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                                  </svg>
                                  <div>
                                    <p className="text-blue-400 text-xs font-medium mb-1">💡 Sugerencia de Sesión:</p>
                                    <p className="text-blue-300 text-xs leading-relaxed">
                                      {groupRecs.groupRecommendations.length > 0 
                                        ? `Enfócate en ${groupRecs.groupRecommendations[0].area.toLowerCase()} durante la primera parte de la sesión, ya que es lo que más jugadores necesitan ajustar.`
                                        : 'El grupo está bien balanceado. Continúa con la planificación normal.'
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  /* Vista individual */
                  <div className="space-y-4">
                    {/* Selector de jugador (solo si hay múltiples participantes) */}
                    {participants.length > 1 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Jugador a analizar:
                        </label>
                        <select
                          value={selectedPlayerId}
                          onChange={(e) => {
                            setSelectedPlayerId(e.target.value);
                            // Mantener la vista individual activa al cambiar de jugador
                            setActiveTab('individual');
                            setUserHasInteractedWithTabs(true);
                          }}
                          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                          {participants.map(player => (
                            <option key={player.id} value={player.id}>
                              {player.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Contenido individual */}
                    {selectedPlayerRecs ? (
                      <>
                        {/* Resumen */}
                        <div className="bg-gray-800/50 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                              <p className="text-white font-medium mb-1">Análisis del Jugador</p>
                              <p className="text-gray-300 text-sm leading-relaxed">{selectedPlayerRecs.summary}</p>
                            </div>
                          </div>
                          
                          {/* Badges de estado */}
                          <div className="flex items-center gap-2 mt-3">
                            {selectedPlayerRecs.isNewPlayer && (
                              <span className="px-2 py-1 text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/20 rounded-full">
                                Jugador Nuevo
                              </span>
                            )}
                            {!selectedPlayerRecs.hasActivePlan && (
                              <span className="px-2 py-1 text-xs font-medium bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-full">
                                Sin Plan
                              </span>
                            )}
                            {selectedPlayerRecs.hasActivePlan && selectedPlayerRecs.hasSessions && (
                              <span className="px-2 py-1 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/20 rounded-full">
                                Plan Activo
                              </span>
                            )}
                            {selectedPlayerRecs.summary?.includes('[Plan Adaptado]') && (
                              <span className="px-2 py-1 text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 rounded-full">
                                <div className="flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                                  </svg>
                                  Plan Adaptado
                                </div>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Error */}
                        {selectedPlayerRecs.error && (
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                            <p className="text-red-400 text-sm">{selectedPlayerRecs.error}</p>
                          </div>
                        )}

                        {/* Recomendaciones específicas */}
                        {selectedPlayerRecs.recommendations.length > 0 && (
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                              Ejercicios Recomendados para Esta Sesión
                            </h5>
                            
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {selectedPlayerRecs.recommendations.map((rec, index) => (
                                <div key={index} className={`border rounded-lg p-3 ${getPriorityColor(rec.priority)}`}>
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                      {getPriorityIcon(rec.priority)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm">
                                          {rec.subcategory}
                                          {rec.exercise && ` > ${rec.exercise}`}
                                        </span>
                                        <span className="text-xs opacity-75 font-medium">
                                          {rec.difference > 0 ? 'FALTA' : 'SOBRA'} {Math.abs(rec.difference)}%
                                        </span>
                                      </div>
                                      <p className="text-xs opacity-90 leading-relaxed mb-2">
                                        {rec.recommendation}
                                      </p>
                                      <div className="flex items-center gap-4 text-xs opacity-75">
                                        <span>Actual: {rec.currentPercentage}%</span>
                                        <span>Planificado: {rec.plannedPercentage}%</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Mensaje para jugadores nuevos sin recomendaciones */}
                        {selectedPlayerRecs.isNewPlayer && selectedPlayerRecs.recommendations.length === 0 && (
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="text-blue-400 text-sm font-medium mb-1">No hay información previa</p>
                                <p className="text-blue-300 text-xs leading-relaxed">
                                  Este jugador es nuevo o no tiene entrenamientos registrados. 
                                  Comienza con una evaluación inicial y las recomendaciones aparecerán en futuras sesiones.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Mensaje para jugadores con plan pero sin recomendaciones */}
                        {selectedPlayerRecs.hasActivePlan && !selectedPlayerRecs.isNewPlayer && selectedPlayerRecs.recommendations.length === 0 && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="text-green-400 text-sm font-medium mb-1">Entrenamiento balanceado</p>
                                <p className="text-green-300 text-xs leading-relaxed">
                                  El jugador está siguiendo su plan de entrenamiento correctamente. 
                                  Continúa con el enfoque actual según la planificación establecida.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Mensaje cuando no se pueden cargar las recomendaciones */
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                          </svg>
                          <div>
                            <p className="text-gray-400 text-sm font-medium mb-1">Sin información de recomendaciones</p>
                            <p className="text-gray-500 text-xs leading-relaxed">
                              No se pudo cargar la información de recomendaciones para este jugador. 
                              Verifica que tenga una planificación asignada.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Consejos generales para tab individual */}
                    <div className="bg-gradient-to-r from-green-500/5 to-cyan-500/5 border border-green-500/20 rounded-lg p-3">
                      <div className="flex items-start gap-3">
                        <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189 6.01 6.01 0 001.5.189v5.25M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                        </svg>
                        <div>
                          <p className="text-green-400 text-xs font-medium mb-1">💡 Tip:</p>
                          <p className="text-green-300 text-xs leading-relaxed">
                            Usa estas recomendaciones como guía para balancear la sesión. 
                            Los elementos en rojo requieren más atención inmediata.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveSessionRecommendations;
