// constants/index.ts

// Exportar las constantes generales
export const MAX_ACTIVE_OBJECTIVES = 5;
export const MAX_PLAYERS_PER_SESSION = 4; // Max selectable at start, session can grow

// Re-exportar todas las constantes desde sus respectivos archivos
export * from './roles';
export * from './training';
export * from './objectives';
export * from './tournaments';

// Si necesitas los datos iniciales (probablemente no si usas Firebase)
// export * from './initial-data';