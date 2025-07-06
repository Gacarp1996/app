// components/player-profile/RadarChartOverview.tsx
import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, ResponsiveContainer } from 'recharts';

interface RadarChartOverviewProps {
  radarData: Array<{
    metric: string;
    value: number;
    fullMark: number;
  }>;
  surveysCount: number;
}

const RadarChartOverview: React.FC<RadarChartOverviewProps> = ({
  radarData,
  surveysCount
}) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
      <h3 className="text-xl lg:text-2xl font-semibold text-green-400 mb-4">
        Vista General - Promedios del Período
      </h3>
      <p className="text-sm lg:text-base text-gray-400 mb-6">
        Basado en {surveysCount} {surveysCount === 1 ? 'encuesta' : 'encuestas'}
      </p>
      <div className="flex justify-center">
        <ResponsiveContainer width="100%" height={400} minWidth={300}>
          <RadarChart data={radarData}>
            <PolarGrid 
              stroke="#374151" 
              radialLines={true}
            />
            <PolarAngleAxis 
              dataKey="metric"
              tick={{ fill: '#e5e7eb', fontSize: 14 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 5]} 
              tickCount={6}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <Radar 
              name="Promedio" 
              dataKey="value" 
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                border: '1px solid #374151',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#f3f4f6' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RadarChartOverview;