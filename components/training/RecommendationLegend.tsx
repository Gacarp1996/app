import React from 'react';

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
        {/* Incrementar (Rojo) */}
        <div className="flex items-center gap-3 p-2 bg-red-500/10 border border-red-500/20 rounded">
          <div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0"></div>
          <div className="text-xs">
            <div className="font-medium text-red-400">🔴 Incrementar</div>
            <div className="text-gray-400">Necesita más práctica</div>
          </div>
        </div>

        {/* Reducir (Amarillo) */}
        <div className="flex items-center gap-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
          <div className="w-4 h-4 bg-yellow-500 rounded-full flex-shrink-0"></div>
          <div className="text-xs">
            <div className="font-medium text-yellow-400">🟡 Reducir</div>
            <div className="text-gray-400">Exceso de práctica</div>
          </div>
        </div>

        {/* Óptimo (Azul) */}
        <div className="flex items-center gap-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
          <div className="w-4 h-4 bg-blue-500 rounded-full flex-shrink-0"></div>
          <div className="text-xs">
            <div className="font-medium text-blue-400">🔵 Óptimo</div>
            <div className="text-gray-400">Bien balanceado</div>
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
            <strong className="text-gray-300">Ejemplo:</strong> Si el plan dice 40% de derecha pero solo practica 25%, la diferencia es +15% (necesita incrementar).
          </p>
        </div>
      </div>
    </div>
  );
};
