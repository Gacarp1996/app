// components/player-profile/CustomTooltip.tsx
import React from 'react';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const surveysCount = payload[0].payload?.surveysCount;
    
    return (
      <div className="p-3 bg-gray-900/95 backdrop-blur-xl shadow-lg rounded-lg border border-gray-800">
        <p className="text-white font-semibold mb-1">{label}</p>
        <p className="text-sm" style={{ color: payload[0].color }}>
          Valor: {payload[0].value}/5
        </p>
        {surveysCount && surveysCount > 1 && (
          <p className="text-xs text-gray-400 mt-1">
            Promedio de {surveysCount} encuestas
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default CustomTooltip;