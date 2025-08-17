// components/player-profile/ExerciseAnalysis.tsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import AreaPieChart from './AreaPieChart';
import { ChartDataPoint, IntensityDataPoint, TrainingSession, LoggedExercise } from '../../types/types';
import IntensityLineChart from './IntensityLineChart';
import { parseTimeToMinutes } from './utils';

interface ExerciseAnalysisProps {
  dateFilteredSessions: any[];
  drillDownPath: string[];
  drillDownData: ChartDataPoint[];
  areaChartTitle: string;
  intensityChartData: IntensityDataPoint[];
  intensityChartTitle: string;
  onBreadcrumbClick: (index: number) => void;
  onPieSliceClick: (dataPoint: ChartDataPoint) => void;
  playerId?: string;
  allSessions?: TrainingSession[];
}

const ExerciseAnalysis: React.FC<ExerciseAnalysisProps> = ({
  dateFilteredSessions,
  drillDownPath,
  drillDownData,
  areaChartTitle,
  intensityChartData,
  intensityChartTitle,
  onBreadcrumbClick,
  onPieSliceClick,
  playerId,
  allSessions = []
}) => {
  // Estado para habilitar el 4to nivel
  const [enableSpecificLevel, setEnableSpecificLevel] = useState(false);
  
  // Estado local para el path extendido (maneja el 4to nivel internamente)
  const [localDrillDownPath, setLocalDrillDownPath] = useState<string[]>([]);

  // Sincronizar con el path del hook
  useEffect(() => {
    setLocalDrillDownPath(drillDownPath);
  }, [drillDownPath]);
  
  // Calculate 7-day session analysis data
  const sessionAnalysisData = useMemo(() => {
    if (!playerId || !allSessions || allSessions.length === 0) {
      return null;
    }

    // Filter sessions for the specific player from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const playerSessions = allSessions.filter(session => {
      if (!session.jugadorId || session.jugadorId !== playerId) return false;
      if (!session.fecha) return false;
      
      const sessionDate = new Date(session.fecha);
      return sessionDate >= sevenDaysAgo && sessionDate <= new Date();
    });

    if (playerSessions.length === 0) {
      return null;
    }

    // Process each session to calculate area percentages
    const processedSessions = playerSessions.map(session => {
      const areas: Record<string, number> = {};
      let totalMinutes = 0;

      // Process exercises to calculate time per area and type combination
      if (session.ejercicios && Array.isArray(session.ejercicios)) {
        session.ejercicios.forEach(exercise => {
          const area = exercise.area || 'Otro';
          const tipo = exercise.tipo || 'Otro';
          // Crear una clave combinada que incluya tanto el tipo como el área
          const combinedKey = `${tipo} - ${area}`;
          const minutes = parseTimeToMinutes(exercise.tiempoCantidad);
          
          if (!areas[combinedKey]) {
            areas[combinedKey] = 0;
          }
          areas[combinedKey] += minutes;
          totalMinutes += minutes;
        });
      }

      // Calculate percentages
      const areaPercentages: Record<string, number> = {};
      if (totalMinutes > 0) {
        Object.entries(areas).forEach(([area, minutes]) => {
          areaPercentages[area] = Math.round((minutes / totalMinutes) * 100);
        });
      }

      return {
        id: session.id,
        date: session.fecha,
        totalMinutes: Math.round(totalMinutes),
        areas,
        areaPercentages,
        sessionLength: Math.round(totalMinutes),
        exerciseCount: session.ejercicios?.length || 0
      };
    });

    return processedSessions;
  }, [playerId, allSessions]);

  // Calculate consolidated statistics
  const consolidatedStats = useMemo(() => {
    if (!sessionAnalysisData || sessionAnalysisData.length === 0) {
      return null;
    }

    const totalSessions = sessionAnalysisData.length;
    const totalMinutes = sessionAnalysisData.reduce((sum, session) => sum + session.totalMinutes, 0);
    const averageSessionLength = Math.round(totalMinutes / totalSessions);

    // Consolidate area statistics (now with combined keys)
    const allAreas: Record<string, { totalMinutes: number; sessionCount: number }> = {};
    
    sessionAnalysisData.forEach(session => {
      Object.entries(session.areas).forEach(([combinedKey, minutes]) => {
        if (!allAreas[combinedKey]) {
          allAreas[combinedKey] = { totalMinutes: 0, sessionCount: 0 };
        }
        allAreas[combinedKey].totalMinutes += minutes;
        allAreas[combinedKey].sessionCount += 1;
      });
    });

    // Calculate area percentages and averages (now with combined keys)
    const areaStats = Object.entries(allAreas).map(([combinedKey, stats]) => ({
      area: combinedKey,
      totalMinutes: Math.round(stats.totalMinutes),
      percentage: totalMinutes > 0 ? Math.round((stats.totalMinutes / totalMinutes) * 100) : 0,
      averagePerSession: Math.round(stats.totalMinutes / stats.sessionCount),
      sessionsWithArea: stats.sessionCount
    })).sort((a, b) => b.percentage - a.percentage);

    return {
      totalSessions,
      totalMinutes: Math.round(totalMinutes),
      averageSessionLength,
      areaStats
    };
  }, [sessionAnalysisData]);

  // Calcular datos para el 4to nivel (ejercicios específicos) - Usando localDrillDownPath
  const specificLevelData = useMemo(() => {
    // Usar localDrillDownPath en lugar de drillDownPath
    if (localDrillDownPath.length !== 3 || !enableSpecificLevel) return null;
    
    const [tipo, area, ejercicio] = localDrillDownPath;
    const specificMap = new Map<string, number>();
    
    // Filtrar y agrupar ejercicios específicos
    dateFilteredSessions.forEach(session => {
      session.ejercicios?.forEach((ex: LoggedExercise) => {
        // Solo considerar ejercicios que coincidan con el path actual
        if (ex.tipo === tipo && ex.area === area && ex.ejercicio === ejercicio) {
          // Usar "Sin especificar" para los que no tienen específico
          const key = ex.ejercicioEspecifico?.trim() || 'Sin especificar';
          const minutes = parseTimeToMinutes(ex.tiempoCantidad) || 0;
          specificMap.set(key, (specificMap.get(key) || 0) + minutes);
        }
      });
    });
    
    // Convertir a formato ChartDataPoint
    return Array.from(specificMap.entries())
      .map(([name, value]) => ({ 
        name, 
        value,
        type: 'SpecificExercise' as 'SpecificExercise'
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => {
        // "Sin especificar" siempre al final
        if (a.name === 'Sin especificar') return 1;
        if (b.name === 'Sin especificar') return -1;
        return b.value - a.value;
      });
  }, [dateFilteredSessions, localDrillDownPath, enableSpecificLevel]);

  // Handler modificado para manejar el 4to nivel localmente
  const handlePieSliceClickExtended = useCallback((dataPoint: ChartDataPoint) => {
    if (!dataPoint.name) return;
    
    // Si estamos en nivel 2 con toggle activo, manejar localmente el nivel 3
    if (enableSpecificLevel && localDrillDownPath.length === 2 && dataPoint.type === 'Exercise') {
      // Agregar el ejercicio al path LOCAL (no al del hook)
      setLocalDrillDownPath(prev => [...prev, dataPoint.name]);
    } 
    // Para niveles 0-1, usar el handler del hook normalmente
    else if (localDrillDownPath.length < 2) {
      onPieSliceClick(dataPoint);
    }
  }, [localDrillDownPath, enableSpecificLevel, onPieSliceClick]);

  // Handler del breadcrumb para manejar el path local
  const handleBreadcrumbClickExtended = useCallback((index: number) => {
    if (index < 3) {
      // Para niveles 0-2, usar el handler del hook
      onBreadcrumbClick(index);
    }
    // Y también actualizar el path local
    setLocalDrillDownPath(prev => prev.slice(0, index));
  }, [onBreadcrumbClick]);

  // Determinar qué datos mostrar en el gráfico - Usando localDrillDownPath
  const chartData = useMemo(() => {
    if (localDrillDownPath.length === 3 && specificLevelData && enableSpecificLevel) {
      return specificLevelData;
    }
    return drillDownData;
  }, [localDrillDownPath, specificLevelData, enableSpecificLevel, drillDownData]);

  // Determinar el título del gráfico - Usando localDrillDownPath
  const chartTitle = useMemo(() => {
    if (localDrillDownPath.length === 3 && enableSpecificLevel) {
      return `Específicos de "${localDrillDownPath[2]}"`;
    }
    return areaChartTitle;
  }, [localDrillDownPath, enableSpecificLevel, areaChartTitle]);

  // Determinar si permitir clicks en el gráfico
  const allowChartClick = useMemo(() => {
    // No permitir clicks si estamos en nivel 3 (específicos)
    if (localDrillDownPath.length === 3 && enableSpecificLevel) {
      return undefined;
    }
    return handlePieSliceClickExtended;
  }, [localDrillDownPath, enableSpecificLevel, handlePieSliceClickExtended]);

  return (
    <div className="border-t border-gray-800 pt-8 lg:pt-10 px-2 sm:px-4 lg:px-0">
      {/* Header responsivo compacto */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400">
          <span className="hidden sm:inline">Análisis de Ejercicios</span>
          <span className="sm:hidden">Análisis</span>
        </h2>
        
        {/* Toggle ultracompacto para móvil */}
        {dateFilteredSessions.length > 0 && (
          <div className="flex items-center gap-2 bg-gray-800/50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border border-gray-700 self-start sm:self-auto">
            <label 
              className="text-xs text-gray-300 cursor-pointer select-none"
              htmlFor="specific-toggle"
            >
              <span className="hidden sm:inline">Ver ejercicios específicos</span>
              <span className="sm:hidden">Específicos</span>
            </label>
            <button
              id="specific-toggle"
              type="button"
              role="switch"
              aria-checked={enableSpecificLevel}
              onClick={() => {
                const newValue = !enableSpecificLevel;
                setEnableSpecificLevel(newValue);
                // Si desactivan el toggle y están en nivel 3, volver al nivel 2
                if (!newValue && localDrillDownPath.length === 3) {
                  setLocalDrillDownPath(prev => prev.slice(0, 2));
                }
              }}
              className={`${
                enableSpecificLevel ? 'bg-green-500' : 'bg-gray-600'
              } relative inline-flex h-4 w-7 sm:h-5 sm:w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-green-500 focus:ring-offset-1 focus:ring-offset-gray-900`}
            >
              <span className="sr-only">Habilitar ejercicios específicos</span>
              <span
                className={`${
                  enableSpecificLevel ? 'translate-x-3.5 sm:translate-x-5' : 'translate-x-0.5'
                } inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full bg-white transition-transform duration-200`}
              />
            </button>
            {enableSpecificLevel && localDrillDownPath.length === 2 && (
              <span className="hidden lg:inline text-xs text-green-400 ml-1 animate-pulse">
                Click en ejercicios
              </span>
            )}
          </div>
        )}
      </div>

      {dateFilteredSessions.length === 0 ? (
        <p className="text-center p-4 text-gray-400">No hay sesiones de entrenamiento en el período seleccionado</p>
      ) : (
        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
          {/* Breadcrumb mejorado para móvil */}
          {localDrillDownPath.length > 0 && (
            <nav className="mb-3 text-xs sm:text-sm flex items-center flex-wrap gap-1">
              <button 
                onClick={() => handleBreadcrumbClickExtended(0)} 
                className="text-gray-400 hover:text-green-400 transition-colors px-1 py-1 rounded"
              >
                Inicio
              </button>
              {localDrillDownPath.map((item, i) => (
                <React.Fragment key={i}>
                  <span className="text-gray-500 text-xs"> › </span>
                  <button 
                    onClick={() => handleBreadcrumbClickExtended(i + 1)} 
                    className="text-gray-400 hover:text-green-400 transition-colors truncate max-w-16 sm:max-w-24 lg:max-w-none px-1 py-1 rounded text-xs sm:text-sm"
                    title={item}
                  >
                    {item}
                  </button>
                </React.Fragment>
              ))}
              {localDrillDownPath.length === 3 && enableSpecificLevel && (
                <span className="text-xs text-gray-500 ml-1 bg-gray-800 px-1.5 py-0.5 rounded">
                  <span className="hidden sm:inline">Específicos</span>
                  <span className="sm:hidden">Esp</span>
                </span>
              )}
            </nav>
          )}

          {/* Indicador compacto cuando no hay específicos */}
          {localDrillDownPath.length === 3 && specificLevelData && specificLevelData.length === 1 && 
           specificLevelData[0].name === 'Sin especificar' && (
            <div className="mb-3 p-2 sm:p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
              <p className="text-xs text-yellow-400">
                <span className="hidden sm:inline">No hay ejercicios específicos registrados para "{localDrillDownPath[2]}"</span>
                <span className="sm:hidden">Sin ejercicios específicos</span>
              </p>
            </div>
          )}

          {/* Sección de gráficos principales responsiva */}
          <div className="space-y-6 sm:space-y-8 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-6">
            {/* Gráfico de área - móvil primero */}
            <div className="w-full overflow-hidden">
              <div className="h-[380px] sm:h-[420px] lg:h-[450px]">
                <AreaPieChart 
                  data={chartData} 
                  chartTitle={chartTitle} 
                  onSliceClick={allowChartClick} 
                  height="100%"
                />
              </div>
            </div>
            
            {/* Gráfico de intensidad */}
            <div className="w-full overflow-hidden">
              <div className="h-[380px] sm:h-[420px] lg:h-[450px]">
                <IntensityLineChart data={intensityChartData} chartTitle={intensityChartTitle} />
              </div>
            </div>
          </div>

          {/* Análisis de entrenamientos móvil-optimizado */}
          {sessionAnalysisData && consolidatedStats && (
            <div className="border-t border-gray-800 pt-6 sm:pt-8 mt-6 sm:mt-8">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-blue-400 mb-4 sm:mb-6">
                <span className="hidden sm:inline">Análisis de Entrenamientos (Últimos 7 días)</span>
                <span className="sm:hidden">Últimos 7 días</span>
              </h3>
              
              <div className="space-y-6 sm:space-y-8">
                {/* Resumen general en cards móvil */}
                <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
                  <h4 className="text-base sm:text-lg font-medium text-white mb-3">Resumen General</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="text-center bg-gray-700/50 rounded-lg p-2 sm:p-3">
                      <div className="text-lg sm:text-2xl font-bold text-green-400">{consolidatedStats.totalSessions}</div>
                      <div className="text-xs sm:text-sm text-gray-400">Sesiones</div>
                    </div>
                    <div className="text-center bg-gray-700/50 rounded-lg p-2 sm:p-3">
                      <div className="text-lg sm:text-2xl font-bold text-blue-400">{consolidatedStats.totalMinutes}</div>
                      <div className="text-xs sm:text-sm text-gray-400">Min. totales</div>
                    </div>
                    <div className="text-center bg-gray-700/50 rounded-lg p-2 sm:p-3">
                      <div className="text-lg sm:text-2xl font-bold text-purple-400">{consolidatedStats.averageSessionLength}</div>
                      <div className="text-xs sm:text-sm text-gray-400">Promedio</div>
                    </div>
                    <div className="text-center bg-gray-700/50 rounded-lg p-2 sm:p-3">
                      <div className="text-lg sm:text-2xl font-bold text-orange-400">{consolidatedStats.areaStats.length}</div>
                      <div className="text-xs sm:text-sm text-gray-400">Áreas</div>
                    </div>
                  </div>
                </div>

                {/* Distribución por área optimizada para móvil */}
                <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
                  <h4 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">
                    <span className="hidden sm:inline">Distribución por Tipo y Área</span>
                    <span className="sm:hidden">Distribución</span>
                  </h4>
                  <div className="space-y-3">
                    {consolidatedStats.areaStats.map((area, index) => {
                      // Separar el tipo del área para mejor visualización
                      const [tipo, areaName] = area.area.split(' - ');
                      const isCanasto = tipo.toLowerCase().includes('canasto');
                      const isPelotaViva = tipo.toLowerCase().includes('pelota viva');
                      
                      return (
                        <div key={area.area} className="bg-gray-700/30 rounded-lg p-2 sm:p-3">
                          <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                            <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                              <span className={`px-1.5 sm:px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                                isCanasto ? 'bg-orange-500/20 text-orange-400' :
                                isPelotaViva ? 'bg-green-500/20 text-green-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                <span className="hidden sm:inline">{tipo}</span>
                                <span className="sm:hidden">{tipo.slice(0, 4)}</span>
                              </span>
                              <span className="text-gray-300 font-medium truncate">{areaName}</span>
                            </div>
                            <span className="text-gray-400 font-bold">{area.percentage}%</span>
                          </div>
                          <div className="bg-gray-700 rounded-full h-2 sm:h-3">
                            <div 
                              className={`h-2 sm:h-3 rounded-full transition-all duration-300 ${
                                isCanasto ? 'bg-gradient-to-r from-orange-500 to-yellow-500' :
                                isPelotaViva ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                'bg-gradient-to-r from-gray-500 to-gray-400'
                              }`}
                              style={{ width: `${area.percentage}%` }}
                            />
                          </div>
                          <div className="mt-1 sm:mt-2 text-xs text-gray-500">
                            {area.totalMinutes} min • {area.sessionsWithArea} sesiones • {area.averagePerSession} min/sesión
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detalle de sesiones móvil-optimizado */}
                <div className="bg-gray-800/50 rounded-lg p-3 sm:p-4">
                  <h4 className="text-base sm:text-lg font-medium text-white mb-3 sm:mb-4">Detalle de Sesiones</h4>
                  <div className="space-y-3 sm:space-y-4">
                    {sessionAnalysisData.map((session, index) => (
                      <div key={session.id} className="bg-gray-700/50 rounded-lg p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                          <div className="text-sm font-medium text-white">
                            Sesión #{sessionAnalysisData.length - index}
                            <span className="block sm:inline sm:ml-2 text-xs text-gray-400">
                              {new Date(session.date).toLocaleDateString('es-ES')}
                            </span>
                          </div>
                          <div className="text-xs sm:text-sm text-gray-400">
                            {session.sessionLength} min • {session.exerciseCount} ejercicios
                          </div>
                        </div>
                        
                        {Object.keys(session.areaPercentages).length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                            {Object.entries(session.areaPercentages).map(([combinedKey, percentage]) => {
                              const [tipo, areaName] = combinedKey.split(' - ');
                              const isCanasto = tipo.toLowerCase().includes('canasto');
                              const isPelotaViva = tipo.toLowerCase().includes('Peloteo');
                              
                              return (
                                <div key={combinedKey} className={`text-center rounded-lg p-2 sm:p-3 ${
                                  isCanasto ? 'bg-orange-500/10 border border-orange-500/20' :
                                  isPelotaViva ? 'bg-green-500/10 border border-green-500/20' :
                                  'bg-gray-500/10 border border-gray-500/20'
                                }`}>
                                  <div className="flex items-center justify-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                                    <span className={`px-1.5 sm:px-2 py-1 rounded text-xs font-medium ${
                                      isCanasto ? 'bg-orange-500/20 text-orange-400' :
                                      isPelotaViva ? 'bg-green-500/20 text-green-400' :
                                      'bg-gray-500/20 text-gray-400'
                                    }`}>
                                      <span className="hidden sm:inline">{tipo}</span>
                                      <span className="sm:hidden">{tipo.slice(0, 4)}</span>
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-400 mb-1 font-medium truncate">{areaName}</div>
                                  <div className="text-base sm:text-lg font-bold text-white">{percentage}%</div>
                                  <div className="text-xs text-gray-500">
                                    {Math.round(session.areas[combinedKey])} min
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 text-xs sm:text-sm py-3 sm:py-4">
                            Sin áreas registradas en esta sesión
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExerciseAnalysis;