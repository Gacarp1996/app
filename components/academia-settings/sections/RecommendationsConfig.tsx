// components/academia-settings/sections/RecommendationsConfig.tsx - CON LOGGING MEJORADO
import React, { useState, useEffect } from 'react';
import { AcademiaConfig } from '../../../Database/FirebaseAcademiaConfig';

interface RecommendationsConfigProps {
  config: AcademiaConfig | null;
  loading: boolean;
  saving: boolean;
  onConfigChange: (days: number) => void;
  onSave: () => Promise<void>;
}

// Opciones predefinidas como especificado en los requerimientos
const WINDOW_OPTIONS = [
  { value: 7, label: '7 días', description: 'Análisis de la última semana' },
  { value: 15, label: '15 días', description: 'Análisis de las últimas 2 semanas' },
  { value: 30, label: '30 días', description: 'Análisis del último mes' },
] as const;

export const RecommendationsConfig: React.FC<RecommendationsConfigProps> = ({
  config,
  loading,
  saving,
  onConfigChange,
  onSave
}) => {
  const [selectedDays, setSelectedDays] = useState<number>(7); // ✅ DEFAULT SEGURO
  const [hasChanges, setHasChanges] = useState(false);

  // ✅ LOGGING MEJORADO: Estado inicial y props
  useEffect(() => {
    console.group('🔧 RecommendationsConfig - Estado inicial');
    console.log('📊 Props recibidas:', {
      configExists: !!config,
      configDays: config?.recommendationsAnalysisWindowDays,
      loading,
      saving,
      selectedDays,
      hasChanges
    });
    
    if (config) {
      console.log('⚙️ Configuración completa:', config);
    }
    
    console.groupEnd();
  }, [config, loading, saving, selectedDays, hasChanges]);

  // Actualizar estado local cuando cambie la configuración externa
  useEffect(() => {
    if (config && typeof config.recommendationsAnalysisWindowDays === 'number') {
      const configDays = config.recommendationsAnalysisWindowDays;
      
      console.group('🔄 RecommendationsConfig - Actualizando desde config');
      console.log('📈 Cambio detectado:', {
        anterior: selectedDays,
        nuevo: configDays,
        diferencia: configDays !== selectedDays
      });
      
      setSelectedDays(configDays);
      setHasChanges(false);
      
      console.log('✅ Estado actualizado exitosamente');
      console.groupEnd();
    } else if (config) {
      console.warn('⚠️ Config existe pero recommendationsAnalysisWindowDays no es válido:', {
        configExists: !!config,
        fieldValue: config.recommendationsAnalysisWindowDays,
        fieldType: typeof config.recommendationsAnalysisWindowDays
      });
    }
  }, [config]);

  const handleDaysChange = (days: number) => {
    const currentConfigDays = config?.recommendationsAnalysisWindowDays || 7;
    
    console.group('🎯 RecommendationsConfig - Cambio de usuario');
    console.log('📊 Detalles del cambio:', {
      desde: selectedDays,
      hacia: days,
      configActual: currentConfigDays,
      hasChanges: days !== currentConfigDays
    });
    
    setSelectedDays(days);
    setHasChanges(days !== currentConfigDays);
    
    // Notificar al padre
    onConfigChange(days);
    
    console.log('📤 Cambio notificado al componente padre');
    console.groupEnd();
  };

  const handleSave = async () => {
    console.group('💾 RecommendationsConfig - Guardando');
    console.log('📋 Datos a guardar:', {
      selectedDays,
      hasChanges,
      configAnterior: config?.recommendationsAnalysisWindowDays
    });
    
    try {
      await onSave();
      setHasChanges(false);
      
      console.log('✅ Guardado exitoso - estado actualizado');
      console.groupEnd();
      
    } catch (error) {
      console.error('❌ Error en guardado:', error);
      console.groupEnd();
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
        <p className="mt-2 text-gray-400">Cargando configuración...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>Error cargando la configuración de recomendaciones</p>
          <p className="text-xs mt-2">Config: {config ? 'existe' : 'null'}</p>
        </div>
      </div>
    );
  }

  const currentDays = config.recommendationsAnalysisWindowDays || 7;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500/20 rounded-lg">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Análisis de Recomendaciones
          </h3>
          <p className="text-sm text-gray-400">
            Configura cuántos días hacia atrás analizar para generar recomendaciones
          </p>
        </div>
      </div>

      {/* ✅ DEBUG INFO MEJORADO - más visible y detallado */}
      <div className="text-xs bg-gray-900/70 border border-gray-600 p-3 rounded-lg mb-4">
        <div className="font-mono text-green-400 mb-2">🔍 DEBUG INFO:</div>
        <div className="grid grid-cols-2 gap-2 text-gray-300">
          <div>config.days: <span className="text-blue-400">{currentDays}</span></div>
          <div>selected: <span className="text-purple-400">{selectedDays}</span></div>
          <div>hasChanges: <span className={hasChanges ? 'text-red-400' : 'text-green-400'}>{hasChanges.toString()}</span></div>
          <div>loading: <span className="text-gray-400">{loading.toString()}</span></div>
        </div>
        <div className="mt-2 text-gray-400">
          Timestamp: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Información actual */}
      <div className="bg-purple-900/20 border border-purple-600/50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/30 rounded-lg">
            <span className="text-purple-300 text-lg">📊</span>
          </div>
          <div>
            <p className="text-purple-300 font-medium">
              Configuración actual: {currentDays} días
            </p>
            <p className="text-purple-400 text-sm">
              Las recomendaciones analizarán las sesiones de los últimos {currentDays} días
            </p>
          </div>
        </div>
      </div>

      {/* Selector de días */}
      <div className="space-y-3">
        <p className="text-gray-300 font-medium">Selecciona la ventana de análisis:</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {WINDOW_OPTIONS.map((option) => {
            const isSelected = selectedDays === option.value;
            const isCurrentConfig = currentDays === option.value;
            
            return (
              <label
                key={option.value}
                className={`cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-purple-500 bg-purple-500/20'
                    : 'border-gray-600 bg-gray-900/50 hover:border-purple-400 hover:bg-purple-500/10'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="radio"
                    name="analysisWindow"
                    value={option.value}
                    checked={isSelected}
                    onChange={() => handleDaysChange(option.value)}
                    className="w-4 h-4 text-purple-500 bg-gray-800 border-gray-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isSelected ? 'text-purple-300' : 'text-gray-300'}`}>
                        {option.label}
                      </span>
                      {isCurrentConfig && !hasChanges && (
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded font-medium">
                          Actual
                        </span>
                      )}
                      {isSelected && hasChanges && (
                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded font-medium">
                          Nuevo
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${isSelected ? 'text-purple-400' : 'text-gray-500'}`}>
                      {option.description}
                    </p>
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Información sobre el impacto */}
      <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="p-1 bg-blue-500/30 rounded">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-blue-300 font-medium mb-2">
              💡 ¿Cómo afecta esta configuración?
            </p>
            <ul className="text-sm text-blue-300 space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span><strong>Menos días (7-15):</strong> Recomendaciones más sensibles a cambios recientes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span><strong>Más días (30):</strong> Patrones más estables, menos fluctuaciones</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span><strong>Recomendado:</strong> 7-15 días para seguimiento activo, 30 para análisis de largo plazo</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Botón para guardar */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              Cambios pendientes: {selectedDays} días
            </span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none shadow-lg shadow-purple-500/25"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Guardando...
                </span>
              ) : (
                'Guardar Configuración'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};