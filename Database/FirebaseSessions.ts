import { db } from "../firebase/firebase-config";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc } from "firebase/firestore";
import { TrainingSession } from "../types";

export const addSession = async (academiaId: string, sessionData: Omit<TrainingSession, "id">) => {
  try {
    // Filtrar campos undefined antes de enviar a Firebase
    const cleanedSessionData = Object.fromEntries(
      Object.entries(sessionData).filter(([key, value]) => value !== undefined)
    );
    
    const sessionsCollection = collection(db, "academias", academiaId, "sessions");
    const docRef = await addDoc(sessionsCollection, cleanedSessionData);
    console.log("Sesión agregada con ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error al agregar sesión:", error);
    throw error;
  }
};

export const getSessions = async (academiaId: string): Promise<TrainingSession[]> => {
  try {
    const sessionsCollection = collection(db, "academias", academiaId, "sessions");
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

export const deleteSession = async (academiaId: string, sessionId: string): Promise<void> => {
  try {
    if (!sessionId) {
      throw new Error('ID de sesión no proporcionado');
    }

    console.log('Intentando eliminar sesión con ID:', sessionId);

    const sessionDoc = doc(db, "academias", academiaId, "sessions", sessionId);
    await deleteDoc(sessionDoc);

    console.log("Sesión eliminada exitosamente:", sessionId);
  } catch (error) {
    console.error("Error al eliminar la sesión:", error);
    throw error;
  }
};

export const updateSession = async (academiaId: string, sessionId: string, updates: Partial<Omit<TrainingSession, "id">>): Promise<void> => {
  try {
    if (!sessionId) {
      throw new Error('ID de sesión no proporcionado');
    }

    const sessionDoc = doc(db, "academias", academiaId, "sessions", sessionId);
    await updateDoc(sessionDoc, updates);

    console.log("Sesión actualizada exitosamente:", sessionId);
  } catch (error) {
    console.error("Error al actualizar la sesión:", error);
    throw error;
  }
};

export const getSessionById = async (academiaId: string, sessionId: string): Promise<TrainingSession | null> => {
  try {
    const sessionDoc = doc(db, "academias", academiaId, "sessions", sessionId);
    const docSnap = await getDoc(sessionDoc);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as TrainingSession;
    }
    return null;
  } catch (error) {
    console.error("Error al obtener sesión por ID:", error);
    return null;
  }
};
