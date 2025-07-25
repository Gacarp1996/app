import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { createInterface } from 'readline';
import { readFileSync } from 'fs';

// Leer las credenciales del archivo JSON
const serviceAccountPath = './firebaseCredentials.json'; 
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

// Inicializar Firebase Admin SDK
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

// Tipos para los roles
type OldRole = 'academyDirector' | 'academySubdirector' | 'academyCoach';
type NewRole = 'academyDirector' | 'academySubdirector' | 'academyCoach';

// Mapa de migración de roles
const ROLE_MIGRATION_MAP: Record<OldRole, NewRole> = {
  'academyDirector': 'academyDirector',
  'academySubdirector': 'academySubdirector',
  'academyCoach': 'academyCoach'
};

// Interfaz para los datos del usuario
interface UserData {
  userId: string;
  userEmail?: string;
  userName?: string;
  role?: string;
  joinedAt?: Timestamp;
  invitedBy?: string;
}

async function migrateRoles(): Promise<void> {
  console.log('🚀 Iniciando migración de roles...');
  console.log('📋 Mapa de migración:', ROLE_MIGRATION_MAP);
  
  let totalAcademias = 0;
  let totalUsuarios = 0;
  let usuariosActualizados = 0;
  let usuariosSinRol = 0;
  let errores = 0;

  try {
    // Obtener todas las academias
    const academiasSnapshot = await db.collection('academias').get();
    totalAcademias = academiasSnapshot.size;
    
    console.log(`\n📚 Encontradas ${totalAcademias} academias`);
    
    // Procesar cada academia
    for (const academiaDoc of academiasSnapshot.docs) {
      const academiaId = academiaDoc.id;
      const academiaData = academiaDoc.data();
      
      console.log(`\n🏫 Procesando academia: ${academiaData.nombre || academiaId}`);
      
      try {
        // Obtener todos los usuarios de esta academia
        const usuariosSnapshot = await db
          .collection('academias')
          .doc(academiaId)
          .collection('usuarios')
          .get();
        
        const usuariosEnAcademia = usuariosSnapshot.size;
        totalUsuarios += usuariosEnAcademia;
        
        if (usuariosEnAcademia === 0) {
          console.log('   └─ No hay usuarios en esta academia');
          continue;
        }
        
        console.log(`   └─ Usuarios encontrados: ${usuariosEnAcademia}`);
        
        // Crear batch para actualizaciones - usar let en lugar de const
        let batch = db.batch();
        let batchCount = 0;
        let actualizadosEnAcademia = 0;
        
        // Procesar cada usuario
        for (const userDoc of usuariosSnapshot.docs) {
          const userId = userDoc.id;
          const userData = userDoc.data() as UserData;
          const currentRole = userData.role;
          
          // Si no tiene rol, ignorar
          if (!currentRole) {
            usuariosSinRol++;
            console.log(`      ⚠️  Usuario ${userData.userEmail || userId}: sin rol definido`);
            continue;
          }
          
          // Verificar si el rol necesita migración
          const newRole = ROLE_MIGRATION_MAP[currentRole as OldRole];
          
          if (newRole) {
            // Preparar actualización
            const userRef = db
              .collection('academias')
              .doc(academiaId)
              .collection('usuarios')
              .doc(userId);
            
            batch.update(userRef, { role: newRole });
            batchCount++;
            actualizadosEnAcademia++;
            
            console.log(`      ✅ Usuario ${userData.userEmail || userId}: ${currentRole} → ${newRole}`);
            
            // Firestore tiene un límite de 500 operaciones por batch
            if (batchCount === 500) {
              await batch.commit();
              console.log(`      📦 Batch intermedio ejecutado (500 operaciones)`);
              batchCount = 0;
              // Crear nuevo batch para continuar
              batch = db.batch();
            }
          } else {
            console.log(`      ℹ️  Usuario ${userData.userEmail || userId}: rol '${currentRole}' no requiere migración`);
          }
        }
        
        // Ejecutar el batch final si hay operaciones pendientes
        if (batchCount > 0) {
          await batch.commit();
          usuariosActualizados += actualizadosEnAcademia;
          console.log(`   └─ ✅ ${actualizadosEnAcademia} usuarios actualizados en esta academia`);
        } else {
          console.log(`   └─ ℹ️  No se requirieron actualizaciones en esta academia`);
        }
        
      } catch (academiaError) {
        const errorMessage = academiaError instanceof Error ? academiaError.message : 'Error desconocido';
        console.error(`   └─ ❌ Error procesando academia ${academiaId}:`, errorMessage);
        errores++;
      }
    }
    
    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE LA MIGRACIÓN:');
    console.log('='.repeat(60));
    console.log(`✅ Academias procesadas: ${totalAcademias}`);
    console.log(`👥 Total de usuarios revisados: ${totalUsuarios}`);
    console.log(`🔄 Usuarios actualizados: ${usuariosActualizados}`);
    console.log(`⚠️  Usuarios sin rol: ${usuariosSinRol}`);
    console.log(`❌ Errores encontrados: ${errores}`);
    console.log('='.repeat(60));
    
    if (usuariosActualizados > 0) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
    } else {
      console.log('\n✅ No se requirieron actualizaciones.');
    }
    
  } catch (error) {
    console.error('\n❌ Error crítico durante la migración:', error);
    throw error;
  } finally {
    // Terminar la aplicación
    console.log('\n👋 Finalizando proceso...');
    process.exit(0);
  }
}

// Función auxiliar para confirmar antes de ejecutar
async function confirmarMigracion(): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('\n⚠️  Esta operación modificará los roles de todos los usuarios. ¿Deseas continuar? (s/n): ', (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 's' || answer.toLowerCase() === 'si');
    });
  });
}

// Ejecutar migración
async function main(): Promise<void> {
  console.log('🔧 SCRIPT DE MIGRACIÓN DE ROLES DE USUARIO');
  console.log('==========================================\n');
  
  // Confirmar antes de ejecutar
  const confirmar = await confirmarMigracion();
  
  if (confirmar) {
    await migrateRoles();
  } else {
    console.log('\n❌ Migración cancelada por el usuario.');
    process.exit(0);
  }
}

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Error no manejado:', error);
  process.exit(1);
});

// Ejecutar el script
main().catch((error) => {
  console.error('❌ Error ejecutando el script:', error);
  process.exit(1);
});