// Database/FirebaseUpcomingCompetitions.ts
import { getTournaments } from './FirebaseTournaments';
import { Tournament, Player } from '../types';

export interface PlayerCompetition {
  playerId: string;
  playerName: string;
  competitionName: string;
  competitionDate: Date;
  daysRemaining: number;
  tournamentId: string;
}

// ✅ CAMBIO: Agregar players como parámetro
export const getUpcomingCompetitions = async (
  academiaId: string,
  players: Player[]  // Nuevo parámetro
): Promise<PlayerCompetition[]> => {
  try {
    // Solo obtener torneos
    const tournaments = await getTournaments(academiaId);

    const now = new Date();
    const upcomingCompetitions: PlayerCompetition[] = [];

    // Filtrar solo torneos futuros (próximos 60 días para no saturar)
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);

    const futureTournaments = tournaments.filter(tournament => {
      const tournamentDate = new Date(tournament.fechaInicio);
      return tournamentDate > now && tournamentDate <= maxDate;
    });

    // Para cada torneo futuro, buscar el jugador asociado
    futureTournaments.forEach((tournament: Tournament) => {
      const player = players.find(p => p.id === tournament.jugadorId);
      
      if (player && player.estado === 'activo') {
        const competitionDate = new Date(tournament.fechaInicio);
        const daysRemaining = Math.ceil((competitionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        upcomingCompetitions.push({
          playerId: player.id,
          playerName: player.name,
          competitionName: tournament.nombreTorneo,
          competitionDate,
          daysRemaining,
          tournamentId: tournament.id
        });
      }
    });

    // Ordenar por fecha más cercana y limitar a los primeros 10
    return upcomingCompetitions
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 10);

  } catch (error) {
    console.error('Error obteniendo competencias próximas:', error);
    return [];
  }
};

// ✅ CAMBIO: Actualizar las demás funciones
export const getPlayerUpcomingCompetitions = async (
  academiaId: string, 
  playerId: string,
  players: Player[]  // Nuevo parámetro
): Promise<PlayerCompetition[]> => {
  try {
    const allCompetitions = await getUpcomingCompetitions(academiaId, players);
    return allCompetitions.filter(comp => comp.playerId === playerId);
  } catch (error) {
    console.error('Error obteniendo competencias del jugador:', error);
    return [];
  }
};

export const getMultiplePlayersUpcomingCompetitions = async (
  academiaId: string, 
  playerIds: string[],
  players: Player[]  // Nuevo parámetro
): Promise<PlayerCompetition[]> => {
  try {
    const allCompetitions = await getUpcomingCompetitions(academiaId, players);
    return allCompetitions.filter(comp => playerIds.includes(comp.playerId));
  } catch (error) {
    console.error('Error obteniendo competencias de múltiples jugadores:', error);
    return [];
  }
};

export const getCoachPlayersUpcomingCompetitions = async (
  academiaId: string, 
  coachId: string,
  players: Player[]  // Nuevo parámetro
): Promise<PlayerCompetition[]> => {
  try {
    // Aquí podrías filtrar solo los jugadores del coach si tienes esa información
    const allCompetitions = await getUpcomingCompetitions(academiaId, players);
    return allCompetitions;
  } catch (error) {
    console.error('Error obteniendo competencias del coach:', error);
    return [];
  }
};