// components/player-profile/RadarChartOverview.tsx
import React, { useState, useEffect } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from 'recharts';

interface RadarChartOverviewProps {
  radarData: Array<{
    metric: string;
    value: number;
    fullMark: number;
  }>;
  surveysCount: number;
}

const RadarChartOverview: React.FC<RadarChartOverviewProps> = ({
  radarData,
  surveysCount
}) => {
  // Detectar tamaño de pantalla
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 768
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;
  
  // Altura adaptativa según el dispositivo
  const getChartHeight = () => {
    if (isMobile) return 300;
    if (isTablet) return 350;
    return 400;
  };

  const chartHeight = getChartHeight();

  // Configuración de márgenes adaptativos
  const getMargins = () => {
    if (isMobile) {
      return { top: 10, right: 20, bottom: 10, left: 20 };
    }
    if (isTablet) {
      return { top: 15, right: 30, bottom: 15, left: 30 };
    }
    return { top: 20, right: 40, bottom: 20, left: 40 };
  };

  // Tamaño de fuente adaptativo
  const getFontSize = (type: 'axis' | 'radius') => {
    if (type === 'axis') {
      if (isMobile) return 10;
      if (isTablet) return 12;
      return 14;
    }
    if (type === 'radius') {
      if (isMobile) return 10;
      if (isTablet) return 11;
      return 12;
    }
    return 12;
  };

  // Procesar labels para móvil (acortar si es necesario)
  const processedRadarData = React.useMemo(() => {
    if (!isMobile) return radarData;
    
    // En móvil, acortar etiquetas largas
    return radarData.map(item => ({
      ...item,
      metric: item.metric.length > 12 
        ? item.metric.substring(0, 10) + '...' 
        : item.metric
    }));
  }, [radarData, isMobile]);

  // Custom Tooltip mejorado
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      // Encontrar el dato original para mostrar el nombre completo
      const originalData = radarData.find(item => 
        item.metric === data.metric || 
        item.metric.startsWith(data.metric.replace('...', ''))
      );
      
      return (
        <div className="p-2 sm:p-3 bg-gray-800/95 backdrop-blur-xl shadow-2xl rounded-lg border border-gray-600">
          <p className="text-white font-semibold text-sm sm:text-base">
            {originalData?.metric || data.metric}
          </p>
          <p className="text-gray-300 text-xs sm:text-sm mt-1">
            Valor: <span className="text-green-400 font-bold">{data.value.toFixed(1)}</span> / 5
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
      {/* Header responsive */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-green-400 mb-2 sm:mb-3">
          Vista General - Promedios del Período
        </h3>
        <p className="text-xs sm:text-sm lg:text-base text-gray-400">
          Basado en {surveysCount} {surveysCount === 1 ? 'encuesta' : 'encuestas'}
        </p>
      </div>

      {/* Contenedor del gráfico con overflow controlado */}
      <div className="flex justify-center">
        <div className={`w-full ${isMobile ? 'max-w-sm' : ''}`}>
          <ResponsiveContainer 
            width="100%" 
            height={chartHeight}
            className="radar-chart-container"
          >
            <RadarChart 
              data={processedRadarData}
              margin={getMargins()}
            >
              <PolarGrid 
                stroke="#374151" 
                radialLines={true}
                gridType="polygon"
              />
              <PolarAngleAxis 
                dataKey="metric"
                tick={{ 
                  fill: '#e5e7eb', 
                  fontSize: getFontSize('axis'),
                  textAnchor: 'middle'
                }}
                className="radar-axis-label"
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 5]} 
                tickCount={isMobile ? 4 : 6}  // Menos ticks en móvil
                tick={{ 
                  fill: '#9ca3af', 
                  fontSize: getFontSize('radius')
                }}
              />
              <Radar 
                name="Promedio" 
                dataKey="value" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.3}
                strokeWidth={isMobile ? 1.5 : 2}
              />
              <Tooltip 
                content={<CustomTooltip />}
                wrapperStyle={{ zIndex: 100 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Información adicional en móvil */}
      {isMobile && processedRadarData.some(item => item.metric.endsWith('...')) && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">
            Toca las métricas para ver los valores completos
          </p>
        </div>
      )}

      {/* Lista de métricas para móvil (opcional, más accesible) */}
      {isMobile && (
        <details className="mt-4 text-sm">
          <summary className="text-gray-400 cursor-pointer hover:text-green-400 transition-colors">
            Ver detalles de métricas
          </summary>
          <div className="mt-2 space-y-2">
            {radarData.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-1 px-2 rounded bg-gray-800/30">
                <span className="text-gray-300 text-xs">{item.metric}</span>
                <span className="text-green-400 font-semibold text-xs">
                  {item.value.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

export default RadarChartOverview;