// Database/FirebaseRoles.ts
import { db } from "../firebase/firebase-config";
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, query, where, serverTimestamp, writeBatch } from "firebase/firestore";

// ACTUALIZADO: Nuevos roles del sistema
export type UserRole = 'academyDirector' | 'academySubdirector' | 'academyCoach' | 'groupCoach' | 'assistantCoach';

// Para mantener compatibilidad temporal durante la migración
export type LegacyUserRole = 'director' | 'subdirector' | 'entrenador';

export interface AcademiaUser {
  userId: string;
  userEmail: string;
  userName?: string;
  role: UserRole;
  joinedAt: Date;
  invitedBy?: string;
}

export interface AcademiaWithRole {
  academiaId: string;
  nombre: string;
  id: string; // ID público de 6 caracteres
  role: UserRole;
}

// Función helper para convertir roles legacy a nuevos (útil durante la transición)
export const convertLegacyRole = (legacyRole: string): UserRole => {
  switch (legacyRole) {
    case 'director':
      return 'academyDirector';
    case 'subdirector':
      return 'academySubdirector';
    case 'entrenador':
      return 'academyCoach';
    default:
      // Por defecto, asignar academyCoach si no se reconoce el rol
      return 'academyCoach';
  }
};

// Agregar un usuario a una academia con un rol específico
export const addUserToAcademia = async (
  academiaId: string,
  userId: string,
  userEmail: string,
  role: UserRole,
  userName?: string,
  invitedBy?: string
): Promise<void> => {
  try {
    const userRef = doc(db, "academias", academiaId, "usuarios", userId);
    await setDoc(userRef, {
      userId,
      userEmail,
      userName: userName || userEmail.split('@')[0],
      role,
      joinedAt: serverTimestamp(),
      invitedBy: invitedBy || null
    });
  } catch (error) {
   
    throw error;
  }
};

// Obtener el rol de un usuario en una academia específica
export const getUserRoleInAcademia = async (
  academiaId: string,
  userId: string
): Promise<UserRole | null> => {
  try {
    const userRef = doc(db, "academias", academiaId, "usuarios", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      // Verificar si es un rol legacy y convertirlo
      const role = data.role as string;
      if (['director', 'subdirector', 'entrenador'].includes(role)) {
        // Si encontramos un rol legacy, lo convertimos
        return convertLegacyRole(role);
      }
      return role as UserRole;
    }
    return null;
  } catch (error: any) {
    // Solo loguear si NO es un error de permisos esperado
    if (!error.message?.includes('Missing or insufficient permissions')) {
 
    }
    return null;
  }
};

// Obtener todos los usuarios de una academia
export const getAcademiaUsers = async (academiaId: string): Promise<AcademiaUser[]> => {
  try {
    const usersRef = collection(db, "academias", academiaId, "usuarios");
    const snapshot = await getDocs(usersRef);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // Convertir rol legacy si es necesario
      const role = data.role as string;
      const finalRole = ['director', 'subdirector', 'entrenador'].includes(role) 
        ? convertLegacyRole(role) 
        : role as UserRole;
      
      return {
        ...data,
        role: finalRole,
        joinedAt: data.joinedAt?.toDate() || new Date()
      } as AcademiaUser;
    });
  } catch (error) {
    
    return [];
  }
};

// Actualizar el rol de un usuario
export const updateUserRole = async (
  academiaId: string,
  userId: string,
  newRole: UserRole
): Promise<void> => {
  try {
    const userRef = doc(db, "academias", academiaId, "usuarios", userId);
    await updateDoc(userRef, { role: newRole });
  } catch (error) {

    throw error;
  }
};

// ✅ ELIMINAR UN USUARIO DE UNA ACADEMIA - VERSIÓN CORREGIDA
export const removeUserFromAcademia = async (
  academiaId: string,
  userId: string
): Promise<void> => {
  try {
    // 1. Eliminar de la subcolección usuarios
    const userRef = doc(db, "academias", academiaId, "usuarios", userId);
    await deleteDoc(userRef);

    
    // 2. CORREGIDO: Actualizar userAcademias para quitar esta academia
    const userAcademiasRef = doc(db, "userAcademias", userId);
    const userAcademiasDoc = await getDoc(userAcademiasRef);
    
    if (userAcademiasDoc.exists()) {
      const data = userAcademiasDoc.data();
      const academiasActuales = data.academias || [];
      const academiasActualizadas = academiasActuales.filter(
        (a: any) => a.academiaId !== academiaId
      );
      
      
      
      if (academiasActualizadas.length > 0) {
        // Si quedan academias, actualizar el documento
        await updateDoc(userAcademiasRef, {
          academias: academiasActualizadas,
          ultimaActualizacion: serverTimestamp()
        });

      } else {
        // Si no quedan academias, eliminar el documento completo
        await deleteDoc(userAcademiasRef);

      }
    } else {

    }
    

    
  } catch (error) {

    throw error;
  }
};

// Obtener todas las academias donde un usuario tiene un rol
export const getUserAcademias = async (userId: string): Promise<AcademiaWithRole[]> => {
  try {
    const academiasSnapshot = await getDocs(collection(db, "academias"));
    const userAcademias: AcademiaWithRole[] = [];
    
    for (const academiaDoc of academiasSnapshot.docs) {
      const userRef = doc(db, "academias", academiaDoc.id, "usuarios", userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const academiaData = academiaDoc.data();
        const userData = userDoc.data();
        
        // Convertir rol legacy si es necesario
        const role = userData.role as string;
        const finalRole = ['director', 'subdirector', 'entrenador'].includes(role) 
          ? convertLegacyRole(role) 
          : role as UserRole;
        
        userAcademias.push({
          academiaId: academiaDoc.id,
          nombre: academiaData.nombre,
          id: academiaData.id,
          role: finalRole
        });
      }
    }
    
    return userAcademias;
  } catch (error) {
 
    return [];
  }
};

// Verificar si un usuario puede realizar acciones de gestión
export const canManageAcademia = async (
  academiaId: string,
  userId: string
): Promise<boolean> => {
  const role = await getUserRoleInAcademia(academiaId, userId);
  // ACTUALIZADO: Nuevos roles que pueden gestionar la academia
  return role === 'academyDirector' || role === 'academySubdirector';
};

// Contar directores en una academia
export const countDirectors = async (academiaId: string): Promise<number> => {
  try {
    const usersRef = collection(db, "academias", academiaId, "usuarios");
    // ACTUALIZADO: Buscar tanto el rol nuevo como el legacy
    const q1 = query(usersRef, where("role", "==", "academyDirector"));
    const q2 = query(usersRef, where("role", "==", "director")); // Por compatibilidad
    
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ]);
    
    return snapshot1.size + snapshot2.size;
  } catch (error) {
  
    return 0;
  }
};

// ✅ NUEVA: Verificar si un director puede abandonar la academia
export const canDirectorLeaveAcademia = async (
  academiaId: string,
  userId: string
): Promise<{ canLeave: boolean; directorCount: number; message: string }> => {
  try {
    // Verificar rol del usuario
    const userRole = await getUserRoleInAcademia(academiaId, userId);
    
    // Si no es director, puede abandonar sin restricciones
    if (userRole !== 'academyDirector') {
      return {
        canLeave: true,
        directorCount: 0,
        message: 'Puedes abandonar la academia'
      };
    }
    
    // Contar directores actuales
    const directorCount = await countDirectors(academiaId);
    
    if (directorCount <= 1) {
      return {
        canLeave: false,
        directorCount,
        message: 'No puedes abandonar: eres el único director. Debes promover a otro usuario primero.'
      };
    }
    
    return {
      canLeave: true,
      directorCount,
      message: `Puedes abandonar. Hay ${directorCount - 1} director(es) más en la academia.`
    };
  } catch (error) {
   
    return {
      canLeave: false,
      directorCount: 0,
      message: 'Error al verificar permisos'
    };
  }
};

// ✅ MEJORAR: Eliminar usuario con validaciones extra
export const safeRemoveUserFromAcademia = async (
  academiaId: string,
  userId: string,
  isLeavingVoluntarily: boolean = false
): Promise<{ success: boolean; message: string }> => {
  try {
    // Si está abandonando voluntariamente, verificar que puede hacerlo
    if (isLeavingVoluntarily) {
      const { canLeave, message } = await canDirectorLeaveAcademia(academiaId, userId);
      
      if (!canLeave) {
        return { success: false, message };
      }
    }
    
    // Proceder con la eliminación
    await removeUserFromAcademia(academiaId, userId);
    
    return {
      success: true,
      message: isLeavingVoluntarily ? 'Has abandonado la academia exitosamente' : 'Usuario eliminado'
    };
  } catch (error) {

    return {
      success: false,
      message: 'Error al procesar la solicitud'
    };
  }
};

// Eliminar una academia completamente
export const deleteAcademia = async (academiaId: string): Promise<void> => {
  try {
    // Primero obtener todos los usuarios de la academia
    const usersRef = collection(db, "academias", academiaId, "usuarios");
    const usersSnapshot = await getDocs(usersRef);
    const userIds = usersSnapshot.docs.map(doc => doc.data().userId);
    
    // Eliminar la academia del documento userAcademias de cada usuario
    const batch = writeBatch(db);
    
    for (const userId of userIds) {
      const userAcademiasRef = doc(db, "userAcademias", userId);
      const userAcademiasDoc = await getDoc(userAcademiasRef);
      
      if (userAcademiasDoc.exists()) {
        const academias = userAcademiasDoc.data().academias || [];
        const academiasActualizadas = academias.filter((a: any) => a.academiaId !== academiaId);
        
        if (academiasActualizadas.length > 0) {
          batch.update(userAcademiasRef, { academias: academiasActualizadas });
        } else {
          // Si no quedan más academias, eliminar el documento completo
          batch.delete(userAcademiasRef);
        }
      }
    }
    
    // Ejecutar todas las actualizaciones de userAcademias
    await batch.commit();
    
    // Eliminar todas las subcolecciones
    const subCollections = ['usuarios', 'players', 'objectives', 'sessions', 'tournaments'];
    
    for (const subCollection of subCollections) {
      const collRef = collection(db, "academias", academiaId, subCollection);
      const snapshot = await getDocs(collRef);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    }
    
    // Finalmente eliminar el documento de la academia
    await deleteDoc(doc(db, "academias", academiaId));
  } catch (error) {
  
    throw error;
  }
};