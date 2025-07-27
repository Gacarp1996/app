// components/dashboard/widgets/helpers.ts

import { Player } from "@/types";



// ========================================
// FUNCIONES ESENCIALES - ALTA DUPLICACIÓN
// ========================================

/**
 * Obtiene el nombre de un jugador por su ID
 * @param players - Lista de jugadores
 * @param playerId - ID del jugador a buscar
 * @returns Nombre del jugador o 'Jugador desconocido'
 */
export const getPlayerName = (players: Player[], playerId: string): string => {
  const player = players.find(p => p.id === playerId);
  return player?.name || 'Jugador desconocido';
};

/**
 * Formatea una fecha en formato español
 * @param dateString - Fecha en formato ISO string
 * @returns Fecha formateada (ej: "15 nov 2024")
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};