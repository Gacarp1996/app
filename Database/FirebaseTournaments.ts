import { db } from "../firebase/firebase-config";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Tournament } from "../types";

export const addTournament = async (academiaId: string, tournamentData: Omit<Tournament, "id">) => {
  try {
    const tournamentsCollection = collection(db, "academias", academiaId, "tournaments");
    const docRef = await addDoc(tournamentsCollection, tournamentData);
    console.log("Torneo agregado con ID:", docRef.id);
  } catch (error) {
    console.error("Error al agregar torneo:", error);
  }
};

export const getTournaments = async (academiaId: string): Promise<Tournament[]> => {
  try {
    const tournamentsCollection = collection(db, "academias", academiaId, "tournaments");
    const querySnapshot = await getDocs(tournamentsCollection);
    const tournaments: Tournament[] = querySnapshot.docs.map((doc) => {
      const data = doc.data() as Omit<Tournament, "id">;
      return {
        id: doc.id,
        ...data,
      };
    });
    return tournaments;
  } catch (error) {
    console.error("Error al obtener torneos:", error);
    return [];
  }
};

export const updateTournament = async (academiaId: string, id: string, dataToUpdate: Partial<Tournament>) => {
  try {
    const tournamentDoc = doc(db, "academias", academiaId, "tournaments", id);
    await updateDoc(tournamentDoc, dataToUpdate);
    console.log("Torneo actualizado con éxito:", id);
  } catch (error) {
    console.error("Error al actualizar torneo:", error);
  }
};

export const deleteTournament = async (academiaId: string, id: string) => {
  try {
    const tournamentDoc = doc(db, "academias", academiaId, "tournaments", id);
    await deleteDoc(tournamentDoc);
    console.log("Torneo eliminado con éxito:", id);
  } catch (error) {
    console.error("Error al eliminar torneo:", error);
  }
};