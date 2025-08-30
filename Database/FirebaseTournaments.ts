import { db } from "../firebase/firebase-config";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Tournament } from "../types/types";

export const addTournament = async (academiaId: string, tournamentData: Omit<Tournament, "id">) => {
  try {
    const tournamentsCollection = collection(db, "academias", academiaId, "tournaments");
    const docRef = await addDoc(tournamentsCollection, tournamentData);
 
  } catch (error) {
   
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
 
    return [];
  }
};

export const updateTournament = async (academiaId: string, id: string, dataToUpdate: Partial<Tournament>) => {
  try {
    const tournamentDoc = doc(db, "academias", academiaId, "tournaments", id);
    await updateDoc(tournamentDoc, dataToUpdate);
   
  } catch (error) {
    
  }
};

export const deleteTournament = async (academiaId: string, id: string) => {
  try {
    const tournamentDoc = doc(db, "academias", academiaId, "tournaments", id);
    await deleteDoc(tournamentDoc);
    
  } catch (error) {
    
  }
};