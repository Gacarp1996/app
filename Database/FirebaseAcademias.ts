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
    
    console.log('🔍 DEBUG: Datos para crear academia:', {
      ...academiaData,
      publicId,
      fechaCreacion: 'serverTimestamp()',
      activa: true
    });
    
    // Crear la academia con un ID específico para evitar el updateDoc
    const docRef = doc(collection(db, 'academias'));
    
    const academiaCompleta = {
      ...academiaData,
      id: docRef.id, // Incluir el ID desde el inicio
      publicId: publicId, // ← ID PÚBLICO DE 6 CARACTERES
      fechaCreacion: serverTimestamp(),
      activa: true,
    };
    
    await setDoc(docRef, academiaCompleta);
    
    console.log('✅ Academia creada con ID:', docRef.id);
    console.log('🆔 PublicId asignado:', publicId);
    console.log('📄 Documento completo guardado:', academiaCompleta);
    
    // Verificar inmediatamente que se guardó correctamente
    setTimeout(async () => {
      try {
        const verificacion = await getDoc(docRef);
        if (verificacion.exists()) {
          const data = verificacion.data();
          console.log('✅ VERIFICACIÓN: Academia guardada correctamente');
          console.log('🔍 PublicId en BD:', data.publicId);
          console.log('🔍 Activa en BD:', data.activa);
        } else {
          console.log('❌ VERIFICACIÓN: Academia NO encontrada en BD');
        }
      } catch (error) {
        console.log('❌ Error en verificación:', error);
      }
    }, 2000); // Verificar después de 2 segundos
    
    // ✅ RETORNAR AMBOS IDs
    return {
      firebaseId: docRef.id,
      publicId: publicId
    };
  } catch (error) {
    console.error('🚨 ERROR completo creando academia:', error);
    console.error('🚨 Datos que causaron el error:', academiaData);
    throw new Error('No se pudo crear la academia.');
  }
};

// ✅ BUSCAR ACADEMIA POR ID PÚBLICO (PARA UNIRSE)
export const buscarAcademiaPorIdPublico = async (publicId: string): Promise<(Academia & { firebaseId: string }) | null> => {
  try {
    // Normalizar el ID público (mayúsculas, sin espacios)
    const normalizedId = publicId.toUpperCase().trim();
    
    console.log('🔍 BÚSQUEDA: ID original recibido:', publicId);
    console.log('🔍 BÚSQUEDA: ID normalizado para buscar:', normalizedId);
    
    if (normalizedId.length !== 6) {
      throw new Error('El ID de la academia debe tener exactamente 6 caracteres');
    }

    const academiasRef = collection(db, 'academias');
    const q = query(
      academiasRef, 
      where("publicId", "==", normalizedId),
      where("activa", "==", true)
    );
    
    console.log('🔍 BÚSQUEDA: Ejecutando query con filtros:', {
      publicId: normalizedId,
      activa: true
    });
    
    const querySnapshot = await getDocs(q);
    
    console.log('🔍 BÚSQUEDA: Resultados encontrados:', querySnapshot.size);
    
    // Debug: Buscar en TODAS las academias para ver qué publicIds existen
    const allAcademiasRef = collection(db, 'academias');
    const allSnapshot = await getDocs(allAcademiasRef);
    console.log('🔍 DEBUG: Todos los publicIds en la BD:');
    allSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`  📋 ${doc.id}: publicId="${data.publicId}", activa=${data.activa}, nombre="${data.nombre}"`);
    });

    if (querySnapshot.empty) {
      console.log('❌ No se encontraron academias con ese publicId');
      return null;
    }

    const docSnap = querySnapshot.docs[0];
    const academiaData = docSnap.data() as Academia;
    console.log('✅ Academia encontrada:', { 
      id: docSnap.id, 
      nombre: academiaData.nombre, 
      tipo: academiaData.tipo, 
      publicId: (academiaData as any).publicId 
    });

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
    console.error('Error en crearSolicitudUnion:', error);
    return { success: false, message: 'Error al procesar solicitud' };
  }
};// ✅ OBTENER SOLICITUDES PENDIENTES (PARA DIRECTORES)
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
    // Usar transacción para garantizar consistencia
    const result = await runTransaction(db, async (transaction) => {
      // ===== FASE 1: TODAS LAS LECTURAS PRIMERO =====
      const solicitudRef = doc(db, 'academias', academiaId, 'solicitudes', solicitudId);
      
      // Leer solicitud
      const solicitudDoc = await transaction.get(solicitudRef);
      if (!solicitudDoc.exists()) {
        throw new Error('Solicitud no encontrada');
      }
      
      const solicitud = solicitudDoc.data() as JoinRequest;
      if (solicitud.status !== 'pending') {
        throw new Error('Solicitud ya fue procesada');
      }
      
      // Variables para datos que necesitaremos
      let academiaData = null;
      let userAcademiasData = null;
      
      // Leer academia y userAcademias solo si se va a aprobar
      if (action === 'approve') {
        const academiaRef = doc(db, 'academias', academiaId);
        const academiaDoc = await transaction.get(academiaRef);
        if (!academiaDoc.exists()) {
          throw new Error('Academia no encontrada');
        }
        academiaData = academiaDoc.data();
        
        const userAcademiasRef = doc(db, 'userAcademias', solicitud.userId);
        const userAcademiasDoc = await transaction.get(userAcademiasRef);
        userAcademiasData = userAcademiasDoc.exists() ? userAcademiasDoc.data() : null;
      }
      
      // ===== FASE 2: TODAS LAS ESCRITURAS DESPUÉS =====
      
      // Actualizar estado de la solicitud
      transaction.update(solicitudRef, {
        status: action === 'approve' ? 'approved' : 'rejected',
        processedAt: new Date().toISOString(),
        processedBy: processorId
      });
      
      // Si se aprueba, realizar todas las escrituras
      if (action === 'approve' && academiaData) {
        // Agregar usuario a la subcolección usuarios
        const userRef = doc(db, 'academias', academiaId, 'usuarios', solicitud.userId);
        transaction.set(userRef, {
          userId: solicitud.userId,
          userEmail: solicitud.userEmail,
          userName: solicitud.userName || solicitud.userEmail,
          role: 'academyCoach',
          joinedAt: new Date(),
          invitedBy: processorId
        });
        
        // Actualizar userAcademias
        const userAcademiasRef = doc(db, 'userAcademias', solicitud.userId);
        const nuevoAcceso = {
          academiaId: academiaId,
          nombre: academiaData.nombre,
          id: academiaData.id,
          role: 'academyCoach' as const
        };
        
        if (userAcademiasData) {
          const academias = userAcademiasData.academias || [];
          // Verificar si ya existe para evitar duplicados
          const existeAcceso = academias.some((a: any) => a.academiaId === academiaId);
          if (!existeAcceso) {
            academias.push(nuevoAcceso);
            transaction.update(userAcademiasRef, {
              academias,
              ultimaActualizacion: new Date().toISOString()
            });
          }
        } else {
          transaction.set(userAcademiasRef, {
            academias: [nuevoAcceso],
            ultimaActualizacion: new Date().toISOString()
          });
        }
      }
      
      return {
        success: true,
        message: action === 'approve' ? 'Usuario agregado exitosamente' : 'Solicitud rechazada'
      };
    });
    
    return result;
  } catch (error: any) {
    console.error('Error procesando solicitud:', error);
    return {
      success: false,
      message: error.message || 'Error procesando solicitud'
    };
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