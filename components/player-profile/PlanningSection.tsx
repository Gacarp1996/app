
import React from 'react';
import { TrainingPlan } from '../../Database/FirebaseTrainingPlans';
import { NEW_EXERCISE_HIERARCHY_CONST } from '../../constants';

interface PlanningSectionProps {
  planLoading: boolean;
  planSaving: boolean;
  rangoAnalisis: number;
  planificacion: TrainingPlan['planificacion'];
  totalPercentage: number;
  validation: { isValid: boolean; warnings: string[] };
  onRangoAnalisisChange: (value: number) => void;
  onTipoPercentageChange: (tipo: string, value: number) => void;
  onAreaPercentageChange: (tipo: string, area: string, value: number) => void;
  onEjercicioPercentageChange: (tipo: string, area: string, ejercicio: string, value: number) => void;
  calculateAreasTotalPercentage: (tipo: string) => number;
  calculateEjerciciosTotalPercentage: (tipo: string, area: string) => number;
  hasDetailAtLevel: (tipo: string, area?: string) => boolean;
  onSavePlan: () => void;
  onAnalysisClick: () => void;
}

const PlanningSection: React.FC<PlanningSectionProps> = ({
  planLoading,
  planSaving,
  rangoAnalisis,
  planificacion,
  totalPercentage,
  validation,
  onRangoAnalisisChange,
  onTipoPercentageChange,
  onAreaPercentageChange,
  onEjercicioPercentageChange,
  calculateAreasTotalPercentage,
  calculateEjerciciosTotalPercentage,
  hasDetailAtLevel,
  onSavePlan,
  onAnalysisClick
}) => {
  return (
    <section className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
      <h2 className="text-2xl lg:text-3xl font-semibold text-green-400 mb-6">Plan de Entrenamiento</h2>
      
      {planLoading ? (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Cargando plan...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grid para desktop con configuración y acciones */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Configuración de rango de análisis */}
            <div className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700">
              <label className="block text-sm lg:text-base font-medium text-gray-400 mb-2">
                Días hacia atrás para análisis
              </label>
              <input
                type="number"
                value={rangoAnalisis}
                onChange={(e) => onRangoAnalisisChange(Number(e.target.value))}
                onFocus={(e) => e.target.select()} // ✅ SELECCIÓN AUTOMÁTICA
                min="7"
                max="365"
                className="w-full p-2 lg:p-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              />
              <p className="text-xs lg:text-sm text-gray-500 mt-2">
                Se analizarán los últimos {rangoAnalisis} días de entrenamiento para las recomendaciones
              </p>
            </div>

            {/* Total general */}
            <div className={`p-4 lg:p-6 rounded-lg border-2 ${
              validation.isValid
                ? 'bg-green-900/20 border-green-500' 
                : 'bg-red-900/20 border-red-500'
            }`}>
              <p className={`font-bold text-lg lg:text-xl ${
                validation.isValid
                  ? 'text-green-400' 
                  : 'text-red-400'
              }`}>
                Total General: {totalPercentage.toFixed(2)}% / 100%
              </p>
              {!validation.isValid && validation.warnings.length > 0 && (
                <p className="text-sm text-red-400 mt-1">
                  {validation.warnings[0]}
                </p>
              )}
            </div>

            {/* Botón de análisis */}
            <div className="flex items-center justify-center lg:justify-end">
              <button
                onClick={onAnalysisClick}
                className="px-6 py-3 lg:px-8 lg:py-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25"
                title="Ver análisis de planificación"
              >
                📊 Ver análisis completo
              </button>
            </div>
          </div>

          {/* Información sobre planificación flexible */}
          <div className="bg-blue-900/20 border border-blue-800 p-4 lg:p-6 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-blue-300 text-lg lg:text-xl mb-2">
                  💡 Planificación Flexible
                </h3>
                <p className="text-sm lg:text-base text-blue-400">
                  No es necesario completar todos los niveles. Puede especificar solo hasta el nivel que desee:
                </p>
                <ul className="list-disc list-inside text-sm lg:text-base text-blue-400 mt-2">
                  <li>Solo tipos (ej: Peloteo 80%, Canasto 20%)</li>
                  <li>Tipos y áreas (sin detallar ejercicios específicos)</li>
                  <li>Detalle completo con ejercicios individuales</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Mostrar advertencias si las hay */}
          {validation.isValid && validation.warnings.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-800 p-4 lg:p-6 rounded-lg">
              <h4 className="font-semibold text-yellow-300 text-lg mb-2">
                Distribución del plan:
              </h4>
              <ul className="list-disc list-inside text-sm lg:text-base text-yellow-400">
                {validation.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Planificación por tipo - Grid en desktop */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {Object.keys(NEW_EXERCISE_HIERARCHY_CONST).map(tipo => {
              const tipoHasDetail = hasDetailAtLevel(tipo);
              const areasTotal = calculateAreasTotalPercentage(tipo);
              const tipoPorcentaje = planificacion[tipo]?.porcentajeTotal || 0;
              const isAreasExceeded = areasTotal > tipoPorcentaje + 0.01;
              
              return (
                <div key={tipo} className="border border-gray-700 rounded-lg p-4 lg:p-6 space-y-4 bg-gray-800/30">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg lg:text-xl font-semibold text-green-400 flex items-center gap-2">
                      {tipo}
                      {tipoPorcentaje > 0 && !tipoHasDetail && (
                        <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded">
                          Sin detallar
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={tipoPorcentaje}
                        onChange={(e) => onTipoPercentageChange(tipo, Number(e.target.value))}
                        onFocus={(e) => e.target.select()} // ✅ SELECCIÓN AUTOMÁTICA
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-20 p-1 lg:p-2 bg-gray-900/50 border border-gray-700 rounded text-sm lg:text-base text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                      />
                      <span className="text-sm lg:text-base">%</span>
                    </div>
                  </div>

                  {tipoPorcentaje > 0 && (
                    <div className="ml-4 space-y-3">
                      {tipoHasDetail && (
                        <div className={`text-sm font-medium p-2 rounded ${
                          isAreasExceeded
                            ? 'bg-red-900/20 text-red-400'
                            : areasTotal < tipoPorcentaje - 0.01
                            ? 'bg-yellow-900/20 text-yellow-400'
                            : 'bg-green-900/20 text-green-400'
                        }`}>
                          Total áreas: {areasTotal.toFixed(2)}% / {tipoPorcentaje}%
                          {areasTotal < tipoPorcentaje - 0.01 && 
                            ` (${(tipoPorcentaje - areasTotal).toFixed(1)}% sin detallar)`
                          }
                        </div>
                      )}
                      
                      {Object.keys(NEW_EXERCISE_HIERARCHY_CONST[tipo]).map(area => {
                        const areaHasDetail = hasDetailAtLevel(tipo, area);
                        const ejerciciosTotal = calculateEjerciciosTotalPercentage(tipo, area);
                        const areaPorcentaje = planificacion[tipo]?.areas[area]?.porcentajeDelTotal || 0;
                        const isEjerciciosExceeded = ejerciciosTotal > areaPorcentaje + 0.01;
                        
                        return (
                          <div key={area} className="bg-gray-900/50 rounded-lg p-3 lg:p-4 space-y-2 border border-gray-700">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-300 flex items-center gap-2">
                                {area}
                                {areaPorcentaje > 0 && !areaHasDetail && (
                                  <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded">
                                    Sin detallar
                                  </span>
                                )}
                              </h4>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={areaPorcentaje}
                                  onChange={(e) => onAreaPercentageChange(tipo, area, Number(e.target.value))}
                                  onFocus={(e) => e.target.select()} // ✅ SELECCIÓN AUTOMÁTICA
                                  min="0"
                                  max={tipoPorcentaje}
                                  step="0.1"
                                  className="w-16 p-1 bg-gray-900/50 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                                />
                                <span className="text-sm">%</span>
                              </div>
                            </div>

                            {areaPorcentaje > 0 && (
                              <div className="ml-4 space-y-1">
                                {areaHasDetail && (
                                  <div className={`text-xs font-medium p-1 rounded ${
                                    isEjerciciosExceeded
                                      ? 'bg-red-900/20 text-red-400'
                                      : ejerciciosTotal < areaPorcentaje - 0.01
                                      ? 'bg-yellow-900/20 text-yellow-400'
                                      : 'bg-green-900/20 text-green-400'
                                  }`}>
                                    Total ejercicios: {ejerciciosTotal.toFixed(2)}% / {areaPorcentaje}%
                                    {ejerciciosTotal < areaPorcentaje - 0.01 && 
                                      ` (${(areaPorcentaje - ejerciciosTotal).toFixed(1)}% sin detallar)`
                                    }
                                  </div>
                                )}
                                {NEW_EXERCISE_HIERARCHY_CONST[tipo][area].map(ejercicio => (
                                  <div key={ejercicio} className="flex items-center justify-between py-1">
                                    <span className="text-sm text-gray-400">{ejercicio}</span>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        value={planificacion[tipo]?.areas[area]?.ejercicios?.[ejercicio]?.porcentajeDelTotal || 0}
                                        onChange={(e) => onEjercicioPercentageChange(tipo, area, ejercicio, Number(e.target.value))}
                                        onFocus={(e) => e.target.select()} // ✅ SELECCIÓN AUTOMÁTICA
                                        min="0"
                                        max={areaPorcentaje}
                                        step="0.1"
                                        className="w-14 p-1 bg-gray-900/50 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                                      />
                                      <span className="text-xs">%</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Botón de guardar */}
          <div className="text-center mt-8">
            <button
              onClick={onSavePlan}
              disabled={planSaving || !validation.isValid}
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25 text-lg lg:text-xl disabled:opacity-50"
            >
              {planSaving ? 'Guardando...' : 'Guardar Plan de Entrenamiento'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default PlanningSection;