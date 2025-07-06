// components/player-profile/IndividualMetricsCharts.tsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CustomTooltip from './CustomTooltip';

interface IndividualMetricsChartsProps {
  prepareIndividualChartData: (metricKey: string) => any[];
  METRIC_CONFIG: {
    energia: { key: string; label: string; color: string };
    concentracion: { key: string; label: string; color: string };
    actitud: { key: string; label: string; color: string };
    sensaciones: { key: string; label: string; color: string };
  };
}

const IndividualMetricsCharts: React.FC<IndividualMetricsChartsProps> = ({
  prepareIndividualChartData,
  METRIC_CONFIG
}) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
      <h3 className="text-xl lg:text-2xl font-semibold text-green-400 mb-6">
        Evolución Individual de Métricas
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {/* Gráfico de Energía */}
        <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
          <h4 className="text-lg lg:text-xl font-medium mb-4" style={{ color: METRIC_CONFIG.energia.color }}>
            Evolución de la {METRIC_CONFIG.energia.label}
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={prepareIndividualChartData(METRIC_CONFIG.energia.key)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="fecha" 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                domain={[0, 5]} 
                ticks={[0, 1, 2, 3, 4, 5]}
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={METRIC_CONFIG.energia.color}
                strokeWidth={2}
                dot={{ fill: METRIC_CONFIG.energia.color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Concentración */}
        <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
          <h4 className="text-lg lg:text-xl font-medium mb-4" style={{ color: METRIC_CONFIG.concentracion.color }}>
            Evolución de la {METRIC_CONFIG.concentracion.label}
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={prepareIndividualChartData(METRIC_CONFIG.concentracion.key)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="fecha" 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                domain={[0, 5]} 
                ticks={[0, 1, 2, 3, 4, 5]}
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={METRIC_CONFIG.concentracion.color}
                strokeWidth={2}
                dot={{ fill: METRIC_CONFIG.concentracion.color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Actitud */}
        <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
          <h4 className="text-lg lg:text-xl font-medium mb-4" style={{ color: METRIC_CONFIG.actitud.color }}>
            Evolución de la {METRIC_CONFIG.actitud.label}
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={prepareIndividualChartData(METRIC_CONFIG.actitud.key)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="fecha" 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                domain={[0, 5]} 
                ticks={[0, 1, 2, 3, 4, 5]}
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={METRIC_CONFIG.actitud.color}
                strokeWidth={2}
                dot={{ fill: METRIC_CONFIG.actitud.color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Sensaciones */}
        <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
          <h4 className="text-lg lg:text-xl font-medium mb-4" style={{ color: METRIC_CONFIG.sensaciones.color }}>
            Evolución de las {METRIC_CONFIG.sensaciones.label}
          </h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={prepareIndividualChartData(METRIC_CONFIG.sensaciones.key)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="fecha" 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                domain={[0, 5]} 
                ticks={[0, 1, 2, 3, 4, 5]}
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={METRIC_CONFIG.sensaciones.color}
                strokeWidth={2}
                dot={{ fill: METRIC_CONFIG.sensaciones.color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leyenda de interpretación */}
      <div className="mt-6 bg-blue-900/20 border border-blue-800 p-4 rounded-lg">
        <p className="text-sm lg:text-base text-blue-300">
          <strong>Interpretación de valores:</strong> 1 = Muy bajo/negativo | 2 = Bajo | 3 = Normal | 4 = Bueno | 5 = Excelente
        </p>
      </div>
    </div>
  );
};

export default IndividualMetricsCharts;