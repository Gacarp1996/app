import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartDataPoint } from '../types';

interface AreaPieChartProps {
  data: ChartDataPoint[];
  chartTitle: string;
  onSliceClick?: (dataPoint: ChartDataPoint) => void;
  height?: string | number;
}

// Define theme-agnostic colors or ensure they work well on both light/dark
const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#A4DE6C', '#D0ED57', '#FFC658'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = data.percentage || '0.0';
    return (
      <div className="p-2 bg-app-surface-alt shadow-md rounded border border-app">
        <p className="text-app-primary font-semibold">{data.name}</p>
        <p className="text-app-secondary text-sm">Tiempo: {data.value} minutos</p>
        <p className="text-app-secondary text-sm">Porcentaje: {percentage}%</p>
      </div>
    );
  }
  return null;
};

const AreaPieChart: React.FC<AreaPieChartProps> = ({ data, chartTitle, onSliceClick, height = '100%' }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isTouchDevice = isClient && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const totalMinutes = data.reduce((sum, item) => sum + (item.value || 0), 0);

  if (!data || data.length === 0 || totalMinutes === 0) {
    return (
      <div className="bg-app-surface p-4 rounded-lg shadow-lg" style={{ height: height !== '100%' ? height : 'auto' }}>
        <h3 className="text-xl font-semibold text-app-accent mb-4 text-center">{chartTitle}</h3>
        <p className="text-center text-app-secondary py-4">
          {!data || data.length === 0 ? 'No hay datos para mostrar para esta selección.' : 'No se registraron minutos de ejercicio.'}
        </p>
      </div>
    );
  }

  const dataWithPercentages = data.map(item => ({
    ...item,
    percentage: ((item.value / totalMinutes) * 100).toFixed(1)
  }));

  return (
    <div className="bg-app-surface p-4 rounded-lg shadow-lg" style={{ height: height }}>
      <h3 className="text-xl font-semibold text-app-accent mb-4 text-center">{chartTitle}</h3>
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={dataWithPercentages}
            cx="50%"
            cy="50%"
            label={false}
            labelLine={false}
            outerRadius={110} 
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            onClick={onSliceClick ? (payload) => onSliceClick(payload as any as ChartDataPoint) : undefined}
            style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
          >
            {dataWithPercentages.map((_, index) => (
              <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
            ))}
          </Pie>

          {!isTouchDevice && <Tooltip content={<CustomTooltip />} />}
          
          <Legend 
            formatter={(value: string) => {
              const item = dataWithPercentages.find(d => d.name === value);
              if (item && totalMinutes > 0) {
                return `${value}: ${item.value} min (${item.percentage}%)`;
              }
              return `${value}: ${item?.value || 0} min`;
            }}
            // ===== ¡LETRA AÚN MÁS GRANDE! =====
            wrapperStyle={{fontSize: '1.2rem', color: 'var(--color-text-secondary)'}} 
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="text-center text-sm text-app-secondary mt-2">
        Total: {totalMinutes} minutos
      </div>
    </div>
  );
};

export default AreaPieChart;