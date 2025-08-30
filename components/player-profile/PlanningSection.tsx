// components/player-profile/PlanningSection.tsx - ACTUALIZADO PARA RECIBIR PROPS DEL HOOK
import React from 'react';
import { TrainingPlan } from '../../Database/FirebaseTrainingPlans';
import { 
  TipoType, 
  AreaType, 
  getAreasForTipo, 
  getEjerciciosForTipoArea 
} from '../../constants/training';
import { StrictValidationResult } from '../../utils/validation';
import { rateLimiter } from '@/utils/rateLimiter';

interface PlanningSectionProps {
  // ✅ Props básicas existentes
  planLoading: boolean;
  planSaving: boolean;
  rangoAnalisis: number;
  planificacion: TrainingPlan['planificacion'];
  totalPercentage: number;
  onRangoAnalisisChange: (value: number) => void;
  onTipoPercentageChange: (tipo: string, value: number) => void;
  onAreaPercentageChange: (tipo: string, area: string, value: number) => void;
  onEjercicioPercentageChange: (tipo: string, area: string, ejercicio: string, value: number) => void;
  calculateAreasTotalPercentage: (tipo: string) => number;
  calculateEjerciciosTotalPercentage: (tipo: string, area: string) => number;
  hasDetailAtLevel: (tipo: string, area?: string) => boolean;
  onSavePlan: () => void;
  onAnalysisClick: () => void;
  
  // ✅ NUEVAS props del hook actualizado
  strictValidation?: StrictValidationResult;
  canGenerateRecommendations?: boolean;
  planStatus?: {
    status: 'COMPLETE' | 'INCOMPLETE' | 'INVALID' | 'EMPTY';
    message: string;
    color: 'green' | 'yellow' | 'red' | 'gray';
  };
  realTimeValidation?: {
    fieldErrors: Record<string, string>;
    globalErrors: string[];
    isValidForSave: boolean;
    totalPercentage: number;
  };
  
  // ✅ MANTENER prop legacy para compatibilidad
  validation?: any;
}

const PlanningSection: React.FC<PlanningSectionProps> = ({
  planLoading,
  planSaving,
  rangoAnalisis,
  planificacion,
  totalPercentage,
  onRangoAnalisisChange,
  onTipoPercentageChange,
  onAreaPercentageChange,
  onEjercicioPercentageChange,
  calculateAreasTotalPercentage,
  calculateEjerciciosTotalPercentage,
  hasDetailAtLevel,
  onSavePlan,
  onAnalysisClick,
  // ✅ NUEVAS props
  strictValidation,
  canGenerateRecommendations = false,
  planStatus,
  realTimeValidation,
  // Legacy props
  validation
}) => {
  
  // ✅ USAR strictValidation del hook si está disponible, sino calcular localmente
  const currentValidation = React.useMemo((): StrictValidationResult => {
    if (strictValidation) {
      return strictValidation;
    }
    
    // Fallback: usar la validación legacy si no hay strictValidation
    return {
      isValid: validation?.isValid || false,
      isComplete: false,
      errors: validation?.warnings || [],
      warnings: [],
      totalPercentage: totalPercentage || 0,
      granularityLevel: 'TIPO',
      canGenerateRecommendations: false
    };
  }, [strictValidation, validation, totalPercentage]);
  
  // ✅ USAR realTimeValidation del hook si está disponible
  const fieldErrors = React.useMemo(() => {
    if (realTimeValidation) {
      return realTimeValidation.fieldErrors;
    }
    
    // Fallback: procesar errores de currentValidation
    const errors: Record<string, string> = {};
    
    currentValidation.errors.forEach((error: string) => {
      if (error.includes('Tipo') && error.includes('porcentaje total no definido')) {
        const tipo = error.match(/Tipo (\w+):/)?.[1];
        if (tipo) {
          errors[`tipo-${tipo}`] = 'Porcentaje requerido';
        }
      } else if (error.includes('área') && error.includes('porcentaje no definido')) {
        const match = error.match(/Tipo (\w+), área ([^:]+):/);
        if (match) {
          errors[`area-${match[1]}-${match[2]}`] = 'Porcentaje requerido';
        }
      } else if (error.includes('suman') && error.includes('diferencia debe ser')) {
        const match = error.match(/Tipo (\w+)(?:, área ([^:]+))?:/);
        if (match) {
          const key = match[2] ? `area-sum-${match[1]}-${match[2]}` : `tipo-sum-${match[1]}`;
          errors[key] = 'Suma incorrecta';
        }
      }
    });
    
    return errors;
  }, [realTimeValidation, currentValidation.errors]);
  
  // Helper para obtener clase de error
  const getFieldErrorClass = (fieldKey: string) => {
    return fieldErrors[fieldKey] ? 
      'border-red-500 bg-red-900/20 focus:border-red-400 focus:ring-red-400/20' : 
      'border-gray-700 focus:border-green-500 focus:ring-green-500/20';
  };
  
  // Helper para mostrar mensaje de error
  const getFieldErrorMessage = (fieldKey: string) => {
    return fieldErrors[fieldKey];
  };
  
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
                onFocus={(e) => e.target.select()}
                min="7"
                max="365"
                className="w-full p-2 lg:p-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
              />
              <p className="text-xs lg:text-sm text-gray-500 mt-2">
                Se analizarán los últimos {rangoAnalisis} días de entrenamiento para las recomendaciones
              </p>
            </div>

            {/* ✅ ACTUALIZADO: Estado de validación usando props del hook */}
            <div className={`p-4 lg:p-6 rounded-lg border-2 ${
              currentValidation.isComplete
                ? 'bg-green-900/20 border-green-500' 
                : currentValidation.isValid
                ? 'bg-yellow-900/20 border-yellow-500'
                : 'bg-red-900/20 border-red-500'
            }`}>
              <div className="space-y-2">
                <p className={`font-bold text-lg lg:text-xl ${
                  currentValidation.isComplete
                    ? 'text-green-400' 
                    : currentValidation.isValid
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  Total: {currentValidation.totalPercentage.toFixed(1)}% / 100%
                </p>
                
                <p className={`text-sm ${
                  currentValidation.isComplete
                    ? 'text-green-300' 
                    : currentValidation.isValid
                    ? 'text-yellow-300'
                    : 'text-red-300'
                }`}>
                  {planStatus?.message || 
                    (currentValidation.isComplete 
                      ? '✅ Plan completo - Recomendaciones habilitadas'
                      : currentValidation.isValid
                      ? '⚠️ Plan válido pero incompleto'
                      : '❌ Plan inválido - Corregir errores'
                    )
                  }
                </p>
                
                <p className="text-xs text-gray-400">
                  Granularidad: {currentValidation.granularityLevel}
                </p>
              </div>
            </div>

            {/* ✅ ACTUALIZADO: Botón de análisis usando canGenerateRecommendations del hook */}
            <div className="flex items-center justify-center lg:justify-end">
              <button
                onClick={onAnalysisClick}
                disabled={!canGenerateRecommendations}
                className={`px-6 py-3 lg:px-8 lg:py-4 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg ${
                  canGenerateRecommendations
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-blue-500/25'
                    : 'bg-gray-600 cursor-not-allowed opacity-50'
                }`}
                title={
                  canGenerateRecommendations 
                    ? "Ver análisis de planificación" 
                    : "Complete el plan para habilitar el análisis"
                }
              >
                📊 Ver análisis completo
              </button>
            </div>
          </div>

          {/* ✅ ACTUALIZADO: Mostrar errores globales si existen */}
          {realTimeValidation?.globalErrors && realTimeValidation.globalErrors.length > 0 && (
            <div className="bg-red-900/20 border border-red-800 p-4 lg:p-6 rounded-lg">
              <h4 className="font-semibold text-red-300 text-lg mb-3">
                ❌ Errores globales que deben corregirse:
              </h4>
              <ul className="list-disc list-inside text-sm lg:text-base text-red-400 space-y-1">
                {realTimeValidation.globalErrors.map((error: string, idx: number) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mostrar errores de validación si no hay realTimeValidation */}
          {!realTimeValidation && currentValidation.errors.length > 0 && (
            <div className="bg-red-900/20 border border-red-800 p-4 lg:p-6 rounded-lg">
              <h4 className="font-semibold text-red-300 text-lg mb-3">
                ❌ Errores que deben corregirse:
              </h4>
              <ul className="list-disc list-inside text-sm lg:text-base text-red-400 space-y-1">
                {currentValidation.errors.map((error: string, idx: number) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Información sobre planificación estricta */}
          <div className="bg-blue-900/20 border border-blue-800 p-4 lg:p-6 rounded-lg">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-blue-300 text-lg lg:text-xl mb-2">
                  📋 Reglas de Planificación Estricta
                </h3>
                <ul className="list-disc list-inside text-sm lg:text-base text-blue-400 space-y-1">
                  <li><strong>Completitud obligatoria:</strong> Todos los campos deben tener valores</li>
                  <li><strong>Suma exacta:</strong> El total debe sumar 100% (±0.5% tolerancia)</li>
                  <li><strong>Coherencia jerárquica:</strong> Las subcategorías deben sumar al padre</li>
                  <li><strong>0% permitido:</strong> Significa exclusión explícita de esa categoría</li>
                  <li><strong>Puntos sin ejercicios:</strong> El tipo "Puntos" no requiere desglose por ejercicios</li>
                  <li><strong>Sin recomendaciones sin plan completo:</strong> Datos faltantes bloquean el análisis</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Mostrar advertencias si las hay */}
          {currentValidation.warnings.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-800 p-4 lg:p-6 rounded-lg">
              <h4 className="font-semibold text-yellow-300 text-lg mb-2">
                Advertencias:
              </h4>
              <ul className="list-disc list-inside text-sm lg:text-base text-yellow-400">
                {currentValidation.warnings.map((warning: string, idx: number) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Planificación por tipo - Grid en desktop */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {Object.values(TipoType).map(tipo => {
              const tipoHasDetail = hasDetailAtLevel(tipo);
              const areasTotal = calculateAreasTotalPercentage(tipo);
              const tipoPorcentaje = planificacion[tipo]?.porcentajeTotal || 0;
              const isAreasExceeded = areasTotal > tipoPorcentaje + 0.5;  // Tolerancia estricta
              const areas = getAreasForTipo(tipo as TipoType);
              
              // Estados de error para este tipo
              const tipoErrorKey = `tipo-${tipo}`;
              const tipoSumErrorKey = `tipo-sum-${tipo}`;
              const hasTipoError = fieldErrors[tipoErrorKey] || fieldErrors[tipoSumErrorKey];
              
              return (
                <div key={tipo} className={`border rounded-lg p-4 lg:p-6 space-y-4 ${
                  hasTipoError ? 'border-red-500 bg-red-900/10' : 'border-gray-700 bg-gray-800/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg lg:text-xl font-semibold text-green-400 flex items-center gap-2">
                      {tipo}
                      {tipoPorcentaje > 0 && !tipoHasDetail && (
                        <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded">
                          Sin detallar
                        </span>
                      )}
                      {hasTipoError && (
                        <span className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded">
                          Error
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={tipoPorcentaje || ''}
                        onChange={(e) => onTipoPercentageChange(tipo, Number(e.target.value) || 0)}
                        onFocus={(e) => e.target.select()}
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="% total"
                        className={`w-20 p-1 lg:p-2 bg-gray-900/50 border rounded text-sm lg:text-base text-white focus:outline-none transition-all duration-200 ${
                          getFieldErrorClass(tipoErrorKey)
                        }`}
                        title={getFieldErrorMessage(tipoErrorKey) || `Porcentaje del total para ${tipo}`}
                      />
                      <span className="text-sm lg:text-base">%</span>
                    </div>
                  </div>

                  {/* Mostrar error específico del tipo */}
                  {hasTipoError && (
                    <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded">
                      {fieldErrors[tipoErrorKey] || fieldErrors[tipoSumErrorKey]}
                    </div>
                  )}

                  {tipoPorcentaje > 0 && (
                    <div className="ml-4 space-y-3">
                      {tipoHasDetail && (
                        <div className={`text-sm font-medium p-2 rounded ${
                          isAreasExceeded
                            ? 'bg-red-900/20 text-red-400'
                            : Math.abs(areasTotal - tipoPorcentaje) > 0.5
                            ? 'bg-yellow-900/20 text-yellow-400'
                            : 'bg-green-900/20 text-green-400'
                        }`}>
                          Total áreas: {areasTotal.toFixed(1)}% del total
                          {tipoPorcentaje > 0 && (
                            <span className="ml-1">
                              ({((areasTotal / tipoPorcentaje) * 100).toFixed(1)}% del tipo)
                            </span>
                          )}
                          {Math.abs(areasTotal - tipoPorcentaje) > 0.5 && (
                            <span className="ml-1 block">
                              ⚠️ Diferencia: {Math.abs(areasTotal - tipoPorcentaje).toFixed(1)}% (máx. 0.5%)
                            </span>
                          )}
                        </div>
                      )}
                      
                      {areas.map(area => {
                        const areaHasDetail = hasDetailAtLevel(tipo, area);
                        const ejerciciosTotal = calculateEjerciciosTotalPercentage(tipo, area);
                        const areaPorcentaje = planificacion[tipo]?.areas[area]?.porcentajeDelTotal || 0;
                        const isEjerciciosExceeded = ejerciciosTotal > areaPorcentaje + 0.5;
                        const ejercicios = getEjerciciosForTipoArea(tipo as TipoType, area as AreaType);
                        
                        // Valor relativo para mostrar
                        const areaValorRelativo = tipoPorcentaje > 0 
                          ? (areaPorcentaje / tipoPorcentaje) * 100 
                          : 0;
                        
                        // ✅ NUEVO: Verificar si este tipo tiene ejercicios
                        const tipoTieneEjercicios = ejercicios.length > 0;
                        
                        // Estados de error para esta área
                        const areaErrorKey = `area-${tipo}-${area}`;
                        const areaSumErrorKey = `area-sum-${tipo}-${area}`;
                        const hasAreaError = fieldErrors[areaErrorKey] || fieldErrors[areaSumErrorKey];
                        
                        return (
                          <div key={area} className={`rounded-lg p-3 lg:p-4 space-y-2 border ${
                            hasAreaError 
                              ? 'border-red-500 bg-red-900/10' 
                              : 'border-gray-700 bg-gray-900/50'
                          }`}>
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-300 flex items-center gap-2">
                                {area}
                                {areaPorcentaje > 0 && !areaHasDetail && tipoTieneEjercicios && (
                                  <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-1 rounded">
                                    Sin detallar
                                  </span>
                                )}
                                {hasAreaError && (
                                  <span className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded">
                                    Error
                                  </span>
                                )}
                              </h4>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={Number(areaValorRelativo.toFixed(1)) || ''}
                                  onChange={(e) => onAreaPercentageChange(tipo, area, Number(e.target.value) || 0)}
                                  onFocus={(e) => e.target.select()}
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  placeholder="% del tipo"
                                  title={`${areaPorcentaje.toFixed(1)}% del total`}
                                  className={`w-16 p-1 bg-gray-900/50 border rounded text-sm text-white focus:outline-none transition-all duration-200 ${
                                    getFieldErrorClass(areaErrorKey)
                                  }`}
                                />
                                <span className="text-sm">%</span>
                              </div>
                            </div>

                            {/* Mostrar error específico del área */}
                            {hasAreaError && (
                              <div className="text-xs text-red-400 bg-red-900/20 p-1 rounded">
                                {fieldErrors[areaErrorKey] || fieldErrors[areaSumErrorKey]}
                              </div>
                            )}

                            {areaPorcentaje > 0 && (
                              <div className="ml-4 space-y-1">
                                {/* ✅ MODIFICADO: Solo mostrar validación de ejercicios si aplica */}
                                {areaHasDetail && tipoTieneEjercicios && (
                                  <div className={`text-xs font-medium p-1 rounded ${
                                    isEjerciciosExceeded
                                      ? 'bg-red-900/20 text-red-400'
                                      : Math.abs(ejerciciosTotal - areaPorcentaje) > 0.5
                                      ? 'bg-yellow-900/20 text-yellow-400'
                                      : 'bg-green-900/20 text-green-400'
                                  }`}>
                                    Total ejercicios: {ejerciciosTotal.toFixed(2)}% del total
                                    {areaPorcentaje > 0 && (
                                      <span className="ml-1">
                                        ({((ejerciciosTotal / areaPorcentaje) * 100).toFixed(1)}% del área)
                                      </span>
                                    )}
                                    {Math.abs(ejerciciosTotal - areaPorcentaje) > 0.5 && (
                                      <span className="ml-1 block">
                                        ⚠️ Diferencia: {Math.abs(ejerciciosTotal - areaPorcentaje).toFixed(1)}% (máx. 0.5%)
                                      </span>
                                    )}
                                  </div>
                                )}
                                
                                {/* ✅ MODIFICADO: Solo renderizar ejercicios si existen */}
                                {tipoTieneEjercicios && ejercicios.map(ejercicio => {
                                  const ejercicioPorcentaje = planificacion[tipo]?.areas[area]?.ejercicios?.[ejercicio]?.porcentajeDelTotal || 0;
                                  const ejercicioValorRelativo = areaPorcentaje > 0
                                    ? (ejercicioPorcentaje / areaPorcentaje) * 100
                                    : 0;
                                  
                                  return (
                                    <div key={ejercicio} className="flex items-center justify-between py-1">
                                      <span className="text-sm text-gray-400">{ejercicio}</span>
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          value={Number(ejercicioValorRelativo.toFixed(1)) || ''}
                                          onChange={(e) => onEjercicioPercentageChange(tipo, area, ejercicio, Number(e.target.value) || 0)}
                                          onFocus={(e) => e.target.select()}
                                          min="0"
                                          max="100"
                                          step="0.1"
                                          placeholder="% del área"
                                          title={`${ejercicioPorcentaje.toFixed(1)}% del total`}
                                          className="w-14 p-1 bg-gray-900/50 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                                        />
                                        <span className="text-xs">%</span>
                                      </div>
                                    </div>
                                  );
                                })}
                                
                                {/* ✅ NUEVO: Mensaje informativo para Puntos */}
                                {!tipoTieneEjercicios && (
                                  <div className="text-xs text-gray-500 italic p-2 bg-gray-800/50 rounded">
                                    ℹ️ Este tipo no requiere desglose por ejercicios
                                  </div>
                                )}
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

          {/* ✅ ACTUALIZADO: Botón de guardar usando validación del hook */}
          <div className="text-center mt-8">
            <button
              onClick={() => {
              if (!rateLimiter.canExecute('save-training-plan', 3000)) {
                 return;
               }
               onSavePlan();
             }}
              disabled={planSaving || !currentValidation.isValid}
              className={`px-8 py-4 font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg text-lg lg:text-xl ${
                planSaving 
                  ? 'bg-gray-600 text-gray-400 cursor-wait'
                  : currentValidation.isValid
                  ? 'bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black shadow-green-500/25'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
              }`}
              title={
                planSaving 
                  ? 'Guardando...'
                  : currentValidation.isValid
                  ? 'Guardar plan de entrenamiento'
                  : 'Corrija los errores antes de guardar'
              }
            >
              {planSaving ? 'Guardando...' : 
               currentValidation.isComplete ? 'Guardar Plan Completo' : 
               currentValidation.isValid ? 'Guardar Plan (Incompleto)' : 
               'Corregir Errores para Guardar'}
            </button>
            
            {/* Mensaje de estado del guardado */}
            {!currentValidation.isValid && (
              <p className="text-sm text-red-400 mt-2">
                Se requiere corregir {currentValidation.errors.length} error(es) antes de guardar
              </p>
            )}
            {currentValidation.isValid && !currentValidation.isComplete && (
              <p className="text-sm text-yellow-400 mt-2">
                ⚠️ Plan incompleto - Las recomendaciones estarán limitadas
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default PlanningSection;