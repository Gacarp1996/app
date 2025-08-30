import { db } from "../firebase/firebase-config";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc, query, where, writeBatch } from "firebase/firestore";
import { TrainingSession, Academia, TipoEntidad } from "../types/types";
// ✅ AGREGADO: Importar funciones de roles para registro
import { getUserRoleInAcademia, addUserToAcademia, UserRole } from "../Database/FirebaseRoles";
import { obtenerAcademiaPorId } from "../Database/FirebaseAcademias";

// ✅ CACHE GLOBAL para evitar múltiples registros del mismo usuario
const registrationCache = new Map<string, Promise<UserRole | null>>();
const CACHE_EXPIRY = 60000; // 1 minuto

// ✅ FUNCIÓN HELPER PARA DETERMINAR TIPO DE ENTIDAD
const getEntityType = (academiaData: Academia | null): TipoEntidad => {
  if (academiaData?.tipo) {
    return academiaData.tipo;
  }
  return 'academia';
};

// ✅ FUNCIÓN HELPER: Asegurar que el usuario esté registrado en la academia con verificación
const ensureUserRegistration = async (
  academiaId: string, 
  userId: string, 
  userEmail: string, 
  userName: string
): Promise<UserRole | null> => {
  const cacheKey = `${academiaId}-${userId}`;
  
  // Verificar cache primero
  if (registrationCache.has(cacheKey)) {
    console.log(`Usando registro en cache para usuario ${userId} en academia ${academiaId}`);
    return await registrationCache.get(cacheKey)!;
  }

  // Crear promesa de registro CON VERIFICACIÓN y guardar en cache
  const registrationPromise = performUserRegistrationWithVerification(academiaId, userId, userEmail, userName);
  registrationCache.set(cacheKey, registrationPromise);
  
  // Limpiar cache después de expiración
  setTimeout(() => {
    registrationCache.delete(cacheKey);
  }, CACHE_EXPIRY);
  
  return await registrationPromise;
};

// ✅ FUNCIÓN MEJORADA: Registrar usuario y VERIFICAR que se propagó
const performUserRegistrationWithVerification = async (
  academiaId: string, 
  userId: string, 
  userEmail: string, 
  userName: string
): Promise<UserRole | null> => {
  try {
    console.log(`Verificando/registrando usuario ${userId} en academia ${academiaId}`);
    
    // PASO 1: Verificar si ya tiene rol (múltiples intentos por si hay latencia)
    let role: UserRole | null = null;
    for (let checkAttempt = 1; checkAttempt <= 3; checkAttempt++) {
      role = await getUserRoleInAcademia(academiaId, userId);
      if (role) {
        console.log(`Usuario ${userId} ya tiene rol: ${role}`);
        return role;
      }
      if (checkAttempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`Usuario ${userId} no tiene rol, procediendo a registrar...`);
    
    // PASO 2: Obtener datos de la academia para asignar rol correcto
    const academiaData = await obtenerAcademiaPorId(academiaId);
    
    if (!academiaData) {
      throw new Error(`No se encontró la academia ${academiaId}`);
    }
    
    const entityType = getEntityType(academiaData);
    
    if (academiaData.creadorId === userId) {
      role = entityType === 'grupo-entrenamiento' ? 'groupCoach' : 'academyDirector';
    } else {
      role = entityType === 'grupo-entrenamiento' ? 'assistantCoach' : 'academyCoach';
    }
    
    console.log(`Asignando rol ${role} a usuario ${userId}`);
    
    // PASO 3: Registrar en Firestore CON RETRY
    let registrationSuccess = false;
    for (let regAttempt = 1; regAttempt <= 3; regAttempt++) {
      try {
        await addUserToAcademia(academiaId, userId, userEmail, role, userName);
        registrationSuccess = true;
        console.log(`Usuario ${userId} registrado exitosamente con rol: ${role} (intento ${regAttempt})`);
        break;
      } catch (error) {
        console.warn(`Intento ${regAttempt} de registro falló:`, error);
        if (regAttempt === 3) throw error;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (!registrationSuccess) {
      throw new Error('No se pudo completar el registro después de 3 intentos');
    }
    
    // PASO 4: CRÍTICO - Verificar propagación con backoff exponencial y más intentos
    console.log(`Verificando propagación de permisos para usuario ${userId}...`);
    
    for (let attempt = 1; attempt <= 12; attempt++) {
      // Backoff exponencial: 100, 200, 400, 800ms, luego 1s constante
      const delay = attempt <= 4 ? 100 * Math.pow(2, attempt - 1) : 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const verifiedRole = await getUserRoleInAcademia(academiaId, userId);
      if (verifiedRole === role) {
        console.log(`✓ Verificación exitosa en intento ${attempt} (${delay}ms) para usuario ${userId}`);
        return verifiedRole;
      }
      
      if (attempt % 3 === 0) {
        console.log(`... aún verificando permisos (intento ${attempt}/12)...`);
      }
    }
    
    // Si llegamos aquí, la verificación falló
    console.error(`✗ Registro no se verificó después de 12 intentos (max ~10s) para usuario ${userId}`);
    throw new Error(`El registro no se propagó correctamente después de múltiples intentos`);
    
  } catch (error) {
    console.error(`Error en registro completo para usuario ${userId}:`, error);
    return null;
  }
};

// ✅ FUNCIÓN HELPER PARA LIMPIAR DATOS UNDEFINED
const cleanData = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(cleanData).filter(item => item !== null && item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        const cleanedValue = cleanData(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
    }
    return cleaned;
  }
  
  return obj;
};

// ✅ FUNCIÓN PRINCIPAL CON REGISTRO DE USUARIO Y VERIFICACIÓN
export const addSession = async (
  academiaId: string, 
  sessionData: Omit<TrainingSession, "id">,
  currentUser?: { uid: string; email?: string | null; displayName?: string | null }
) => {
  try {
    if (!sessionData.entrenadorId) {
      throw new Error('El ID del entrenador es requerido');
    }

    if (!sessionData.jugadorId) {
      throw new Error('El ID del jugador es requerido');
    }

    // ✅ CRÍTICO: Asegurar registro del usuario ANTES de crear sesión
    if (currentUser) {
      const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario Anónimo';
      const userRole = await ensureUserRegistration(
        academiaId,
        currentUser.uid,
        currentUser.email || 'no-email-provided',
        userName
      );

      if (!userRole) {
        throw new Error('No se pudo registrar el usuario en la academia');
      }

      console.log(`Usuario registrado para crear sesión con rol: ${userRole}, procediendo a guardar`);
    }

    const cleanedSessionData = cleanData(sessionData);
    
    if (!cleanedSessionData || Object.keys(cleanedSessionData).length === 0) {
      throw new Error('No hay datos válidos para guardar');
    }

    const sessionsCollection = collection(db, "academias", academiaId, "sessions");
    const docRef = await addDoc(sessionsCollection, cleanedSessionData);
    
    console.log(`Sesión guardada exitosamente con ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error en addSession:', error);
    throw error;
  }
};

// ✅ FUNCIÓN OPTIMIZADA CON REGISTRO: Agregar múltiples sesiones en batch
export const addSessionsBatch = async (
  academiaId: string, 
  sessions: Omit<TrainingSession, "id">[],
  currentUser?: { uid: string; email?: string | null; displayName?: string | null }
): Promise<string[]> => {
  try {
    // ✅ CRÍTICO: Asegurar registro del usuario ANTES de crear sesiones en batch
    if (currentUser && sessions.length > 0) {
      const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario Anónimo';
      const userRole = await ensureUserRegistration(
        academiaId,
        currentUser.uid,
        currentUser.email || 'no-email-provided',
        userName
      );

      if (!userRole) {
        throw new Error('No se pudo registrar el usuario en la academia');
      }

      console.log(`Usuario registrado para batch de sesiones con rol: ${userRole}, procediendo a guardar ${sessions.length} sesiones`);
    }

    const batch = writeBatch(db);
    const sessionIds: string[] = [];
    const sessionsCollection = collection(db, "academias", academiaId, "sessions");
    
    sessions.forEach((sessionData) => {
      // Validaciones
      if (!sessionData.entrenadorId) {
        throw new Error('El ID del entrenador es requerido');
      }
      if (!sessionData.jugadorId) {
        throw new Error('El ID del jugador es requerido');
      }
      
      const cleanedData = cleanData(sessionData);
      const docRef = doc(sessionsCollection);
      batch.set(docRef, cleanedData);
      sessionIds.push(docRef.id);
    });
    
    await batch.commit();
    console.log(`Batch de ${sessions.length} sesiones guardado exitosamente`);
    return sessionIds;
  } catch (error) {
    console.error('Error en addSessionsBatch:', error);
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
    
    return sessions;
  } catch (error) {
    console.error('Error obteniendo sesiones:', error);
    return [];
  }
};

export const getSessionsByTrainer = async (academiaId: string, trainerId: string): Promise<TrainingSession[]> => {
  try {
    const sessionsCollection = collection(db, "academias", academiaId, "sessions");
    const q = query(sessionsCollection, where("entrenadorId", "==", trainerId));
    const querySnapshot = await getDocs(q);
    
    const sessions: TrainingSession[] = querySnapshot.docs.map((doc) => {
      const data = doc.data() as Omit<TrainingSession, "id">;
      return {
        id: doc.id,
        ...data,
      };
    });
    
    return sessions;
  } catch (error) {
    console.error('Error obteniendo sesiones por entrenador:', error);
    return [];
  }
};

export const getSessionsByDate = async (academiaId: string, date: string): Promise<TrainingSession[]> => {
  try {
    const sessionsCollection = collection(db, "academias", academiaId, "sessions");
    const querySnapshot = await getDocs(sessionsCollection);
    
    const sessions: TrainingSession[] = querySnapshot.docs
      .map((doc) => {
        const data = doc.data() as Omit<TrainingSession, "id">;
        return {
          id: doc.id,
          ...data,
        };
      })
      .filter(session => session.fecha.startsWith(date));
    
    return sessions;
  } catch (error) {
    console.error('Error obteniendo sesiones por fecha:', error);
    return [];
  }
};

export const getSessionsByTrainerAndDate = async (
  academiaId: string, 
  trainerId: string, 
  date: string
): Promise<TrainingSession[]> => {
  try {
    const sessionsCollection = collection(db, "academias", academiaId, "sessions");
    const q = query(sessionsCollection, where("entrenadorId", "==", trainerId));
    const querySnapshot = await getDocs(q);
    
    const sessions: TrainingSession[] = querySnapshot.docs
      .map((doc) => {
        const data = doc.data() as Omit<TrainingSession, "id">;
        return {
          id: doc.id,
          ...data,
        };
      })
      .filter(session => session.fecha.startsWith(date));
    
    return sessions;
  } catch (error) {
    console.error('Error obteniendo sesiones por entrenador y fecha:', error);
    return [];
  }
};

export const getTrainedPlayersByCoach = async (
  academiaId: string,
  coachId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  playerId: string;
  sessionCount: number;
  lastSessionDate: string;
  totalExercises: number;
}[]> => {
  try {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const sessionsCollection = collection(db, "academias", academiaId, "sessions");
    const q = query(sessionsCollection, where("entrenadorId", "==", coachId));
    const querySnapshot = await getDocs(q);
    
    const playerSessionsMap = new Map<string, {
      sessions: TrainingSession[];
      lastSessionDate: string;
      totalExercises: number;
    }>();
    
    querySnapshot.docs.forEach((doc) => {
      const session = {
        id: doc.id,
        ...doc.data()
      } as TrainingSession;
      
      const sessionDate = session.fecha.split('T')[0];
      
      if (sessionDate >= startDateStr && sessionDate <= endDateStr) {
        const playerData = playerSessionsMap.get(session.jugadorId) || {
          sessions: [],
          lastSessionDate: '',
          totalExercises: 0
        };
        
        playerData.sessions.push(session);
        playerData.totalExercises += session.ejercicios?.length || 0;
        
        if (!playerData.lastSessionDate || session.fecha > playerData.lastSessionDate) {
          playerData.lastSessionDate = session.fecha;
        }
        
        playerSessionsMap.set(session.jugadorId, playerData);
      }
    });
    
    const trainedPlayers = Array.from(playerSessionsMap.entries()).map(([playerId, data]) => ({
      playerId,
      sessionCount: data.sessions.length,
      lastSessionDate: data.lastSessionDate,
      totalExercises: data.totalExercises
    }));
    
    trainedPlayers.sort((a, b) => b.sessionCount - a.sessionCount);
    
    return trainedPlayers;
    
  } catch (error) {
    console.error('Error obteniendo jugadores entrenados por coach:', error);
    return [];
  }
};

// ✅ FUNCIÓN CON REGISTRO: Actualizar sesión
export const updateSession = async (
  academiaId: string, 
  sessionId: string, 
  updates: Partial<Omit<TrainingSession, "id">>,
  currentUser?: { uid: string; email?: string | null; displayName?: string | null }
): Promise<void> => {
  try {
    if (!sessionId) {
      throw new Error('ID de sesión no proporcionado');
    }

    // ✅ CRÍTICO: Asegurar registro del usuario ANTES de actualizar sesión
    if (currentUser) {
      const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario Anónimo';
      const userRole = await ensureUserRegistration(
        academiaId,
        currentUser.uid,
        currentUser.email || 'no-email-provided',
        userName
      );

      if (!userRole) {
        throw new Error('No se pudo registrar el usuario en la academia');
      }

      console.log(`Usuario registrado para actualizar sesión con rol: ${userRole}`);
    }

    const cleanedUpdates = cleanData(updates);
    const sessionDoc = doc(db, "academias", academiaId, "sessions", sessionId);
    await updateDoc(sessionDoc, cleanedUpdates);
    
    console.log(`Sesión ${sessionId} actualizada exitosamente`);
  } catch (error) {
    console.error('Error en updateSession:', error);
    throw error;
  }
};

export const deleteSession = async (academiaId: string, sessionId: string): Promise<void> => {
  try {
    if (!sessionId) {
      throw new Error('ID de sesión no proporcionado');
    }

    const sessionDoc = doc(db, "academias", academiaId, "sessions", sessionId);
    await deleteDoc(sessionDoc);
    
    console.log(`Sesión ${sessionId} eliminada exitosamente`);
  } catch (error) {
    console.error('Error en deleteSession:', error);
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
    console.error('Error obteniendo sesión por ID:', error);
    return null;
  }
};

// ✅ FUNCIÓN: Eliminar múltiples sesiones en batch
export const deleteSessionsBatch = async (academiaId: string, sessionIds: string[]): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    sessionIds.forEach((sessionId) => {
      const sessionDoc = doc(db, "academias", academiaId, "sessions", sessionId);
      batch.delete(sessionDoc);
    });
    
    await batch.commit();
    console.log(`Batch de ${sessionIds.length} sesiones eliminado exitosamente`);
  } catch (error) {
    console.error('Error en deleteSessionsBatch:', error);
    throw error;
  }
};