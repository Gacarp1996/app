// contexts/AcademiaContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'; 
import { db } from '../firebase/firebase-config';
import { Academia, TipoEntidad } from '../types/types'; 
import { getUserRoleInAcademia, addUserToAcademia, UserRole } from '../Database/FirebaseRoles';

interface UserAcademia {
  academiaId: string;
  nombre: string;
  id?: string;
  // Cambiado para usar timestamp de JavaScript
  ultimoAcceso: number; // timestamp en millisegundos
  role?: UserRole;
  tipo?: TipoEntidad;
}

interface AcademiaContextType {
  academiaActual: Academia | null;
  rolActual: UserRole | null;
  misAcademias: UserAcademia[];
  loading: boolean;
  setAcademiaActual: (academia: Academia | null) => Promise<void>;
  cargarMisAcademias: () => Promise<void>;
  registrarAccesoAcademia: (academiaId: string, nombre: string) => Promise<void>;
  limpiarAcademiaActual: () => void;
  eliminarAcademiaDeMisAcademias: (academiaId: string) => Promise<void>;
}

const AcademiaContext = createContext<AcademiaContextType | undefined>(undefined);

// ✅ FUNCIÓN HELPER PARA DETERMINAR TIPO DE ENTIDAD
const getEntityType = (academiaData: Academia | null): TipoEntidad => {
  // Si tiene tipo definido, usarlo
  if (academiaData?.tipo) {
    return academiaData.tipo;
  }
  
  // Fallback: asumir que es academia para compatibilidad
  return 'academia';
};

export const AcademiaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [academiaActual, setAcademiaActualState] = useState<Academia | null>(null);
  const [rolActual, setRolActual] = useState<UserRole | null>(null);
  const [misAcademias, setMisAcademias] = useState<UserAcademia[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  const setAcademiaActual = async (academia: Academia | null) => {
    setAcademiaActualState(academia);
    
    if (academia && currentUser) {
      console.log('🔍 Debug academia actual:', {
        academiaId: academia.id,
        nombre: academia.nombre,
        tipo: academia.tipo,
        creadorId: academia.creadorId,
        userId: currentUser.uid
      });
      
      console.log('🔍 Verificando rol para usuario:', currentUser.uid, 'en academia:', academia.id);
      
      let role = await getUserRoleInAcademia(academia.id, currentUser.uid);
      console.log('🎭 Rol obtenido inicialmente:', role);
      
      // ✅ SI NO TIENE ROL, VERIFICAR SI ES EL CREADOR O ASIGNAR AUTOMÁTICAMENTE
      if (!role) {
        console.log('⚠️ Usuario sin rol detectado. Verificando si es creador...');
        
        // ✅ USAR FUNCIÓN HELPER PARA TIPO
        const entityType = getEntityType(academia);
        
        // Verificar si es el creador de la academia
        if (academia.creadorId === currentUser.uid) {
          console.log('👑 Usuario es el creador, asignando rol según tipo de entidad...');
          try {
            const creatorRole: UserRole = entityType === 'grupo-entrenamiento' ? 'groupCoach' : 'academyDirector';
            await addUserToAcademia(
              academia.id,
              currentUser.uid,
              currentUser.email || 'no-email-provided',
              creatorRole,
              currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario Anónimo'
            );
            role = creatorRole;
            console.log(`✅ Rol de ${creatorRole} asignado exitosamente`);
          } catch (error) {
            console.error('❌ Error asignando rol de creador:', error);
          }
        } else {
          // ACTUALIZADO: Rol por defecto según el tipo de academia
          // Para academias normales: academyCoach
          // Para grupos de entrenamiento: assistantCoach
          const defaultRole: UserRole = entityType === 'grupo-entrenamiento' ? 'assistantCoach' : 'academyCoach';
          console.log(`👥 Usuario no es creador, asignando rol de ${defaultRole}...`);
          try {
            await addUserToAcademia(
              academia.id,
              currentUser.uid,
              currentUser.email || 'no-email-provided',
              defaultRole,
              currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario Anónimo'
            );
            role = defaultRole;
            console.log(`✅ Rol de ${defaultRole} asignado exitosamente`);
          } catch (error) {
            console.error(`❌ Error asignando rol de ${defaultRole}:`, error);
          }
        }
      }
      
      setRolActual(role);
      console.log('🎯 Rol final cargado para la academia:', role);
    } else {
      setRolActual(null);
      console.log('🚫 No hay academia o usuario, rol establecido como null');
    }
  };

  useEffect(() => {
    const init = async () => {
        if (currentUser) {
            await cargarMisAcademias();
        } else {
            // Limpiamos el estado si no hay usuario
            setMisAcademias([]);
            setAcademiaActualState(null);
            setRolActual(null);
        }
        setLoading(false);
    };
    init();
  }, [currentUser]);

  const cargarMisAcademias = async () => {
    if (!currentUser) return;
    
    setLoading(true); // Indicamos que estamos cargando
    try {
      const userDocRef = doc(db, 'userAcademias', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        const academias = data.academias || [];

        const academiasConDetalles = await Promise.all(
          academias.map(async (academia: any) => {
            // Aseguramos que los datos básicos estén
            if (!academia.academiaId) return null;

            const academiaDoc = await getDoc(doc(db, 'academias', academia.academiaId));
            const role = await getUserRoleInAcademia(academia.academiaId, currentUser.uid);
            
            if (academiaDoc.exists()) {
                const academiaData = academiaDoc.data() as Academia;
                return {
                    ...academia,
                    id: academiaData.id || academia.academiaId,
                    nombre: academiaData.nombre,
                    tipo: getEntityType(academiaData), // ✅ USAR FUNCIÓN HELPER
                    role: role,
                    // Convertir Timestamp de Firestore a número si es necesario
                    ultimoAcceso: academia.ultimoAcceso?.toMillis ? 
                      academia.ultimoAcceso.toMillis() : 
                      academia.ultimoAcceso || Date.now()
                };
            }
            return null;
          })
        );
        // Filtramos los resultados nulos por si alguna academia fue eliminada
        setMisAcademias(academiasConDetalles.filter(Boolean) as UserAcademia[]);
      }
    } catch (error) {
      console.error('Error cargando mis academias:', error);
    } finally {
      setLoading(false);
    }
  };

  const registrarAccesoAcademia = async (academiaId: string, nombre: string) => {
    if (!currentUser) return;

    try {
      // ✅ AGREGAR DEBUG ANTES DE LA OPERACIÓN QUE FALLA
      console.log('🔍 Debug registrarAccesoAcademia:', {
        academiaId,
        nombre,
        userId: currentUser.uid,
        userEmail: currentUser.email
      });

      const academiaDocRef = doc(db, 'academias', academiaId);
      const academiaDoc = await getDoc(academiaDocRef);
      const academiaData = academiaDoc.exists() ? academiaDoc.data() as Academia : null;

      // CORRECCIÓN CLAVE: Si la academia no existe en la BD, no continuamos.
      if (!academiaData) {
        console.error("No se puede registrar acceso a una academia que no existe:", academiaId);
        return;
      }
      
      // ✅ USAR FUNCIÓN HELPER PARA TIPO
      const entityType = getEntityType(academiaData);
      console.log('🔍 Tipo de entidad detectado:', entityType);
      
      let userRole = await getUserRoleInAcademia(academiaId, currentUser.uid);

      // ✅ MEJORAR LA LÓGICA DE ASIGNACIÓN DE ROLES
      if (!userRole) {
        if (academiaData.creadorId === currentUser.uid) {
          // Si es el creador, asignar rol según el tipo de entidad
          const creatorRole: UserRole = entityType === 'grupo-entrenamiento' ? 'groupCoach' : 'academyDirector';
          await addUserToAcademia(
            academiaId,
            currentUser.uid,
            currentUser.email || 'no-email-provided',
            creatorRole,
            currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario Anónimo'
          );
          userRole = creatorRole;
          console.log(`🎯 Creador registrado como ${creatorRole}`);
        } else {
          // ACTUALIZADO: Rol por defecto según el tipo
          const defaultRole: UserRole = entityType === 'grupo-entrenamiento' ? 'assistantCoach' : 'academyCoach';
          await addUserToAcademia(
            academiaId,
            currentUser.uid,
            currentUser.email || 'no-email-provided',
            defaultRole,
            currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario Anónimo'
          );
          userRole = defaultRole;
          console.log(`🎯 Usuario registrado como ${defaultRole}`);
        }
      }

      // CORRECCIÓN: Usamos Date.now() en lugar de serverTimestamp() para arrays
      const nuevoAcceso = {
        academiaId: academiaId,
        nombre: nombre,
        ultimoAcceso: Date.now() // Timestamp en millisegundos
      };

      console.log('🔍 Datos a escribir:', nuevoAcceso);

      const userRef = doc(db, 'userAcademias', currentUser.uid);
      const userDoc = await getDoc(userRef);

      let academiasActualizadas = [];
      if (userDoc.exists()) {
        const academiasPrevias = userDoc.data().academias || [];
        // Filtramos para evitar duplicados y luego añadimos el nuevo acceso al principio
        academiasActualizadas = academiasPrevias.filter((a: UserAcademia) => a.academiaId !== academiaId);
        academiasActualizadas.unshift(nuevoAcceso);

        // ✅ AGREGAR TRY-CATCH ESPECÍFICO PARA LA OPERACIÓN QUE FALLA
        console.log('🔍 Actualizando documento existente...');
        await updateDoc(userRef, { 
          academias: academiasActualizadas,
          ultimaActualizacion: serverTimestamp()
        });
        console.log('✅ Documento actualizado exitosamente');
      } else {
        academiasActualizadas = [nuevoAcceso];
        console.log('🔍 Creando nuevo documento...');
        await setDoc(userRef, { 
          academias: academiasActualizadas,
          fechaCreacion: serverTimestamp(),
          ultimaActualizacion: serverTimestamp()
        });
        console.log('✅ Documento creado exitosamente');
      }
      
      // Actualizamos el estado local para reflejar el cambio inmediatamente
      await cargarMisAcademias();
      
      const role = await getUserRoleInAcademia(academiaId, currentUser.uid);
      setRolActual(role);
      console.log('🎯 Rol después de registrar acceso:', role);

    } catch (error) {
      console.error('❌ Error registrando acceso (línea ~223):', error);
      // ✅ AGREGAR MÁS DETALLES DEL ERROR
      if (error instanceof Error) {
        console.error('❌ Mensaje del error:', error.message);
        console.error('❌ Stack del error:', error.stack);
      }
    }
  };

  const limpiarAcademiaActual = () => {
    setAcademiaActualState(null);
    setRolActual(null);
  };

  const eliminarAcademiaDeMisAcademias = async (academiaId: string) => {
    if (!currentUser) return;

    try {
      const userRef = doc(db, 'userAcademias', currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const academias = userDoc.data().academias || [];
        const academiasActualizadas = academias.filter((a: UserAcademia) => a.academiaId !== academiaId);

        await updateDoc(userRef, { 
          academias: academiasActualizadas,
          ultimaActualizacion: serverTimestamp() // Esto sí funciona fuera del array
        });

        setMisAcademias(academiasActualizadas);

        if (academiaActual?.id === academiaId) {
          limpiarAcademiaActual();
        }
      }
    } catch (error) {
      console.error('Error eliminando academia de mis academias:', error);
    }
  };

  return (
    <AcademiaContext.Provider value={{
      academiaActual,
      rolActual,
      misAcademias,
      loading,
      setAcademiaActual,
      cargarMisAcademias,
      registrarAccesoAcademia,
      limpiarAcademiaActual,
      eliminarAcademiaDeMisAcademias
    }}>
      {children}
    </AcademiaContext.Provider>
  );
};

export const useAcademia = (): AcademiaContextType => {
  const context = useContext(AcademiaContext);
  if (!context) {
    throw new Error('useAcademia debe ser usado dentro de AcademiaProvider');
  }
  return context;
};