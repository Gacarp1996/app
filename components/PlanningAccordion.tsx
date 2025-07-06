import React, { useState, useEffect } from 'react';

// Simulación de tipos para el ejemplo
interface Player {
  id: string;
  name: string;
}

interface TrainingSession {
  id: string;
  jugadorId: string;
  fecha: string;
  ejercicios: Array<{
    id: string;
    tipo: string;
    area: string;
    ejercicio: string;
    tiempoCantidad: string;
    intensidad: number;
  }>;
}

interface AnalysisNode {
  name: string;
  planificado: number;
  realizado: number;
  diferencia: number;
  esDistribucionLibre?: boolean;
  children?: AnalysisNode[];
}

interface PlanningAccordionProps {
  player: Player;
  academiaId: string;
}

const PlanningAccordion: React.FC<PlanningAccordionProps> = ({ player, academiaId }) => {
  const [loading, setLoading] = useState(false);
  const [analysisTree, setAnalysisTree] = useState<AnalysisNode[]>([
    // Datos de ejemplo para demostración
    {
      name: 'Canasto',
      planificado: 40,
      realizado: 35,
      diferencia: 5,
      children: [
        {
          name: 'Juego de base',
          planificado: 25,
          realizado: 20,
          diferencia: 5,
          children: [
            {
              name: 'Estático',
              planificado: 15,
              realizado: 12,
              diferencia: 3
            },
            {
              name: 'Dinámico',
              planificado: 10,
              realizado: 8,
              diferencia: 2
            }
          ]
        },
        {
          name: 'Juego de red',
          planificado: 15,
          realizado: 15,
          diferencia: 0,
          esDistribucionLibre: true
        }
      ]
    },
    {
      name: 'Peloteo',
      planificado: 60,
      realizado: 65,
      diferencia: -5,
      children: [
        {
          name: 'Puntos',
          planificado: 30,
          realizado: 40,
          diferencia: -10,
          esDistribucionLibre: true
        },
        {
          name: 'Primeras pelotas',
          planificado: 30,
          realizado: 25,
          diferencia: 5
        }
      ]
    }
  ]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['Canasto', 'Peloteo']));
  const [error, setError] = useState<string>('');
  const [rangoAnalisis, setRangoAnalisis] = useState(30);

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

  const getStatusConfig = (diferencia: number) => {
    const threshold = 5;
    if (Math.abs(diferencia) <= threshold) {
      return {
        icon: '✅',
        color: 'text-green-400',
        bgColor: 'bg-green-500',
        borderColor: 'border-green-500/20',
        label: 'OK'
      };
    }
    if (diferencia > 0) {
      return {
        icon: '⚠️',
        color: 'text-red-400',
        bgColor: 'bg-red-500',
        borderColor: 'border-red-500/20',
        label: 'Falta'
      };
    }
    return {
      icon: '📈',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500',
      borderColor: 'border-orange-500/20',
      label: 'Exceso'
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
          {/* Efecto de hover sutil */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          <div className="relative p-4 sm:p-5">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                {hasChildren && (
                  <span className={`
                    text-gray-500 text-sm transition-transform duration-300
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
                      <span className="inline-flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full border border-yellow-500/30">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Distribución libre
                      </span>
                    )}
                  </div>
                  
                  {/* Barra de progreso mejorada */}
                  <div className="space-y-2">
                    <div className="relative">
                      <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ease-out ${status.bgColor} relative`}
                          style={{ width: `${progressPercentage}%` }}
                        >
                          {/* Efecto de brillo animado */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                        </div>
                      </div>
                      {/* Marcador del objetivo */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-gray-600"
                        style={{ left: `${node.planificado}%` }}
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
              
              {/* Estado mejorado */}
              <div className={`
                flex flex-col items-center justify-center p-3 rounded-lg
                bg-gray-800/50 border ${status.borderColor}
                min-w-[80px] sm:min-w-[90px]
              `}>
                <span className="text-2xl mb-1">{status.icon}</span>
                <div className={`text-center ${status.color}`}>
                  <div className="font-bold text-sm sm:text-base">
                    {node.diferencia > 0 ? '+' : ''}{Math.abs(node.diferencia).toFixed(1)}%
                  </div>
                  <div className="text-xs opacity-80">
                    {status.label}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Hijos con animación */}
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
        <p className="mt-4 text-gray-400 animate-pulse">Analizando planificación...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 p-4 sm:p-6 rounded-xl backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl">❌</span>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header mejorado */}
      <div className="bg-gradient-to-r from-gray-900/80 to-gray-900/60 p-4 sm:p-6 rounded-xl border border-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              Análisis de Planificación
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Comparación entre lo planificado y lo ejecutado
            </p>
          </div>
          <div className="flex items-center gap-2 bg-gray-800/50 px-3 py-2 rounded-lg">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-gray-300">
              Últimos {rangoAnalisis} días
            </span>
          </div>
        </div>
      </div>
      
      {/* Árbol de análisis */}
      {analysisTree.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No hay datos para mostrar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {analysisTree.map(node => renderNode(node))}
        </div>
      )}
      
      {/* Leyenda mejorada */}
      <div className="bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 rounded-xl border border-gray-800">
        <h4 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Guía de interpretación
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
            <span className="text-2xl">✅</span>
            <div>
              <span className="text-green-400 font-medium">Dentro del plan</span>
              <p className="text-xs text-gray-500">Diferencia ±5%</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
            <span className="text-2xl">⚠️</span>
            <div>
              <span className="text-red-400 font-medium">Falta entrenar</span>
              <p className="text-xs text-gray-500">Por debajo del plan</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg">
            <span className="text-2xl">📈</span>
            <div>
              <span className="text-orange-400 font-medium">Entrenado de más</span>
              <p className="text-xs text-gray-500">Por encima del plan</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningAccordion;