import React, { useState, useMemo, useEffect } from 'react';
import { Player } from '../types/types';
import { usePlanningAnalysis, AnalysisNode } from '../hooks/usePlanningAnalysis';
import { SessionExercise } from '../contexts/TrainingContext';
import { STATUS_COLORS, THRESHOLDS, getStatusFromDifference } from '../constants/recommendationThresholds';

interface PlanningAccordionProps {
  player: Player;
  academiaId: string;
  currentSessionExercises?: SessionExercise[];
  config?: {
    defaultExpandedNodes?: string[];
    statusThreshold?: number;
    availableRanges?: { value: number; label: string }[];
    defaultRange?: number;
  };
}

const DEFAULT_CONFIG = {
  defaultExpandedNodes: [] as string[],
  statusThreshold: THRESHOLDS.OPTIMAL, // Usar constante centralizada
  availableRanges: [
    { value: 7, label: 'Últimos 7 días' },
    { value: 14, label: 'Últimos 14 días' },
    { value: 30, label: 'Últimos 30 días' },
    { value: 60, label: 'Últimos 60 días' },
    { value: 90, label: 'Últimos 90 días' }
  ],
  defaultRange: 30
};

const PlanningAccordion: React.FC<PlanningAccordionProps> = ({ 
  player, 
  academiaId, 
  currentSessionExercises = [],
  config = {} 
}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [rangoAnalisis, setRangoAnalisis] = useState(finalConfig.defaultRange);
  
  const { 
    loading, 
    error, 
    analysisTree, 
    trainingPlan,
    hasCurrentSessionData,
    totalSessions
  } = usePlanningAnalysis({ 
    player, 
    academiaId, 
    rangoAnalisis,
    currentSessionExercises,
    enabled: true
  });
  
  const defaultExpandedNodes = useMemo(() => {
    if (finalConfig.defaultExpandedNodes.length > 0) {
      return finalConfig.defaultExpandedNodes;
    }
    
    return analysisTree
      .filter(node => node.children && node.children.length > 0)
      .slice(0, 2)
      .map(node => node.name);
  }, [analysisTree, finalConfig.defaultExpandedNodes]);
  
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(defaultExpandedNodes));

  useEffect(() => {
    if (analysisTree.length > 0 && expandedNodes.size === 0) {
      setExpandedNodes(new Set(defaultExpandedNodes));
    }
  }, [analysisTree, defaultExpandedNodes]);

  const toggleNode = (nodePath: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodePath)) {
        newSet.delete(nodePath);
      } else {
        newSet.add(nodePath);
      }
      return newSet;
    });
  };

  // ✅ ACTUALIZADO: Usar constantes centralizadas
  const getStatusConfig = (diferencia: number) => {
    const absValue = Math.abs(diferencia);
    const isDeficit = diferencia > 0;
    const statusKey = getStatusFromDifference(absValue, isDeficit, true);
    const status = STATUS_COLORS[statusKey];
    
    return {
      icon: status.icon,
      color: status.text,
      bgColor: status.bg.replace('/20', ''), // Ajustar para la barra de progreso
      borderColor: status.border,
      label: statusKey === 'OPTIMAL' ? 'OK' : 
             statusKey === 'INCREMENT' ? 'Falta' : 
             'Exceso'
    };
  };

  const renderNode = (node: AnalysisNode, level: number = 0, path: string = ''): React.ReactNode => {
    const nodePath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedNodes.has(nodePath);
    const hasChildren = node.children && node.children.length > 0;
    const status = getStatusConfig(node.diferencia);
    const progressPercentage = Math.min(100, (node.realizado / node.planificado) * 100);
    
    return (
      <div key={nodePath} className={`${level > 0 ? 'ml-4 sm:ml-6' : ''}`}>
        <div 
          className={`
            group relative overflow-hidden
            ${level === 0 ? 'bg-gray-900/60 border border-gray-800' : 'bg-gray-900/40 border border-gray-800/50'} 
            rounded-xl mb-3 transition-all duration-300
            ${hasChildren ? 'cursor-pointer hover:border-green-500/30' : 'hover:bg-gray-900/50'}
            shadow-lg ${level === 0 ? 'shadow-green-500/5' : ''}
          `}
          onClick={() => hasChildren && toggleNode(nodePath)}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          <div className="relative p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                {hasChildren && (
                  <span className={`
                    text-gray-500 text-sm transition-transform duration-300 flex-shrink-0 mt-1 sm:mt-0
                    ${isExpanded ? 'rotate-90' : ''}
                  `}>
                    ▶
                  </span>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <h4 className={`
                      font-semibold truncate
                      ${level === 0 ? 'text-lg sm:text-xl text-white' : 'text-base sm:text-lg text-gray-200'}
                    `}>
                      {node.name}
                    </h4>
                    {node.esDistribucionLibre && (
                      <span className="inline-flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full border border-yellow-500/30 flex-shrink-0">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Distribución libre
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ease-out ${status.bgColor} relative`}
                          style={{ width: `${progressPercentage}%` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                        </div>
                      </div>
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-600"
                        style={{ left: `${Math.min(100, node.planificado)}%` }}
                      />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                      <span className="text-gray-400">
                        Plan: <span className="text-gray-300 font-medium">{node.planificado.toFixed(1)}%</span>
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400">
                        Real: <span className="text-gray-300 font-medium">{node.realizado.toFixed(1)}%</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={`
                flex flex-col items-center justify-center p-3 rounded-lg
                bg-gray-800/50 border ${status.borderColor}
                min-w-[90px] sm:min-w-[100px] min-h-[70px] flex-shrink-0
              `}>
                <div className="flex items-center justify-center w-8 h-8 mb-2">
                  <span className="text-xl">{status.icon}</span>
                </div>
                <div className={`text-center ${status.color}`}>
                  <div className="font-bold text-sm leading-tight">
                    {node.diferencia > 0 ? '+' : ''}{Math.abs(node.diferencia).toFixed(1)}%
                  </div>
                  <div className="text-xs opacity-80 mt-1">
                    {status.label}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            {node.children!.map(child => renderNode(child, level + 1, nodePath))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          <div className="absolute inset-0 rounded-full animate-ping h-12 w-12 border border-green-500 opacity-20"></div>
        </div>
        <p className="mt-4 text-gray-400 animate-pulse">Analizando planificación de {player.name}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 p-4 sm:p-6 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">❌</span>
          <div>
            <p className="text-red-400 font-medium">{error}</p>
            <p className="text-sm text-gray-400 mt-1">
              Asegúrate de que {player.name} tenga un plan de entrenamiento creado.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!trainingPlan) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 sm:p-6 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-yellow-400 font-medium">No hay plan de entrenamiento</p>
            <p className="text-sm text-gray-400 mt-1">
              Crea un plan de entrenamiento para {player.name} para poder ver el análisis.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-gray-900/80 to-gray-900/60 p-4 sm:p-6 rounded-xl border border-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              Análisis de Planificación - {player.name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-400">
              <span>
                Comparación entre lo planificado y lo ejecutado (±{finalConfig.statusThreshold}% considerado OK)
              </span>
              {hasCurrentSessionData && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-green-400 font-medium">
                    Incluye {currentSessionExercises.filter(ex => ex.loggedForPlayerId === player.id).length} ejercicio(s) de la sesión actual
                  </span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {hasCurrentSessionData && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 text-xs font-medium">En vivo</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <select 
                value={rangoAnalisis} 
                onChange={(e) => setRangoAnalisis(Number(e.target.value))}
                className="bg-transparent text-sm font-medium text-gray-300 focus:outline-none"
              >
                {finalConfig.availableRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {analysisTree.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-lg font-medium mb-2">No hay datos de entrenamiento</p>
          <p className="text-sm">
            {player.name} no tiene sesiones de entrenamiento registradas en los últimos {rangoAnalisis} días.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {analysisTree.map(node => renderNode(node))}
        </div>
      )}
      
      {/* ✅ LEYENDA ACTUALIZADA CON CONSTANTES CENTRALIZADAS */}
      <div className="bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-gray-800">
        <h4 className="font-semibold text-gray-200 mb-6 flex items-center gap-2">
          <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-base">Guía de interpretación</span>
        </h4>
        
        <div className="space-y-3">
          {/* Estado: Dentro del plan - AZUL (OPTIMAL) */}
          <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 h-16">
            <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center ${STATUS_COLORS.OPTIMAL.bg} rounded-lg border ${STATUS_COLORS.OPTIMAL.border}`}>
              <span className="text-sm">{STATUS_COLORS.OPTIMAL.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h5 className={`${STATUS_COLORS.OPTIMAL.text} font-medium text-sm leading-tight`}>
                Dentro del plan
              </h5>
              <p className="text-xs text-gray-500 leading-tight">
                Diferencia ±{finalConfig.statusThreshold}%
              </p>
            </div>
          </div>

          {/* Estado: Falta entrenar - ROJO (INCREMENT) */}
          <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 h-16">
            <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center ${STATUS_COLORS.INCREMENT.bg} rounded-lg border ${STATUS_COLORS.INCREMENT.border}`}>
              <span className="text-sm">{STATUS_COLORS.INCREMENT.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h5 className={`${STATUS_COLORS.INCREMENT.text} font-medium text-sm leading-tight`}>
                Falta entrenar
              </h5>
              <p className="text-xs text-gray-500 leading-tight">
                Por debajo del plan
              </p>
            </div>
          </div>

          {/* Estado: Entrenado de más - AMARILLO (REDUCE) */}
          <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50 h-16">
            <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center ${STATUS_COLORS.REDUCE.bg} rounded-lg border ${STATUS_COLORS.REDUCE.border}`}>
              <span className="text-sm">{STATUS_COLORS.REDUCE.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h5 className={`${STATUS_COLORS.REDUCE.text} font-medium text-sm leading-tight`}>
                Entrenado de más
              </h5>
              <p className="text-xs text-gray-500 leading-tight">
                Por encima del plan
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningAccordion;