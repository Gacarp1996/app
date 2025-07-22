import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Player } from '../../types';
import { useTrainingRecommendations } from '../../hooks/useTrainingRecommendations';
import { generateActionableRecommendations } from '@/utils/recomendations';


interface ActiveSessionRecommendationsProps {
  participants: Player[];
  academiaId: string;
  sessions: any[];
  currentExercises?: any[];
}

const ActiveSessionRecommendations: React.FC<ActiveSessionRecommendationsProps> = ({
  participants,
  academiaId,
  sessions,
  currentExercises = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [sessionDuration, setSessionDuration] = useState(90);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  
  // 🔧 Usar ref para trackear el último estado de ejercicios
  const lastExercisesRef = useRef<string>('');

  // Hook de recomendaciones
  const {
    recommendations,
    loading,
    generateRecommendationsWithExercises,
    clearRecommendations
  } = useTrainingRecommendations({
    players: participants,
    sessions,
    academiaId,
    manualMode: true
  });

  // Auto-seleccionar primer jugador
  useEffect(() => {
    if (participants.length > 0 && !selectedPlayerId) {
      setSelectedPlayerId(participants[0].id);
    }
  }, [participants, selectedPlayerId]);

  // Función para generar recomendaciones
  const handleGenerateRecommendations = useCallback(async () => {
    console.log('🔴 Generando recomendaciones con ejercicios actuales:', currentExercises.length);
    
    const playerIds = participants.map(p => p.id);
    await generateRecommendationsWithExercises(playerIds, currentExercises);
    setHasGeneratedOnce(true);
    
    // 🔧 Guardar el estado actual de ejercicios
    lastExercisesRef.current = JSON.stringify(currentExercises);
    
    console.log('✅ Recomendaciones generadas');
  }, [participants, currentExercises, generateRecommendationsWithExercises]);

  // 🔧 Limpiar cuando cambien ejercicios (con verificación mejorada)
  useEffect(() => {
    const currentExercisesStr = JSON.stringify(currentExercises);
    
    // Solo limpiar si:
    // 1. Ya generamos recomendaciones antes
    // 2. Los ejercicios realmente cambiaron
    // 3. Hay recomendaciones actuales
    if (hasGeneratedOnce && 
        currentExercisesStr !== lastExercisesRef.current && 
        Object.keys(recommendations).length > 0) {
      
      console.log('🧹 Ejercicios cambiaron - limpiando recomendaciones anteriores');
      clearRecommendations();
      setHasGeneratedOnce(false);
    }
  }, [currentExercises, hasGeneratedOnce, recommendations, clearRecommendations]);

  // Obtener recomendaciones del jugador seleccionado
  const selectedPlayerRecs = useMemo(() => {
    if (!selectedPlayerId || !recommendations[selectedPlayerId]) {
      return null;
    }

    const playerRecs = recommendations[selectedPlayerId];
    if (!playerRecs.recommendations || playerRecs.recommendations.length === 0) {
      return playerRecs;
    }

    // Agregar hierarchyLevel a las recomendaciones para compatibilidad
    const consolidatedRecs = playerRecs.recommendations.map((rec: any) => ({
      ...rec,
      hierarchyLevel: rec.exercise ? 'exercise' : rec.subcategory ? 'subcategory' : 'category' as 'category' | 'subcategory' | 'exercise',
      consolidatedCount: 1
    }));

    // Convertir a actionables
    const actionable = generateActionableRecommendations(consolidatedRecs, sessionDuration);
    
    return {
      ...playerRecs,
      recommendations: actionable
    };
  }, [selectedPlayerId, recommendations, sessionDuration]);

  const hasRecommendations = Object.keys(recommendations).length > 0;
  const totalRecommendations = Object.values(recommendations).reduce(
    (sum, rec) => sum + (rec?.recommendations?.length || 0), 0
  );

  return (
    <div className="bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl shadow-lg">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl">
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-green-500/20 to-cyan-500/20 rounded-lg">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014.846 17H9.154a3.374 3.374 0 00-1.849-.553l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Recomendaciones de Entrenamiento</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>{participants.length} jugador{participants.length > 1 ? 'es' : ''}</span>
                  <span>•</span>
                  <span>{currentExercises.length} ejercicio{currentExercises.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            
            {hasRecommendations && (
              <span className="px-2 py-1 text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/20 rounded-full">
                {totalRecommendations} área{totalRecommendations > 1 ? 's' : ''} por agregar
              </span>
            )}
          </div>

          {/* Controles */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Control de duración */}
            <div className="flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <label className="text-sm text-gray-300">Duración:</label>
              <input
                type="number"
                min="30"
                max="180"
                value={sessionDuration}
                onChange={(e) => setSessionDuration(parseInt(e.target.value) || 90)}
                className="w-16 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
              />
              <span className="text-sm text-gray-400">min</span>
            </div>

            {/* Botón generar */}
            <button
              onClick={handleGenerateRecommendations}
              disabled={loading || participants.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                loading
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : !hasRecommendations || hasGeneratedOnce === false
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg'
                    : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  <span>Analizando...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  <span>{!hasRecommendations ? 'Generar Recomendaciones' : 'Regenerar'}</span>
                </>
              )}
            </button>

            {/* Botón expandir */}
            {hasRecommendations && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all"
              >
                <span>{isExpanded ? 'Contraer' : 'Ver Detalles'}</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  strokeWidth={2} 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>

          {/* Mensaje cuando no hay recomendaciones */}
          {!hasRecommendations && !loading && (
            <div className="bg-gray-800/30 rounded-lg p-3 text-center">
              <p className="text-gray-400 text-sm">
                {currentExercises.length === 0 
                  ? 'Agrega ejercicios y presiona "Generar Recomendaciones" para obtener sugerencias'
                  : 'Presiona "Generar Recomendaciones" para analizar la sesión'
                }
              </p>
            </div>
          )}
        </div>

        {/* Contenido expandible */}
        {isExpanded && hasRecommendations && (
          <div className="px-4 pb-4 border-t border-gray-800">
            <div className="mt-4 space-y-4">
              {/* Selector de jugador para múltiples participantes */}
              {participants.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Jugador a analizar:
                  </label>
                  <select
                    value={selectedPlayerId}
                    onChange={(e) => setSelectedPlayerId(e.target.value)}
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

              {/* Recomendaciones del jugador */}
              {selectedPlayerRecs && (
                <>
                  {/* Resumen */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <p className="text-white font-medium mb-1">
                          Análisis de Sesión ({sessionDuration} min)
                        </p>
                        <p className="text-gray-300 text-sm">{selectedPlayerRecs.summary}</p>
                      </div>
                    </div>
                  </div>

                  {/* Lista de recomendaciones */}
                  {selectedPlayerRecs.recommendations && selectedPlayerRecs.recommendations.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
                        🎯 Qué Agregar
                      </h5>
                      
                      <div className="space-y-2">
                        {selectedPlayerRecs.recommendations.map((rec: any, index: number) => (
                          <div key={index} className={`border ${rec.difference > 0 ? 'border-red-500/30 bg-red-500/10 text-red-400' : 'border-blue-500/30 bg-blue-500/10 text-blue-400'} rounded-lg p-3`}>
                            <div className="flex items-start gap-3">
                              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                {rec.difference > 0 ? (
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                ) : (
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                )}
                              </svg>
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm">
                                    {rec.exercise || rec.subcategory || rec.category}
                                  </span>
                                  <span className="text-xs font-medium px-2 py-0.5 bg-black/20 rounded-full">
                                    {rec.difference > 0 ? 'FALTA' : 'SOBRA'} {rec.calculatedMinutes || Math.round(Math.abs(rec.difference) * sessionDuration / 100)} min
                                  </span>
                                </div>
                                
                                {rec.actionableText && (
                                  <p className="text-xs font-medium opacity-95 mb-2">
                                    💡 {rec.actionableText}
                                  </p>
                                )}
                                
                                <div className="flex items-center justify-between text-xs opacity-60 border-t border-current/10 pt-2">
                                  <span>Actual: {rec.currentPercentage}%</span>
                                  <span>Objetivo: {rec.plannedPercentage}%</span>
                                  <span className="font-medium">Diferencia: {Math.abs(rec.difference)}%</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mensaje sin recomendaciones */}
                  {(!selectedPlayerRecs.recommendations || selectedPlayerRecs.recommendations.length === 0) && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-green-400 text-sm font-medium mb-1">
                            Entrenamiento balanceado
                          </p>
                          <p className="text-green-300 text-xs">
                            El jugador está siguiendo su plan correctamente. ¡Continúa así!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveSessionRecommendations;