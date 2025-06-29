import { collection, getDocs, query, where, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { Academia } from '../types'; // IMPORTADO DESDE TYPES

// Funciones CRUD para Academias

// Crear una nueva academia
export const crearAcademia = async (academiaData: Omit<Academia, 'id' | 'fechaCreacion' | 'activa'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'academias'), {
      ...academiaData,
      fechaCreacion: new Date(),
      activa: true,
    });
    // Actualizar el documento para añadir el ID
    await updateDoc(doc(db, 'academias', docRef.id), {
      id: docRef.id
    });
    return docRef.id;
  } catch (error) {
    console.error("Error al crear la academia: ", error);
    throw new Error('No se pudo crear la academia.');
  }
};

// Obtener todas las academias
export const obtenerAcademias = async (): Promise<Academia[]> => {
  try {
    const q = query(collection(db, "academias"), where("activa", "==", true));
    const querySnapshot = await getDocs(q);
    const academias: Academia[] = [];
    querySnapshot.forEach((doc) => {
        academias.push({ id: doc.id, ...doc.data() } as Academia);
    });
    return academias;
  } catch (error) {
    console.error("Error al obtener las academias: ", error);
    return [];
  }
};


// Obtener una academia por su ID
export const obtenerAcademiaPorId = async (id: string): Promise<Academia | null> => {
    try {
        const docRef = doc(db, 'academias', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Academia;
        } else {
            console.log("No se encontró la academia");
            return null;
        }
    } catch (error) {
        console.error("Error al obtener la academia: ", error);
        return null;
    }
};


// Actualizar una academia
export const actualizarAcademia = async (id: string, data: Partial<Academia>): Promise<void> => {
    try {
        const academiaRef = doc(db, 'academias', id);
        await updateDoc(academiaRef, data);
    } catch (error) {
        console.error("Error al actualizar la academia: ", error);
    }
};


// Eliminar una academia (marcar como inactiva)
export const eliminarAcademia = async (id: string): Promise<void> => {
    try {
        const academiaRef = doc(db, 'academias', id);
        await updateDoc(academiaRef, { activa: false });
    } catch (error) {
        console.error("Error al eliminar la academia: ", error);
    }
};

// NUEVO: Buscar academia o grupo por nombre
export const buscarEntidadPorNombre = async (nombre: string): Promise<(Academia & { id: string }) | null> => {
  try {
    const academiasRef = collection(db, 'academias');
    // Normalizamos el nombre a minúsculas para la búsqueda
    const nombreNormalizado = nombre.toLowerCase();
    const q = query(academiasRef, where("nombre_normalizado", "==", nombreNormalizado));

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('No se encontró ninguna academia o grupo con ese nombre.');
      return null;
    }

    // Suponemos que los nombres son únicos, así que tomamos el primer resultado
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Academia & { id: string };

  } catch (error) {
    console.error("Error al buscar la entidad por nombre: ", error);
    throw new Error('Error al buscar la entidad.');
  }
};