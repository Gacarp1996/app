// utils/emergencyRoleRestore.ts
import { db } from '../firebase/firebase-config';
import { doc, getDoc, setDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { UserRole } from '../Database/FirebaseRoles';

interface AcademiaData {
  creadorId: string;
  nombre: string;
  // ... otros campos
}

/**
 * Script de emergencia para restaurar roles basándose en el sistema anterior
 * Este script:
 * 1. Identifica al creador de cada academia
 * 2. Le asigna automáticamente el rol de 'academyDirector'
 * 3. Convierte roles legacy a nuevos roles
 */
export const emergencyRoleRestore = async (userId: string, userEmail?: string): Promise<void> => {
  console.log('🚨 Iniciando restauración de emergencia de roles para usuario:', userId);
  
  try {
    // 1. Obtener todas las academias donde el usuario es creador
    const academiasRef = collection(db, 'academias');
    const academiasSnapshot = await getDocs(academiasRef);
    
    let academiasRestauradas = 0;
    
    for (const academiaDoc of academiasSnapshot.docs) {
      const academiaData = academiaDoc.data() as AcademiaData;
      const academiaId = academiaDoc.id;
      
      // Si el usuario es el creador de esta academia
      if (academiaData.creadorId === userId) {
        console.log(`🏫 Restaurando rol de director para academia: ${academiaData.nombre}`);
        
        // Asignar rol de director FORZADAMENTE
        const userRef = doc(db, 'academias', academiaId, 'usuarios', userId);
        await setDoc(userRef, {
          userId,
          userEmail: userEmail || 'email-no-disponible',
          userName: userEmail?.split('@')[0] || 'Usuario',
          role: 'academyDirector' as UserRole,
          joinedAt: serverTimestamp(),
          restoredByEmergencyScript: true,
          restoredAt: serverTimestamp()
        }, { merge: true });
        
        academiasRestauradas++;
        console.log(`✅ Rol de director restaurado para academia: ${academiaData.nombre}`);
        
        // ADICIONAL: También actualizar en userAcademias si existe
        try {
          const userAcademiasRef = doc(db, 'userAcademias', userId);
          const userAcademiasDoc = await getDoc(userAcademiasRef);
          
          if (userAcademiasDoc.exists()) {
            const data = userAcademiasDoc.data();
            const academias = data.academias || [];
            
            // Buscar y actualizar la academia específica
            const academiaIndex = academias.findIndex((a: any) => a.academiaId === academiaId);
            if (academiaIndex >= 0) {
              academias[academiaIndex].role = 'academyDirector';
              await setDoc(userAcademiasRef, { academias }, { merge: true });
              console.log(`✅ También actualizado en userAcademias para ${academiaData.nombre}`);
            }
          }
        } catch (error) {
          console.log(`⚠️ No se pudo actualizar userAcademias: ${error}`);
        }
      }
    }
    
    // 2. Verificar si hay roles legacy existentes
    for (const academiaDoc of academiasSnapshot.docs) {
      const academiaId = academiaDoc.id;
      const usersRef = collection(db, 'academias', academiaId, 'usuarios');
      const usersSnapshot = await getDocs(usersRef);
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (userDoc.id === userId && userData.role) {
          const currentRole = userData.role;
          
          // Convertir roles legacy
          let newRole: UserRole | null = null;
          switch (currentRole) {
            case 'director':
              newRole = 'academyDirector';
              break;
            case 'subdirector':
              newRole = 'academySubdirector';
              break;
            case 'entrenador':
              newRole = 'academyCoach';
              break;
          }
          
          if (newRole) {
            console.log(`🔄 Convirtiendo rol legacy ${currentRole} → ${newRole} en academia ${academiaId}`);
            const userRef = doc(db, 'academias', academiaId, 'usuarios', userId);
            await setDoc(userRef, {
              ...userData,
              role: newRole,
              legacyRole: currentRole,
              migratedByEmergencyScript: true,
              migratedAt: serverTimestamp()
            }, { merge: true });
            academiasRestauradas++;
          }
        }
      }
    }
    
    console.log(`✅ Restauración completada. ${academiasRestauradas} academias procesadas.`);
    
  } catch (error) {
    console.error('❌ Error durante la restauración de emergencia:', error);
    throw error;
  }
};

/**
 * Función para verificar el estado actual de roles de un usuario
 */
export const checkUserRoleStatus = async (userId: string): Promise<void> => {
  console.log('🔍 Verificando estado de roles para usuario:', userId);
  
  try {
    const academiasRef = collection(db, 'academias');
    const academiasSnapshot = await getDocs(academiasRef);
    
    console.log('\n📊 Estado actual de roles:');
    
    let foundIssues = false;
    
    for (const academiaDoc of academiasSnapshot.docs) {
      const academiaData = academiaDoc.data();
      const academiaId = academiaDoc.id;
      
      // Verificar si tiene rol en esta academia
      const userRef = doc(db, 'academias', academiaId, 'usuarios', userId);
      const userDoc = await getDoc(userRef);
      
      const isCreator = academiaData.creadorId === userId;
      
      if (isCreator) {
        console.log(`🏫 ${academiaData.nombre}:`);
        console.log(`   - Es creador: ✅ SÍ`);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log(`   - Rol actual: ${userData.role || 'SIN ROL'}`);
          
          if (!userData.role || userData.role !== 'academyDirector') {
            console.log(`   - ⚠️ PROBLEMA: Creador sin rol de director!`);
            foundIssues = true;
          } else {
            console.log(`   - ✅ ROL CORRECTO`);
          }
        } else {
          console.log(`   - ❌ PROBLEMA: Creador sin registro en usuarios!`);
          foundIssues = true;
        }
      } else if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log(`🏫 ${academiaData.nombre}:`);
        console.log(`   - Es creador: ❌ NO`);
        console.log(`   - Rol actual: ${userData.role || 'SIN ROL'}`);
      }
    }
    
    if (foundIssues) {
      console.log('\n🚨 SE ENCONTRARON PROBLEMAS. Ejecuta la restauración de emergencia.');
    } else {
      console.log('\n✅ No se encontraron problemas en los roles.');
    }
    
  } catch (error) {
    console.error('❌ Error verificando estado:', error);
  }
};
