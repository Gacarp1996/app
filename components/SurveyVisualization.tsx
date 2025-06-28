// components/SurveyVisualization.tsx
import React, { useMemo } from 'react';
import { PostTrainingSurvey, SurveyDataPoint } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SurveyVisualizationProps {
  surveys: PostTrainingSurvey[];
}

const SurveyVisualization: React.FC<SurveyVisualizationProps> = ({ surveys }) => {
  // Preparar datos para el gráfico
  const chartData = useMemo((): SurveyDataPoint[] => {
    if (!surveys || surveys.length === 0) return [];
    
    // Ordenar por fecha ascendente (más antigua primero)
    const sortedSurveys = [...surveys].sort((a, b) => 
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    );
    
    return sortedSurveys.map(survey => ({
      fecha: new Date(survey.fecha).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short',
        year: '2-digit'
      }),
      cansancioFisico: survey.cansancioFisico,
      concentracion: survey.concentracion,
      actitudMental: survey.actitudMental,
      sensacionesTenisticas: survey.sensacionesTenisticas
    }));
  }, [surveys]);

  // Calcular promedios
  const avgValues = useMemo(() => {
    if (!surveys || surveys.length === 0) return null;
    
    const totals = surveys.reduce((acc, survey) => ({
      cansancioFisico: acc.cansancioFisico + survey.cansancioFisico,
      concentracion: acc.concentracion + survey.concentracion,
      actitudMental: acc.actitudMental + survey.actitudMental,
      sensacionesTenisticas: acc.sensacionesTenisticas + survey.sensacionesTenisticas
    }), {
      cansancioFisico: 0,
      concentracion: 0,
      actitudMental: 0,
      sensacionesTenisticas: 0
    });

    const count = surveys.length;
    return {
      cansancioFisico: (totals.cansancioFisico / count).toFixed(1),
      concentracion: (totals.concentracion / count).toFixed(1),
      actitudMental: (totals.actitudMental / count).toFixed(1),
      sensacionesTenisticas: (totals.sensacionesTenisticas / count).toFixed(1)
    };
  }, [surveys]);

  // Componente personalizado para el tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-app-surface-alt shadow-lg rounded-lg border border-app">
          <p className="text-app-primary font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}/5
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Si no hay encuestas
  if (!surveys || surveys.length === 0) {
    return (
      <div className="bg-app-surface p-6 rounded-lg shadow text-center">
        <p className="text-app-secondary">
          No hay encuestas registradas para este jugador en el período seleccionado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen de promedios */}
      {avgValues && (
        <div className="bg-app-surface p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-app-accent mb-4">
            Promedios del Período ({surveys.length} {surveys.length === 1 ? 'encuesta' : 'encuestas'})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-app-surface-alt p-4 rounded-lg text-center transform hover:scale-105 transition-transform">
              <p className="text-sm text-app-secondary mb-1">Energía Física</p>
              <p className="text-2xl font-bold text-green-500">{avgValues.cansancioFisico}</p>
              <p className="text-xs text-app-secondary mt-1">de 5</p>
              <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(parseFloat(avgValues.cansancioFisico) / 5) * 100}%` }}
                />
              </div>
            </div>
            <div className="bg-app-surface-alt p-4 rounded-lg text-center transform hover:scale-105 transition-transform">
              <p className="text-sm text-app-secondary mb-1">Concentración</p>
              <p className="text-2xl font-bold text-blue-500">{avgValues.concentracion}</p>
              <p className="text-xs text-app-secondary mt-1">de 5</p>
              <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(parseFloat(avgValues.concentracion) / 5) * 100}%` }}
                />
              </div>
            </div>
            <div className="bg-app-surface-alt p-4 rounded-lg text-center transform hover:scale-105 transition-transform">
              <p className="text-sm text-app-secondary mb-1">Actitud Mental</p>
              <p className="text-2xl font-bold text-yellow-500">{avgValues.actitudMental}</p>
              <p className="text-xs text-app-secondary mt-1">de 5</p>
              <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(parseFloat(avgValues.actitudMental) / 5) * 100}%` }}
                />
              </div>
            </div>
            <div className="bg-app-surface-alt p-4 rounded-lg text-center transform hover:scale-105 transition-transform">
              <p className="text-sm text-app-secondary mb-1">Sensaciones</p>
              <p className="text-2xl font-bold text-purple-500">{avgValues.sensacionesTenisticas}</p>
              <p className="text-xs text-app-secondary mt-1">de 5</p>
              <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(parseFloat(avgValues.sensacionesTenisticas) / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de evolución - PRINCIPAL */}
      <div className="bg-app-surface p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-app-accent mb-4">Evolución en el Tiempo</h3>
        
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart 
              data={chartData} 
              margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis 
                dataKey="fecha" 
                stroke="var(--color-text-secondary)"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 5]} 
                ticks={[0, 1, 2, 3, 4, 5]}
                stroke="var(--color-text-secondary)"
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              
              {/* Líneas para cada métrica */}
              <Line 
                type="monotone" 
                dataKey="cansancioFisico" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Energía Física"
                dot={{ fill: '#10b981', r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line 
                type="monotone" 
                dataKey="concentracion" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Concentración"
                dot={{ fill: '#3b82f6', r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line 
                type="monotone" 
                dataKey="actitudMental" 
                stroke="#f59e0b" 
                strokeWidth={3}
                name="Actitud Mental"
                dot={{ fill: '#f59e0b', r: 5 }}
                activeDot={{ r: 7 }}
              />
              <Line 
                type="monotone" 
                dataKey="sensacionesTenisticas" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                name="Sensaciones"
                dot={{ fill: '#8b5cf6', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-10">
            <p className="text-app-secondary">No hay datos suficientes para mostrar el gráfico</p>
          </div>
        )}
      </div>

      {/* Lista detallada */}
      <div className="bg-app-surface p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-app-accent mb-4">
          Detalle de Encuestas ({surveys.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app">
                <th className="text-left p-2 font-medium text-app-secondary">Fecha</th>
                <th className="text-center p-2 font-medium text-app-secondary">Energía</th>
                <th className="text-center p-2 font-medium text-app-secondary">Concentr.</th>
                <th className="text-center p-2 font-medium text-app-secondary">Actitud</th>
                <th className="text-center p-2 font-medium text-app-secondary">Sensac.</th>
                <th className="text-center p-2 font-medium text-app-secondary">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {[...surveys]
                .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                .map((survey) => {
                  const promedio = (
                    (survey.cansancioFisico + 
                     survey.concentracion + 
                     survey.actitudMental + 
                     survey.sensacionesTenisticas) / 4
                  ).toFixed(1);
                  
                  return (
                    <tr key={survey.id} className="border-b border-app hover:bg-app-surface-alt transition-colors">
                      <td className="p-2">
                        {new Date(survey.fecha).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="text-center p-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-medium">
                          {survey.cansancioFisico}
                        </span>
                      </td>
                      <td className="text-center p-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium">
                          {survey.concentracion}
                        </span>
                      </td>
                      <td className="text-center p-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 font-medium">
                          {survey.actitudMental}
                        </span>
                      </td>
                      <td className="text-center p-2">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-medium">
                          {survey.sensacionesTenisticas}
                        </span>
                      </td>
                      <td className="text-center p-2 font-medium">
                        {promedio}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Información adicional */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Interpretación de valores:</strong> 
          1 = Muy bajo/negativo | 2 = Bajo | 3 = Normal | 4 = Bueno | 5 = Excelente
        </p>
      </div>
    </div>
  );
};

export default SurveyVisualization;