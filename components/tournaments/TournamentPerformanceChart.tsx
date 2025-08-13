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
      <div className="p-3 bg-gray-900/95 backdrop-blur-xl shadow-lg rounded-lg border border-gray-700">
        <p className="text-white font-semibold mb-1">{tournament.nombreTorneo}</p>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-sm text-gray-400">Resultado: {tournament.resultado}</p>
        <p className="text-sm" style={{ color: '#3b82f6' }}>
          Rendimiento: {tournament.rendimientoText} ({payload[0].value}/5)
        </p>
      </div>
    );
  }
  return null;
};

const TournamentPerformanceChart: React.FC<TournamentPerformanceChartProps> = ({ 
  tournaments
}) => {
  // Preparar datos para el gráfico de líneas - SOLO RENDIMIENTO
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
        resultado: t.resultado
      }));
  }, [tournaments]);

  // Calcular estadísticas generales - SIN DIFICULTAD
  const stats = useMemo(() => {
    if (tournaments.length === 0) return null;
    
    const totalRendimiento = tournaments.reduce(
      (sum, t) => sum + RENDIMIENTO_MAP[t.rendimientoJugador], 0
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
      totalTorneos: tournaments.length,
      ...resultadosCount
    };
  }, [tournaments]);

  if (tournaments.length === 0) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-800 text-center">
        <p className="text-gray-400">
          No hay torneos disputados registrados para mostrar estadísticas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas generales - SIN DIFICULTAD */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 p-4 rounded-lg text-center border border-gray-700">
            <p className="text-sm text-gray-400">Torneos Jugados</p>
            <p className="text-2xl font-bold text-green-400">{stats.totalTorneos}</p>
          </div>
          <div className="bg-gray-800/50 p-4 rounded-lg text-center border border-gray-700">
            <p className="text-sm text-gray-400">Rendimiento Promedio</p>
            <p className="text-2xl font-bold text-blue-500">{stats.promedioRendimiento}/5</p>
          </div>
          <div className="bg-gray-800/50 p-4 rounded-lg text-center border border-gray-700">
            <p className="text-sm text-gray-400">Logros</p>
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
              {stats.campeonatos === 0 && stats.finales === 0 && stats.semifinales === 0 && (
                <span className="text-sm text-gray-500">Sin logros destacados aún</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de evolución temporal - SOLO RENDIMIENTO */}
      <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-800">
        <h3 className="text-xl font-semibold text-green-400 mb-4">
          Evolución del Rendimiento en Torneos
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={lineChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="fecha" 
              stroke="#9CA3AF"
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis 
              domain={[0, 5]} 
              ticks={[0, 1, 2, 3, 4, 5]}
              stroke="#9CA3AF"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="rendimiento" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', r: 6 }}
              name="Rendimiento del Jugador"
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 text-center text-sm text-gray-400">
          * Evolución del rendimiento a lo largo del tiempo
        </div>
      </div>
    </div>
  );
};

export default TournamentPerformanceChart;