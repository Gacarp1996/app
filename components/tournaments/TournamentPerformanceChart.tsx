import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { DisputedTournament, RendimientoJugador, ConformidadGeneral } from '../../types';

interface TournamentPerformanceChartProps {
  tournaments: DisputedTournament[];
  showRadar?: boolean;
}

// Mapeo de valores de texto a números para gráficos
const RENDIMIENTO_MAP: Record<RendimientoJugador, number> = {
  'Muy malo': 1,
  'Malo': 2,
  'Bueno': 3,
  'Muy bueno': 4,
  'Excelente': 5
};

const CONFORMIDAD_MAP: Record<ConformidadGeneral, number> = {
  'Muy insatisfecho': 1,
  'Insatisfecho': 2,
  'Satisfecho': 3,
  'Muy satisfecho': 4,
  'Totalmente satisfecho': 5
};

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
        <p className="text-sm" style={{ color: '#10b981' }}>
          Conformidad: {tournament.conformidadText} ({tournament.conformidad}/5)
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
  tournaments, 
  showRadar = false 
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
        conformidad: CONFORMIDAD_MAP[t.conformidadGeneral],
        conformidadText: t.conformidadGeneral,
        dificultad: t.nivelDificultad,
        resultado: t.resultado
      }));
  }, [tournaments]);

  // Preparar datos para el gráfico de radar (promedios por dificultad)
  const radarData = useMemo(() => {
    const dificultades = [1, 2, 3, 4, 5];
    return dificultades.map(dif => {
      const tourneosEnDificultad = tournaments.filter(t => t.nivelDificultad === dif);
      if (tourneosEnDificultad.length === 0) {
        return {
          dificultad: `Nivel ${dif}`,
          rendimiento: 0,
          conformidad: 0,
          cantidad: 0
        };
      }
      
      const promRendimiento = tourneosEnDificultad.reduce(
        (sum, t) => sum + RENDIMIENTO_MAP[t.rendimientoJugador], 0
      ) / tourneosEnDificultad.length;
      
      const promConformidad = tourneosEnDificultad.reduce(
        (sum, t) => sum + CONFORMIDAD_MAP[t.conformidadGeneral], 0
      ) / tourneosEnDificultad.length;
      
      return {
        dificultad: `Nivel ${dif}`,
        rendimiento: parseFloat(promRendimiento.toFixed(1)),
        conformidad: parseFloat(promConformidad.toFixed(1)),
        cantidad: tourneosEnDificultad.length
      };
    });
  }, [tournaments]);

  // Calcular estadísticas generales
  const stats = useMemo(() => {
    if (tournaments.length === 0) return null;
    
    const totalRendimiento = tournaments.reduce(
      (sum, t) => sum + RENDIMIENTO_MAP[t.rendimientoJugador], 0
    );
    const totalConformidad = tournaments.reduce(
      (sum, t) => sum + CONFORMIDAD_MAP[t.conformidadGeneral], 0
    );
    const totalDificultad = tournaments.reduce(
      (sum, t) => sum + t.nivelDificultad, 0
    );
    
    return {
      promedioRendimiento: (totalRendimiento / tournaments.length).toFixed(1),
      promedioConformidad: (totalConformidad / tournaments.length).toFixed(1),
      promedioDificultad: (totalDificultad / tournaments.length).toFixed(1),
      totalTorneos: tournaments.length
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
            <p className="text-sm text-app-secondary">Conformidad Promedio</p>
            <p className="text-2xl font-bold text-green-500">{stats.promedioConformidad}/5</p>
          </div>
          <div className="bg-app-surface-alt p-4 rounded-lg text-center">
            <p className="text-sm text-app-secondary">Dificultad Promedio</p>
            <p className="text-2xl font-bold text-yellow-500">{stats.promedioDificultad}/5</p>
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
              dataKey="conformidad" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 6 }}
              name="Conformidad"
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

      {/* Gráfico de radar por nivel de dificultad */}
      {showRadar && (
        <div className="bg-app-surface p-6 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-app-accent mb-4">
            Rendimiento Promedio por Nivel de Dificultad
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis 
                dataKey="dificultad"
                tick={{ fill: 'var(--color-text-primary)' }}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 5]}
                tick={{ fill: 'var(--color-text-secondary)' }}
              />
              <Tooltip />
              <Radar 
                name="Rendimiento" 
                dataKey="rendimiento" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.3}
              />
              <Radar 
                name="Conformidad" 
                dataKey="conformidad" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.3}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
          <div className="mt-4 text-center text-sm text-app-secondary">
            * Solo se muestran niveles con al menos un torneo disputado
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentPerformanceChart;