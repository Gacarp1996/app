import React, { useMemo } from 'react';
import { PostTrainingSurvey, SurveyDataPoint } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SurveyVisualizationProps {
  surveys: PostTrainingSurvey[];
  timeZone?: string;
}

// Componente de ayuda para las tarjetas de estadísticas
const StatCard: React.FC<{ title: string; value: string; color: string; icon: React.ReactNode }> = ({ title, value, color, icon }) => (
    <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 p-[1px] rounded-2xl">
        <div className="bg-gray-900/90 backdrop-blur-lg rounded-2xl p-4 text-center h-full flex flex-col justify-center">
            <div className={`mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2`} style={{ backgroundColor: `${color}20`, border: `1px solid ${color}50` }}>
                {icon}
            </div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
        </div>
    </div>
);

const SurveyVisualization: React.FC<SurveyVisualizationProps> = ({ surveys, timeZone = 'America/Argentina/Buenos_Aires' }) => {
  const formatDateLocal = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone });

  const chartData = useMemo((): SurveyDataPoint[] => {
    if (!surveys || surveys.length === 0) return [];
    return [...surveys]
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
      .map(survey => ({
        fecha: formatDateLocal(survey.fecha),
        cansancioFisico: survey.cansancioFisico,
        concentracion: survey.concentracion,
        actitudMental: survey.actitudMental,
        sensacionesTenisticas: survey.sensacionesTenisticas
      }));
  }, [surveys, timeZone]);

  const avgValues = useMemo(() => {
    if (!surveys || surveys.length === 0) return null;
    const totals = surveys.reduce((acc, survey) => ({
      cansancioFisico: acc.cansancioFisico + survey.cansancioFisico,
      concentracion: acc.concentracion + survey.concentracion,
      actitudMental: acc.actitudMental + survey.actitudMental,
      sensacionesTenisticas: acc.sensacionesTenisticas + survey.sensacionesTenisticas
    }), { cansancioFisico: 0, concentracion: 0, actitudMental: 0, sensacionesTenisticas: 0 });
    const count = surveys.length;
    return {
      cansancioFisico: (totals.cansancioFisico / count).toFixed(1),
      concentracion: (totals.concentracion / count).toFixed(1),
      actitudMental: (totals.actitudMental / count).toFixed(1),
      sensacionesTenisticas: (totals.sensacionesTenisticas / count).toFixed(1)
    };
  }, [surveys]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/80 backdrop-blur-md p-3 shadow-lg rounded-lg border border-gray-700">
          <p className="text-white font-semibold mb-2">{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} className="text-sm" style={{ color: entry.color }}>{entry.name}: {entry.value}/5</p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  const ValueBadge: React.FC<{ value: number; color: string }> = ({ value, color }) => (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm" style={{ backgroundColor: `${color}20`, color: `${color}`}}>
      {value}
    </span>
  );

  if (!surveys || surveys.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 p-[1px] rounded-2xl">
        <div className="bg-gray-900/90 backdrop-blur-lg rounded-2xl p-6 text-center">
            <p className="text-gray-400">No hay encuestas registradas para este jugador en el período seleccionado.</p>
        </div>
      </div>
    );
  }

  const METRICS = {
      cansancioFisico: { name: 'Energía', color: '#22c55e', icon: '⚡️' },
      concentracion: { name: 'Concentración', color: '#3b82f6', icon: '🎯' },
      actitudMental: { name: 'Actitud', color: '#facc15', icon: '🧠' },
      sensacionesTenisticas: { name: 'Sensaciones', color: '#a855f7', icon: '🎾' }
  };

  return (
    <div className="space-y-8">
      <div className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6">
          <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">Promedios ({surveys.length} {surveys.length === 1 ? 'encuesta' : 'encuestas'})</h3>
          {avgValues && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Energía" value={avgValues.cansancioFisico} color={METRICS.cansancioFisico.color} icon={<span className='text-xl'>{METRICS.cansancioFisico.icon}</span>} />
              <StatCard title="Concentración" value={avgValues.concentracion} color={METRICS.concentracion.color} icon={<span className='text-xl'>{METRICS.concentracion.icon}</span>} />
              <StatCard title="Actitud" value={avgValues.actitudMental} color={METRICS.actitudMental.color} icon={<span className='text-xl'>{METRICS.actitudMental.icon}</span>} />
              <StatCard title="Sensaciones" value={avgValues.sensacionesTenisticas} color={METRICS.sensacionesTenisticas.color} icon={<span className='text-xl'>{METRICS.sensacionesTenisticas.icon}</span>} />
            </div>
          )}
        </div>
      </div>

      <div className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6">
          <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">Evolución en el Tiempo</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="fecha" stroke="var(--color-text-secondary)" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} stroke="var(--color-text-secondary)" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" />
              {Object.entries(METRICS).map(([key, { name, color }]) => (
                <Line key={key} type="monotone" dataKey={key} stroke={color} name={name} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }}/>
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6">
          <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">Detalle de Encuestas</h3>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  {['Fecha', ...Object.values(METRICS).map(m => m.name), 'Promedio'].map(header => (
                    <th key={header} className="p-3 font-medium text-gray-400">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...surveys].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map(survey => {
                  const promedio = ((survey.cansancioFisico + survey.concentracion + survey.actitudMental + survey.sensacionesTenisticas) / 4).toFixed(1);
                  return (
                    <tr key={survey.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                      <td className="p-3 text-white">{formatDateLocal(survey.fecha)}</td>
                      <td className="p-3 text-center"><ValueBadge value={survey.cansancioFisico} color={METRICS.cansancioFisico.color} /></td>
                      <td className="p-3 text-center"><ValueBadge value={survey.concentracion} color={METRICS.concentracion.color} /></td>
                      <td className="p-3 text-center"><ValueBadge value={survey.actitudMental} color={METRICS.actitudMental.color} /></td>
                      <td className="p-3 text-center"><ValueBadge value={survey.sensacionesTenisticas} color={METRICS.sensacionesTenisticas.color} /></td>
                      <td className="p-3 text-white font-bold">{promedio}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-4">
             {[...surveys].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map(survey => {
                const promedio = ((survey.cansancioFisico + survey.concentracion + survey.actitudMental + survey.sensacionesTenisticas) / 4).toFixed(1);
                return (
                    <div key={survey.id} className="relative bg-gradient-to-br from-gray-800 to-gray-900 p-[1px] rounded-2xl">
                        <div className="bg-gray-900/90 backdrop-blur-lg rounded-2xl p-4">
                            <div className="flex justify-between items-center mb-3">
                                <p className="font-semibold text-white">{formatDateLocal(survey.fecha)}</p>
                                <p className="font-bold text-lg text-green-400">{promedio}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {Object.entries(METRICS).map(([key, {name, color}]) => (
                                    <p key={key}><strong style={{color}}>{name}:</strong> <span className='text-gray-300'>{survey[key as keyof PostTrainingSurvey]}/5</span></p>
                                ))}
                            </div>
                        </div>
                    </div>
                );
             })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyVisualization;