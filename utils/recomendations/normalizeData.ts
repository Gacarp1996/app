// src/utils/recommendations/normalizeData.ts

/**
 * Normaliza nombres de ejercicios/áreas para consistencia
 */
export function normalizeKey(key: string): string {
  const normalizations: Record<string, string> = {
    // Peloteo y variantes
    'Pelota viva': 'Peloteo',
    'pelota viva': 'Peloteo',
    'PELOTA VIVA': 'Peloteo',
    
    // Primeras pelotas
    'Primeras pelotas': 'Primeras pelotas',
    'primeras pelotas': 'Primeras pelotas',
    'PRIMERAS PELOTAS': 'Primeras pelotas',
    'Primeras Pelotas': 'Primeras pelotas',
    
    // Juego de base/fondo
    'Fondo': 'Juego de base',
    'fondo': 'Juego de base',
    'FONDO': 'Juego de base',
    'Juego de base': 'Juego de base',
    'juego de base': 'Juego de base',
    'JUEGO DE BASE': 'Juego de base',
    
    // Juego de red
    'Juego de red': 'Juego de red',
    'juego de red': 'Juego de red',
    'JUEGO DE RED': 'Juego de red',
    
    // Puntos
    'Puntos': 'Puntos',
    'puntos': 'Puntos',
    'PUNTOS': 'Puntos'
  };
  
  return normalizations[key] || key;
}

/**
 * Convierte diferentes formatos de tiempo a minutos
 */
export function parseTimeToMinutes(timeString: string | number): number {
  if (typeof timeString === 'number') {
    return timeString;
  }
  
  const str = timeString.toLowerCase().trim();
  const numberMatch = str.match(/(\d+(?:\.\d+)?)/);
  if (!numberMatch) return 0;
  
  const number = parseFloat(numberMatch[1]);
  
  if (str.includes('hora') || str.includes('hr')) {
    return number * 60;
  } else if (str.includes('minuto') || str.includes('min') || !str.includes('seg')) {
    return number;
  } else if (str.includes('segundo') || str.includes('seg')) {
    return number / 60;
  }
  
  return number;
}