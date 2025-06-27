import { db } from "../firebase/firebase-config";
import { collection, addDoc, doc, getDoc, query, where, getDocs } from "firebase/firestore";

// 1. MUEVE LA INTERFAZ FUERA DE LAS FUNCIONES Y EXPORTALA
export interface Academia {
  nombre: string;
  id: string;
  creadorId: string;
  fechaCreacion: Date;
  activa: boolean;
}

// 2. Generar ID único de 6 caracteres
const generarIdUnico = (): string => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let resultado = '';
  for (let i = 0; i < 6; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return resultado;
};

// 3. ACTUALIZA crearAcademia para usar la interfaz exportada
export const crearAcademia = async (nombre: string, creadorId: string): Promise<string> => {
  try {
    let idUnico = generarIdUnico();
    let idExiste = true;
    
    // Verificar que el ID sea único
    while (idExiste) {
      const q = query(collection(db, "academias"), where("id", "==", idUnico));
      const querySnapshot = await getDocs(q);
      if (querySnapshot.empty) {
        idExiste = false;
      } else {
        idUnico = generarIdUnico();
      }
    }

    const nuevaAcademia: Academia = {
      nombre,
      id: idUnico,
      creadorId,
      fechaCreacion: new Date(),
      activa: true
    };

    const docRef = await addDoc(collection(db, "academias"), nuevaAcademia);
    console.log("Academia creada con ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error al crear academia:", error);
    throw error;
  }
};

// 4. ACTUALIZA buscarAcademiaPorIdYNombre con el tipo de retorno
export const buscarAcademiaPorIdYNombre = async (id: string, nombre: string): Promise<Academia | null> => {
  try {
    const q = query(
      collection(db, "academias"), 
      where("id", "==", id.toUpperCase()),
      where("nombre", "==", nombre),
      where("activa", "==", true)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as Academia;
    }
    
    return null;
  } catch (error) {
    console.error("Error buscando academia:", error);
    throw error;
  }
};

// 5. ACTUALIZA obtenerAcademiaPorId con el tipo de retorno
export const obtenerAcademiaPorId = async (academiaId: string): Promise<Academia | null> => {
  try {
    const docRef = doc(db, "academias", academiaId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Academia;
    }
    return null;
  } catch (error) {
    console.error("Error obteniendo academia:", error);
    throw error;
  }
};