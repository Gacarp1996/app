// components/player-profile/ExerciseAnalysis.tsx
import React from 'react';
import AreaPieChart from './AreaPieChart';

import { ChartDataPoint, IntensityDataPoint } from '../../types';
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
}

const ExerciseAnalysis: React.FC<ExerciseAnalysisProps> = ({
  dateFilteredSessions,
  drillDownPath,
  drillDownData,
  areaChartTitle,
  intensityChartData,
  intensityChartTitle,
  onBreadcrumbClick,
  onPieSliceClick
}) => {
  return (
    <div className="border-t border-gray-800 pt-8 lg:pt-12">
      <h2 className="text-2xl lg:text-3xl font-semibold text-green-400 mb-6 lg:mb-8">Análisis de Ejercicios</h2>
      {dateFilteredSessions.length === 0 ? (
        <p className="text-center p-4 text-gray-400">No hay sesiones de entrenamiento en el período seleccionado</p>
      ) : (
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
      )}
    </div>
  );
};

export default ExerciseAnalysis;