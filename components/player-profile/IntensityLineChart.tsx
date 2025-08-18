import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { IntensityDataPoint } from '../../types/types';

interface IntensityLineChartProps {
  data: IntensityDataPoint[];
  chartTitle: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 lg:p-4 bg-gray-900/95 backdrop-blur-xl shadow-2xl rounded-lg border border-gray-700">
        <p className="text-white font-semibold text-base lg:text-lg mb-1">{label}</p>
        <p className="text-gray-400 text-sm lg:text-base">
          Intensidad: <span className="text-cyan-400 font-bold">{payload[0].value}/10</span>
        </p>
      </div>
    );
  }
  return null;
};

const IntensityLineChart: React.FC<IntensityLineChartProps> = ({ data, chartTitle }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm p-3 sm:p-4 lg:p-6 rounded-xl shadow-lg border border-gray-800 h-full flex flex-col overflow-hidden">
        <h3 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-3 sm:mb-4 text-center flex-shrink-0">
          <span className="hidden sm:inline">{chartTitle}</span>
          <span className="sm:hidden">{chartTitle.length > 20 ? chartTitle.substring(0, 20) + '...' : chartTitle}</span>
        </h3>
        <div className="text-center py-6 sm:py-8 lg:py-12 flex-1 flex flex-col justify-center">
          <svg className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto text-gray-700 mb-3 sm:mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          <p className="text-gray-400 text-sm sm:text-base lg:text-lg">
            <span className="hidden sm:inline">No hay datos de intensidad para mostrar.</span>
            <span className="sm:hidden">Sin datos de intensidad</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-3 sm:p-4 lg:p-6 rounded-xl shadow-lg border border-gray-800 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/5 h-full flex flex-col overflow-hidden">
      <h3 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-3 sm:mb-4 lg:mb-6 text-center flex-shrink-0">
        <span className="hidden sm:inline">{chartTitle}</span>
        <span className="sm:hidden">{chartTitle.length > 20 ? chartTitle.substring(0, 20) + '...' : chartTitle}</span>
      </h3>
      
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 15, left: 5, bottom: 30 }}>
          <defs>
            <linearGradient id="intensityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00D9E8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#00D9E8" stopOpacity={0.1}/>
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#374151" 
            strokeOpacity={0.3}
          />
          
          <XAxis 
            dataKey="fecha" 
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={50}
            interval="preserveStartEnd"
          />
          
          <YAxis 
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
            width={25}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          <Line 
            type="monotone" 
            dataKey="intensidad" 
            stroke="#00D9E8"
            strokeWidth={2}
            dot={{ 
              fill: '#00E87A', 
              strokeWidth: 2, 
              r: 4,
              filter: 'url(#glow)'
            }}
            activeDot={{ 
              r: 8, 
              fill: '#00E87A',
              stroke: '#00D9E8',
              strokeWidth: 3
            }}
            filter="url(#glow)"
          />
          
          {/* Área bajo la línea para efecto visual */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00D9E8" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00D9E8" stopOpacity={0}/>
            </linearGradient>
          </defs>
        </LineChart>
      </ResponsiveContainer>
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-800 flex-shrink-0">
        <div className="grid grid-cols-2 gap-4 px-2">
          <div>
            <p className="text-xs lg:text-sm text-gray-500">Promedio</p>
            <p className="text-lg lg:text-xl font-bold text-cyan-400">
              {data.length > 0 
                ? (data.reduce((sum, d) => sum + d.intensidad, 0) / data.length).toFixed(1)
                : '0'}/10
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs lg:text-sm text-gray-500">Sesiones</p>
            <p className="text-lg lg:text-xl font-bold text-green-400">{data.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntensityLineChart;