import { collection, getDocs, query, where, addDoc, updateDoc, doc, getDoc, orderBy, limit as firestoreLimit, serverTimestamp, setDoc, runTransaction, Transaction } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { Academia, JoinRequest } from '../types/types';
import { getUserRoleInAcademia, addUserToAcademia } from './FirebaseRoles';

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
    
   
    
    // ✅ RETORNAR AMBOS IDs
    return {
      firebaseId: docRef.id,
      publicId: publicId
    };
  } catch (error) {

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
      return null;
    }

    const docSnap = querySnapshot.docs[0];
    const academiaData = docSnap.data() as Academia;
    

    
    return {
      ...academiaData,
      firebaseId: docSnap.id // Guardamos el Firebase ID para operaciones internas
    } as Academia & { firebaseId: string };

  } catch (error) {

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

      return null;
    }

    const docSnap = querySnapshot.docs[0];
    const academiaData = docSnap.data() as Academia;
    

    
    return {
      ...academiaData,
      firebaseId: docSnap.id
    } as Academia & { firebaseId: string };

  } catch (error) {

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
      return null;
    }
  } catch (error) {

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

  } catch (error) {

    throw error;
  }
};

// ✅ ELIMINAR ACADEMIA (MARCAR COMO INACTIVA)
export const eliminarAcademia = async (id: string): Promise<void> => {
  try {
    await actualizarAcademia(id, { activa: false });

  } catch (error) {

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
  
      return null;
    }

    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Academia & { id: string };

  } catch (error) {

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

    return null;
  }
};

// ===== NUEVAS FUNCIONES PARA SISTEMA DE APROBACIÓN =====

// ✅ CREAR SOLICITUD DE UNIÓN
export const crearSolicitudUnion = async (
  academiaId: string,
  publicId: string,
  userData: {
    userId: string;
    email: string;
    displayName?: string;
  }
): Promise<{ success: boolean; message: string; requestId?: string }> => {
  try {
    // Validar que la academia existe y está activa
    const academia = await obtenerAcademiaPorId(academiaId);
    if (!academia || !academia.activa) {
      return { success: false, message: 'Academia no disponible' };
    }

    // Verificar que el publicId coincide
    if ((academia as any).publicId !== publicId) {
      return { success: false, message: 'Código inválido o expirado' };
    }

    // Verificar si ya existe una solicitud pendiente
    const solicitudesRef = collection(db, 'academias', academiaId, 'solicitudes');
    const q = query(
      solicitudesRef,
      where('userId', '==', userData.userId),
      where('status', '==', 'pending')
    );
    const existing = await getDocs(q);
    
    if (!existing.empty) {
      return { success: false, message: 'Ya tienes una solicitud pendiente' };
    }

    // Verificar si el usuario ya es miembro
    const userRole = await getUserRoleInAcademia(academiaId, userData.userId);
    if (userRole) {
      return { success: false, message: 'Ya eres miembro de esta academia' };
    }

    // Crear solicitud
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días

    const solicitud: Omit<JoinRequest, 'id'> = {
      userId: userData.userId,
      userEmail: userData.email,
      userName: userData.displayName || userData.email.split('@')[0],
      academiaId,
      publicIdUsed: publicId,
      status: 'pending',
      requestedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    const docRef = await addDoc(solicitudesRef, solicitud);
    

    return { 
      success: true, 
      message: 'Solicitud enviada. El director será notificado.',
      requestId: docRef.id 
    };
    
  } catch (error) {

    return { success: false, message: 'Error al procesar solicitud' };
  }
};

// ✅ OBTENER SOLICITUDES PENDIENTES (PARA DIRECTORES)
export const obtenerSolicitudesPendientes = async (
  academiaId: string,
  limit: number = 20
): Promise<JoinRequest[]> => {
  try {
    const solicitudesRef = collection(db, 'academias', academiaId, 'solicitudes');
    const q = query(
      solicitudesRef,
      where('status', '==', 'pending'),
      where('expiresAt', '>', new Date().toISOString()),
      orderBy('expiresAt', 'asc'),
      firestoreLimit(limit)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as JoinRequest));
    
  } catch (error) {

    return [];
  }
};

// ✅ PROCESAR SOLICITUD - VERSIÓN CORREGIDA CON TRANSACCIÓN
export const procesarSolicitud = async (
  academiaId: string,
  solicitudId: string,
  action: 'approve' | 'reject',
  processorId: string
): Promise<{ success: boolean; message: string }> => {
  try {    
    const solicitudRef = doc(db, 'academias', academiaId, 'solicitudes', solicitudId);
    const solicitudDoc = await getDoc(solicitudRef);
    
    if (!solicitudDoc.exists()) {
      return { success: false, message: 'Solicitud no encontrada' };
    }
    
    const solicitud = solicitudDoc.data() as JoinRequest;
    
    if (solicitud.status !== 'pending') {
      return { success: false, message: 'Solicitud ya fue procesada' };
    }

    // Actualizar solicitud
    await updateDoc(solicitudRef, {
      status: action === 'approve' ? 'approved' : 'rejected',
      processedAt: new Date().toISOString(),
      processedBy: processorId
    });


    // Si se aprueba, agregar usuario a la academia
    if (action === 'approve') {

      
      try {
        await addUserToAcademia(
          academiaId,
          solicitud.userId,
          solicitud.userEmail,
          'academyCoach',
          solicitud.userName
        );
   
      } catch (error) {

        throw error;
      }

      // Obtener información de la academia y actualizar userAcademias
      try {
        const academiaDoc = await getDoc(doc(db, 'academias', academiaId));
        if (academiaDoc.exists()) {
          const academiaData = academiaDoc.data();

          
          // ✅ SOLUCIÓN CON TRANSACCIÓN
          const userAcademiasRef = doc(db, 'userAcademias', solicitud.userId);

          
          try {
            const nuevoAcceso = {
              academiaId: academiaId,
              nombre: academiaData.nombre,
              ultimoAcceso: Date.now()
            };

            
            // Usar transacción para operación atómica
            await runTransaction(db, async (transaction: Transaction) => {
              const userDoc = await transaction.get(userAcademiasRef);
              
              if (userDoc.exists()) {
                const data = userDoc.data();
                const academiasActuales = data.academias || [];
                // Filtrar para evitar duplicados
                const academiasActualizadas = academiasActuales.filter(
                  (a: any) => a.academiaId !== academiaId
                );
                // Agregar nueva academia al principio
                academiasActualizadas.unshift(nuevoAcceso);
                
                transaction.update(userAcademiasRef, {
                  academias: academiasActualizadas,
                  ultimaActualizacion: serverTimestamp()
                });
              } else {
                // Si no existe el documento, crearlo
                transaction.set(userAcademiasRef, {
                  academias: [nuevoAcceso],
                  fechaCreacion: serverTimestamp(),
                  ultimaActualizacion: serverTimestamp()
                });
              }
            });
            

            
          } catch (userAcademiasError: any) {
          
          }
        }
      } catch (academiaError) {


      }
    }


    return { 
      success: true, 
      message: action === 'approve' ? 'Usuario aprobado' : 'Solicitud rechazada' 
    };
    
  } catch (error) {

    return { success: false, message: 'Error al procesar' };
  }
};

// ✅ ROTAR CÓDIGO PÚBLICO
export const rotarCodigoPublico = async (
  academiaId: string,
  userId: string,
  reason?: string
): Promise<{ success: boolean; newCode?: string; message: string }> => {
  try {
    const academia = await obtenerAcademiaPorId(academiaId);
    if (!academia) {
      return { success: false, message: 'Academia no encontrada' };
    }

    const oldCode = (academia as any).publicId;
    const newCode = await generateUniquePublicId();

    // Actualizar academia
    await updateDoc(doc(db, 'academias', academiaId), {
      publicId: newCode,
      lastRotation: new Date().toISOString()
    });

    // Registrar rotación
    await addDoc(collection(db, 'academias', academiaId, 'rotaciones'), {
      oldPublicId: oldCode,
      newPublicId: newCode,
      rotatedBy: userId,
      rotatedAt: new Date().toISOString(),
      reason
    });

    return { success: true, newCode, message: 'Código actualizado' };
    
  } catch (error) {

    return { success: false, message: 'Error al rotar código' };
  }
};