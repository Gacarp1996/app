import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  name: string;
  value: number;
  type?: 'TrainingType' | 'TrainingArea' | 'Exercise' | 'SpecificExercise';
  percentage?: string;
}

interface AreaPieChartProps {
  data: ChartDataPoint[];
  chartTitle: string;
  onSliceClick?: (dataPoint: ChartDataPoint) => void;
  height?: string | number;
}

type ChartView = 'pie' | 'table';

// Colores optimizados para tema oscuro
const CHART_COLORS = [
  '#00E87A', '#00D9E8', '#3B82F6', '#8B5CF6', '#F59E0B', 
  '#EC4899', '#10B981', '#6366F1', '#14B8A6'
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-3 bg-gray-800/95 backdrop-blur-xl shadow-2xl rounded-lg border border-gray-600">
        <p className="text-white font-semibold text-base">{data.name}</p>
        <p className="text-gray-300 text-sm mt-1">
          <span className="text-green-400 font-bold">{data.value}</span> minutos
        </p>
        <p className="text-gray-300 text-sm">
          <span className="text-cyan-400 font-bold">{data.percentage}%</span> del total
        </p>
      </div>
    );
  }
  return null;
};

const ChartViewSelector: React.FC<{
  activeView: ChartView;
  onViewChange: (view: ChartView) => void;
}> = ({ activeView, onViewChange }) => {
  const views = [
    { id: 'pie' as ChartView, icon: '🥧', label: 'Torta', tooltip: 'Vista de torta' },
    { id: 'table' as ChartView, icon: '📋', label: 'Tabla', tooltip: 'Vista de tabla' }
  ];

  return (
    <div className="flex bg-gray-800/50 rounded-lg p-1 gap-1">
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
            ${activeView === view.id 
              ? 'bg-green-500/20 text-green-400 shadow-sm' 
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
            }
          `}
          title={view.tooltip}
        >
          <span className="text-base">{view.icon}</span>
          <span className="hidden sm:inline">{view.label}</span>
        </button>
      ))}
    </div>
  );
};

// Componente simple y limpio - Solo Torta y Tabla

const TableView: React.FC<{
  data: ChartDataPoint[];
  onRowClick?: (dataPoint: ChartDataPoint) => void;
}> = ({ data, onRowClick }) => {
  const [sortField, setSortField] = useState<'name' | 'value' | 'percentage'>('value');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal, bVal;
      
      if (sortField === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === 'value') {
        aVal = a.value;
        bVal = b.value;
      } else {
        aVal = parseFloat(a.percentage || '0');
        bVal = parseFloat(b.percentage || '0');
      }
      
      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: 'name' | 'value' | 'percentage') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="text-gray-600">↕️</span>;
    return <span className="text-green-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-700">
      <table className="w-full">
        <thead className="bg-gray-800/50">
          <tr>
            <th 
              className="px-4 py-3 text-left text-sm font-medium text-gray-300 cursor-pointer hover:text-green-400 transition-colors"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center gap-2">
                Categoría <SortIcon field="name" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-green-400 transition-colors"
              onClick={() => handleSort('value')}
            >
              <div className="flex items-center justify-center gap-2">
                Minutos <SortIcon field="value" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-center text-sm font-medium text-gray-300 cursor-pointer hover:text-green-400 transition-colors"
              onClick={() => handleSort('percentage')}
            >
              <div className="flex items-center justify-center gap-2">
                Porcentaje <SortIcon field="percentage" />
              </div>
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium text-gray-300">
              Visual
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {sortedData.map((item, index) => (
            <tr 
              key={item.name}
              className={`
                hover:bg-gray-800/30 transition-colors
                ${onRowClick ? 'cursor-pointer' : ''}
              `}
              onClick={() => onRowClick?.(item)}
            >
              <td className="px-4 py-3 text-sm text-gray-200 font-medium">
                {item.name}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <span className="text-green-400 font-bold">{item.value}</span>
                <span className="text-gray-500 ml-1">min</span>
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <span className="text-cyan-400 font-bold">{item.percentage}%</span>
              </td>
              <td className="px-4 py-3 text-center">
                <div 
                  className="w-4 h-4 rounded-full mx-auto"
                  style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const AreaPieChart: React.FC<AreaPieChartProps> = ({ 
  data, 
  chartTitle, 
  onSliceClick, 
  height = '100%' 
}) => {
  const [isClient, setIsClient] = useState(false);
  const [activeView, setActiveView] = useState<ChartView>('pie');

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isTouchDevice = isClient && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const totalMinutes = data.reduce((sum, item) => sum + (item.value || 0), 0);

  // Procesar datos con porcentajes
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      percentage: ((item.value / totalMinutes) * 100).toFixed(1)
    }));
  }, [data, totalMinutes]);

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

  const chartHeight = activeView === 'table' ? 'auto' : '85%';

  return (
    <div 
      className="bg-gray-900/50 backdrop-blur-sm p-4 lg:p-6 rounded-xl shadow-lg border border-gray-800 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/5" 
      style={{ height: height }}
    >
      {/* Header con título y selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 lg:mb-6">
        <h3 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
          {chartTitle}
        </h3>
        <ChartViewSelector 
          activeView={activeView} 
          onViewChange={setActiveView} 
        />
      </div>
      
      {/* Contenido del gráfico */}
      <div style={{ height: chartHeight }}>
        {activeView === 'pie' && (
          <div className="w-full h-full flex flex-col">
            {/* Gráfico de torta */}
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    {CHART_COLORS.map((color, index) => (
                      <linearGradient key={`gradient-${index}`} id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={color} stopOpacity={1} />
                      </linearGradient>
                    ))}
                  </defs>
                  
                  <Pie
                    data={processedData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => parseFloat(entry.percentage) > 5 ? `${entry.percentage}%` : ''}
                    outerRadius="75%"
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    onClick={onSliceClick ? (payload) => onSliceClick(payload as any) : undefined}
                    style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
                  >
                    {processedData.map((_, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#gradient-${index % CHART_COLORS.length})`}
                      />
                    ))}
                  </Pie>

                  {!isTouchDevice && <Tooltip content={<CustomTooltip />} />}
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend personalizado */}
            <div className="flex-shrink-0 px-4 pb-2">
              <div className="flex flex-wrap justify-center items-center gap-4">
                {processedData.map((item, index) => (
                  <div 
                    key={item.name}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-gray-300 font-medium">{item.name}</span>
                    <span className="text-gray-500">
                      {item.value}min ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeView === 'table' && (
          <TableView 
            data={processedData}
            onRowClick={onSliceClick}
          />
        )}
      </div>
      
      {/* Footer con totales y ayuda */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="flex justify-between items-center px-2">
          <span className="text-sm lg:text-base text-gray-400">Total registrado:</span>
          <span className="text-lg lg:text-xl font-bold text-green-400">
            {totalMinutes} minutos
          </span>
        </div>
        {onSliceClick && (
          <p className="text-xs lg:text-sm text-gray-500 text-center mt-2">
            {activeView === 'pie' && 'Haz click en una sección para ver más detalles'}
            {activeView === 'table' && 'Haz click en una fila para ver más detalles'}
          </p>
        )}
      </div>
    </div>
  );
};

export default AreaPieChart;