import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PostTrainingSurvey } from '../types';

interface SurveyVisualizationProps {
  surveys: PostTrainingSurvey[];
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
}

interface ChartDataPoint {
  fecha: string;
  cansancioFisico: number | null;
  concentracion: number | null;
  actitudMental: number | null;
  sensacionesTenisticas: number | null;
}

const LINE_COLORS = {
  cansancioFisico: '#FF6B6B',      // Rojo
  concentracion: '#4ECDC4',        // Turquesa
  actitudMental: '#95E1D3',        // Verde claro
  sensacionesTenisticas: '#FFD93D' // Amarillo
};

const LINE_NAMES = {
  cansancioFisico: 'Energía Física',
  concentracion: 'Concentración',
  actitudMental: 'Actitud Mental',
  sensacionesTenisticas: 'Sensaciones Tenísticas'
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-app-surface-alt shadow-lg rounded-lg border border-app">
        <p className="text-app-primary font-semibold mb-2">{label}</p>
        {payload.map((entry: any) => (
          entry.value && (
            <p key={entry.dataKey} style={{ color: entry.color }} className="text-sm">
              {LINE_NAMES[entry.dataKey as keyof typeof LINE_NAMES]}: {entry.value.toFixed(1)}
            </p>
          )
        ))}
      </div>
    );
  }
  return null;
};

const SurveyVisualization: React.FC<SurveyVisualizationProps> = ({
  surveys,
  startDate,
  endDate,
  onDateChange
}) => {
  const [dateFilter, setDateFilter] = useState<'6days' | 'month' | 'custom'>('6days');

  useEffect(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    switch (dateFilter) {
      case '6days':
        const sixDaysAgo = new Date(today);
        sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
        sixDaysAgo.setHours(0, 0, 0, 0);
        onDateChange(sixDaysAgo.toISOString().split('T')[0], today.toISOString().split('T')[0]);
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        monthAgo.setHours(0, 0, 0, 0);
        onDateChange(monthAgo.toISOString().split('T')[0], today.toISOString().split('T')[0]);
        break;
      // Para 'custom', mantener las fechas que vienen de los inputs
    }
  }, [dateFilter]);

  const chartData = useMemo((): ChartDataPoint[] => {
    // Agrupar encuestas por fecha
    const groupedByDate = surveys.reduce((acc, survey) => {
      const date = new Date(survey.fecha).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short'
      });
      
      if (!acc[date]) {
        acc[date] = {
          fecha: date,
          cansancioFisico: [],
          concentracion: [],
          actitudMental: [],
          sensacionesTenisticas: []
        };
      }
      
      acc[date].cansancioFisico.push(survey.cansancioFisico);
      acc[date].concentracion.push(survey.concentracion);
      acc[date].actitudMental.push(survey.actitudMental);
      acc[date].sensacionesTenisticas.push(survey.sensacionesTenisticas);
      
      return acc;
    }, {} as Record<string, any>);

    // Calcular promedios
    const data = Object.entries(groupedByDate).map(([fecha, values]) => ({
      fecha,
      cansancioFisico: values.cansancioFisico.length > 0 
        ? values.cansancioFisico.reduce((a: number, b: number) => a + b) / values.cansancioFisico.length 
        : null,
      concentracion: values.concentracion.length > 0
        ? values.concentracion.reduce((a: number, b: number) => a + b) / values.concentracion.length
        : null,
      actitudMental: values.actitudMental.length > 0
        ? values.actitudMental.reduce((a: number, b: number) => a + b) / values.actitudMental.length
        : null,
      sensacionesTenisticas: values.sensacionesTenisticas.length > 0
        ? values.sensacionesTenisticas.reduce((a: number, b: number) => a + b) / values.sensacionesTenisticas.length
        : null
    }));

    // Ordenar por fecha
    return data.sort((a, b) => {
      const dateA = new Date(a.fecha);
      const dateB = new Date(b.fecha);
      return dateA.getTime() - dateB.getTime();
    });
  }, [surveys]);

  const tableData = useMemo(() => {
    return surveys.sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
  }, [surveys]);

  if (surveys.length === 0) {
    return (
      <div className="bg-app-surface p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-app-accent mb-4">
          Evolución de Sensaciones Post-Entrenamiento
        </h3>
        <p className="text-center text-app-secondary py-8">
          No hay datos de encuestas para el período seleccionado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros de fecha */}
      <div className="bg-app-surface p-4 rounded-lg shadow-md">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex gap-2">
            <button
              onClick={() => setDateFilter('6days')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                dateFilter === '6days' 
                  ? 'bg-app-accent text-white' 
                  : 'bg-app-surface-alt hover:bg-opacity-80'
              }`}
            >
              Últimos 6 días
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                dateFilter === 'month' 
                  ? 'bg-app-accent text-white' 
                  : 'bg-app-surface-alt hover:bg-opacity-80'
              }`}
            >
              Último mes
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                dateFilter === 'custom' 
                  ? 'bg-app-accent text-white' 
                  : 'bg-app-surface-alt hover:bg-opacity-80'
              }`}
            >
              Personalizado
            </button>
          </div>
          
          {dateFilter === 'custom' && (
            <div className="flex gap-3 items-end">
              <div>
                <label className="block text-sm font-medium text-app-secondary mb-1">Desde</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onDateChange(e.target.value, endDate)}
                  className="p-2 app-input rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-app-secondary mb-1">Hasta</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onDateChange(startDate, e.target.value)}
                  className="p-2 app-input rounded-md"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Gráfico de líneas */}
      <div className="bg-app-surface p-6 rounded-lg shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <h3 className="text-xl font-semibold text-app-accent">
            Evolución de Sensaciones Post-Entrenamiento
          </h3>
          <span className="text-xs text-app-secondary bg-app-surface-alt px-3 py-1 rounded-full">
            Escala: 1 = Bajo, 5 = Alto
          </span>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis 
              dataKey="fecha" 
              stroke="var(--color-text-secondary)"
              angle={-30}
              textAnchor="end"
              height={60}
              tick={{ fontSize: '0.75rem' }}
            />
            <YAxis 
              domain={[1, 5]} 
              ticks={[1, 2, 3, 4, 5]}
              stroke="var(--color-text-secondary)"
              tick={{ fill: 'var(--color-text-secondary)' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}
              formatter={(value) => LINE_NAMES[value as keyof typeof LINE_NAMES]}
            />
            <Line
              type="monotone"
              dataKey="cansancioFisico"
              stroke={LINE_COLORS.cansancioFisico}
              strokeWidth={2}
              dot={{ r: 4 }}
              connectNulls
              name="cansancioFisico"
            />
            <Line
              type="monotone"
              dataKey="concentracion"
              stroke={LINE_COLORS.concentracion}
              strokeWidth={2}
              dot={{ r: 4 }}
              connectNulls
              name="concentracion"
            />
            <Line
              type="monotone"
              dataKey="actitudMental"
              stroke={LINE_COLORS.actitudMental}
              strokeWidth={2}
              dot={{ r: 4 }}
              connectNulls
              name="actitudMental"
            />
            <Line
              type="monotone"
              dataKey="sensacionesTenisticas"
              stroke={LINE_COLORS.sensacionesTenisticas}
              strokeWidth={2}
              dot={{ r: 4 }}
              connectNulls
              name="sensacionesTenisticas"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla resumen */}
      <div className="bg-app-surface p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold text-app-accent mb-4">
          Detalle de Encuestas
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app">
                <th className="text-left py-2 px-3 font-semibold text-app-secondary">Fecha</th>
                <th className="text-center py-2 px-3 font-semibold text-app-secondary">Energía</th>
                <th className="text-center py-2 px-3 font-semibold text-app-secondary">Concentración</th>
                <th className="text-center py-2 px-3 font-semibold text-app-secondary">Actitud</th>
                <th className="text-center py-2 px-3 font-semibold text-app-secondary">Sensaciones</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((survey, index) => (
                <tr key={survey.id} className={index % 2 === 0 ? 'bg-app-surface-alt' : ''}>
                  <td className="py-2 px-3">
                    {new Date(survey.fecha).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className={`inline-block px-2 py-1 rounded ${
                      survey.cansancioFisico >= 4 ? 'bg-green-500/20 text-green-400' :
                      survey.cansancioFisico >= 3 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {survey.cansancioFisico}
                    </span>
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className={`inline-block px-2 py-1 rounded ${
                      survey.concentracion >= 4 ? 'bg-green-500/20 text-green-400' :
                      survey.concentracion >= 3 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {survey.concentracion}
                    </span>
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className={`inline-block px-2 py-1 rounded ${
                      survey.actitudMental >= 4 ? 'bg-green-500/20 text-green-400' :
                      survey.actitudMental >= 3 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {survey.actitudMental}
                    </span>
                  </td>
                  <td className="text-center py-2 px-3">
                    <span className={`inline-block px-2 py-1 rounded ${
                      survey.sensacionesTenisticas >= 4 ? 'bg-green-500/20 text-green-400' :
                      survey.sensacionesTenisticas >= 3 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {survey.sensacionesTenisticas}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SurveyVisualization;