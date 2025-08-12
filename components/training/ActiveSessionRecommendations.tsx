import React, { useState, useEffect } from 'react';
import { UI_LABELS, TipoType, AreaType } from '../../constants/training';
import { RecommendationLegend } from './RecommendationLegend';
import { useActiveSessionRecommendations } from '../../hooks/useActiveSessionRecommendations';
import { SessionExercise } from '../../contexts/TrainingContext';
import { getColorForAction } from '../../constants/recommendationThresholds';

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
    // ✅ NUEVOS: Estados de configuración de ventana de análisis
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

  // ✅ ACTUALIZADO: Debug con información de configuración
  useEffect(() => {
    console.log('📊 Estado Recomendaciones:', {
      participants: participants.length,
      dataPreview,
      recommendationsGenerated,
      recommendationsLoading,
      engineOutput: !!engineOutput,
      analysisWindowDays, // ✅ NUEVO
      loadingAnalysisConfig // ✅ NUEVO
    });
  }, [participants, dataPreview, recommendationsGenerated, recommendationsLoading, engineOutput, analysisWindowDays, loadingAnalysisConfig]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <div>
            <h4 className="text-lg font-semibold text-white">Recomendaciones</h4>
            {/* ✅ NUEVO: Mostrar ventana de análisis configurada */}
            {!loadingAnalysisConfig && (
              <p className="text-xs text-gray-400">
                Análisis de últimos {analysisWindowDays} días
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshRecommendations}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title="Actualizar recomendaciones"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
          
          <button
            onClick={() => setShowLegend(!showLegend)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-300 shadow-md border-2 border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400
              ${showLegend ? 'bg-indigo-700 text-white scale-105' : 'bg-indigo-500/80 text-white animate-pulse'}
              hover:bg-indigo-600 hover:scale-105`}
            title="Guía de colores: ¿Qué significa cada color?"
          >
            <svg className="w-5 h-5 mr-1 text-yellow-300 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="#facc15" />
              <text x="12" y="16" textAnchor="middle" fontSize="12" fill="#1e293b" fontWeight="bold">?</text>
            </svg>
            <span>Guía de colores</span>
          </button>
        </div>
      </div>

      {showLegend && (
        <RecommendationLegend className="mb-4" />
      )}

      {/* ✅ NUEVO: Mostrar loading de configuración */}
      {loadingAnalysisConfig && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
          <span className="ml-3 text-gray-400">Cargando configuración de análisis...</span>
        </div>
      )}

      {recommendationsLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
          <span className="ml-3 text-gray-400">Analizando recomendaciones...</span>
        </div>
      )}

      {/* ✅ ACTUALIZADO: Mostrar estado de data preview con configuración */}
      {!loadingAnalysisConfig && !recommendationsLoading && !recommendationsGenerated && dataPreview && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-400/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-500/20 rounded-full p-3">
                <span className="text-blue-400 text-xl">📊</span>
              </div>
              <div>
                <h4 className="font-semibold text-blue-400 text-base">Datos Disponibles para Análisis</h4>
                <p className="text-blue-300 text-sm">
                  {dataPreview.canGenerateRecommendations 
                    ? `Analizando últimos ${analysisWindowDays} días` 
                    : "Revisión previa - datos insuficientes"}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="text-center bg-blue-500/10 rounded-lg p-3">
                <div className="text-lg font-bold text-blue-400">{dataPreview.totalParticipants}</div>
                <div className="text-xs text-blue-300">Participantes</div>
              </div>
              <div className="text-center bg-blue-500/10 rounded-lg p-3">
                <div className="text-lg font-bold text-green-400">{dataPreview.playersWithData}</div>
                <div className="text-xs text-blue-300">Con Datos</div>
              </div>
              <div className="text-center bg-blue-500/10 rounded-lg p-3">
                <div className="text-lg font-bold text-purple-400">{dataPreview.totalSessions}</div>
                <div className="text-xs text-blue-300">Sesiones</div>
              </div>
              <div className="text-center bg-blue-500/10 rounded-lg p-3">
                <div className="text-lg font-bold text-cyan-400">{dataPreview.totalExercises}</div>
                <div className="text-xs text-blue-300">Ejercicios</div>
              </div>
            </div>

            {/* ✅ ACTUALIZADO: Debug info con ventana de análisis */}
            <div className="text-xs text-gray-400 mt-2">
              Estado: playersWithData={dataPreview.playersWithData}, canGenerate={dataPreview.canGenerateRecommendations ? 'Sí' : 'No'}, ventana={analysisWindowDays} días
            </div>
          </div>
          
          <div className="text-center">
            <button
              onClick={() => {
                console.log('🔄 Botón manual presionado - Generando recomendaciones...');
                console.log('📊 Data Preview:', dataPreview);
                console.log('🎯 Participants:', participants);
                console.log('⏰ Ventana de análisis:', analysisWindowDays, 'días');
                generateRecommendations();
              }}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                dataPreview && dataPreview.playersWithData > 0
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 shadow-lg hover:shadow-xl cursor-pointer'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {dataPreview && dataPreview.playersWithData > 0 ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">🎯</span>
                  <div className="text-center">
                    <div>Generar Recomendaciones</div>
                    <div className="text-sm opacity-80">
                      ({dataPreview.playersWithData} jugador{dataPreview.playersWithData !== 1 ? 'es' : ''} • últimos {analysisWindowDays} días)
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">❌</span>
                  <div>
                    <div>Sin datos para analizar</div>
                    <div className="text-sm opacity-80">
                      Necesita: planes de entrenamiento + sesiones históricas
                    </div>
                  </div>
                </div>
              )}
            </button>
            
            {/* ✅ ACTUALIZADO: Debug info con ventana de análisis */}
            <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400">
              <div>🔍 <strong>Debug Info:</strong></div>
              <div>• Participantes: {participants.length}</div>
              <div>• Con datos: {dataPreview ? dataPreview.playersWithData : 'Cargando...'}</div>
              <div>• Sesiones: {dataPreview ? dataPreview.totalSessions : 'Cargando...'}</div>
              <div>• Ejercicios: {dataPreview ? dataPreview.totalExercises : 'Cargando...'}</div>
              <div>• ¿Puede generar?: {dataPreview ? (dataPreview.canGenerateRecommendations ? 'Sí' : 'No') : 'Cargando...'}</div>
              <div>• Ventana análisis: {analysisWindowDays} días</div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ ACTUALIZADO: Mostrar cuando no hay data preview */}
      {!loadingAnalysisConfig && !recommendationsLoading && !recommendationsGenerated && !dataPreview && (
        <div className="text-center py-8">
          <div className="text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-lg font-medium mb-2">Cargando datos...</p>
            <p className="text-sm">Preparando análisis para {participants.length} participante(s)</p>
          </div>
        </div>
      )}

      {/* ✅ MOSTRAR RECOMENDACIONES */}
      {!loadingAnalysisConfig && !recommendationsLoading && recommendationsGenerated && engineOutput && (
        <div className="space-y-4">
          {/* ✅ DEBUG: Confirmar que llegamos aquí */}
          <div className="text-xs text-green-400 bg-green-900/20 p-2 rounded">
            ✅ Recomendaciones cargadas: {Object.keys(engineOutput.individual).length} jugadores (ventana: {analysisWindowDays} días)
          </div>
          
          {/* 🎯 FASE 4: Mostrar jugadores bloqueados si los hay */}
          {engineOutput.group.blocked && engineOutput.group.blocked.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-yellow-500/20 rounded-full p-2">
                  <span className="text-yellow-400 text-lg">⚠️</span>
                </div>
                <div>
                  <h4 className="font-semibold text-yellow-400 text-base">
                    Jugadores sin recomendaciones
                  </h4>
                  <p className="text-yellow-300 text-sm">
                    {engineOutput.group.blocked.length} jugador{engineOutput.group.blocked.length !== 1 ? 'es' : ''} no {engineOutput.group.blocked.length !== 1 ? 'pueden' : 'puede'} generar recomendaciones
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                {engineOutput.group.blocked.map((blocked) => (
                  <div key={blocked.playerId} className="bg-yellow-800/20 rounded p-3">
                    <div className="font-medium text-yellow-300 mb-1">
                      {blocked.playerName}
                    </div>
                    <ul className="text-sm text-yellow-400 space-y-1">
                      {blocked.reasons.slice(0, 3).map((reason, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-yellow-500 mt-1">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                      {blocked.reasons.length > 3 && (
                        <li className="flex items-start gap-2 text-yellow-500 italic">
                          <span className="mt-1">•</span>
                          <span>...y {blocked.reasons.length - 3} razón{blocked.reasons.length - 3 !== 1 ? 'es' : ''} más</span>
                        </li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
          
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
          
          {/* VISTA GRUPAL - USANDO engineOutput.group */}
          {activeTab === 'group' && participants.length > 1 && engineOutput.group && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2 border-purple-400/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/20 rounded-full p-3">
                    <span className="text-purple-400 text-xl">👥</span>
                  </div>
                  <div>
                    <h3 className="text-purple-400 font-bold text-lg">Recomendaciones Grupales</h3>
                    <p className="text-purple-300 text-sm">
                      Análisis de {engineOutput.group.analyzedPlayers} jugadores con datos • {analysisWindowDays} días
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {engineOutput.group.items.map((item, index) => {
                  const colors = getColorForAction(item.action);
                  const showGap = item.action !== 'OPTIMO';
                  
                  return (
                    <div key={`${item.level}-${item.area}-${index}`} 
                         className="bg-gray-800/50 border border-gray-600/50 rounded-xl overflow-hidden">
                      <div className={`p-4 ${colors.bg}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`rounded-full p-3 ${colors.bgHover}`}>
                              <span className="text-xl">{colors.icon}</span>
                            </div>
                            <div>
                              <span className={`font-bold text-xl ${colors.text}`}>
                                {getUILabel(item.area, 'tipo')}
                              </span>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-gray-300">
                                  Promedio Grupal: <strong className={colors.text}>{item.currentPercentage}%</strong>
                                </span>
                                <span className="text-sm text-gray-300">
                                  Meta: <strong>{item.plannedPercentage}%</strong>
                                </span>
                                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                                  {engineOutput.group.analyzedPlayers} jugadores
                                </span>
                              </div>
                            </div>
                          </div>
                          {showGap && (
                            <div className="text-right">
                              <span className={`text-xl font-bold ${colors.text}`}>
                                {item.gap > 0 ? '+' : ''}{item.gap.toFixed(1)}%
                              </span>
                              <div className={`text-xs ${colors.text}`}>
                                {colors.label}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-gradient-to-r from-blue-500/15 to-cyan-500/15 border-2 border-blue-400/40 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/30 rounded-full p-2">
                    <span className="text-blue-400 text-lg">💭</span>
                  </div>
                  <div>
                    <p className="text-blue-400 font-semibold text-base">Estrategia Recomendada</p>
                    <p className="text-blue-300 text-sm mt-1">
                      {engineOutput.group.recommendation}
                    </p>
                  </div>
                </div>
              </div>

              {engineOutput.group.strongCoincidences.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span>🎯</span>
                    Coincidencias grupales detectadas:
                  </h5>
                  <div className="space-y-2">
                    {engineOutput.group.strongCoincidences.map((coincidencia, index) => {
                      const colors = getColorForAction(coincidencia.action);
                      return (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">
                              {coincidencia.level === 'TIPO' ? '🎾' : '🎯'}
                            </span>
                            <span className="text-white font-medium">
                              {coincidencia.area}
                            </span>
                            <span className={`text-sm ${colors.text}`}>
                              ({colors.label})
                            </span>
                          </div>
                          <div className="text-right text-sm">
                            <div className="text-gray-300">
                              Afecta a <span className="font-semibold text-white">{coincidencia.playerCount} jugadores</span>
                            </div>
                            <div className="text-gray-400">
                              (gap promedio: {coincidencia.averageGap > 0 ? '+' : ''}{coincidencia.averageGap}%)
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* VISTA INDIVIDUAL - USANDO engineOutput.individual */}
          {(activeTab === 'individual' || participants.length === 1) && (
            <div className="space-y-4">
              {participants.length > 1 && (
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2 border-purple-400/30 rounded-xl p-4">
                  <label className="text-purple-400 font-semibold text-base mb-3 flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    Seleccionar jugador:
                  </label>
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
                    className="w-full bg-gray-800 border-2 border-purple-400/40 rounded-lg px-4 py-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all"
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
                const playerAnalysis = analyzePlayerSessions(selectedPlayerId);
                
                if (!playerData) {
                  return (
                    <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6 text-center">
                      <p className="text-gray-400">No hay datos para este jugador</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Jugador seleccionado: {selectedPlayerId}<br/>
                        Jugadores disponibles: {Object.keys(engineOutput.individual).join(', ')}
                      </p>
                    </div>
                  );
                }
                
                return (
                  <>
                    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-purple-500/20 rounded-full p-2">
                          <span className="text-purple-400 text-lg">📊</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-purple-400 text-base">
                            Análisis Individual {playerData.summary.planUsed === 'real' ? '🎯' : '⚠️'}
                          </h4>
                          <p className="text-purple-300 text-sm">
                            Basado en {playerData.summary.totalExercises} ejercicios de {playerData.summary.sessionsAnalyzed} sesiones
                            {playerData.summary.planUsed === 'real' ? ' con plan personalizado' : ' con valores por defecto'}
                            • últimos {analysisWindowDays} días
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center bg-purple-500/10 rounded-lg p-3">
                          <div className="text-lg font-bold text-purple-400">{playerData.summary.sessionsAnalyzed}</div>
                          <div className="text-xs text-purple-300">Sesiones</div>
                        </div>
                        <div className="text-center bg-purple-500/10 rounded-lg p-3">
                          <div className="text-lg font-bold text-purple-400">{playerData.summary.totalExercises}</div>
                          <div className="text-xs text-purple-300">Ejercicios</div>
                        </div>
                        <div className="text-center bg-purple-500/10 rounded-lg p-3">
                          <div className="text-lg font-bold text-purple-400">{playerData.summary.totalMinutes}</div>
                          <div className="text-xs text-purple-300">Minutos</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Agrupar items por tipo */}
                      {Object.values(TipoType).map(tipo => {
                        const tipoItems = playerData.items.filter(item => 
                          (item.level === 'TIPO' && item.area === tipo) ||
                          (item.parentType === tipo)
                        );
                        
                        if (tipoItems.length === 0) {
                          return null;
                        }
                        
                        const tipoMain = tipoItems.find(item => item.level === 'TIPO');
                        if (!tipoMain) return null;
                        
                        const colors = getColorForAction(tipoMain.action);
                        const isExpanded = expandedRecommendations.has(`type-${tipo}`);
                        
                        return (
                          <div key={tipo} className="bg-gray-800/50 border border-gray-600/50 rounded-xl overflow-hidden">
                            <div 
                              className={`cursor-pointer p-4 transition-all duration-300 ${colors.bg} hover:bg-opacity-80`}
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
                                  <div className={`rounded-full p-3 ${colors.bgHover}`}>
                                    <span className="text-xl">{colors.icon}</span>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className={`font-bold text-xl ${colors.text}`}>
                                        {getUILabel(tipo, 'tipo')}
                                      </span>
                                      <span className="text-xs px-2 py-1 bg-gray-600/50 text-gray-300 rounded font-medium">
                                        {tipoMain.basedOn.exercises} ejercicios
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-sm text-gray-300">
                                        Actual: <strong className={colors.text}>{tipoMain.currentPercentage}%</strong>
                                      </span>
                                      <span className="text-sm text-gray-300">
                                        Meta: <strong>{tipoMain.plannedPercentage}%</strong>
                                      </span>
                                      {tipoMain.isDefault && (
                                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded">
                                          Default
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {tipoMain.action !== 'OPTIMO' && (
                                    <div className="text-right">
                                      <span className={`text-xl font-bold ${colors.text}`}>
                                        {tipoMain.gap > 0 ? '+' : ''}{tipoMain.gap.toFixed(1)}%
                                      </span>
                                      <div className={`text-xs ${colors.text}`}>
                                        {colors.label}
                                      </div>
                                    </div>
                                  )}
                                  <svg 
                                    className={`w-5 h-5 transition-transform ${
                                      isExpanded ? 'rotate-180' : ''
                                    } ${colors.text}`}
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    strokeWidth={2} 
                                    stroke="currentColor"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="p-4 bg-gray-900/30 border-t border-gray-600/30">
                                <div className="space-y-2">
                                  {tipoItems
                                    .filter(item => item.level === 'AREA')
                                    .map((areaItem, idx) => {
                                      const areaColors = getColorForAction(areaItem.action);
                                      
                                      return (
                                        <div key={idx} className={`p-3 rounded-lg border ${areaColors.bg} ${areaColors.border}`}>
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <span className="text-lg">{areaColors.icon}</span>
                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <span className={`font-medium ${areaColors.text}`}>
                                                    {getUILabel(areaItem.area, 'area')}
                                                  </span>
                                                  {areaItem.basedOn.exercises > 0 && (
                                                    <span className="text-xs px-2 py-1 bg-gray-600/50 text-gray-300 rounded">
                                                      {areaItem.basedOn.exercises} ejercicios
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                  <span className="text-xs text-gray-400">
                                                    Actual: <span className={areaColors.text}>{areaItem.currentPercentage}%</span>
                                                  </span>
                                                  <span className="text-xs text-gray-400">
                                                    Meta: <span className="text-gray-300">{areaItem.plannedPercentage}%</span>
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                            {areaItem.action !== 'OPTIMO' && (
                                              <div className="text-right">
                                                <div className={`text-sm font-semibold ${areaColors.text}`}>
                                                  {areaColors.label}
                                                </div>
                                                <div className={`text-xs ${areaColors.text}`}>
                                                  {areaItem.gap > 0 ? '+' : ''}{areaItem.gap.toFixed(1)}%
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
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
  );
};

export default ActiveSessionRecommendations;