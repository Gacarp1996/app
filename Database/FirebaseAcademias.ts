// Database/FirebaseAcademias.ts
import { db } from "../firebase/firebase-config";
import { collection, addDoc, doc, getDoc, query, where, getDocs } from "firebase/firestore";
import { addUserToAcademia } from "./FirebaseRoles";
import { getAuth } from "firebase/auth";

export interface Academia {
  nombre: string;
  id: string;
  creadorId: string;
  fechaCreacion: Date;
  activa: boolean;
}

// Generar ID único de 6 caracteres
const generarIdUnico = (): string => {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let resultado = '';
  for (let i = 0; i < 6; i++) {
    resultado += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return resultado;
};

// ACTUALIZADO: Ahora también asigna el rol de director al creador
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

    // Crear la academia
    const docRef = await addDoc(collection(db, "academias"), nuevaAcademia);
    console.log("Academia creada con ID:", docRef.id);
    
    // Obtener el email del usuario actual
    const auth = getAuth();
    const userEmail = auth.currentUser?.email || '';
    const userName = auth.currentUser?.displayName || userEmail.split('@')[0];
    
    // Asignar rol de director al creador
    await addUserToAcademia(
      docRef.id,
      creadorId,
      userEmail,
      'director',
      userName
    );
    
    console.log("Rol de director asignado al creador");
    
    return docRef.id;
  } catch (error) {
    console.error("Error al crear academia:", error);
    throw error;
  }
};

// Sin cambios en el resto de las funciones
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