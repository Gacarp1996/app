import React, { useState, useEffect } from 'react';
import { UI_LABELS, TipoType, AreaType } from '../../constants/training';
import { RecommendationLegend } from './RecommendationLegend';
import { useActiveSessionRecommendations } from '../../hooks/useActiveSessionRecommendations';
import { SessionExercise } from '../../contexts/TrainingContext';
import { getColorForAction } from '../../constants/recommendationThresholds';
import { rateLimiter } from '@/utils/rateLimiter';

interface Participant {
  id: string;
  name: string;
}

interface ActiveSessionRecommendationsProps {
  participants: Participant[];
  currentSessionExercises?: SessionExercise[];
}

const ActiveSessionRecommendations: React.FC<ActiveSessionRecommendationsProps> = ({ 
  participants,
  currentSessionExercises = []
}) => {
  // ✅ NUEVOS ESTADOS para el comportamiento desplegable
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  
  // Estados existentes pero simplificados
  const [activeTab, setActiveTab] = useState<'individual' | 'group'>('individual');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(participants[0]?.id || '');
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<string>>(new Set());
  const [showLegend, setShowLegend] = useState(false);

  const {
    recommendationsGenerated,
    engineOutput,
    dataPreview,
    recommendationsLoading,
    generateRecommendations,
    refreshRecommendations,
    analyzePlayerSessions,
    trainingPlans,
    analysisWindowDays,
    loadingAnalysisConfig
  } = useActiveSessionRecommendations({ 
    participants,
    currentSessionExercises
  });

  const getUILabel = (value: string, type: 'tipo' | 'area'): string => {
    if (type === 'tipo' && value in UI_LABELS.TIPOS) {
      return UI_LABELS.TIPOS[value as TipoType];
    }
    if (type === 'area' && value in UI_LABELS.AREAS) {
      return UI_LABELS.AREAS[value as AreaType];
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  useEffect(() => {
    if (participants.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(participants[0].id);
    }
  }, [participants, selectedPlayerId]);

  // ✅ Detectar cuando se generan recomendaciones para expandir automáticamente
  useEffect(() => {
    if (recommendationsGenerated && !hasGenerated) {
      setIsExpanded(true);
      setHasGenerated(true);
    }
  }, [recommendationsGenerated, hasGenerated]);

  // ✅ FUNCIÓN para generar recomendaciones y expandir
  const handleGenerateRecommendations = () => {
     if (!rateLimiter.canExecute('generate-recommendations', 5000)) { // 5 segundos
    return;
  }
    generateRecommendations();
    setIsExpanded(true);
  };

  // ✅ FUNCIÓN para toggle del panel
  const toggleExpansion = () => {
    if (recommendationsGenerated || dataPreview) {
      setIsExpanded(!isExpanded);
    }
  };

  // ✅ DETERMINAR ESTADO Y ESTILO del botón principal
  const getButtonState = () => {
    if (loadingAnalysisConfig) {
      return {
        text: 'Cargando configuración...',
        icon: '⚙️',
        disabled: true,
        color: 'gray'
      };
    }
    
    if (recommendationsLoading) {
      return {
        text: 'Generando recomendaciones...',
        icon: '🔄',
        disabled: true,
        color: 'blue'
      };
    }
    
    if (recommendationsGenerated) {
      return {
        text: `Recomendaciones (${analysisWindowDays}d)`,
        icon: '🎯',
        disabled: false,
        color: 'green'
      };
    }
    
    if (dataPreview && dataPreview.playersWithData > 0) {
      return {
        text: `Generar recomendaciones (${dataPreview.playersWithData} jugadores)`,
        icon: '✨',
        disabled: false,
        color: 'blue'
      };
    }
    
    return {
      text: 'Sin datos suficientes',
      icon: '⚠️',
      disabled: true,
      color: 'yellow'
    };
  };

  const buttonState = getButtonState();

  // ✅ FUNCIÓN para obtener estadísticas rápidas
  const getQuickStats = () => {
    if (!recommendationsGenerated || !engineOutput) return null;
    
    const individualCount = Object.keys(engineOutput.individual).length;
    const blockedCount = engineOutput.group.blocked?.length || 0;
    
    return {
      analyzed: individualCount,
      blocked: blockedCount,
      total: participants.length
    };
  };

  const quickStats = getQuickStats();

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800">
      {/* ✅ HEADER COMPACTO - Siempre visible */}
      <div 
        className={`flex items-center justify-between p-4 cursor-pointer transition-all duration-200 ${
          (recommendationsGenerated || dataPreview) ? 'hover:bg-gray-800/30' : ''
        }`}
        onClick={toggleExpansion}
      >
        <div className="flex items-center gap-3">
          {/* Flecha desplegable como VS Code */}
          <div className="flex items-center gap-2">
            {(recommendationsGenerated || dataPreview) && (
              <svg 
                className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                  isExpanded ? 'rotate-90' : ''
                }`}
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={2} 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            )}
            
            {/* Icono y título */}
            <div className="flex items-center gap-2">
              <span className="text-lg">{buttonState.icon}</span>
              <span className="text-white font-medium">{buttonState.text}</span>
            </div>
          </div>

          {/* Stats rápidas cuando hay recomendaciones */}
          {quickStats && (
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                ✓ {quickStats.analyzed}
              </span>
              {quickStats.blocked > 0 && (
                <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                  ⚠️ {quickStats.blocked}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2">
          {/* Botón generar/refrescar */}
          {!recommendationsGenerated && dataPreview && dataPreview.playersWithData > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGenerateRecommendations();
              }}
              disabled={buttonState.disabled}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-medium rounded-lg transition-all duration-200 text-sm"
            >
              Generar
            </button>
          )}

          {recommendationsGenerated && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                refreshRecommendations();
              }}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              title="Actualizar recomendaciones"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          )}

          {recommendationsGenerated && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLegend(!showLegend);
              }}
              className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
              title="Guía de colores"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ✅ CONTENIDO DESPLEGABLE */}
      {isExpanded && (
        <div className="border-t border-gray-700">
          {/* Loading states */}
          {recommendationsLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
              <span className="ml-3 text-gray-400">Analizando datos...</span>
            </div>
          )}

          {loadingAnalysisConfig && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
              <span className="ml-3 text-gray-400">Cargando configuración...</span>
            </div>
          )}

          {/* Leyenda de colores */}
          {showLegend && (
            <div className="p-4 border-b border-gray-700">
              <RecommendationLegend />
            </div>
          )}

          {/* Data preview - SIN debug info */}
          {!loadingAnalysisConfig && !recommendationsLoading && !recommendationsGenerated && dataPreview && (
            <div className="p-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-400">{dataPreview.totalParticipants}</div>
                    <div className="text-xs text-blue-300">Participantes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">{dataPreview.playersWithData}</div>
                    <div className="text-xs text-blue-300">Con Datos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-400">{dataPreview.totalSessions}</div>
                    <div className="text-xs text-blue-300">Sesiones</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-cyan-400">{dataPreview.totalExercises}</div>
                    <div className="text-xs text-blue-300">Ejercicios</div>
                  </div>
                </div>

                {dataPreview.playersWithData === 0 && (
                  <div className="text-center py-4">
                    <p className="text-gray-400 mb-2">⚠️ Sin datos suficientes</p>
                    <p className="text-sm text-gray-500">
                      Se necesitan planes de entrenamiento y sesiones históricas
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recomendaciones generadas */}
          {!loadingAnalysisConfig && !recommendationsLoading && recommendationsGenerated && engineOutput && (
            <div className="p-4 space-y-4">
              {/* Jugadores bloqueados - compacto */}
              {engineOutput.group.blocked && engineOutput.group.blocked.length > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-400">⚠️</span>
                    <span className="text-yellow-400 font-medium text-sm">
                      {engineOutput.group.blocked.length} jugador(es) sin recomendaciones
                    </span>
                  </div>
                  <div className="text-xs text-yellow-300">
                    {engineOutput.group.blocked.map(b => b.playerName).join(', ')}
                  </div>
                </div>
              )}

              {/* Tabs para múltiples jugadores */}
              {participants.length > 1 && (
                <div className="flex mb-4 bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('individual')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'individual'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    onClick={() => setActiveTab('group')}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      activeTab === 'group'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Grupal
                  </button>
                </div>
              )}

              {/* Vista grupal */}
              {activeTab === 'group' && participants.length > 1 && engineOutput.group && (
                <div className="space-y-3">
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-purple-400">👥</span>
                      <span className="text-purple-400 font-medium">Recomendaciones Grupales</span>
                      <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                        {engineOutput.group.analyzedPlayers} jugadores
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {engineOutput.group.items.map((item, index) => {
                      const colors = getColorForAction(item.action);
                      
                      return (
                        <div key={`${item.level}-${item.area}-${index}`} 
                             className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{colors.icon}</span>
                              <div>
                                <div className={`font-medium ${colors.text}`}>
                                  {getUILabel(item.area, 'tipo')}
                                </div>
                                <div className="text-xs text-gray-400">
                                  Actual: {item.currentPercentage}% • Meta: {item.plannedPercentage}%
                                </div>
                              </div>
                            </div>
                            {item.action !== 'OPTIMO' && (
                              <div className={`text-sm font-bold ${colors.text}`}>
                                {item.gap > 0 ? '+' : ''}{item.gap.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {engineOutput.group.recommendation && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">💭</span>
                        <div>
                          <span className="text-blue-400 font-medium text-sm">Estrategia:</span>
                          <p className="text-blue-300 text-sm mt-1">
                            {engineOutput.group.recommendation}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Vista individual */}
              {(activeTab === 'individual' || participants.length === 1) && (
                <div className="space-y-3">
                  {/* Selector de jugador */}
                  {participants.length > 1 && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                      <select
                        value={selectedPlayerId}
                        onChange={(e) => setSelectedPlayerId(e.target.value)}
                        className="w-full bg-gray-800 border border-purple-400/40 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {participants.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {(() => {
                    const playerData = engineOutput.individual[selectedPlayerId];
                    
                    if (!playerData) {
                      return (
                        <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 text-center">
                          <p className="text-gray-400">No hay datos para este jugador</p>
                        </div>
                      );
                    }
                    
                    return (
                      <>
                        {/* Stats del jugador - compacto */}
                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-purple-400">📊</span>
                            <span className="text-purple-400 font-medium text-sm">
                              {playerData.summary.sessionsAnalyzed} sesiones • {playerData.summary.totalExercises} ejercicios
                            </span>
                            {playerData.summary.planUsed === 'real' ? (
                              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">Plan</span>
                            ) : (
                              <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">Default</span>
                            )}
                          </div>
                        </div>

                        {/* Recomendaciones por tipo - desplegables */}
                        <div className="space-y-2">
                          {Object.values(TipoType).map(tipo => {
                            const tipoItems = playerData.items.filter(item => 
                              (item.level === 'TIPO' && item.area === tipo) ||
                              (item.parentType === tipo)
                            );
                            
                            if (tipoItems.length === 0) return null;
                            
                            const tipoMain = tipoItems.find(item => item.level === 'TIPO');
                            if (!tipoMain) return null;
                            
                            const colors = getColorForAction(tipoMain.action);
                            const isExpanded = expandedRecommendations.has(`type-${tipo}`);
                            
                            return (
                              <div key={tipo} className="bg-gray-800/50 border border-gray-600/50 rounded-lg overflow-hidden">
                                <div 
                                  className={`cursor-pointer p-3 transition-all duration-200 ${colors.bg} hover:bg-opacity-80`}
                                  onClick={() => {
                                    const newExpanded = new Set(expandedRecommendations);
                                    const typeKey = `type-${tipo}`;
                                    if (newExpanded.has(typeKey)) {
                                      newExpanded.delete(typeKey);
                                    } else {
                                      newExpanded.add(typeKey);
                                    }
                                    setExpandedRecommendations(newExpanded);
                                  }}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <svg 
                                        className={`w-4 h-4 transition-transform duration-200 ${
                                          isExpanded ? 'rotate-90' : ''
                                        } ${colors.text}`}
                                        fill="none" 
                                        viewBox="0 0 24 24" 
                                        strokeWidth={2} 
                                        stroke="currentColor"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                      </svg>
                                      <span className="text-lg">{colors.icon}</span>
                                      <div>
                                        <div className={`font-medium ${colors.text}`}>
                                          {getUILabel(tipo, 'tipo')}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                          {tipoMain.currentPercentage}% de {tipoMain.plannedPercentage}%
                                        </div>
                                      </div>
                                    </div>
                                    {tipoMain.action !== 'OPTIMO' && (
                                      <div className={`text-sm font-bold ${colors.text}`}>
                                        {tipoMain.gap > 0 ? '+' : ''}{tipoMain.gap.toFixed(1)}%
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="p-3 bg-gray-900/30 border-t border-gray-600/30 space-y-2">
                                    {tipoItems
                                      .filter(item => item.level === 'AREA')
                                      .map((areaItem, idx) => {
                                        const areaColors = getColorForAction(areaItem.action);
                                        
                                        return (
                                          <div key={idx} className={`p-2 rounded border ${areaColors.bg} ${areaColors.border}`}>
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-2">
                                                <span className="text-sm">{areaColors.icon}</span>
                                                <div>
                                                  <span className={`text-sm font-medium ${areaColors.text}`}>
                                                    {getUILabel(areaItem.area, 'area')}
                                                  </span>
                                                  <div className="text-xs text-gray-400">
                                                    {areaItem.currentPercentage}% / {areaItem.plannedPercentage}%
                                                  </div>
                                                </div>
                                              </div>
                                              {areaItem.action !== 'OPTIMO' && (
                                                <div className={`text-xs font-medium ${areaColors.text}`}>
                                                  {areaItem.gap > 0 ? '+' : ''}{areaItem.gap.toFixed(1)}%
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActiveSessionRecommendations;