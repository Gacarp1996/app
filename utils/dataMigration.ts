import { db } from "../firebase/firebase-config";
import { collection, getDocs, doc, updateDoc, writeBatch } from "firebase/firestore";

/**
 * Migra sesiones existentes que tienen ejercicios con area="Fondo" 
 * para cambiarlos a area="Juego de base"
 */
export const migrateSessionsFondoToJuegoDeBase = async (academiaId: string): Promise<{ success: boolean; migratedSessions: number; migratedExercises: number; errors: any[] }> => {
  try {
    console.log(`🔄 Iniciando migración de sesiones para academia: ${academiaId}`);
    
    const sessionsCollection = collection(db, "academias", academiaId, "sessions");
    const sessionsSnapshot = await getDocs(sessionsCollection);
    
    let migratedSessions = 0;
    let migratedExercises = 0;
    const errors: any[] = [];
    
    // Usar batch para optimizar las escrituras
    const batch = writeBatch(db);
    let batchOperations = 0;
    const MAX_BATCH_SIZE = 500; // Límite de Firestore
    
    for (const sessionDoc of sessionsSnapshot.docs) {
      const sessionData = sessionDoc.data();
      let sessionNeedsMigration = false;
      
      // Verificar si hay ejercicios con area="Fondo"
      if (sessionData.ejercicios && Array.isArray(sessionData.ejercicios)) {
        const updatedEjercicios = sessionData.ejercicios.map((ejercicio: any) => {
          if (ejercicio.area === "Fondo") {
            console.log(`📝 Migrando ejercicio: ${ejercicio.ejercicio || ejercicio.name || 'Sin nombre'} de "Fondo" a "Juego de base"`);
            migratedExercises++;
            sessionNeedsMigration = true;
            return {
              ...ejercicio,
              area: "Juego de base"
            };
          }
          return ejercicio;
        });
        
        if (sessionNeedsMigration) {
          const sessionRef = doc(db, "academias", academiaId, "sessions", sessionDoc.id);
          batch.update(sessionRef, { ejercicios: updatedEjercicios });
          batchOperations++;
          migratedSessions++;
          
          // Ejecutar batch si llegamos al límite
          if (batchOperations >= MAX_BATCH_SIZE) {
            await batch.commit();
            console.log(`✅ Batch ejecutado: ${batchOperations} operaciones`);
            batchOperations = 0;
          }
        }
      }
    }
    
    // Ejecutar el batch final si hay operaciones pendientes
    if (batchOperations > 0) {
      await batch.commit();
      console.log(`✅ Batch final ejecutado: ${batchOperations} operaciones`);
    }
    
    console.log(`✅ Migración completada: ${migratedSessions} sesiones y ${migratedExercises} ejercicios migrados`);
    
    return {
      success: true,
      migratedSessions,
      migratedExercises,
      errors
    };
    
  } catch (error) {
    console.error("❌ Error durante la migración:", error);
    return {
      success: false,
      migratedSessions: 0,
      migratedExercises: 0,
      errors: [error]
    };
  }
};

/**
 * Función para verificar cuántas sesiones necesitan migración sin modificarlas
 */
export const checkSessionsNeedingMigration = async (academiaId: string): Promise<{ sessionsWithFondo: number; exercisesWithFondo: number }> => {
  try {
    const sessionsCollection = collection(db, "academias", academiaId, "sessions");
    const sessionsSnapshot = await getDocs(sessionsCollection);
    
    let sessionsWithFondo = 0;
    let exercisesWithFondo = 0;
    
    for (const sessionDoc of sessionsSnapshot.docs) {
      const sessionData = sessionDoc.data();
      let sessionHasFondo = false;
      
      if (sessionData.ejercicios && Array.isArray(sessionData.ejercicios)) {
        for (const ejercicio of sessionData.ejercicios) {
          if (ejercicio.area === "Fondo") {
            exercisesWithFondo++;
            if (!sessionHasFondo) {
              sessionHasFondo = true;
              sessionsWithFondo++;
            }
          }
        }
      }
    }
    
    return { sessionsWithFondo, exercisesWithFondo };
  } catch (error) {
    console.error("Error verificando sesiones que necesitan migración:", error);
    return { sessionsWithFondo: 0, exercisesWithFondo: 0 };
  }
};
