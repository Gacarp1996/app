import { db } from "../firebase/firebase-config";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, getDoc, query, where } from "firebase/firestore";
import { TrainingSession } from "../types";

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
    // ✅ VALIDAR QUE entrenadorId esté presente
    if (!sessionData.entrenadorId) {
      throw new Error('El ID del entrenador es requerido');
    }

    // ✅ VALIDAR QUE jugadorId esté presente
    if (!sessionData.jugadorId) {
      throw new Error('El ID del jugador es requerido');
    }

    // ✅ LIMPIAR TODOS LOS VALORES UNDEFINED RECURSIVAMENTE
    const cleanedSessionData = cleanData(sessionData);
    
    // ✅ VALIDAR QUE QUEDARON DATOS DESPUÉS DE LA LIMPIEZA
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
    console.log("📊 Sesiones obtenidas:", sessions.length);
    return sessions;
  } catch (error) {
    console.error("❌ Error al obtener sesiones:", error);
    return [];
  }
};

// NUEVA FUNCIÓN: Obtener sesiones por entrenador
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

// NUEVA FUNCIÓN: Obtener sesiones de una fecha específica
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
      .filter(session => session.fecha.startsWith(date)); // Filtrar por fecha
    
    return sessions;
  } catch (error) {
    console.error("❌ Error al obtener sesiones por fecha:", error);
    return [];
  }
};

// NUEVA FUNCIÓN: Obtener sesiones por entrenador y fecha
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
      .filter(session => session.fecha.startsWith(date)); // Filtrar por fecha
    
    return sessions;
  } catch (error) {
    console.error("❌ Error al obtener sesiones por entrenador y fecha:", error);
    return [];
  }
};

// NUEVA FUNCIÓN: Obtener jugadores únicos entrenados por un coach en un rango de fechas
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
    // Convertir fechas a strings ISO para comparación
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Obtener todas las sesiones del coach
    const sessionsCollection = collection(db, "academias", academiaId, "sessions");
    const q = query(sessionsCollection, where("entrenadorId", "==", coachId));
    const querySnapshot = await getDocs(q);
    
    // Filtrar por rango de fechas y agrupar por jugador
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
      
      // Extraer solo la fecha (YYYY-MM-DD) para comparación
      const sessionDate = session.fecha.split('T')[0];
      
      // Verificar si la sesión está dentro del rango de fechas
      if (sessionDate >= startDateStr && sessionDate <= endDateStr) {
        const playerData = playerSessionsMap.get(session.jugadorId) || {
          sessions: [],
          lastSessionDate: '',
          totalExercises: 0
        };
        
        playerData.sessions.push(session);
        playerData.totalExercises += session.ejercicios?.length || 0;
        
        // Actualizar la última fecha de sesión
        if (!playerData.lastSessionDate || session.fecha > playerData.lastSessionDate) {
          playerData.lastSessionDate = session.fecha;
        }
        
        playerSessionsMap.set(session.jugadorId, playerData);
      }
    });
    
    // Convertir el Map a array con el formato deseado
    const trainedPlayers = Array.from(playerSessionsMap.entries()).map(([playerId, data]) => ({
      playerId,
      sessionCount: data.sessions.length,
      lastSessionDate: data.lastSessionDate,
      totalExercises: data.totalExercises
    }));
    
    // Ordenar por cantidad de sesiones (descendente)
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

    // ✅ LIMPIAR DATOS UNDEFINED TAMBIÉN EN ACTUALIZACIONES
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