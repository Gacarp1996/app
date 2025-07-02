import React, { useState, useEffect } from 'react';
import { Player, TrainingSession } from '../types';
import { getTrainingPlan, TrainingPlan } from '../Database/FirebaseTrainingPlans';
import { getSessions } from '../Database/FirebaseSessions';
import { NEW_EXERCISE_HIERARCHY_MAPPING } from '../constants';

interface PlanningAccordionProps {
  player: Player;
  academiaId: string;
}

interface AnalysisNode {
  name: string;
  planificado: number;
  realizado: number;
  diferencia: number;
  esDistribucionLibre?: boolean;
  children?: AnalysisNode[];
}

const PlanningAccordion: React.FC<PlanningAccordionProps> = ({ player, academiaId }) => {
  const [loading, setLoading] = useState(true);
  const [analysisTree, setAnalysisTree] = useState<AnalysisNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>('');
  const [rangoAnalisis, setRangoAnalisis] = useState(30);

  useEffect(() => {
    loadPlanningAnalysis();
  }, [player.id, academiaId]);

  const parseTimeToMinutes = (tiempoCantidad: string): number => {
    const cleanTime = tiempoCantidad.trim().toLowerCase();
    
    const pureNumber = parseFloat(cleanTime);
    if (!isNaN(pureNumber) && cleanTime === pureNumber.toString()) {
      return pureNumber;
    }
    
    const minuteMatch = cleanTime.match(/(\d+\.?\d*)\s*(m|min|mins|minuto|minutos)/);
    if (minuteMatch) {
      return parseFloat(minuteMatch[1]);
    }
    
    const hourMatch = cleanTime.match(/(\d+\.?\d*)\s*(h|hr|hrs|hora|horas)/);
    if (hourMatch) {
      return parseFloat(hourMatch[1]) * 60;
    }
    
    return 0;
  };

  const loadPlanningAnalysis = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Obtener plan del jugador
      const plan = await getTrainingPlan(academiaId, player.id);
      if (!plan || !plan.planificacion) {
        setError('No hay plan configurado');
        setLoading(false);
        return;
      }

      // Verificar si el plan tiene porcentajes asignados
      const tienePorcentajes = Object.values(plan.planificacion).some(
        tipo => tipo && tipo.porcentajeTotal > 0
      );
      
      if (!tienePorcentajes) {
        setError('El plan no tiene porcentajes asignados');
        setLoading(false);
        return;
      }

      // Obtener sesiones históricas
      const sessions = await getSessions(academiaId);
      const playerSessions = sessions.filter(s => s.jugadorId === player.id);
      
      // Filtrar sesiones por rango de análisis
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (plan.rangoAnalisis || 30));
      const recentSessions = playerSessions.filter(s => 
        new Date(s.fecha) >= cutoffDate
      );
      
      setRangoAnalisis(plan.rangoAnalisis || 30);
      
      if (recentSessions.length === 0) {
        setError(`No hay sesiones en los últimos ${plan.rangoAnalisis || 30} días`);
        setLoading(false);
        return;
      }

      // Construir árbol de análisis
      const tree = buildAnalysisTree(plan, recentSessions);
      setAnalysisTree(tree);
      
    } catch (error) {
      console.error('Error cargando análisis:', error);
      setError('Error al cargar el análisis');
    } finally {
      setLoading(false);
    }
  };

  const buildAnalysisTree = (plan: TrainingPlan, sessions: TrainingSession[]): AnalysisNode[] => {
    // Calcular tiempo total
    let totalMinutes = 0;
    const exerciseMinutes: Record<string, Record<string, Record<string, number>>> = {};
    
    sessions.forEach(session => {
      session.ejercicios.forEach(ex => {
        const minutes = parseTimeToMinutes(ex.tiempoCantidad);
        totalMinutes += minutes;
        
        // Obtener keys desde el mapeo
        const tipoKey = Object.entries(NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP)
          .find(([_, value]) => value === ex.tipo)?.[0] || ex.tipo;
        const areaKey = Object.entries(NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP)
          .find(([_, value]) => value === ex.area)?.[0] || ex.area;
        
        if (!exerciseMinutes[tipoKey]) exerciseMinutes[tipoKey] = {};
        if (!exerciseMinutes[tipoKey][areaKey]) exerciseMinutes[tipoKey][areaKey] = {};
        if (!exerciseMinutes[tipoKey][areaKey][ex.ejercicio]) {
          exerciseMinutes[tipoKey][areaKey][ex.ejercicio] = 0;
        }
        
        exerciseMinutes[tipoKey][areaKey][ex.ejercicio] += minutes;
      });
    });
    
    if (totalMinutes === 0) return [];
    
    const tree: AnalysisNode[] = [];
    
    // Construir árbol jerárquico
    Object.entries(plan.planificacion || {}).forEach(([tipo, tipoConfig]) => {
      if (!tipoConfig || tipoConfig.porcentajeTotal === 0) return;
      
      const tipoRealizado = Object.values(exerciseMinutes[tipo] || {}).reduce((sum, areas) => 
        sum + Object.values(areas).reduce((areaSum, mins) => areaSum + mins, 0), 0
      ) / totalMinutes * 100;
      
      const tipoNode: AnalysisNode = {
        name: tipo,
        planificado: tipoConfig.porcentajeTotal,
        realizado: tipoRealizado,
        diferencia: tipoConfig.porcentajeTotal - tipoRealizado,
        children: []
      };
      
      // Verificar si hay áreas detalladas
      const hasAreaDetails = tipoConfig.areas && Object.values(tipoConfig.areas).some(area => 
        area && area.porcentajeDelTotal > 0
      );
      
      if (!hasAreaDetails) {
        tipoNode.esDistribucionLibre = true;
      } else {
        // Procesar áreas
        Object.entries(tipoConfig.areas || {}).forEach(([area, areaConfig]) => {
          if (!areaConfig || areaConfig.porcentajeDelTotal === 0) return;
          
          const areaRealizado = Object.values(exerciseMinutes[tipo]?.[area] || {}).reduce(
            (sum, mins) => sum + mins, 0
          ) / totalMinutes * 100;
          
          const areaNode: AnalysisNode = {
            name: area,
            planificado: areaConfig.porcentajeDelTotal,
            realizado: areaRealizado,
            diferencia: areaConfig.porcentajeDelTotal - areaRealizado,
            children: []
          };
          
          // Verificar si hay ejercicios detallados
          const hasExerciseDetails = areaConfig.ejercicios && Object.values(areaConfig.ejercicios).some(ej => 
            ej && ej.porcentajeDelTotal > 0
          );
          
          if (!hasExerciseDetails) {
            areaNode.esDistribucionLibre = true;
          } else {
            // Procesar ejercicios
            Object.entries(areaConfig.ejercicios || {}).forEach(([ejercicio, ejConfig]) => {
              if (!ejConfig || ejConfig.porcentajeDelTotal === 0) return;
              
              const ejRealizado = (exerciseMinutes[tipo]?.[area]?.[ejercicio] || 0) / totalMinutes * 100;
              
              const ejercicioNode: AnalysisNode = {
                name: ejercicio,
                planificado: ejConfig.porcentajeDelTotal,
                realizado: ejRealizado,
                diferencia: ejConfig.porcentajeDelTotal - ejRealizado
              };
              
              areaNode.children!.push(ejercicioNode);
            });
            
            // Agregar "Otros ejercicios" si hay porcentaje sin asignar
            const totalEjerciciosAsignados = Object.values(areaConfig.ejercicios || {})
              .reduce((sum, ej) => sum + (ej?.porcentajeDelTotal || 0), 0);
            const areaSinAsignar = areaConfig.porcentajeDelTotal - totalEjerciciosAsignados;
            
            if (areaSinAsignar > 0.01) {
              const ejerciciosEspecificados = Object.keys(areaConfig.ejercicios || {})
                .filter(ej => areaConfig.ejercicios![ej].porcentajeDelTotal > 0);
              
              const otrosEjerciciosRealizado = Object.entries(exerciseMinutes[tipo]?.[area] || {})
                .filter(([ej]) => !ejerciciosEspecificados.includes(ej))
                .reduce((sum, [_, mins]) => sum + mins, 0) / totalMinutes * 100;
              
              areaNode.children!.push({
                name: 'Otros ejercicios',
                planificado: areaSinAsignar,
                realizado: otrosEjerciciosRealizado,
                diferencia: areaSinAsignar - otrosEjerciciosRealizado,
                esDistribucionLibre: true
              });
            }
          }
          
          tipoNode.children!.push(areaNode);
        });
        
        // Agregar "Otras áreas" si hay porcentaje sin asignar
        const totalAreasAsignadas = Object.values(tipoConfig.areas || {})
          .reduce((sum, area) => sum + (area?.porcentajeDelTotal || 0), 0);
        const tipoSinAsignar = tipoConfig.porcentajeTotal - totalAreasAsignadas;
        
        if (tipoSinAsignar > 0.01) {
          const areasEspecificadas = Object.keys(tipoConfig.areas || {})
            .filter(area => tipoConfig.areas[area].porcentajeDelTotal > 0);
          
          const otrasAreasRealizado = Object.entries(exerciseMinutes[tipo] || {})
            .filter(([area]) => !areasEspecificadas.includes(area))
            .reduce((sum, [_, areaExs]) => 
              sum + Object.values(areaExs).reduce((areaSum, mins) => areaSum + mins, 0), 0
            ) / totalMinutes * 100;
          
          tipoNode.children!.push({
            name: 'Otras áreas',
            planificado: tipoSinAsignar,
            realizado: otrasAreasRealizado,
            diferencia: tipoSinAsignar - otrasAreasRealizado,
            esDistribucionLibre: true
          });
        }
      }
      
      tree.push(tipoNode);
    });
    
    return tree;
  };

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

  const getStatusIcon = (diferencia: number): string => {
    const threshold = 5; // 5% de margen
    if (Math.abs(diferencia) <= threshold) return '✅';
    if (diferencia > 0) return '🔻'; // Falta entrenar
    return '🔺'; // Se entrena de más
  };

  const getStatusColor = (diferencia: number): string => {
    const threshold = 5;
    if (Math.abs(diferencia) <= threshold) return 'text-green-600 dark:text-green-400';
    if (diferencia > 0) return 'text-red-600 dark:text-red-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const getProgressBarColor = (diferencia: number): string => {
    const threshold = 5;
    if (Math.abs(diferencia) <= threshold) return 'bg-green-500';
    if (diferencia > 0) return 'bg-red-500';
    return 'bg-orange-500';
  };

  const renderNode = (node: AnalysisNode, level: number = 0, path: string = ''): React.ReactNode => {
    const nodePath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedNodes.has(nodePath);
    const hasChildren = node.children && node.children.length > 0;
    
    
    return (
      <div key={nodePath} className={`${level > 0 ? 'ml-6' : ''}`}>
        <div 
          className={`
            flex items-center justify-between p-3 rounded-lg mb-2
            ${level === 0 ? 'bg-app-surface-alt' : 'bg-app-surface'} 
            ${hasChildren ? 'cursor-pointer hover:opacity-90' : ''}
            transition-all duration-200
          `}
          onClick={() => hasChildren && toggleNode(nodePath)}
        >
          <div className="flex items-center gap-3 flex-1">
            {hasChildren && (
              <span className="text-app-secondary text-sm">
                {isExpanded ? '▼' : '▶'}
              </span>
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${level === 0 ? 'text-lg' : 'text-base'}`}>
                  {node.name}
                </span>
                {node.esDistribucionLibre && (
                  <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded">
                    Distribución libre
                  </span>
                )}
              </div>
              
              {/* Barra de progreso visual */}
              <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(node.diferencia)}`}
                  style={{ width: `${Math.min(100, (node.realizado / node.planificado) * 100)}%` }}
                />
              </div>
              
              <div className="mt-1 text-sm text-app-secondary">
                <span>Plan: {node.planificado.toFixed(1)}%</span>
                <span className="mx-2">|</span>
                <span>Real: {node.realizado.toFixed(1)}%</span>
              </div>
            </div>
          </div>
          
          <div className={`flex items-center gap-2 ${getStatusColor(node.diferencia)}`}>
            <span className="text-2xl">{getStatusIcon(node.diferencia)}</span>
            <div className="text-right">
              <div className="font-bold">
                {node.diferencia > 0 ? '-' : '+'}{Math.abs(node.diferencia).toFixed(1)}%
              </div>
              <div className="text-xs">
                {node.diferencia > 0 ? 'Falta' : node.diferencia < 0 ? 'Exceso' : 'OK'}
              </div>
            </div>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div className="transition-all duration-300 ease-out">
            {node.children!.map(child => renderNode(child, level + 1, nodePath))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent mx-auto"></div>
        <p className="mt-4 text-app-secondary">Analizando planificación...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-app-accent">
          Análisis de Planificación
        </h3>
        <span className="text-sm text-app-secondary">
          Últimos {rangoAnalisis} días
        </span>
      </div>
      
      {analysisTree.length === 0 ? (
        <p className="text-app-secondary">No hay datos para mostrar</p>
      ) : (
        <div className="space-y-2">
          {analysisTree.map(node => renderNode(node))}
        </div>
      )}
      
      {/* Leyenda */}
      <div className="mt-6 p-4 bg-app-surface-alt rounded-lg">
        <h4 className="font-medium mb-2">Leyenda:</h4>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <span>Dentro del plan (±5%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔻</span>
            <span className="text-red-600 dark:text-red-400">Falta entrenar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔺</span>
            <span className="text-orange-600 dark:text-orange-400">Entrenado de más</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningAccordion;