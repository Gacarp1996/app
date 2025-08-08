// utils/dateHelpers.ts

/**
 * Obtiene el timezone del usuario o devuelve uno por defecto
 */
export const getUserTimeZone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('No se pudo detectar la zona horaria, usando default');
    return 'America/Argentina/Buenos_Aires';
  }
};

/**
 * Obtiene el offset de timezone del usuario en milisegundos
 */
export const getUserTimezoneOffset = (): number => {
  return new Date().getTimezoneOffset() * 60000;
};

/**
 * Ajusta una fecha con el offset de timezone del usuario
 */
export const adjustDateWithTimezone = (dateString: string, endOfDay: boolean = false): Date => {
  const offset = getUserTimezoneOffset();
  const date = new Date(new Date(dateString).getTime() + offset);
  
  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }
  
  return date;
};

/**
 * Obtiene el rango de fechas por defecto (últimos 30 días)
 */
export const getDefaultDateRange = (days: number = 30): { start: string; end: string } => {
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - days);
  
  return {
    start: startDate.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  };
};

/**
 * Formatea una fecha para mostrar en UI (día y mes)
 */
export const formatDateShort = (date: Date, timeZone?: string): string => {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    timeZone: timeZone || getUserTimeZone()
  });
};

/**
 * Formatea una fecha completa para mostrar en UI
 */
export const formatDateFull = (date: Date, timeZone?: string): string => {
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timeZone || getUserTimeZone()
  });
};

/**
 * Agrupa elementos por día basándose en una propiedad de fecha
 */
export function groupByDay<T>(
  items: T[],
  dateExtractor: (item: T) => string | Date,
  timeZone?: string
): Record<string, T[]> {
  return items.reduce((acc, item) => {
    const date = dateExtractor(item);
    const dateKey = formatDateFull(
      typeof date === 'string' ? new Date(date) : date,
      timeZone
    );
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

/**
 * Filtra elementos por rango de fechas
 */
export function filterByDateRange<T>(
  items: T[],
  startDate: string | Date,
  endDate: string | Date,
  dateExtractor: (item: T) => string | Date
): T[] {
  const start = typeof startDate === 'string' ? adjustDateWithTimezone(startDate) : startDate;
  const end = typeof endDate === 'string' ? adjustDateWithTimezone(endDate, true) : endDate;
  
  return items.filter(item => {
    const itemDate = dateExtractor(item);
    const date = typeof itemDate === 'string' ? new Date(itemDate) : itemDate;
    return date >= start && date <= end;
  });
}

/**
 * Ordena elementos por fecha
 */
export function sortByDate<T>(
  items: T[],
  dateExtractor: (item: T) => string | Date,
  ascending: boolean = true
): T[] {
  return [...items].sort((a, b) => {
    const dateA = dateExtractor(a);
    const dateB = dateExtractor(b);
    const timeA = (typeof dateA === 'string' ? new Date(dateA) : dateA).getTime();
    const timeB = (typeof dateB === 'string' ? new Date(dateB) : dateB).getTime();
    
    return ascending ? timeA - timeB : timeB - timeA;
  });
}