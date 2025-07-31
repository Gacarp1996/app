// components/tournaments/helpers.ts

/**
 * Convierte una fecha de torneo a ISO manteniendo la fecha visual
 * Los torneos son eventos de "día completo" sin hora específica
 */
export const dateToISOString = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0); // Mediodía para evitar problemas
  return date.toISOString();
};

/**
 * Convierte ISO string a fecha local para mostrar
 */
export const isoToLocalDate = (isoString: string): string => {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Validaciones de torneo
 */
export const validateTournamentForm = (data: {
  nombreTorneo: string;
  fechaInicio: string;
  fechaFin: string;
  resultado?: string;
}): string | null => {
  if (!data.nombreTorneo.trim()) {
    return 'El nombre del torneo no puede estar vacío.';
  }
  if (!data.fechaInicio || !data.fechaFin) {
    return 'Debe seleccionar una fecha de inicio y una fecha de fin.';
  }
  
  // Comparar fechas sin timezone issues
  const inicio = new Date(data.fechaInicio + 'T12:00:00');
  const fin = new Date(data.fechaFin + 'T12:00:00');
  
  if (inicio > fin) {
    return 'La fecha de inicio no puede ser posterior a la fecha de fin.';
  }
  
  if (data.resultado !== undefined && !data.resultado) {
    return 'Debe seleccionar el resultado del torneo.';
  }
  
  return null;
};

// Mapeo de rendimiento para gráficos
export const RENDIMIENTO_MAP = {
  'Muy malo': 1,
  'Malo': 2,  
  'Bueno': 3,
  'Muy bueno': 4,
  'Excelente': 5
} as const;