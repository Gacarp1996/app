import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { DisputedTournament, RendimientoJugador, ConformidadGeneral } from '../types';

interface TournamentPerformanceChartProps {
  tournaments: DisputedTournament[];
  showRadar?: boolean;
}

const RENDIMIENTO_MAP: Record<RendimientoJugador, number> = { 'Muy malo': 1, 'Malo': 2, 'Bueno': 3, 'Muy bueno': 4, 'Excelente': 5 };
const CONFORMIDAD_MAP: Record<ConformidadGeneral, number> = { 'Muy insatisfecho': 1, 'Insatisfecho': 2, 'Satisfecho': 3, 'Muy satisfecho': 4, 'Totalmente satisfecho': 5 };

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const tournament = payload[0].payload;
    return (
      <div className="bg-gray-900/80 backdrop-blur-md p-3 shadow-lg rounded-lg border border-gray-700 text-sm">
        <p className="text-white font-semibold mb-1">{tournament.nombreTorneo}</p>
        <p className="text-gray-400 mb-2">{label} | Resultado: {tournament.resultado}</p>
        <p style={{ color: '#3b82f6' }}>Rendimiento: {tournament.rendimientoText} ({payload[0].value}/5)</p>
        <p style={{ color: '#10b981' }}>Conformidad: {tournament.conformidadText} ({tournament.conformidad}/5)</p>
        <p style={{ color: '#f59e0b' }}>Dificultad: {tournament.dificultad}/5</p>
      </div>
    );
  }
  return null;
};

const StatCard: React.FC<{ title: string; value: string; color: string; unit?: string }> = ({ title, value, color, unit }) => (
    <div className="relative p-[1px] rounded-2xl" style={{ backgroundImage: `linear-gradient(135deg, ${color}20, #1f2937)`}}>
        <div className="bg-gray-900/90 backdrop-blur-lg rounded-2xl p-4 text-center h-full">
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold" style={{ color: color }}>
                {value}
                {unit && <span className="text-lg text-gray-400">{unit}</span>}
            </p>
        </div>
    </div>
);


const TournamentPerformanceChart: React.FC<TournamentPerformanceChartProps> = ({ tournaments, showRadar = false }) => {
  const chartData = useMemo(() => {
    return tournaments
      .sort((a, b) => new Date(a.fechaFin).getTime() - new Date(b.fechaFin).getTime())
      .map(t => ({
        fecha: new Date(t.fechaFin).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
        nombreTorneo: t.nombreTorneo,
        rendimiento: RENDIMIENTO_MAP[t.rendimientoJugador],
        rendimientoText: t.rendimientoJugador,
        conformidad: CONFORMIDAD_MAP[t.conformidadGeneral],
        conformidadText: t.conformidadGeneral,
        dificultad: t.nivelDificultad,
        resultado: t.resultado
      }));
  }, [tournaments]);

  const radarData = useMemo(() => {
    return [1, 2, 3, 4, 5].map(dif => {
      const filtered = tournaments.filter(t => t.nivelDificultad === dif);
      if (filtered.length === 0) return { dificultad: `Nivel ${dif}`, rendimiento: 0, conformidad: 0 };
      const avgRendimiento = filtered.reduce((sum, t) => sum + RENDIMIENTO_MAP[t.rendimientoJugador], 0) / filtered.length;
      const avgConformidad = filtered.reduce((sum, t) => sum + CONFORMIDAD_MAP[t.conformidadGeneral], 0) / filtered.length;
      return { dificultad: `Nivel ${dif}`, rendimiento: parseFloat(avgRendimiento.toFixed(1)), conformidad: parseFloat(avgConformidad.toFixed(1)) };
    });
  }, [tournaments]);

  const stats = useMemo(() => {
    if (tournaments.length === 0) return null;
    return {
      promedioRendimiento: (tournaments.reduce((s, t) => s + RENDIMIENTO_MAP[t.rendimientoJugador], 0) / tournaments.length).toFixed(1),
      promedioConformidad: (tournaments.reduce((s, t) => s + CONFORMIDAD_MAP[t.conformidadGeneral], 0) / tournaments.length).toFixed(1),
      promedioDificultad: (tournaments.reduce((s, t) => s + t.nivelDificultad, 0) / tournaments.length).toFixed(1),
      totalTorneos: tournaments.length
    };
  }, [tournaments]);

  if (tournaments.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 p-[1px] rounded-2xl">
          <div className="bg-gray-900/90 backdrop-blur-lg rounded-2xl p-6 text-center">
              <p className="text-gray-400">No hay torneos disputados para mostrar estadísticas.</p>
          </div>
      </div>
    );
  }
  
  const Card: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
    <div className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">{title}</h3>
            {children}
        </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Torneos Jugados" value={String(stats.totalTorneos)} color="#00E87A" />
          <StatCard title="Rendimiento Prom." value={stats.promedioRendimiento} color="#3b82f6" unit="/5" />
          <StatCard title="Conformidad Prom." value={stats.promedioConformidad} color="#10b981" unit="/5" />
          <StatCard title="Dificultad Prom." value={stats.promedioDificultad} color="#f59e0b" unit="/5" />
        </div>
      )}

      <Card title="Evolución del Rendimiento">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="fecha" stroke="var(--color-text-secondary)" angle={-45} textAnchor="end" height={70} />
            <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} stroke="var(--color-text-secondary)" />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" />
            <Line type="monotone" dataKey="rendimiento" name="Rendimiento" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="conformidad" name="Conformidad" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="dificultad" name="Dificultad" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {showRadar && (
        <Card title="Rendimiento por Nivel de Dificultad">
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis dataKey="dificultad" tick={{ fill: 'var(--color-text-primary)' }} />
              <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fill: 'var(--color-text-secondary)' }} />
              <Tooltip />
              <Radar name="Rendimiento" dataKey="rendimiento" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              <Radar name="Conformidad" dataKey="conformidad" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
};

export default TournamentPerformanceChart;