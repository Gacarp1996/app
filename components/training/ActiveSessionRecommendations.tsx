import React, { useState, useEffect } from 'react';
import { TrainingSession } from '../../types';
import { UI_LABELS, TipoType, AreaType } from '../../constants/training';
import { RecommendationLegend } from './RecommendationLegend';
import { useActiveSessionRecommendations } from '../../hooks/useActiveSessionRecommendations';

interface Participant {
  id: string;
  name: string;
}

// ✅ INTERFACE SIMPLIFICADA - Eliminamos academiaId y sessions
interface ActiveSessionRecommendationsProps {
  participants: Participant[];
}

const ActiveSessionRecommendations: React.FC<ActiveSessionRecommendationsProps> = ({ 
  participants
}) => {
  const [activeTab, setActiveTab] = useState<'individual' | 'group'>('individual');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(participants[0]?.id || '');
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<string>>(new Set());
  const [showLegend, setShowLegend] = useState(false);

  // ✅ USAR EL HOOK SIN academiaId
  const {
    recommendationsGenerated,
    individualRecommendations,
    groupRecommendations,
    dataPreview,
    recommendationsLoading,
    generateRecommendations,
    refreshRecommendations,
    analyzePlayerExercises,
    analyzePlayerSessions,
    getIdealPercentageForType,
    getIdealPercentageForAreaInType
  } = useActiveSessionRecommendations({ participants });

  // Función para obtener el label UI para mostrar
  const getUILabel = (value: string, type: 'tipo' | 'area'): string => {
    if (type === 'tipo' && value in UI_LABELS.TIPOS) {
      return UI_LABELS.TIPOS[value as TipoType];
    }
    if (type === 'area' && value in UI_LABELS.AREAS) {
      return UI_LABELS.AREAS[value as AreaType];
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  // Regenerar recomendaciones cuando cambie el jugador seleccionado
  useEffect(() => {
    if (recommendationsGenerated && selectedPlayerId) {
      const individualAnalysis = analyzePlayerExercises(selectedPlayerId);
      // No podemos actualizar el estado del hook desde aquí, pero el componente se re-renderizará
    }
  }, [selectedPlayerId, recommendationsGenerated, analyzePlayerExercises]);

  // Configurar jugador seleccionado por defecto
  useEffect(() => {
    if (participants.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(participants[0].id);
    }
  }, [participants, selectedPlayerId]);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
          <h4 className="text-lg font-semibold text-white">Recomendaciones</h4>
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

      {/* Leyenda de colores */}
      {showLegend && (
        <RecommendationLegend className="mb-4" />
      )}

      {/* Loading state */}
      {recommendationsLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
          <span className="ml-3 text-gray-400">Analizando recomendaciones...</span>
        </div>
      )}

      {/* Placeholder inicial */}
      {!recommendationsLoading && !recommendationsGenerated && !dataPreview && (
        <div className="bg-gray-800/30 border border-gray-600/30 rounded-xl p-6 text-center">
          <span className="text-gray-400 text-2xl block mb-2">📊</span>
          <p className="text-gray-400 font-medium">Listo para generar recomendaciones</p>
          <p className="text-gray-500 text-sm mt-1">
            Los datos se cargarán cuando presiones el botón de análisis
          </p>
        </div>
      )}

      {/* Preview de datos y botón para generar */}
      {!recommendationsLoading && !recommendationsGenerated && dataPreview && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-2 border-blue-400/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-500/20 rounded-full p-3">
                <span className="text-blue-400 text-xl">📊</span>
              </div>
              <div>
                <h4 className="font-semibold text-blue-400 text-base">Datos Disponibles para Análisis</h4>
                <p className="text-blue-300 text-sm">
                  Revisión previa antes de generar recomendaciones
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
            
            <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/20">
              <h5 className="text-xs font-semibold text-blue-400 mb-2">Detalle por jugador:</h5>
              <div className="space-y-2">
                {dataPreview.participantsPreviews.map((participant: any, index: number) => (
                  <div key={index} className={`flex items-center justify-between text-xs p-2 rounded ${
                    participant.hasData ? 'bg-green-500/10 border border-green-500/20' : 'bg-gray-500/10 border border-gray-500/20'
                  }`}>
                    <span className={participant.hasData ? 'text-green-300' : 'text-gray-400'}>
                      {participant.playerName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={participant.hasData ? 'text-green-400' : 'text-gray-400'}>
                        {participant.sessionsCount} sesiones
                      </span>
                      <span className={participant.hasData ? 'text-green-400' : 'text-gray-400'}>
                        {participant.exercisesCount} ejercicios
                      </span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        participant.hasPlan ? 'bg-purple-500/20 text-purple-300' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {participant.hasPlan ? 'Plan' : 'Default'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {dataPreview.playersWithData === 0 && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-red-400">⚠️</span>
                  <span className="text-red-400 text-sm font-medium">Sin datos suficientes</span>
                </div>
                <p className="text-red-300 text-xs mt-1">
                  No se encontraron sesiones de entrenamiento en los últimos 30 días
                </p>
              </div>
            )}
            
            {dataPreview.playersWithPlans < dataPreview.playersWithData && (
              <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">💡</span>
                  <span className="text-yellow-400 text-sm font-medium">Planes de entrenamiento</span>
                </div>
                <p className="text-yellow-300 text-xs mt-1">
                  {dataPreview.playersWithData - dataPreview.playersWithPlans} jugador(es) usarán valores por defecto
                </p>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <button
              onClick={generateRecommendations}
              disabled={!dataPreview.canGenerateRecommendations}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                dataPreview.canGenerateRecommendations
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 shadow-lg hover:shadow-xl'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {dataPreview.canGenerateRecommendations ? (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">🎯</span>
                  <span>Generar Recomendaciones</span>
                  <span className="text-sm opacity-80">
                    ({dataPreview.playersWithData} jugador{dataPreview.playersWithData !== 1 ? 'es' : ''})
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <span className="text-2xl">❌</span>
                  <span>Sin datos para analizar</span>
                </div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Contenido de recomendaciones generadas */}
      {!recommendationsLoading && recommendationsGenerated && (
        <div className="space-y-4">
          {/* Botón para regenerar */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-green-400 text-lg">✅</span>
              <span className="text-green-400 font-semibold">Recomendaciones Generadas</span>
            </div>
            <button
              onClick={refreshRecommendations}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              🔄 Regenerar
            </button>
          </div>
          
          {/* Tabs */}
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
          
          {/* Vista Grupal */}
          {activeTab === 'group' && participants.length > 1 && groupRecommendations && (
            <div className="space-y-4">
              {/* Header para recomendaciones grupales */}
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2 border-purple-400/30 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/20 rounded-full p-3">
                    <span className="text-purple-400 text-xl">👥</span>
                  </div>
                  <div>
                    <h3 className="text-purple-400 font-bold text-lg">Recomendaciones Grupales</h3>
                    <p className="text-purple-300 text-sm">
                      Análisis real de {groupRecommendations.analyzedPlayers} jugadores con datos ({groupRecommendations.sessionAnalysis.totalSessionsAnalyzed} sesiones totales)
                    </p>
                  </div>
                </div>
                
                {/* Mostrar información detallada de los datos */}
                <div className="mt-3 p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                  <h4 className="text-xs font-semibold text-purple-400 mb-2">Jugadores analizados:</h4>
                  <div className="grid grid-cols-1 gap-2">
                    {groupRecommendations.participantsWithData.map((participant: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-purple-300">{participant.playerName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-purple-400">{participant.totalExercises} ejercicios</span>
                          <span className="text-purple-400">{participant.sessionsCount} sesiones</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            participant.planUsed === 'real' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {participant.planUsed === 'real' ? 'Plan' : 'Default'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recomendaciones grupales - mostrar promedios reales */}
              <div className="space-y-3">
                {['Canasto', 'Peloteo'].map((tipo) => {
                  const currentPercentage = groupRecommendations.groupAverages[tipo] || 0;
                  const plannedPercentage = 50; // Meta por defecto
                  const difference = Math.abs(currentPercentage - plannedPercentage);
                  const isDeficit = currentPercentage < plannedPercentage;

                  return (
                    <div key={tipo} className="bg-gray-800/50 border border-gray-600/50 rounded-xl overflow-hidden">
                      <div 
                        className={`p-4 ${
                          difference > 5 ? (isDeficit ? 'bg-red-500/20' : 'bg-green-500/20') : 'bg-blue-500/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`rounded-full p-3 ${
                              difference > 5 ? (isDeficit ? 'bg-red-500/30' : 'bg-green-500/30') : 'bg-blue-500/30'
                            }`}>
                              <span className="text-xl">
                                {tipo === 'Canasto' ? '🧺' : '🎾'}
                              </span>
                            </div>
                            <div>
                              <span className={`font-bold text-xl ${
                                difference > 5 ? (isDeficit ? 'text-red-300' : 'text-green-300') : 'text-blue-300'
                              }`}>
                                {tipo}
                              </span>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-gray-300">
                                  Promedio Grupal: <strong className={difference > 5 ? (isDeficit ? 'text-red-400' : 'text-green-400') : 'text-blue-400'}>{currentPercentage}%</strong>
                                </span>
                                <span className="text-sm text-gray-300">
                                  Meta: <strong>{plannedPercentage}%</strong>
                                </span>
                                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                                  Datos reales
                                </span>
                              </div>
                            </div>
                          </div>
                          {difference > 5 && (
                            <span className={`text-xl font-bold ${isDeficit ? 'text-red-400' : 'text-green-400'}`}>
                              {isDeficit ? '+' : '-'}{difference.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sugerencia práctica basada en datos reales */}
              <div className="bg-gradient-to-r from-blue-500/15 to-cyan-500/15 border-2 border-blue-400/40 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/30 rounded-full p-2">
                    <span className="text-blue-400 text-lg">💭</span>
                  </div>
                  <div>
                    <p className="text-blue-400 font-semibold text-base">Estrategia Basada en Datos Reales</p>
                    <p className="text-blue-300 text-sm mt-1">
                      {groupRecommendations.recommendation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Coincidencias grupales */}
              {groupRecommendations.hasStrongCoincidences && groupRecommendations.coincidencias.length > 0 && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h5 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span>🎯</span>
                    Coincidencias grupales detectadas:
                  </h5>
                  <div className="space-y-2">
                    {groupRecommendations.coincidencias.map((coincidencia: any, index: number) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">
                            {coincidencia.level === 'TIPO' ? '🎾' : '🎯'}
                          </span>
                          <span className="text-white font-medium">
                            {coincidencia.area}
                          </span>
                          <span className={`text-sm ${
                            coincidencia.type === 'INCREMENTAR' ? 'text-red-400' : 'text-yellow-400'
                          }`}>
                            ({coincidencia.type === 'INCREMENTAR' ? '↑' : '↓'})
                          </span>
                        </div>
                        <div className="text-right text-sm">
                          <div className="text-gray-300">
                            Afecta a <span className="font-semibold text-white">{coincidencia.playerCount} jugadores</span>
                          </div>
                          <div className="text-gray-400">
                            (prom. {coincidencia.promedioDiferencia}% de gap)
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Vista Individual */}
          {(activeTab === 'individual' || participants.length === 1) && individualRecommendations && (
            <div className="space-y-4">
              {/* Selector de jugador mejorado */}
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

              {/* Análisis de sesiones del jugador */}
              {(() => {
                const playerAnalysis = analyzePlayerSessions(selectedPlayerId);
                const realAnalysis = analyzePlayerExercises(selectedPlayerId);
                
                return (
                  <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-purple-500/20 rounded-full p-2">
                        <span className="text-purple-400 text-lg">📊</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-purple-400 text-base">
                          Análisis Real de Datos {realAnalysis.planUsed === 'real' ? '🎯' : '⚠️'}
                        </h4>
                        <p className="text-purple-300 text-sm">
                          Basado en {realAnalysis.totalExercises} ejercicios de {playerAnalysis.totalSessions} sesiones reales
                          {realAnalysis.planUsed === 'real' ? ' con plan personalizado' : ' con valores por defecto'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center bg-purple-500/10 rounded-lg p-3">
                        <div className="text-lg font-bold text-purple-400">{playerAnalysis.totalSessions}</div>
                        <div className="text-xs text-purple-300">Sesiones</div>
                      </div>
                      <div className="text-center bg-purple-500/10 rounded-lg p-3">
                        <div className="text-lg font-bold text-purple-400">{realAnalysis.totalExercises}</div>
                        <div className="text-xs text-purple-300">Ejercicios</div>
                      </div>
                      <div className="text-center bg-purple-500/10 rounded-lg p-3">
                        <div className="text-lg font-bold text-purple-400">{Object.keys(realAnalysis.typeStats).length}</div>
                        <div className="text-xs text-purple-300">Tipos</div>
                      </div>
                    </div>
                    
                    {/* Indicador de fuente de datos */}
                    <div className="mt-3 p-2 rounded border">
                      {realAnalysis.totalExercises > 0 ? (
                        <div className={`text-xs ${realAnalysis.planUsed === 'real' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'}`}>
                          {realAnalysis.planUsed === 'real' ? 
                            '✅ Usando plan de entrenamiento personalizado del jugador' : 
                            '⚠️ Plan no encontrado, usando valores por defecto'
                          }
                        </div>
                      ) : (
                        <div className="text-xs text-red-400 bg-red-500/10 border-red-500/20">
                          ❌ No se encontraron ejercicios recientes para este jugador
                        </div>
                      )}
                    </div>
                    
                    {playerAnalysis.dateRange && (
                      <div className="mt-3 text-center">
                        <div className="text-xs text-purple-400">
                          Período: {playerAnalysis.dateRange.from} - {playerAnalysis.dateRange.to}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Recomendaciones jerárquicas por tipo */}
              {(() => {
                const realAnalysis = analyzePlayerExercises(selectedPlayerId);
                const typeRecommendations: { [key: string]: any[] } = {};
                const mainTypes = ['Canasto', 'Peloteo'];
                
                realAnalysis.recommendations.forEach((rec: any) => {
                  if (rec.level === 'TIPO' && mainTypes.includes(rec.area)) {
                    if (!typeRecommendations[rec.area]) {
                      typeRecommendations[rec.area] = [];
                    }
                    typeRecommendations[rec.area].push(rec);
                  } else if (rec.parentType && mainTypes.includes(rec.parentType)) {
                    if (!typeRecommendations[rec.parentType]) {
                      typeRecommendations[rec.parentType] = [];
                    }
                    typeRecommendations[rec.parentType].push(rec);
                  }
                });

                // Agregar estadísticas de tipos sin recomendaciones para mostrar el estado
                mainTypes.forEach(tipo => {
                  const typeStats = realAnalysis.typeStats as { [key: string]: any };
                  if (!typeRecommendations[tipo] && typeStats && typeStats[tipo]) {
                    const stats = typeStats[tipo];
                    const plannedPercentage = getIdealPercentageForType(tipo, selectedPlayerId);
                    const difference = Math.abs(stats.percentage - plannedPercentage);
                    
                    if (!typeRecommendations[tipo]) {
                      typeRecommendations[tipo] = [];
                    }
                    
                    typeRecommendations[tipo].unshift({
                      level: 'TIPO',
                      type: stats.percentage < plannedPercentage ? 'INCREMENTAR' : 'REDUCIR',
                      area: tipo,
                      currentPercentage: stats.percentage,
                      plannedPercentage: plannedPercentage,
                      difference: difference,
                      priority: difference > 15 ? 'high' : difference > 10 ? 'medium' : 'low',
                      reason: `${stats.percentage < plannedPercentage ? 'Déficit' : 'Exceso'} en tipo ${tipo}: ${stats.percentage}% actual vs ${plannedPercentage}% planificado`,
                      basedOnExercises: stats.total,
                      details: stats,
                      isStatus: difference <= 5
                    });
                  }
                });

                return (
                  <div className="space-y-3">
                    {mainTypes.filter(tipo => {
                      const typeStatsTyped = realAnalysis.typeStats as { [key: string]: any };
                      const hasStats = typeStatsTyped && typeStatsTyped[tipo] && typeStatsTyped[tipo].total > 0;
                      const hasRecommendations = typeRecommendations[tipo] && typeRecommendations[tipo].length > 0;
                      return hasStats || hasRecommendations;
                    }).map((tipo) => {
                      const recommendations = typeRecommendations[tipo] || [];
                      const typeStatsTyped = realAnalysis.typeStats as { [key: string]: any };
                      const typeStats = typeStatsTyped ? typeStatsTyped[tipo] : null;
                      const plannedPercentage = getIdealPercentageForType(tipo, selectedPlayerId);
                      const currentPercentage = typeStats ? typeStats.percentage : 0;
                      const isDeficit = currentPercentage < plannedPercentage;
                      const difference = Math.abs(currentPercentage - plannedPercentage);
                      
                      return (
                        <div key={tipo} className="bg-gray-800/50 border border-gray-600/50 rounded-xl overflow-hidden">
                          <div 
                            className={`cursor-pointer p-4 transition-all duration-300 ${
                              difference > 5 ? (isDeficit ? 'bg-red-500/20 border-red-500/30' : 'bg-green-500/20 border-green-500/30') : 'bg-blue-500/20 border-blue-500/30'
                            } hover:bg-opacity-80`}
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
                                <div className={`rounded-full p-3 ${
                                  difference > 5 ? (isDeficit ? 'bg-red-500/30' : 'bg-green-500/30') : 'bg-blue-500/30'
                                }`}>
                                  <span className="text-xl">
                                    {tipo === 'Canasto' ? '🧺' : '🎾'}
                                    {difference > 5 ? (isDeficit ? '📈' : '📉') : '✅'}
                                  </span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-bold text-xl ${
                                      difference > 5 ? (isDeficit ? 'text-red-300' : 'text-green-300') : 'text-blue-300'
                                    }`}>
                                      {tipo}
                                    </span>
                                    <span className="text-xs px-2 py-1 bg-gray-600/50 text-gray-300 rounded font-medium">
                                      {typeStats ? typeStats.total : 0} ejercicios
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-sm text-gray-300">
                                      Actual: <strong className={difference > 5 ? (isDeficit ? 'text-red-400' : 'text-green-400') : 'text-blue-400'}>{currentPercentage}%</strong>
                                    </span>
                                    <span className="text-sm text-gray-300">
                                      Meta: <strong>{plannedPercentage}%</strong>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {difference > 5 && (
                                  <span className={`text-xl font-bold ${isDeficit ? 'text-red-400' : 'text-green-400'}`}>
                                    {isDeficit ? '+' : '-'}{difference.toFixed(1)}%
                                  </span>
                                )}
                                <svg 
                                  className={`w-5 h-5 transition-transform ${
                                    expandedRecommendations.has(`type-${tipo}`) ? 'rotate-180' : ''
                                  } ${difference > 5 ? (isDeficit ? 'text-red-300' : 'text-green-300') : 'text-blue-300'}`}
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

                          {/* Contenido expandible del tipo */}
                          {expandedRecommendations.has(`type-${tipo}`) && (
                            <div className="p-4 bg-gray-900/30 border-t border-gray-600/30">
                              {/* Recomendación principal del tipo */}
                              {recommendations.filter(rec => rec.level === 'TIPO').map((rec: any, index: number) => (
                                <div key={`tipo-${index}`} className={`mb-4 p-3 rounded-lg border ${
                                  rec.isStatus ? 'bg-blue-500/10 border-blue-500/20' :
                                  rec.type === 'INCREMENTAR' ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">🎯</span>
                                      <span className={`font-semibold ${
                                        rec.isStatus ? 'text-blue-400' :
                                        rec.type === 'INCREMENTAR' ? 'text-red-400' : 'text-green-400'
                                      }`}>
                                        {rec.isStatus ? 'Estado Óptimo' : 
                                         rec.type === 'INCREMENTAR' ? 'INCREMENTAR' : 'REDUCIR'} {tipo}
                                      </span>
                                    </div>
                                    {!rec.isStatus && (
                                      <span className={`font-bold ${rec.type === 'INCREMENTAR' ? 'text-red-400' : 'text-green-400'}`}>
                                        {rec.type === 'INCREMENTAR' ? '+' : '-'}{rec.difference.toFixed(1)}%
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-sm mt-1 ${
                                    rec.isStatus ? 'text-blue-300' :
                                    rec.type === 'INCREMENTAR' ? 'text-red-300' : 'text-green-300'
                                  }`}>
                                    {rec.reason}
                                  </p>
                                </div>
                              ))}

                              {/* Áreas organizadas verticalmente */}
                              {(() => {
                                const allAreas = {
                                  'Canasto': ['Juego De Base', 'Juego De Red', 'Primeras Pelotas'],
                                  'Peloteo': ['Juego De Base', 'Juego De Red', 'Puntos', 'Primeras Pelotas']
                                };
                                
                                const areasForType = allAreas[tipo as keyof typeof allAreas] || [];
                                
                                return areasForType.length > 0 ? (
                                  <div className="mb-4">
                                    <h5 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                                      <span>📍</span> Áreas de {tipo}
                                    </h5>
                                    <div className="space-y-2">
                                      {areasForType.map((area) => {
                                        const areaStats = typeStats?.areas?.[area];
                                        const currentPercentage = areaStats?.percentage || 0;
                                        const totalExercises = areaStats?.total || 0;
                                        const plannedPercentage = getIdealPercentageForAreaInType(area, tipo, selectedPlayerId);
                                        const difference = Math.abs(currentPercentage - plannedPercentage);
                                        const isDeficit = currentPercentage < plannedPercentage;
                                        
                                        let bgColor, borderColor, textColor, statusText, statusIcon;
                                        
                                        if (totalExercises === 0) {
                                          bgColor = 'bg-gray-500/10';
                                          borderColor = 'border-gray-500/30';
                                          textColor = 'text-gray-400';
                                          statusText = 'Sin datos';
                                          statusIcon = '⚪';
                                        } else if (difference <= 5) {
                                          bgColor = 'bg-blue-500/10';
                                          borderColor = 'border-blue-500/30';
                                          textColor = 'text-blue-400';
                                          statusText = 'Óptimo';
                                          statusIcon = '✅';
                                        } else if (isDeficit) {
                                          bgColor = 'bg-red-500/10';
                                          borderColor = 'border-red-500/30';
                                          textColor = 'text-red-400';
                                          statusText = 'Incrementar';
                                          statusIcon = '📈';
                                        } else {
                                          bgColor = 'bg-green-500/10';
                                          borderColor = 'border-green-500/30';
                                          textColor = 'text-green-400';
                                          statusText = 'Reducir';
                                          statusIcon = '📉';
                                        }
                                        
                                        return (
                                          <div key={area} className={`p-3 rounded-lg border ${bgColor} ${borderColor}`}>
                                            <div className="flex items-center justify-between">
                                              <div className="flex items-center gap-3">
                                                <span className="text-lg">{statusIcon}</span>
                                                <div>
                                                  <div className="flex items-center gap-2">
                                                    <span className={`font-medium ${textColor}`}>{area}</span>
                                                    {totalExercises > 0 && (
                                                      <span className="text-xs px-2 py-1 bg-gray-600/50 text-gray-300 rounded">
                                                        {totalExercises} ejercicios
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-gray-400">
                                                      Actual: <span className={textColor}>{currentPercentage}%</span>
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                      Meta: <span className="text-gray-300">{plannedPercentage}%</span>
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <div className={`text-sm font-semibold ${textColor}`}>
                                                  {statusText}
                                                </div>
                                                {difference > 5 && totalExercises > 0 && (
                                                  <div className={`text-xs ${textColor}`}>
                                                    {isDeficit ? '+' : '-'}{difference.toFixed(1)}%
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            
                                            {/* Mostrar ejercicios específicos si existen */}
                                            {areaStats && Object.keys(areaStats.exercises).length > 0 && (
                                              <div className="mt-2 pt-2 border-t border-gray-600/30">
                                                <div className="text-xs text-gray-400 mb-1">Ejercicios:</div>
                                                <div className="flex flex-wrap gap-1">
                                                  {Object.entries(areaStats.exercises).map(([ejercicio, repeticiones]) => (
                                                    <span key={ejercicio} className="text-xs px-2 py-1 bg-gray-700/50 text-gray-300 rounded">
                                                      {ejercicio} ({String(repeticiones)})
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : null;
                              })()}

                              {/* Recomendaciones por ejercicios */}
                              {(() => {
                                const exerciseRecs = recommendations.filter(rec => rec.level === 'EJERCICIO');
                                return exerciseRecs.length > 0 ? (
                                  <div>
                                    <h5 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                                      <span>🔧</span> Recomendaciones por Ejercicios
                                    </h5>
                                    <div className="space-y-2">
                                      {exerciseRecs.slice(0, 3).map((rec: any, index: number) => (
                                        <div key={`exercise-${index}`} className={`p-2 rounded border ${
                                          rec.type === 'INCREMENTAR' ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'
                                        }`}>
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span>🔧</span>
                                              <span className={`text-sm font-medium ${rec.type === 'INCREMENTAR' ? 'text-red-400' : 'text-green-400'}`}>
                                                {rec.area}
                                              </span>
                                              {rec.parentArea && (
                                                <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-300 rounded">
                                                  {rec.parentArea}
                                                </span>
                                              )}
                                            </div>
                                            <span className={`text-sm font-bold ${rec.type === 'INCREMENTAR' ? 'text-red-400' : 'text-green-400'}`}>
                                              {rec.basedOnExercises} veces
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                      {exerciseRecs.length > 3 && (
                                        <div className="text-center text-xs text-gray-400 py-2">
                                          +{exerciseRecs.length - 3} ejercicios más...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : null;
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Sin datos */}
              {individualRecommendations && individualRecommendations.totalExercises === 0 && (
                <div className="bg-gradient-to-r from-gray-800/30 to-gray-700/30 border-2 border-gray-600/40 rounded-xl p-6 text-center">
                  <div className="bg-gray-600/30 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-gray-400 text-2xl">📊</span>
                  </div>
                  <p className="text-gray-400 font-semibold text-base mb-2">Sin datos de entrenamientos</p>
                  <p className="text-gray-500 text-sm">
                    No se encontraron ejercicios en las sesiones recientes para este jugador
                  </p>
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