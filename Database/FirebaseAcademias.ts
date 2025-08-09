import { collection, getDocs, query, where, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { Academia } from '../types/types';

// ===== SISTEMA DE IDS PÚBLICOS DE 6 CARACTERES =====

// ✅ FUNCIÓN PARA GENERAR ID PÚBLICO DE 6 CARACTERES
const generatePublicId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ✅ FUNCIÓN PARA VERIFICAR SI UN ID PÚBLICO YA EXISTE
const isPublicIdUnique = async (publicId: string): Promise<boolean> => {
  try {
    const academiasRef = collection(db, 'academias');
    const q = query(academiasRef, where("publicId", "==", publicId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  } catch (error) {
    console.error("❌ Error verificando ID único:", error);
    return false;
  }
};

// ✅ FUNCIÓN PARA GENERAR ID PÚBLICO ÚNICO
const generateUniquePublicId = async (): Promise<string> => {
  let publicId: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  do {
    publicId = generatePublicId();
    isUnique = await isPublicIdUnique(publicId);
    attempts++;
  } while (!isUnique && attempts < maxAttempts);

  if (!isUnique) {
    throw new Error('No se pudo generar un ID único después de varios intentos');
  }

  return publicId;
};

// ===== INTERFAZ PARA EL RESULTADO DE CREAR ACADEMIA =====
interface CrearAcademiaResult {
  firebaseId: string;
  publicId: string;
}

// ===== FUNCIONES CRUD ACTUALIZADAS =====

// ✅ CREAR ACADEMIA CON ID PÚBLICO (VERSIÓN CORREGIDA)
export const crearAcademia = async (academiaData: Omit<Academia, 'id' | 'fechaCreacion' | 'activa'>): Promise<CrearAcademiaResult> => {
  try {
    // Generar ID público único de 6 caracteres
    const publicId = await generateUniquePublicId();
    
    const docRef = await addDoc(collection(db, 'academias'), {
      ...academiaData,
      publicId: publicId, // ← ID PÚBLICO DE 6 CARACTERES
      fechaCreacion: new Date(),
      activa: true,
    });
    
    // Actualizar el documento para añadir el Firebase ID interno
    await updateDoc(doc(db, 'academias', docRef.id), {
      id: docRef.id // Firebase ID para uso interno
    });
    
    console.log(`✅ Academia creada con ID público: ${publicId} (Firebase ID: ${docRef.id})`);
    
    // ✅ RETORNAR AMBOS IDs
    return {
      firebaseId: docRef.id,
      publicId: publicId
    };
  } catch (error) {
    console.error("❌ Error al crear la academia:", error);
    throw new Error('No se pudo crear la academia.');
  }
};

// ✅ BUSCAR ACADEMIA POR ID PÚBLICO (PARA UNIRSE)
export const buscarAcademiaPorIdPublico = async (publicId: string): Promise<(Academia & { firebaseId: string }) | null> => {
  try {
    // Normalizar el ID público (mayúsculas, sin espacios)
    const normalizedId = publicId.toUpperCase().trim();
    
    if (normalizedId.length !== 6) {
      throw new Error('El ID de la academia debe tener exactamente 6 caracteres');
    }

    const academiasRef = collection(db, 'academias');
    const q = query(
      academiasRef, 
      where("publicId", "==", normalizedId),
      where("activa", "==", true)
    );
    
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`❌ No se encontró academia con ID público: ${normalizedId}`);
      return null;
    }

    const docSnap = querySnapshot.docs[0];
    const academiaData = docSnap.data() as Academia;
    
    console.log(`✅ Academia encontrada: ${academiaData.nombre} (ID público: ${normalizedId})`);
    
    return {
      ...academiaData,
      firebaseId: docSnap.id // Guardamos el Firebase ID para operaciones internas
    } as Academia & { firebaseId: string };

  } catch (error) {
    console.error("❌ Error al buscar academia por ID público:", error);
    throw error;
  }
};

// ✅ BUSCAR ACADEMIA POR NOMBRE E ID (MÉTODO ACTUAL MEJORADO)
export const buscarAcademiaPorNombreEId = async (nombre: string, idPublico: string): Promise<(Academia & { firebaseId: string }) | null> => {
  try {
    const normalizedId = idPublico.toUpperCase().trim();
    
    if (normalizedId.length !== 6) {
      throw new Error('El ID debe tener exactamente 6 caracteres');
    }

    const academiasRef = collection(db, 'academias');
    const q = query(
      academiasRef,
      where("publicId", "==", normalizedId),
      where("nombre", "==", nombre.trim()),
      where("activa", "==", true)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log(`❌ No se encontró academia con nombre "${nombre}" e ID "${normalizedId}"`);
      return null;
    }

    const docSnap = querySnapshot.docs[0];
    const academiaData = docSnap.data() as Academia;
    
    console.log(`✅ Academia encontrada por nombre e ID: ${academiaData.nombre}`);
    
    return {
      ...academiaData,
      firebaseId: docSnap.id
    } as Academia & { firebaseId: string };

  } catch (error) {
    console.error("❌ Error al buscar academia por nombre e ID:", error);
    throw error;
  }
};

// ✅ OBTENER ACADEMIA POR ID (FLEXIBLE - PÚBLICO O FIREBASE)
export const obtenerAcademiaPorId = async (id: string): Promise<Academia | null> => {
  try {
    // Si es un ID de 6 caracteres, buscar por ID público
    if (id.length === 6) {
      const result = await buscarAcademiaPorIdPublico(id);
      return result ? { ...result, id: result.firebaseId } : null;
    }
    
    // Si es más largo, asumir que es Firebase ID
    const docRef = doc(db, 'academias', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Academia;
    } else {
      console.log("❌ No se encontró la academia");
      return null;
    }
  } catch (error) {
    console.error("❌ Error al obtener la academia:", error);
    return null;
  }
};

// ✅ OBTENER TODAS LAS ACADEMIAS
export const obtenerAcademias = async (): Promise<Academia[]> => {
  try {
    const q = query(collection(db, "academias"), where("activa", "==", true));
    const querySnapshot = await getDocs(q);
    const academias: Academia[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      academias.push({ 
        id: doc.id, 
        ...data 
      } as Academia);
    });
    
    return academias;
  } catch (error) {
    console.error("❌ Error al obtener las academias:", error);
    return [];
  }
};

// ✅ ACTUALIZAR ACADEMIA
export const actualizarAcademia = async (id: string, data: Partial<Academia>): Promise<void> => {
  try {
    // Si es ID público de 6 caracteres, buscar el Firebase ID
    let firebaseId = id;
    
    if (id.length === 6) {
      const academia = await buscarAcademiaPorIdPublico(id);
      if (!academia) {
        throw new Error('Academia no encontrada');
      }
      firebaseId = academia.firebaseId;
    }
    
    const academiaRef = doc(db, 'academias', firebaseId);
    await updateDoc(academiaRef, data);
    console.log(`✅ Academia actualizada: ${id}`);
  } catch (error) {
    console.error("❌ Error al actualizar la academia:", error);
    throw error;
  }
};

// ✅ ELIMINAR ACADEMIA (MARCAR COMO INACTIVA)
export const eliminarAcademia = async (id: string): Promise<void> => {
  try {
    await actualizarAcademia(id, { activa: false });
    console.log(`✅ Academia eliminada: ${id}`);
  } catch (error) {
    console.error("❌ Error al eliminar la academia:", error);
    throw error;
  }
};

// ===== FUNCIONES LEGACY PARA COMPATIBILIDAD =====

// NUEVO: Buscar academia o grupo por nombre (método anterior)
export const buscarEntidadPorNombre = async (nombre: string): Promise<(Academia & { id: string }) | null> => {
  try {
    const academiasRef = collection(db, 'academias');
    const nombreNormalizado = nombre.toLowerCase();
    const q = query(academiasRef, where("nombre_normalizado", "==", nombreNormalizado));

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('❌ No se encontró ninguna academia con ese nombre.');
      return null;
    }

    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Academia & { id: string };

  } catch (error) {
    console.error("❌ Error al buscar la entidad por nombre:", error);
    throw new Error('Error al buscar la entidad.');
  }
};

// ===== FUNCIONES DE UTILIDAD =====

// ✅ OBTENER ID PÚBLICO DE UNA ACADEMIA (PARA MOSTRAR AL USUARIO)
export const obtenerIdPublico = async (firebaseId: string): Promise<string | null> => {
  try {
    const academia = await obtenerAcademiaPorId(firebaseId);
    return academia && 'publicId' in academia ? (academia as any).publicId : null;
  } catch (error) {
    console.error("❌ Error obteniendo ID público:", error);
    return null;
  }
};


