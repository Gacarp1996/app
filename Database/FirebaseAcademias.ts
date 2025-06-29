// Database/FirebaseAcademias.ts
import { db } from "../firebase/firebase-config";
import { collection, addDoc, doc, getDoc, query, where, getDocs } from "firebase/firestore";
import { addUserToAcademia } from "./FirebaseRoles";
import { getAuth } from "firebase/auth";
import { Academia, TipoEntidad } from "../types";

// NUEVO: Tipo de entidad
export type TipoEntidad = 'academia' | 'grupo-entrenamiento';

export interface Academia {
  nombre: string;
  id: string;
  creadorId: string;
  fechaCreacion: Date;
  activa: boolean;
  tipo: TipoEntidad; // NUEVO
  limiteJugadores?: number; // NUEVO: límite de jugadores (3 para grupos, null para academias)
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

// ACTUALIZADO: Ahora acepta tipo y límite de jugadores
export const crearAcademia = async (
  nombre: string, 
  creadorId: string, 
  tipo: TipoEntidad = 'academia',
  limiteJugadores?: number
): Promise<string> => {
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
      activa: true,
      tipo, // NUEVO
      limiteJugadores // NUEVO
    };

    // Crear la academia/grupo
    const docRef = await addDoc(collection(db, "academias"), nuevaAcademia);
    console.log(`${tipo === 'academia' ? 'Academia' : 'Grupo de entrenamiento'} creado con ID:`, docRef.id);

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

    // Pequeña espera para asegurar que la escritura se complete
    await new Promise(resolve => setTimeout(resolve, 100));

    return docRef.id;
  } catch (error) {
    console.error(`Error al crear ${tipo === 'academia' ? 'academia' : 'grupo'}:`, error);
    throw error;
  }
};

export const obtenerAcademiaPorId = async (id: string): Promise<Academia | null> => {
  const q = query(collection(db, "academias"), where("id", "==", id));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return doc.data() as Academia;
  } else {
    return null;
  }
};

export const obtenerAcademiaPorDocId = async (docId: string): Promise<Academia | null> => {
  const docRef = doc(db, "academias", docId);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as Academia;
  } else {
    return null;
  }
};
