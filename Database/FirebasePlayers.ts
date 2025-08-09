import { db } from "../firebase/firebase-config";
import { collection, addDoc, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
import { Player } from "../types/types";

// Función para agregar un jugador a Firestore
export const addPlayer = async (academiaId: string, playerData: Omit<Player, "id">) => {
  try {
    const playersCollection = collection(db, "academias", academiaId, "players");
    const docRef = await addDoc(playersCollection, playerData);
    console.log("Jugador agregado con ID:", docRef.id);
  } catch (error) {
    console.error("Error al agregar jugador:", error);
  }
};

// Puede actualizar cualquier campo de un jugador, incluido su 'estado'.
export const updatePlayer = async (academiaId: string, id: string, dataToUpdate: Partial<Player>) => {
  try {
    const playerDoc = doc(db, "academias", academiaId, "players", id);
    await updateDoc(playerDoc, dataToUpdate);
    console.log("Jugador actualizado con éxito:", id);
  } catch (error) {
    console.error("Error al actualizar jugador:", error);
  }
};

// Función para obtener todos los jugadores desde Firestore
export const getPlayers = async (academiaId: string): Promise<Player[]> => {
  try {
    const playersCollection = collection(db, "academias", academiaId, "players");
    const querySnapshot = await getDocs(playersCollection);
    const players: Player[] = querySnapshot.docs.map((doc) => {
      const data = doc.data() as Omit<Player, "id">;
      return {
        id: doc.id,
        ...data,
      };
    });
    console.log("Jugadores obtenidos:", players);
    return players;
  } catch (error) {
    console.error("Error al obtener jugadores:", error);
    return [];
  }
};

// Función para obtener un jugador por ID
export const getPlayerById = async (academiaId: string, id: string): Promise<Player | null> => {
  try {
    const docRef = doc(db, "academias", academiaId, "players", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as Omit<Player, "id">;
      return { id: docSnap.id, ...data };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error al obtener jugador por ID:", error);
    return null;
  }
};