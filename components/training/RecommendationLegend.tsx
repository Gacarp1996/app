import React from 'react';
import { STATUS_COLORS, THRESHOLDS } from '../../constants/recommendationThresholds';

interface RecommendationLegendProps {
  className?: string;
}

export const RecommendationLegend: React.FC<RecommendationLegendProps> = ({ className = '' }) => {
  return (
    <div className={`bg-gray-800/50 border border-gray-600 rounded-lg p-4 ${className}`}>
      <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <span className="text-blue-400">ℹ️</span>
        Guía de Colores en Recomendaciones
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Óptimo (Azul) - PRIMERO para destacar lo positivo */}
        <div className={`flex items-center gap-3 p-2 ${STATUS_COLORS.OPTIMAL.bg} border ${STATUS_COLORS.OPTIMAL.border} rounded`}>
          <div className="w-4 h-4 bg-blue-500 rounded-full flex-shrink-0"></div>
          <div className="text-xs">
            <div className={`font-medium ${STATUS_COLORS.OPTIMAL.text}`}>
              {STATUS_COLORS.OPTIMAL.icon} Óptimo
            </div>
            <div className="text-gray-400">Bien balanceado (±{THRESHOLDS.OPTIMAL}%)</div>
          </div>
        </div>

        {/* Incrementar (Rojo) */}
        <div className={`flex items-center gap-3 p-2 ${STATUS_COLORS.INCREMENT.bg} border ${STATUS_COLORS.INCREMENT.border} rounded`}>
          <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
          <div className="text-xs">
            <div className={`font-medium ${STATUS_COLORS.INCREMENT.text}`}>
              {STATUS_COLORS.INCREMENT.icon} Incrementar
            </div>
            <div className="text-gray-400">Falta entrenar más</div>
          </div>
        </div>

        {/* Reducir (Amarillo) */}
        <div className={`flex items-center gap-3 p-2 ${STATUS_COLORS.REDUCE.bg} border ${STATUS_COLORS.REDUCE.border} rounded`}>
          <div className="w-4 h-4 bg-yellow-500 rounded-full flex-shrink-0"></div>
          <div className="text-xs">
            <div className={`font-medium ${STATUS_COLORS.REDUCE.text}`}>
              {STATUS_COLORS.REDUCE.icon} Reducir
            </div>
            <div className="text-gray-400">Exceso de práctica</div>
          </div>
        </div>
      </div>

      {/* Explicación adicional */}
      <div className="mt-3 pt-3 border-t border-gray-600">
        <div className="text-xs text-gray-400 space-y-1">
          <p>
            <strong className="text-gray-300">Diferencia:</strong> Brecha entre el porcentaje actual y el planificado en el entrenamiento.
          </p>
          <p>
            <strong className="text-gray-300">Ejemplo:</strong> Si el plan dice 40% peloteo pero solo practica 25%, la diferencia es -15% (necesita incrementar 🔴).
          </p>
          <div className="mt-2 space-y-1">
            <p>
              <strong className="text-gray-300">Umbrales:</strong>
            </p>
            <ul className="ml-4 text-gray-400">
              <li>• Óptimo: ±{THRESHOLDS.OPTIMAL}%</li>
              <li>• Prioridad media: &gt;{THRESHOLDS.MEDIUM}%</li>
              <li>• Prioridad alta: &gt;{THRESHOLDS.HIGH}%</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};