import { db } from "../firebase/firebase-config";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { TrainingSession } from "../types";

const sessionsCollection = collection(db, "sessions");

export const addSession = async (sessionData: Omit<TrainingSession, "id">) => {
  try {
    const docRef = await addDoc(sessionsCollection, sessionData);
    console.log("Sesión agregada con ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error al agregar sesión:", error);
    throw error;
  }
};

export const getSessions = async (): Promise<TrainingSession[]> => {
  try {
    const querySnapshot = await getDocs(sessionsCollection);
    const sessions: TrainingSession[] = querySnapshot.docs.map((doc) => {
      const data = doc.data() as Omit<TrainingSession, "id">;
      return {
        id: doc.id,
        ...data,
      };
    });
    console.log("Sesiones obtenidas:", sessions.length);
    return sessions;
  } catch (error) {
    console.error("Error al obtener sesiones:", error);
    return [];
  }
};

export const deleteSession = async (sessionId: string): Promise<void> => {
  try {
    if (!sessionId) {
      throw new Error('ID de sesión no proporcionado');
    }
    
    console.log('Intentando eliminar sesión con ID:', sessionId);
    
    const sessionDoc = doc(db, "sessions", sessionId);
    await deleteDoc(sessionDoc);
    
    console.log("Sesión eliminada exitosamente:", sessionId);
  } catch (error) {
    console.error("Error al eliminar la sesión:", error);
    throw error;
  }
};

export const updateSession = async (sessionId: string, updates: Partial<Omit<TrainingSession, "id">>): Promise<void> => {
  try {
    if (!sessionId) {
      throw new Error('ID de sesión no proporcionado');
    }
    
    const sessionDoc = doc(db, "sessions", sessionId);
    await updateDoc(sessionDoc, updates);
    
    console.log("Sesión actualizada exitosamente:", sessionId);
  } catch (error) {
    console.error("Error al actualizar la sesión:", error);
    throw error;
  }
};