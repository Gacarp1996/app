import { db } from "../firebase/firebase-config";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc, query, where, writeBatch } from "firebase/firestore";
import { TrainingSession } from "../types/types";

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

export const addSession = async (academiaId: string, sessionData: Omit<TrainingSession, "id">) => {
  try {
    if (!sessionData.entrenadorId) {
      throw new Error('El ID del entrenador es requerido');
    }

    if (!sessionData.jugadorId) {
      throw new Error('El ID del jugador es requerido');
    }

    const cleanedSessionData = cleanData(sessionData);
    
    if (!cleanedSessionData || Object.keys(cleanedSessionData).length === 0) {
      throw new Error('No hay datos válidos para guardar');
    }

    console.log('📝 Datos a guardar (después de limpieza):', cleanedSessionData);
    
    const sessionsCollection = collection(db, "academias", academiaId, "sessions");
    const docRef = await addDoc(sessionsCollection, cleanedSessionData);
    console.log("✅ Sesión agregada con ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("❌ Error al agregar sesión:", error);
    throw error;
  }
};

// ✅ NUEVA FUNCIÓN OPTIMIZADA: Agregar múltiples sesiones en batch
export const addSessionsBatch = async (
  academiaId: string, 
  sessions: Omit<TrainingSession, "id">[]
): Promise<string[]> => {
  try {
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
    console.log(`✅ ${sessions.length} sesiones agregadas en batch`);
    return sessionIds;
  } catch (error) {
    console.error("❌ Error al agregar sesiones en batch:", error);
    throw error;
  }
};

export const getSessions = async (academiaId: string): Promise<TrainingSession[]> => {
  try {
    console.log('🔍 FIREBASE: Consultando sesiones para academia:', academiaId);
    
    const sessionsCollection = collection(db, "academias", academiaId, "sessions");
    const querySnapshot = await getDocs(sessionsCollection);
    
    console.log('🔍 FIREBASE: Documentos encontrados en Firestore:', querySnapshot.docs.length);
    
    const sessions: TrainingSession[] = querySnapshot.docs.map((doc) => {
      const data = doc.data() as Omit<TrainingSession, "id">;
      const session = {
        id: doc.id,
        ...data,
      };
      
      // Log detallado de cada sesión
      const minutosAtras = Math.round((Date.now() - new Date(session.fecha).getTime()) / (1000 * 60));
      console.log(`🔍 FIREBASE: Sesión ${doc.id}:`, {
        jugadorId: session.jugadorId,
        entrenadorId: session.entrenadorId,
        fecha: session.fecha,
        minutosAtras: minutosAtras,
        esReciente: minutosAtras < 30
      });
      
      return session;
    });
    
    // Resumen por jugador
    const jugadoresUnicos = [...new Set(sessions.map(s => s.jugadorId))];
    console.log('🔍 FIREBASE: Resumen por jugador:', 
      jugadoresUnicos.map(jugadorId => ({
        jugadorId,
        sesiones: sessions.filter(s => s.jugadorId === jugadorId).length,
        fechaMasReciente: sessions
          .filter(s => s.jugadorId === jugadorId)
          .map(s => s.fecha)
          .sort()
          .slice(-1)[0]
      }))
    );
    
    console.log("📊 FIREBASE: Total sesiones obtenidas:", sessions.length);
    return sessions;
  } catch (error) {
    console.error("❌ Error al obtener sesiones:", error);
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
    console.error("❌ Error al obtener sesiones por entrenador:", error);
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
    console.error("❌ Error al obtener sesiones por fecha:", error);
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
    console.error("❌ Error al obtener sesiones por entrenador y fecha:", error);
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
    
    console.log(`📊 Jugadores entrenados por coach ${coachId}: ${trainedPlayers.length}`);
    return trainedPlayers;
    
  } catch (error) {
    console.error("❌ Error al obtener jugadores entrenados por coach:", error);
    return [];
  }
};

export const deleteSession = async (academiaId: string, sessionId: string): Promise<void> => {
  try {
    if (!sessionId) {
      throw new Error('ID de sesión no proporcionado');
    }

    console.log('🗑️ Intentando eliminar sesión con ID:', sessionId);

    const sessionDoc = doc(db, "academias", academiaId, "sessions", sessionId);
    await deleteDoc(sessionDoc);

    console.log("✅ Sesión eliminada exitosamente:", sessionId);
  } catch (error) {
    console.error("❌ Error al eliminar la sesión:", error);
    throw error;
  }
};

export const updateSession = async (academiaId: string, sessionId: string, updates: Partial<Omit<TrainingSession, "id">>): Promise<void> => {
  try {
    if (!sessionId) {
      throw new Error('ID de sesión no proporcionado');
    }

    const cleanedUpdates = cleanData(updates);

    const sessionDoc = doc(db, "academias", academiaId, "sessions", sessionId);
    await updateDoc(sessionDoc, cleanedUpdates);

    console.log("✅ Sesión actualizada exitosamente:", sessionId);
  } catch (error) {
    console.error("❌ Error al actualizar la sesión:", error);
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
    console.error("❌ Error al obtener sesión por ID:", error);
    return null;
  }
};

// ✅ NUEVA FUNCIÓN: Eliminar múltiples sesiones en batch
export const deleteSessionsBatch = async (academiaId: string, sessionIds: string[]): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    sessionIds.forEach((sessionId) => {
      const sessionDoc = doc(db, "academias", academiaId, "sessions", sessionId);
      batch.delete(sessionDoc);
    });
    
    await batch.commit();
    console.log(`✅ ${sessionIds.length} sesiones eliminadas en batch`);
  } catch (error) {
    console.error("❌ Error al eliminar sesiones en batch:", error);
    throw error;
  }
};