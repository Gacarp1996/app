// Database/FirebaseRoles.ts
import { db } from "../firebase/firebase-config";
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, updateDoc, query, where, serverTimestamp, writeBatch } from "firebase/firestore";

export type UserRole = 'director' | 'subdirector' | 'entrenador';

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
    console.error("Error agregando usuario a academia:", error);
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
      return userDoc.data().role as UserRole;
    }
    return null;
  } catch (error) {
    console.error("Error obteniendo rol del usuario:", error);
    return null;
  }
};

// Obtener todos los usuarios de una academia
export const getAcademiaUsers = async (academiaId: string): Promise<AcademiaUser[]> => {
  try {
    const usersRef = collection(db, "academias", academiaId, "usuarios");
    const snapshot = await getDocs(usersRef);
    
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      joinedAt: doc.data().joinedAt?.toDate() || new Date()
    } as AcademiaUser));
  } catch (error) {
    console.error("Error obteniendo usuarios de academia:", error);
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
    console.error("Error actualizando rol:", error);
    throw error;
  }
};

// Eliminar un usuario de una academia
export const removeUserFromAcademia = async (
  academiaId: string,
  userId: string
): Promise<void> => {
  try {
    const userRef = doc(db, "academias", academiaId, "usuarios", userId);
    await deleteDoc(userRef);
  } catch (error) {
    console.error("Error eliminando usuario:", error);
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
        userAcademias.push({
          academiaId: academiaDoc.id,
          nombre: academiaData.nombre,
          id: academiaData.id,
          role: userDoc.data().role as UserRole
        });
      }
    }
    
    return userAcademias;
  } catch (error) {
    console.error("Error obteniendo academias del usuario:", error);
    return [];
  }
};

// Verificar si un usuario puede realizar acciones de director
export const canManageAcademia = async (
  academiaId: string,
  userId: string
): Promise<boolean> => {
  const role = await getUserRoleInAcademia(academiaId, userId);
  return role === 'director' || role === 'subdirector';
};

// Contar directores en una academia
export const countDirectors = async (academiaId: string): Promise<number> => {
  try {
    const usersRef = collection(db, "academias", academiaId, "usuarios");
    const q = query(usersRef, where("role", "==", "director"));
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error("Error contando directores:", error);
    return 0;
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
    console.error("Error eliminando academia:", error);
    throw error;
  }
};