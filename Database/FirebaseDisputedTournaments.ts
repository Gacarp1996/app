import { db } from "../firebase/firebase-config";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { DisputedTournament } from "../types";

// Agregar un torneo disputado
export const addDisputedTournament = async (academiaId: string, tournamentData: Omit<DisputedTournament, "id">) => {
  try {
    const disputedTournamentsCollection = collection(db, "academias", academiaId, "disputedTournaments");
    const dataWithRegistrationDate = {
      ...tournamentData,
      fechaRegistro: new Date().toISOString()
    };
    const docRef = await addDoc(disputedTournamentsCollection, dataWithRegistrationDate);
    console.log("Torneo disputado agregado con ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error al agregar torneo disputado:", error);
    throw error;
  }
};

// Obtener todos los torneos disputados
export const getDisputedTournaments = async (academiaId: string): Promise<DisputedTournament[]> => {
  try {
    const disputedTournamentsCollection = collection(db, "academias", academiaId, "disputedTournaments");
    const q = query(disputedTournamentsCollection, orderBy("fechaFin", "desc"));
    const querySnapshot = await getDocs(q);
    const tournaments: DisputedTournament[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<DisputedTournament, "id">
    }));
    return tournaments;
  } catch (error) {
    console.error("Error al obtener torneos disputados:", error);
    return [];
  }
};

// Obtener torneos disputados de un jugador específico
export const getPlayerDisputedTournaments = async (
  academiaId: string, 
  playerId: string,
  startDate?: Date,
  endDate?: Date
): Promise<DisputedTournament[]> => {
  try {
    const disputedTournamentsCollection = collection(db, "academias", academiaId, "disputedTournaments");
    let q = query(
      disputedTournamentsCollection, 
      where("jugadorId", "==", playerId),
      orderBy("fechaFin", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    let tournaments: DisputedTournament[] = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data() as Omit<DisputedTournament, "id">
    }));
    
    // Filtrar por fechas si se proporcionan
    if (startDate || endDate) {
      tournaments = tournaments.filter(t => {
        const tournamentEndDate = new Date(t.fechaFin);
        if (startDate && tournamentEndDate < startDate) return false;
        if (endDate && tournamentEndDate > endDate) return false;
        return true;
      });
    }
    
    return tournaments;
  } catch (error) {
    console.error("Error al obtener torneos disputados del jugador:", error);
    return [];
  }
};

// Actualizar un torneo disputado
export const updateDisputedTournament = async (
  academiaId: string, 
  id: string, 
  dataToUpdate: Partial<DisputedTournament>
) => {
  try {
    const tournamentDoc = doc(db, "academias", academiaId, "disputedTournaments", id);
    await updateDoc(tournamentDoc, {
      ...dataToUpdate,
      fechaRegistro: new Date().toISOString() // Actualizar fecha de última modificación
    });
    console.log("Torneo disputado actualizado con éxito:", id);
  } catch (error) {
    console.error("Error al actualizar torneo disputado:", error);
    throw error;
  }
};

// Eliminar un torneo disputado
export const deleteDisputedTournament = async (academiaId: string, id: string) => {
  try {
    const tournamentDoc = doc(db, "academias", academiaId, "disputedTournaments", id);
    await deleteDoc(tournamentDoc);
    console.log("Torneo disputado eliminado con éxito:", id);
  } catch (error) {
    console.error("Error al eliminar torneo disputado:", error);
    throw error;
  }
};

// Convertir un torneo futuro en disputado
export const convertToDisputedTournament = async (
  academiaId: string,
  futureTournament: any, // Tournament type from your existing code
  resultData: {
    resultado: string;
    nivelDificultad: number;
    rendimientoJugador: DisputedTournament['rendimientoJugador'];
    conformidadGeneral: DisputedTournament['conformidadGeneral'];
    observaciones?: string;
  }
) => {
  try {
    const disputedTournamentData: Omit<DisputedTournament, "id"> = {
      jugadorId: futureTournament.jugadorId,
      nombreTorneo: futureTournament.nombreTorneo,
      fechaInicio: futureTournament.fechaInicio,
      fechaFin: futureTournament.fechaFin,
      torneoFuturoId: futureTournament.id,
      ...resultData
    };
    
    return await addDisputedTournament(academiaId, disputedTournamentData);
  } catch (error) {
    console.error("Error al convertir torneo a disputado:", error);
    throw error;
  }
};