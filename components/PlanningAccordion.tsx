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
      const plan = await getTrainingPlan(academiaId, player.id);
      if (!plan || !plan.planificacion) {
        setError('No hay un plan de entrenamiento configurado para este jugador.');
        setLoading(false);
        return;
      }

      const tienePorcentajes = Object.values(plan.planificacion).some(
        tipo => tipo && tipo.porcentajeTotal > 0
      );
      
      if (!tienePorcentajes) {
        setError('El plan de entrenamiento no tiene porcentajes asignados.');
        setLoading(false);
        return;
      }

      const sessions = await getSessions(academiaId);
      const playerSessions = sessions.filter(s => s.jugadorId === player.id);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - (plan.rangoAnalisis || 30));
      const recentSessions = playerSessions.filter(s => new Date(s.fecha) >= cutoffDate);
      
      setRangoAnalisis(plan.rangoAnalisis || 30);
      
      if (recentSessions.length === 0) {
        setError(`No se encontraron sesiones de entrenamiento en los últimos ${plan.rangoAnalisis || 30} días.`);
        setLoading(false);
        return;
      }

      const tree = buildAnalysisTree(plan, recentSessions);
      setAnalysisTree(tree);
      
    } catch (error) {
      console.error('Error cargando análisis:', error);
      setError('Ocurrió un error inesperado al cargar el análisis del plan.');
    } finally {
      setLoading(false);
    }
  };

  const buildAnalysisTree = (plan: TrainingPlan, sessions: TrainingSession[]): AnalysisNode[] => {
    let totalMinutes = 0;
    const exerciseMinutes: Record<string, Record<string, Record<string, number>>> = {};
    
    sessions.forEach(session => {
      session.ejercicios.forEach(ex => {
        const minutes = parseTimeToMinutes(ex.tiempoCantidad);
        totalMinutes += minutes;
        
        const tipoKey = Object.entries(NEW_EXERCISE_HIERARCHY_MAPPING.TYPE_MAP).find(([_, value]) => value === ex.tipo)?.[0] || ex.tipo;
        const areaKey = Object.entries(NEW_EXERCISE_HIERARCHY_MAPPING.AREA_MAP).find(([_, value]) => value === ex.area)?.[0] || ex.area;
        
        if (!exerciseMinutes[tipoKey]) exerciseMinutes[tipoKey] = {};
        if (!exerciseMinutes[tipoKey][areaKey]) exerciseMinutes[tipoKey][areaKey] = {};
        if (!exerciseMinutes[tipoKey][areaKey][ex.ejercicio]) exerciseMinutes[tipoKey][areaKey][ex.ejercicio] = 0;
        
        exerciseMinutes[tipoKey][areaKey][ex.ejercicio] += minutes;
      });
    });
    
    if (totalMinutes === 0) return [];
    
    const tree: AnalysisNode[] = [];
    
    Object.entries(plan.planificacion || {}).forEach(([tipo, tipoConfig]) => {
      if (!tipoConfig || tipoConfig.porcentajeTotal === 0) return;
      
      const tipoRealizado = Object.values(exerciseMinutes[tipo] || {}).reduce((sum, areas) => 
        sum + Object.values(areas).reduce((areaSum, mins) => areaSum + mins, 0), 0
      ) / totalMinutes * 100;
      
      const tipoNode: AnalysisNode = { name: tipo, planificado: tipoConfig.porcentajeTotal, realizado: tipoRealizado, diferencia: tipoConfig.porcentajeTotal - tipoRealizado, children: [] };
      
      const hasAreaDetails = tipoConfig.areas && Object.values(tipoConfig.areas).some(area => area && area.porcentajeDelTotal > 0);
      
      if (!hasAreaDetails) {
        tipoNode.esDistribucionLibre = true;
      } else {
        Object.entries(tipoConfig.areas || {}).forEach(([area, areaConfig]) => {
          if (!areaConfig || areaConfig.porcentajeDelTotal === 0) return;
          const areaRealizado = Object.values(exerciseMinutes[tipo]?.[area] || {}).reduce((sum, mins) => sum + mins, 0) / totalMinutes * 100;
          const areaNode: AnalysisNode = { name: area, planificado: areaConfig.porcentajeDelTotal, realizado: areaRealizado, diferencia: areaConfig.porcentajeDelTotal - areaRealizado, children: [] };
          const hasExerciseDetails = areaConfig.ejercicios && Object.values(areaConfig.ejercicios).some(ej => ej && ej.porcentajeDelTotal > 0);
          
          if (!hasExerciseDetails) {
            areaNode.esDistribucionLibre = true;
          } else {
            Object.entries(areaConfig.ejercicios || {}).forEach(([ejercicio, ejConfig]) => {
              if (!ejConfig || ejConfig.porcentajeDelTotal === 0) return;
              const ejRealizado = (exerciseMinutes[tipo]?.[area]?.[ejercicio] || 0) / totalMinutes * 100;
              areaNode.children!.push({ name: ejercicio, planificado: ejConfig.porcentajeDelTotal, realizado: ejRealizado, diferencia: ejConfig.porcentajeDelTotal - ejRealizado });
            });
            const totalEjerciciosAsignados = Object.values(areaConfig.ejercicios || {}).reduce((sum, ej) => sum + (ej?.porcentajeDelTotal || 0), 0);
            const areaSinAsignar = areaConfig.porcentajeDelTotal - totalEjerciciosAsignados;
            if (areaSinAsignar > 0.01) {
              const ejerciciosEspecificados = Object.keys(areaConfig.ejercicios || {}).filter(ej => areaConfig.ejercicios![ej].porcentajeDelTotal > 0);
              const otrosEjerciciosRealizado = Object.entries(exerciseMinutes[tipo]?.[area] || {}).filter(([ej]) => !ejerciciosEspecificados.includes(ej)).reduce((sum, [_, mins]) => sum + mins, 0) / totalMinutes * 100;
              areaNode.children!.push({ name: 'Otros ejercicios', planificado: areaSinAsignar, realizado: otrosEjerciciosRealizado, diferencia: areaSinAsignar - otrosEjerciciosRealizado, esDistribucionLibre: true });
            }
          }
          tipoNode.children!.push(areaNode);
        });
        const totalAreasAsignadas = Object.values(tipoConfig.areas || {}).reduce((sum, area) => sum + (area?.porcentajeDelTotal || 0), 0);
        const tipoSinAsignar = tipoConfig.porcentajeTotal - totalAreasAsignadas;
        if (tipoSinAsignar > 0.01) {
          const areasEspecificadas = Object.keys(tipoConfig.areas || {}).filter(area => tipoConfig.areas[area].porcentajeDelTotal > 0);
          const otrasAreasRealizado = Object.entries(exerciseMinutes[tipo] || {}).filter(([area]) => !areasEspecificadas.includes(area)).reduce((sum, [_, areaExs]) => sum + Object.values(areaExs).reduce((areaSum, mins) => areaSum + mins, 0), 0) / totalMinutes * 100;
          tipoNode.children!.push({ name: 'Otras áreas', planificado: tipoSinAsignar, realizado: otrasAreasRealizado, diferencia: tipoSinAsignar - otrasAreasRealizado, esDistribucionLibre: true });
        }
      }
      tree.push(tipoNode);
    });
    return tree;
  };

  const toggleNode = (nodePath: string) => setExpandedNodes(prev => {
    const newSet = new Set(prev);
    newSet.has(nodePath) ? newSet.delete(nodePath) : newSet.add(nodePath);
    return newSet;
  });

  const getStatusIcon = (diferencia: number) => {
    if (Math.abs(diferencia) <= 5) return '✅';
    return diferencia > 0 ? '🔻' : '🔺';
  };

  const getStatusColor = (diferencia: number) => {
    if (Math.abs(diferencia) <= 5) return 'text-green-400';
    return diferencia > 0 ? 'text-red-400' : 'text-orange-400';
  };

  const getProgressBarColor = (diferencia: number) => {
    if (Math.abs(diferencia) <= 5) return 'bg-green-500';
    return diferencia > 0 ? 'bg-red-500' : 'bg-orange-500';
  };

  const renderNode = (node: AnalysisNode, level: number = 0, path: string = ''): React.ReactNode => {
    const nodePath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedNodes.has(nodePath);
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div key={nodePath} className={`${level > 0 ? 'ml-4 pl-4 border-l border-gray-800' : ''}`}>
        <div 
          className={`flex items-center justify-between p-3 rounded-lg mb-2 transition-all duration-200 ${level === 0 ? 'bg-gray-800/50' : ''} ${hasChildren ? 'cursor-pointer hover:bg-gray-800/80' : ''}`}
          onClick={() => hasChildren && toggleNode(nodePath)}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {hasChildren && (
              <svg className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
              </svg>
            )}
            <div className={`flex-1 ${!hasChildren ? 'ml-7' : ''}`}>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                <span className={`font-medium ${level === 0 ? 'text-lg text-white' : 'text-base text-gray-300'}`}>{node.name}</span>
                {node.esDistribucionLibre && (
                  <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full font-medium">Distribución Libre</span>
                )}
              </div>
              <div className="mt-2 w-full bg-gray-700 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all duration-500 ${getProgressBarColor(node.diferencia)}`} style={{ width: `${Math.min(100, (node.realizado / node.planificado) * 100)}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-gray-400">
                <span>Plan: {node.planificado.toFixed(1)}%</span>
                <span>Real: {node.realizado.toFixed(1)}%</span>
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-2 flex-shrink-0 ml-4 ${getStatusColor(node.diferencia)}`}>
            <span className="text-2xl">{getStatusIcon(node.diferencia)}</span>
            <div className="text-right">
              <div className="font-bold text-base">{node.diferencia > 0 ? '-' : '+'}{Math.abs(node.diferencia).toFixed(1)}%</div>
              <div className="text-xs">{node.diferencia > 0 ? 'Falta' : node.diferencia < -5 ? 'Exceso' : 'OK'}</div>
            </div>
          </div>
        </div>
        {isExpanded && hasChildren && <div className="mt-2">{node.children!.map(child => renderNode(child, level + 1, nodePath))}</div>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        <p className="mt-4 text-gray-400">Analizando planificación...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/40 border border-red-500/50 p-4 rounded-lg flex items-center gap-3">
        <span className='text-red-400 text-xl'>⚠️</span>
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">Análisis del Plan</h3>
        <span className="text-sm text-gray-500 bg-gray-800/50 px-3 py-1 rounded-full">Últimos {rangoAnalisis} días</span>
      </div>
      {analysisTree.length === 0 ? <p className="text-gray-500 text-center py-8">No hay datos de entrenamiento para analizar en este período.</p> : <div>{analysisTree.map(node => renderNode(node))}</div>}
      <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <h4 className="font-semibold text-white mb-3">Leyenda</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2"><span className="text-xl">✅</span><span className='text-gray-300'>OK (±5%)</span></div>
          <div className="flex items-center gap-2"><span className="text-xl">🔻</span><span className="text-red-400">Falta entrenar</span></div>
          <div className="flex items-center gap-2"><span className="text-xl">🔺</span><span className="text-orange-400">Entrenado de más</span></div>
        </div>
      </div>
    </div>
  );
};

export default PlanningAccordion;