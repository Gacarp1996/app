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
    // Usar el porcentaje precalculado o calcularlo si no existe
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
  // --- PASO 1: AÑADIR ESTADOS PARA DETECCIÓN ---
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Esto se ejecuta solo en el navegador para evitar errores
    setIsClient(true);
  }, []);

  // --- PASO 2: DETECTAR SI ES UN DISPOSITIVO TÁCTIL ---
  const isTouchDevice = isClient && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Calcular el total de minutos
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

  // Preparar datos con porcentajes calculados
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
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ index }) => {
              if (index === undefined) return '';
              const item = dataWithPercentages[index];
              // Para labels muy pequeños, no mostrar texto
              const percent = parseFloat(item.percentage);
              if (percent < 3) return '';
              
              return `${item.name}: ${item.value} min`;
            }}
            onClick={onSliceClick ? (payload) => onSliceClick(payload as any as ChartDataPoint) : undefined}
            style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
          >
            {dataWithPercentages.map((_, index) => (
              <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
            ))}
          </Pie>

          {/* --- PASO 3: RENDERIZAR EL TOOLTIP CONDICIONALMENTE --- */}
          {!isTouchDevice && <Tooltip content={<CustomTooltip />} />}
          
          <Legend 
            formatter={(value: string) => {
              const item = dataWithPercentages.find(d => d.name === value);
              if (item && totalMinutes > 0) {
                return `${value}: ${item.value} min (${item.percentage}%)`;
              }
              return `${value}: ${item?.value || 0} min`;
            }}
            wrapperStyle={{fontSize: '0.8rem', color: 'var(--color-text-secondary)'}} 
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