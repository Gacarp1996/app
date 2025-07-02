import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { DisputedTournament, EvaluacionGeneral, RendimientoJugador } from '../types';

interface TournamentPerformanceChartProps {
  tournaments: DisputedTournament[];
  showRadar?: boolean;
}

const EVALUACION_MAP: Record<EvaluacionGeneral, number> = { 
  'Muy malo': 1, 
  'Malo': 2, 
  'Regular': 3, 
  'Bueno': 4, 
  'Muy bueno': 5, 
  'Excelente': 6 
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const tournament = payload[0].payload;
    return (
      <div className="bg-gray-900/95 backdrop-blur-md p-4 shadow-lg rounded-lg border border-gray-700">
        <p className="text-white font-semibold mb-2">{tournament.nombreTorneo}</p>
        <p className="text-gray-400 text-sm mb-1">
          Fecha: {new Date(tournament.fechaInicio).toLocaleDateString('es-ES')}
        </p>
        <p className="text-gray-300 mb-2">Resultado: {tournament.resultado}</p>
        <div className="space-y-1">
          <p className="text-sm">
            <span className="text-gray-400">Evaluación:</span>{' '}
            <span style={{ color: '#3b82f6' }}>{tournament.evaluacionText} ({tournament.evaluacion}/6)</span>
          </p>
          <p className="text-sm">
            <span className="text-gray-400">Dificultad:</span>{' '}
            <span style={{ color: '#f59e0b' }}>{tournament.dificultad}/5</span>
          </p>
        </div>
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

const Card: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
  <div className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl">
    <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6">
      <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">{title}</h3>
      {children}
    </div>
  </div>
);

const TournamentPerformanceChart: React.FC<TournamentPerformanceChartProps> = ({ tournaments }) => {
  // Preparar datos con manejo de legacy
  const chartData = useMemo(() => {
    return tournaments
      .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime())
      .map(t => {
        // Manejar datos legacy
        let evaluacionNum: number;
        if (t.evaluacionGeneral) {
          evaluacionNum = EVALUACION_MAP[t.evaluacionGeneral];
        } else if (t.rendimientoJugador) {
          // Mapeo legacy
          const legacyMap: Record<RendimientoJugador, number> = {
            'Muy malo': 1,
            'Malo': 2,
            'Bueno': 4,
            'Muy bueno': 5,
            'Excelente': 6
          };
          evaluacionNum = legacyMap[t.rendimientoJugador] || 3;
        } else {
          evaluacionNum = 3; // Default
        }

        return {
          fecha: new Date(t.fechaInicio).toLocaleDateString('es-ES', { 
            day: '2-digit',
            month: 'short', 
            year: '2-digit' 
          }),
          fechaCompleta: t.fechaInicio,
          nombreTorneo: t.nombreTorneo,
          evaluacion: evaluacionNum,
          evaluacionText: t.evaluacionGeneral || 'Regular',
          dificultad: t.nivelDificultad,
          resultado: t.resultado
        };
      });
  }, [tournaments]);

  // Datos para el gráfico de dispersión (scatter plot)
  const scatterData = useMemo(() => {
    return chartData.map(d => ({
      x: d.dificultad,
      y: d.evaluacion,
      ...d
    }));
  }, [chartData]);

  const stats = useMemo(() => {
    if (tournaments.length === 0) return null;
    
    const evaluaciones = chartData.map(d => d.evaluacion);
    const dificultades = chartData.map(d => d.dificultad);
    
    return {
      promedioEvaluacion: (evaluaciones.reduce((s, v) => s + v, 0) / evaluaciones.length).toFixed(1),
      promedioDificultad: (dificultades.reduce((s, v) => s + v, 0) / dificultades.length).toFixed(1),
      mejorEvaluacion: Math.max(...evaluaciones),
      peorlEvaluacion: Math.min(...evaluaciones),
      totalTorneos: tournaments.length
    };
  }, [tournaments, chartData]);

  if (tournaments.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 p-[1px] rounded-2xl">
        <div className="bg-gray-900/90 backdrop-blur-lg rounded-2xl p-6 text-center">
          <p className="text-gray-400">No hay torneos disputados para mostrar estadísticas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Torneos Jugados" value={String(stats.totalTorneos)} color="#00E87A" />
          <StatCard title="Evaluación Prom." value={stats.promedioEvaluacion} color="#3b82f6" unit="/6" />
          <StatCard title="Dificultad Prom." value={stats.promedioDificultad} color="#f59e0b" unit="/5" />
          <StatCard 
            title="Rango Evaluación" 
            value={`${stats.peorlEvaluacion}-${stats.mejorEvaluacion}`} 
            color="#a855f7" 
            unit="/6" 
          />
        </div>
      )}

      {/* Gráfico de línea temporal */}
      <Card title="Evolución Temporal del Rendimiento">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="fecha" 
              stroke="#9ca3af" 
              angle={-45} 
              textAnchor="end" 
              height={70}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              yAxisId="left"
              domain={[0, 6]} 
              ticks={[0, 1, 2, 3, 4, 5, 6]} 
              stroke="#3b82f6"
              label={{ value: 'Evaluación', angle: -90, position: 'insideLeft', fill: '#3b82f6' }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              domain={[0, 5]} 
              ticks={[0, 1, 2, 3, 4, 5]} 
              stroke="#f59e0b"
              label={{ value: 'Dificultad', angle: 90, position: 'insideRight', fill: '#f59e0b' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="evaluacion" 
              name="Evaluación del Jugador" 
              stroke="#3b82f6" 
              strokeWidth={3} 
              dot={{ fill: '#3b82f6', r: 6 }}
              activeDot={{ r: 8 }} 
            />
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="dificultad" 
              name="Dificultad del Torneo" 
              stroke="#f59e0b" 
              strokeWidth={2} 
              strokeDasharray="5 5"
              dot={{ fill: '#f59e0b', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div className="mt-4 flex justify-center gap-6 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Evaluación: 1=Muy malo, 6=Excelente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-amber-500"></div>
            <span>Dificultad: 1=Fácil, 5=Difícil</span>
          </div>
        </div>
      </Card>

      {/* Gráfico de dispersión: Evaluación vs Dificultad */}
      <Card title="Relación Evaluación vs Dificultad">
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              type="number"
              dataKey="x" 
              name="Dificultad" 
              domain={[0, 6]}
              ticks={[1, 2, 3, 4, 5]}
              stroke="#9ca3af"
              label={{ value: 'Dificultad del Torneo', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
            />
            <YAxis 
              type="number"
              dataKey="y" 
              name="Evaluación" 
              domain={[0, 7]}
              ticks={[1, 2, 3, 4, 5, 6]}
              stroke="#9ca3af"
              label={{ value: 'Evaluación del Jugador', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Scatter 
              name="Torneos" 
              data={scatterData} 
              fill="#3b82f6"
            >
              {scatterData.map((_, index) => (
                <circle
                  key={`dot-${index}`}
                  r={8}
                  fill="#3b82f6"
                  fillOpacity={0.8}
                  stroke="#1e40af"
                  strokeWidth={2}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-4 bg-gray-800/50 p-4 rounded-lg">
          <p className="text-sm text-gray-400 text-center">
            Este gráfico muestra cómo se relaciona el rendimiento del jugador con la dificultad del torneo. 
            Los puntos más arriba y a la derecha indican mejor rendimiento en torneos más difíciles.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default TournamentPerformanceChart;