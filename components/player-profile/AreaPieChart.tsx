import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '../../types';

interface AreaPieChartProps {
  data: ChartDataPoint[];
  chartTitle: string;
  onSliceClick?: (dataPoint: ChartDataPoint) => void;
  height?: string | number;
}

// Colores optimizados para tema oscuro con estilo neón
const PIE_CHART_COLORS = [
  '#00E87A', // Verde neón
  '#00D9E8', // Cyan neón
  '#3B82F6', // Azul
  '#8B5CF6', // Púrpura
  '#F59E0B', // Ámbar
  '#EC4899', // Rosa
  '#10B981', // Esmeralda
  '#6366F1', // Índigo
  '#14B8A6', // Teal
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = data.percentage || '0.0';
    return (
      <div className="p-3 lg:p-4 bg-gray-900/95 backdrop-blur-xl shadow-2xl rounded-lg border border-gray-700">
        <p className="text-white font-semibold text-base lg:text-lg">{data.name}</p>
        <p className="text-gray-400 text-sm lg:text-base mt-1">
          <span className="text-green-400 font-bold">{data.value}</span> minutos
        </p>
        <p className="text-gray-400 text-sm lg:text-base">
          <span className="text-cyan-400 font-bold">{percentage}%</span> del total
        </p>
      </div>
    );
  }
  return null;
};

const AreaPieChart: React.FC<AreaPieChartProps> = ({ data, chartTitle, onSliceClick, height = '100%' }) => {
  const [isClient, setIsClient] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isTouchDevice = isClient && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const totalMinutes = data.reduce((sum, item) => sum + (item.value || 0), 0);

  if (!data || data.length === 0 || totalMinutes === 0) {
    return (
      <div 
        className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800" 
        style={{ height: height !== '100%' ? height : 'auto' }}
      >
        <h3 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4 text-center">
          {chartTitle}
        </h3>
        <div className="text-center py-8 lg:py-12">
          <svg className="w-16 h-16 lg:w-20 lg:h-20 mx-auto text-gray-700 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
          </svg>
          <p className="text-gray-400 text-base lg:text-lg">
            {!data || data.length === 0 ? 'No hay datos para mostrar para esta selección.' : 'No se registraron minutos de ejercicio.'}
          </p>
        </div>
      </div>
    );
  }

  const dataWithPercentages = data.map(item => ({
    ...item,
    percentage: ((item.value / totalMinutes) * 100).toFixed(1)
  }));

  return (
    <div 
      className="bg-gray-900/50 backdrop-blur-sm p-4 lg:p-6 rounded-xl shadow-lg border border-gray-800 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5" 
      style={{ height: height }}
    >
      <h3 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4 lg:mb-6 text-center">
        {chartTitle}
      </h3>
      
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <defs>
            {PIE_CHART_COLORS.map((color, index) => (
              <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                <stop offset="100%" stopColor={color} stopOpacity={1} />
              </linearGradient>
            ))}
          </defs>
          
          <Pie
            data={dataWithPercentages}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(entry) => entry.percentage > 5 ? `${entry.percentage}%` : ''}
            outerRadius="80%"
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            onClick={onSliceClick ? (payload) => onSliceClick(payload as any as ChartDataPoint) : undefined}
            onMouseEnter={(_, index) => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
          >
            {dataWithPercentages.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={`url(#gradient-${index % PIE_CHART_COLORS.length})`}
                stroke={hoveredIndex === index ? PIE_CHART_COLORS[index % PIE_CHART_COLORS.length] : 'transparent'}
                strokeWidth={hoveredIndex === index ? 2 : 0}
                style={{
                  filter: hoveredIndex === index ? 'brightness(1.2)' : 'brightness(1)',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </Pie>

          {!isTouchDevice && <Tooltip content={<CustomTooltip />} />}
          
          <Legend 
            formatter={(value: string, entry: any) => {
              const item = dataWithPercentages.find(d => d.name === value);
              if (item && totalMinutes > 0) {
                return (
                  <span className="text-gray-300 text-sm lg:text-base">
                    <span className="font-medium">{value}</span>
                    <span className="text-gray-500 ml-1">
                      {item.value}min ({item.percentage}%)
                    </span>
                  </span>
                );
              }
              return <span className="text-gray-300">{value}: {item?.value || 0} min</span>;
            }}
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '14px',
            }}
            iconType="circle"
            iconSize={10}
          />
        </PieChart>
      </ResponsiveContainer>
      
      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="flex justify-between items-center px-2">
          <span className="text-sm lg:text-base text-gray-400">Total registrado:</span>
          <span className="text-lg lg:text-xl font-bold text-green-400">
            {totalMinutes} minutos
          </span>
        </div>
        {onSliceClick && (
          <p className="text-xs lg:text-sm text-gray-500 text-center mt-2">
            Haz click en una sección para ver más detalles
          </p>
        )}
      </div>
    </div>
  );
};

export default AreaPieChart;