import { db } from "../firebase/firebase-config";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Objective } from "../types/types";

export const addObjective = async (academiaId: string, objectiveData: Omit<Objective, "id">) => {
  try {
    const objectivesCollection = collection(db, "academias", academiaId, "objectives");
    const docRef = await addDoc(objectivesCollection, objectiveData);
    console.log("Objetivo agregado con ID:", docRef.id);
  } catch (error) {
    console.error("Error al agregar objetivo:", error);
  }
};

export const getObjectives = async (academiaId: string): Promise<Objective[]> => {
  try {
    const objectivesCollection = collection(db, "academias", academiaId, "objectives");
    const querySnapshot = await getDocs(objectivesCollection);
    const objectives: Objective[] = querySnapshot.docs.map((doc) => {
      const data = doc.data() as Omit<Objective, "id">;
      return {
        id: doc.id,
        ...data,
      };
    });
    return objectives;
  } catch (error) {
    console.error("Error al obtener objetivos:", error);
    return [];
  }
};

// Esta función ahora puede actualizar cualquier campo del objetivo
export const updateObjective = async (academiaId: string, id: string, dataToUpdate: Partial<Objective>) => {
  try {
    const objectiveDoc = doc(db, "academias", academiaId, "objectives", id);
    await updateDoc(objectiveDoc, dataToUpdate);
    console.log("Objetivo actualizado con éxito:", id);
  } catch (error) {
    console.error("Error al actualizar objetivo:", error);
  }
};

export const deleteObjective = async (academiaId: string, id: string) => {
  try {
    const objectiveDoc = doc(db, "academias", academiaId, "objectives", id);
    await deleteDoc(objectiveDoc);
    console.log("Objetivo eliminado con éxito:", id);
  } catch (error) {
    console.error("Error al eliminar objetivo:", error);
  }
};