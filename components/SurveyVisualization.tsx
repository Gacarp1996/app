// components/SurveyVisualization.tsx (versión actualizada sin filtros de fecha propios)
import React, { useMemo } from 'react';
import { PostTrainingSurvey, SurveyDataPoint } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SurveyVisualizationProps {
  surveys: PostTrainingSurvey[];
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
}

const SurveyVisualization: React.FC<SurveyVisualizationProps> = ({
  surveys
}) => {
  const chartData = useMemo((): SurveyDataPoint[] => {
    return surveys.map(survey => ({
      fecha: new Date(survey.fecha).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short' 
      }),
      cansancioFisico: survey.cansancioFisico,
      concentracion: survey.concentracion,
      actitudMental: survey.actitudMental,
      sensacionesTenisticas: survey.sensacionesTenisticas
    }));
  }, [surveys]);

  const avgValues = useMemo(() => {
    if (surveys.length === 0) return null;
    
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

  if (surveys.length === 0) {
    return (
      <div className="bg-app-surface p-6 rounded-lg shadow text-center">
        <p className="text-app-secondary">No hay encuestas registradas para este jugador en el período seleccionado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen de promedios */}
      {avgValues && (
        <div className="bg-app-surface p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-app-accent mb-4">
            Promedios del Período ({surveys.length} encuestas)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-app-surface-alt p-4 rounded-lg text-center">
              <p className="text-sm text-app-secondary mb-1">Energía Física</p>
              <p className="text-2xl font-bold text-app-accent">{avgValues.cansancioFisico}</p>
              <p className="text-xs text-app-secondary mt-1">de 5</p>
            </div>
            <div className="bg-app-surface-alt p-4 rounded-lg text-center">
              <p className="text-sm text-app-secondary mb-1">Concentración</p>
              <p className="text-2xl font-bold text-app-accent">{avgValues.concentracion}</p>
              <p className="text-xs text-app-secondary mt-1">de 5</p>
            </div>
            <div className="bg-app-surface-alt p-4 rounded-lg text-center">
              <p className="text-sm text-app-secondary mb-1">Actitud Mental</p>
              <p className="text-2xl font-bold text-app-accent">{avgValues.actitudMental}</p>
              <p className="text-xs text-app-secondary mt-1">de 5</p>
            </div>
            <div className="bg-app-surface-alt p-4 rounded-lg text-center">
              <p className="text-sm text-app-secondary mb-1">Sensaciones</p>
              <p className="text-2xl font-bold text-app-accent">{avgValues.sensacionesTenisticas}</p>
              <p className="text-xs text-app-secondary mt-1">de 5</p>
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de evolución */}
      <div className="bg-app-surface p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-app-accent mb-4">Evolución en el Tiempo</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis 
              dataKey="fecha" 
              stroke="var(--color-text-secondary)"
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              domain={[0, 5]} 
              ticks={[1, 2, 3, 4, 5]}
              stroke="var(--color-text-secondary)"
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'var(--color-surface-alt)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="cansancioFisico" 
              stroke="#10b981" 
              strokeWidth={2}
              name="Energía Física"
            />
            <Line 
              type="monotone" 
              dataKey="concentracion" 
              stroke="#3b82f6" 
              strokeWidth={2}
              name="Concentración"
            />
            <Line 
              type="monotone" 
              dataKey="actitudMental" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="Actitud Mental"
            />
            <Line 
              type="monotone" 
              dataKey="sensacionesTenisticas" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              name="Sensaciones"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Lista detallada */}
      <div className="bg-app-surface p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-app-accent mb-4">Detalle de Encuestas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app">
                <th className="text-left p-2">Fecha</th>
                <th className="text-center p-2">Energía</th>
                <th className="text-center p-2">Concentr.</th>
                <th className="text-center p-2">Actitud</th>
                <th className="text-center p-2">Sensac.</th>
              </tr>
            </thead>
            <tbody>
              {surveys.map((survey) => (
                <tr key={survey.id} className="border-b border-app hover:bg-app-surface-alt">
                  <td className="p-2">
                    {new Date(survey.fecha).toLocaleDateString('es-ES')}
                  </td>
                  <td className="text-center p-2">{survey.cansancioFisico}</td>
                  <td className="text-center p-2">{survey.concentracion}</td>
                  <td className="text-center p-2">{survey.actitudMental}</td>
                  <td className="text-center p-2">{survey.sensacionesTenisticas}</td>
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