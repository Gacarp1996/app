import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DisputedTournament, RendimientoJugador } from '../../types/types';
import { RENDIMIENTO_MAP } from './helpers';

interface TournamentPerformanceChartProps {
  tournaments: DisputedTournament[];
}


const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const tournament = payload[0].payload;
    return (
      <div className="p-3 bg-app-surface-alt shadow-lg rounded-lg border border-app">
        <p className="text-app-primary font-semibold mb-1">{tournament.nombreTorneo}</p>
        <p className="text-sm text-app-secondary">{label}</p>
        <p className="text-sm text-app-secondary">Resultado: {tournament.resultado}</p>
        <p className="text-sm" style={{ color: '#3b82f6' }}>
          Rendimiento: {tournament.rendimientoText} ({payload[0].value}/5)
        </p>
        <p className="text-sm" style={{ color: '#f59e0b' }}>
          Dificultad: {tournament.dificultad}/5
        </p>
      </div>
    );
  }
  return null;
};

const TournamentPerformanceChart: React.FC<TournamentPerformanceChartProps> = ({ 
  tournaments
}) => {
  // Preparar datos para el gráfico de líneas
  const lineChartData = useMemo(() => {
    return tournaments
      .sort((a, b) => new Date(a.fechaFin).getTime() - new Date(b.fechaFin).getTime())
      .map(t => ({
        fecha: new Date(t.fechaFin).toLocaleDateString('es-ES', { 
          month: 'short', 
          year: '2-digit' 
        }),
        nombreTorneo: t.nombreTorneo,
        rendimiento: RENDIMIENTO_MAP[t.rendimientoJugador],
        rendimientoText: t.rendimientoJugador,
        dificultad: t.nivelDificultad,
        resultado: t.resultado
      }));
  }, [tournaments]);

  // Calcular estadísticas generales
  const stats = useMemo(() => {
    if (tournaments.length === 0) return null;
    
    const totalRendimiento = tournaments.reduce(
      (sum, t) => sum + RENDIMIENTO_MAP[t.rendimientoJugador], 0
    );
    const totalDificultad = tournaments.reduce(
      (sum, t) => sum + t.nivelDificultad, 0
    );
    
    // Contar resultados por tipo
    const resultadosCount = tournaments.reduce((acc, t) => {
      if (t.resultado === 'Campeón') acc.campeonatos++;
      else if (t.resultado === 'Finalista') acc.finales++;
      else if (t.resultado === 'Semifinal') acc.semifinales++;
      return acc;
    }, { campeonatos: 0, finales: 0, semifinales: 0 });
    
    return {
      promedioRendimiento: (totalRendimiento / tournaments.length).toFixed(1),
      promedioDificultad: (totalDificultad / tournaments.length).toFixed(1),
      totalTorneos: tournaments.length,
      ...resultadosCount
    };
  }, [tournaments]);

  if (tournaments.length === 0) {
    return (
      <div className="bg-app-surface p-6 rounded-lg shadow text-center">
        <p className="text-app-secondary">
          No hay torneos disputados registrados para mostrar estadísticas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas generales */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-app-surface-alt p-4 rounded-lg text-center">
            <p className="text-sm text-app-secondary">Torneos Jugados</p>
            <p className="text-2xl font-bold text-app-accent">{stats.totalTorneos}</p>
          </div>
          <div className="bg-app-surface-alt p-4 rounded-lg text-center">
            <p className="text-sm text-app-secondary">Rendimiento Promedio</p>
            <p className="text-2xl font-bold text-blue-500">{stats.promedioRendimiento}/5</p>
          </div>
          <div className="bg-app-surface-alt p-4 rounded-lg text-center">
            <p className="text-sm text-app-secondary">Dificultad Promedio</p>
            <p className="text-2xl font-bold text-yellow-500">{stats.promedioDificultad}/5</p>
          </div>
          <div className="bg-app-surface-alt p-4 rounded-lg text-center">
            <p className="text-sm text-app-secondary">Logros</p>
            <div className="flex items-center justify-center gap-2 mt-1">
              {stats.campeonatos > 0 && (
                <span className="text-lg font-bold text-yellow-400" title="Campeonatos">
                  🏆 {stats.campeonatos}
                </span>
              )}
              {stats.finales > 0 && (
                <span className="text-lg font-bold text-gray-400" title="Finalista">
                  🥈 {stats.finales}
                </span>
              )}
              {stats.semifinales > 0 && (
                <span className="text-lg font-bold text-orange-600" title="Semifinales">
                  🥉 {stats.semifinales}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de evolución temporal */}
      <div className="bg-app-surface p-6 rounded-lg shadow">
        <h3 className="text-xl font-semibold text-app-accent mb-4">
          Evolución del Rendimiento en Torneos
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={lineChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis 
              dataKey="fecha" 
              stroke="var(--color-text-secondary)"
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis 
              domain={[0, 5]} 
              ticks={[0, 1, 2, 3, 4, 5]}
              stroke="var(--color-text-secondary)"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="rendimiento" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 6 }}
              name="Rendimiento"
            />
            <Line 
              type="monotone" 
              dataKey="dificultad" 
              stroke="#f59e0b" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#f59e0b', r: 4 }}
              name="Dificultad"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TournamentPerformanceChart;