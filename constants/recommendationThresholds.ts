// constants/recommendationThresholds.ts

// Umbrales para determinar acciones
export const THRESHOLDS = {
  OPTIMAL: 5,     // |gap| ≤ 5% => Óptimo
  MEDIUM: 10,     // |gap| > 10% => Prioridad media
  HIGH: 15        // |gap| > 15% => Prioridad alta
};

// Colores unificados para cada acción
export const STATUS_COLORS = {
  OPTIMAL: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    bgHover: 'bg-blue-500/30',
    icon: '✅',
    label: 'Óptimo'
  },
  INCREMENT: {
    bg: 'bg-red-500/20',
    border: 'border-red-500/30', 
    text: 'text-red-400',
    bgHover: 'bg-red-500/30',
    icon: '📈',
    label: 'Incrementar'
  },
  REDUCE: {
    bg: 'bg-yellow-500/20',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    bgHover: 'bg-yellow-500/30',
    icon: '📉',
    label: 'Reducir'
  },
  NO_DATA: {
    bg: 'bg-gray-500/10',
    border: 'border-gray-500/30',
    text: 'text-gray-400',
    bgHover: 'bg-gray-500/20',
    icon: '⚪',
    label: 'Sin datos'
  }
} as const;

// Tipos para el motor
export type GapAction = 'INCREMENTAR' | 'REDUCIR' | 'OPTIMO';
export type Priority = 'high' | 'medium' | 'low';
export type RecLevel = 'TIPO' | 'AREA' | 'EJERCICIO';

/**
 * Determina la acción basada en el gap con signo
 * @param gap - Diferencia (plan - real) CON SIGNO
 */
export const getActionFromGap = (gap: number): GapAction => {
  const absGap = Math.abs(gap);
  
  if (absGap <= THRESHOLDS.OPTIMAL) {
    return 'OPTIMO';
  }
  
  // gap > 0 significa plan > real => necesita incrementar
  // gap < 0 significa plan < real => necesita reducir
  return gap > 0 ? 'INCREMENTAR' : 'REDUCIR';
};

/**
 * Determina la prioridad basada en la magnitud del gap
 */
export const getPriorityFromGap = (gap: number): Priority => {
  const absGap = Math.abs(gap);
  
  if (absGap > THRESHOLDS.HIGH) return 'high';
  if (absGap > THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
};

/**
 * Obtiene el color para una acción
 */
export const getColorForAction = (action: GapAction) => {
  switch (action) {
    case 'OPTIMO':
      return STATUS_COLORS.OPTIMAL;
    case 'INCREMENTAR':
      return STATUS_COLORS.INCREMENT;
    case 'REDUCIR':
      return STATUS_COLORS.REDUCE;
    default:
      return STATUS_COLORS.NO_DATA;
  }
};

// DEPRECADO: Mantener por compatibilidad temporal
export const getStatusFromDifference = (
  difference: number,
  isDeficit: boolean,
  hasData: boolean = true
): keyof typeof STATUS_COLORS => {
  if (!hasData) return 'NO_DATA';
  if (difference <= THRESHOLDS.OPTIMAL) return 'OPTIMAL';
  return isDeficit ? 'INCREMENT' : 'REDUCE';
};