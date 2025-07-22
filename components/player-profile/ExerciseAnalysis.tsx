// components/player-profile/ExerciseAnalysis.tsx
import React, { useMemo } from 'react';
import AreaPieChart from './AreaPieChart';
import { ChartDataPoint, IntensityDataPoint, TrainingSession } from '../../types';
import IntensityLineChart from './IntensityLineChart';

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

// Helper function to parse time string to minutes
const parseTimeToMinutes = (timeStr: string): number => {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  
  const parts = timeStr.split(':');
  if (parts.length !== 2) return 0;
  
  const minutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  
  if (isNaN(minutes) || isNaN(seconds)) return 0;
  
  return minutes + (seconds / 60);
};

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

  return (
    <div className="border-t border-gray-800 pt-8 lg:pt-12">
      <h2 className="text-2xl lg:text-3xl font-semibold text-green-400 mb-6 lg:mb-8">Análisis de Ejercicios</h2>
      {dateFilteredSessions.length === 0 ? (
        <p className="text-center p-4 text-gray-400">No hay sesiones de entrenamiento en el período seleccionado</p>
      ) : (
        <div className="space-y-6 lg:space-y-8">
          {/* Main Charts Section */}
          <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div>
              {drillDownPath.length > 0 && (
                <nav className="mb-2 text-sm lg:text-base">
                  <button onClick={() => onBreadcrumbClick(0)} className="text-gray-400 hover:text-green-400 transition-colors">Inicio</button>
                  {drillDownPath.map((item, i) => (
                    <span key={i}> &gt; <button onClick={() => onBreadcrumbClick(i + 1)} className="text-gray-400 hover:text-green-400 transition-colors">{item}</button></span>
                  ))}
                </nav>
              )}
              <AreaPieChart data={drillDownData} chartTitle={areaChartTitle} onSliceClick={onPieSliceClick} height={384}/>
            </div>
            <IntensityLineChart data={intensityChartData} chartTitle={intensityChartTitle} />
          </div>

          {/* 7-Day Training Session Analysis */}
          {sessionAnalysisData && consolidatedStats && (
            <div className="border-t border-gray-800 pt-6 lg:pt-8">
              <h3 className="text-xl lg:text-2xl font-semibold text-blue-400 mb-4 lg:mb-6">
                Análisis de Entrenamientos (Últimos 7 días)
              </h3>
              
              <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Summary */}
                <div className="bg-gray-800/50 rounded-lg p-4 lg:p-6">
                  <h4 className="text-lg font-medium text-white mb-4">Resumen General</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">{consolidatedStats.totalSessions}</div>
                      <div className="text-sm text-gray-400">Sesiones</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{consolidatedStats.totalMinutes}</div>
                      <div className="text-sm text-gray-400">Minutos totales</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">{consolidatedStats.averageSessionLength}</div>
                      <div className="text-sm text-gray-400">Promedio/sesión</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400">{consolidatedStats.areaStats.length}</div>
                      <div className="text-sm text-gray-400">Áreas trabajadas</div>
                    </div>
                  </div>
                </div>

                {/* Area Distribution */}
                <div className="bg-gray-800/50 rounded-lg p-4 lg:p-6">
                  <h4 className="text-lg font-medium text-white mb-4">Distribución por Tipo y Área</h4>
                  <div className="space-y-3">
                    {consolidatedStats.areaStats.map((area, index) => {
                      // Separar el tipo del área para mejor visualización
                      const [tipo, areaName] = area.area.split(' - ');
                      const isCanasto = tipo.toLowerCase().includes('canasto');
                      const isPelotaViva = tipo.toLowerCase().includes('pelota viva');
                      
                      return (
                        <div key={area.area} className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  isCanasto ? 'bg-orange-500/20 text-orange-400' :
                                  isPelotaViva ? 'bg-green-500/20 text-green-400' :
                                  'bg-gray-500/20 text-gray-400'
                                }`}>
                                  {tipo}
                                </span>
                                <span className="text-gray-300 font-medium">{areaName}</span>
                              </div>
                              <span className="text-gray-400 font-bold">{area.percentage}%</span>
                            </div>
                            <div className="mt-2 bg-gray-700 rounded-full h-3">
                              <div 
                                className={`h-3 rounded-full transition-all duration-300 ${
                                  isCanasto ? 'bg-gradient-to-r from-orange-500 to-yellow-500' :
                                  isPelotaViva ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                  'bg-gradient-to-r from-gray-500 to-gray-400'
                                }`}
                                style={{ width: `${area.percentage}%` }}
                              />
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              {area.totalMinutes} min • {area.sessionsWithArea} sesiones • {area.averagePerSession} min/sesión
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Session Details */}
              <div className="mt-6 bg-gray-800/50 rounded-lg p-4 lg:p-6">
                <h4 className="text-lg font-medium text-white mb-4">Detalle de Sesiones</h4>
                <div className="grid gap-4">
                  {sessionAnalysisData.map((session, index) => (
                    <div key={session.id} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium text-white">
                          Sesión #{sessionAnalysisData.length - index} - {new Date(session.date).toLocaleDateString('es-ES')}
                        </div>
                        <div className="text-sm text-gray-400">
                          {session.sessionLength} minutos • {session.exerciseCount} ejercicios
                        </div>
                      </div>
                      
                      {Object.keys(session.areaPercentages).length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(session.areaPercentages).map(([combinedKey, percentage]) => {
                            const [tipo, areaName] = combinedKey.split(' - ');
                            const isCanasto = tipo.toLowerCase().includes('canasto');
                            const isPelotaViva = tipo.toLowerCase().includes('pelota viva');
                            
                            return (
                              <div key={combinedKey} className={`text-center rounded-lg p-3 ${
                                isCanasto ? 'bg-orange-500/10 border border-orange-500/20' :
                                isPelotaViva ? 'bg-green-500/10 border border-green-500/20' :
                                'bg-gray-500/10 border border-gray-500/20'
                              }`}>
                                <div className="flex items-center justify-center gap-2 mb-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    isCanasto ? 'bg-orange-500/20 text-orange-400' :
                                    isPelotaViva ? 'bg-green-500/20 text-green-400' :
                                    'bg-gray-500/20 text-gray-400'
                                  }`}>
                                    {tipo}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 mb-1 font-medium">{areaName}</div>
                                <div className="text-lg font-bold text-white">{percentage}%</div>
                                <div className="text-xs text-gray-500">
                                  {Math.round(session.areas[combinedKey])} min
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 text-sm py-4">
                          Sin áreas registradas en esta sesión
                        </div>
                      )}
                    </div>
                  ))}
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