// components/player-profile/utils.ts
// Re-exportar desde las nuevas utilidades centralizadas
export { parseTimeToMinutes } from '../../utils/calculations';
export { getDefaultDateRange } from '../../utils/dateHelpers';

// Mantener solo lo específico del componente
export const formatDate = (dateString: string) => 
  new Date(dateString).toLocaleDateString('es-ES', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

// Configuración específica de métricas para UI
export const METRIC_CONFIG = {
  energia: { key: 'cansancioFisico', label: 'Energía', color: '#22c55e' },
  concentracion: { key: 'concentracion', label: 'Concentración', color: '#3b82f6' },
  actitud: { key: 'actitudMental', label: 'Actitud', color: '#facc15' },
  sensaciones: { key: 'sensacionesTenisticas', label: 'Sensaciones', color: '#a855f7' }
};