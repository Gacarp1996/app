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
 * Obtiene el rango de fechas por defecto (últimos N días) usando fecha LOCAL
 */
export const getDefaultDateRange = (days: number = 30): { start: string; end: string } => {
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - days);
  
  // ✅ CORREGIDO: Usar fecha local en lugar de UTC
  const todayLocal = today.getFullYear() + '-' + 
    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
    String(today.getDate()).padStart(2, '0');
    
  const startLocal = startDate.getFullYear() + '-' + 
    String(startDate.getMonth() + 1).padStart(2, '0') + '-' + 
    String(startDate.getDate()).padStart(2, '0');
  
  return {
    start: startLocal,
    end: todayLocal
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
 * Convierte fecha a string YYYY-MM-DD en hora LOCAL del usuario
 * NO hardcodea ninguna timezone específica
 * ✅ CORREGIDO: Maneja correctamente strings YYYY-MM-DD
 */
export const toLocalDateString = (date: Date | string): string => {
  // Si ya es un string en formato YYYY-MM-DD, devolverlo directamente
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-CA'); // formato YYYY-MM-DD en TZ local
};

/**
 * Compara si dos fechas son el mismo día en hora LOCAL del usuario
 */
export const isSameLocalDay = (date1: Date | string, date2: Date | string): boolean => {
  return toLocalDateString(date1) === toLocalDateString(date2);
};

/**
 * Verifica si una fecha está dentro de un rango (todo en hora LOCAL)
 */
export const isInLocalDateRange = (
  date: Date | string, 
  start: Date | string, 
  end: Date | string
): boolean => {
  const dateLocal = toLocalDateString(date);
  const startLocal = toLocalDateString(start);
  const endLocal = toLocalDateString(end);
  return dateLocal >= startLocal && dateLocal <= endLocal;
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