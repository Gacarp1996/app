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

// ✅ NUEVA FUNCIÓN HELPER: Asegurar que el usuario esté registrado en la academia
const ensureUserRegistration = async (
  academiaId: string, 
  userId: string, 
  userEmail: string, 
  userName: string,
  academiaData: Academia | null
): Promise<UserRole | null> => {
  try {
    // Verificar si ya tiene rol
    let role = await getUserRoleInAcademia(academiaId, userId);
    
    if (!role && academiaData) {
      // Si no tiene rol, asignarlo según la lógica de negocio
      const entityType = getEntityType(academiaData);
      
      if (academiaData.creadorId === userId) {
        // Es el creador
        const creatorRole: UserRole = entityType === 'grupo-entrenamiento' ? 'groupCoach' : 'academyDirector';
        await addUserToAcademia(academiaId, userId, userEmail, creatorRole, userName);
        role = creatorRole;
        console.log(`Usuario ${userId} registrado como creador con rol: ${creatorRole}`);
      } else {
        // Usuario regular
        const defaultRole: UserRole = entityType === 'grupo-entrenamiento' ? 'assistantCoach' : 'academyCoach';
        await addUserToAcademia(academiaId, userId, userEmail, defaultRole, userName);
        role = defaultRole;
        console.log(`Usuario ${userId} registrado con rol por defecto: ${defaultRole}`);
      }
    }
    
    return role;
  } catch (error) {
    console.error(`Error registrando usuario ${userId} en academia ${academiaId}:`, error);
    return null;
  }
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
      // ✅ ASEGURAR REGISTRO ANTES DE OBTENER ROL
      const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario Anónimo';
      const role = await ensureUserRegistration(
        academia.id,
        currentUser.uid,
        currentUser.email || 'no-email-provided',
        userName,
        academia
      );
      
      setRolActual(role);
    } else {
      setRolActual(null);
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
    
    setLoading(true);
    try {
      const userDocRef = doc(db, 'userAcademias', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        const academias = data.academias || [];
        const academiasConDetalles = await Promise.all(
          academias.map(async (academia: any) => {
            if (!academia.academiaId) return null;

            const academiaDoc = await getDoc(doc(db, 'academias', academia.academiaId));
            const role = await getUserRoleInAcademia(academia.academiaId, currentUser.uid);
            
            if (academiaDoc.exists()) {
                const academiaData = academiaDoc.data() as Academia;
                return {
                    ...academia,
                    id: academiaData.id || academia.academiaId,
                    nombre: academiaData.nombre,
                    tipo: getEntityType(academiaData),
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
      console.error("Error cargando mis academias:", error);
    } finally {
      setLoading(false);
    }
  };

  const registrarAccesoAcademia = async (academiaId: string, nombre: string) => {
    if (!currentUser) return;

    try {
      const academiaDocRef = doc(db, 'academias', academiaId);
      const academiaDoc = await getDoc(academiaDocRef);
      const academiaData = academiaDoc.exists() ? academiaDoc.data() as Academia : null;

      // Si la academia no existe en la BD, no continuamos
      if (!academiaData) {
        console.error(`Academia ${academiaId} no encontrada`);
        return;
      }
      
      // ✅ CAMBIO CRÍTICO: ASEGURAR REGISTRO ANTES de cualquier operación que requiera permisos
      const userName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario Anónimo';
      const userRole = await ensureUserRegistration(
        academiaId,
        currentUser.uid,
        currentUser.email || 'no-email-provided',
        userName,
        academiaData
      );

      if (!userRole) {
        console.error(`No se pudo asignar rol al usuario ${currentUser.uid} en academia ${academiaId}`);
        return;
      }

      // ✅ AHORA SÍ: Registrar acceso en userAcademias (ya tiene permisos)
      const nuevoAcceso = {
        academiaId: academiaId,
        nombre: nombre,
        ultimoAcceso: Date.now() // Timestamp en millisegundos
      };

      const userRef = doc(db, 'userAcademias', currentUser.uid);
      const userDoc = await getDoc(userRef);

      let academiasActualizadas = [];
      if (userDoc.exists()) {
        const academiasPrevias = userDoc.data().academias || [];
        // Filtramos para evitar duplicados y luego añadimos el nuevo acceso al principio
        academiasActualizadas = academiasPrevias.filter((a: UserAcademia) => a.academiaId !== academiaId);
        academiasActualizadas.unshift(nuevoAcceso);

        await updateDoc(userRef, { 
          academias: academiasActualizadas,
          ultimaActualizacion: serverTimestamp()
        });
      } else {
        academiasActualizadas = [nuevoAcceso];
        await setDoc(userRef, { 
          academias: academiasActualizadas,
          fechaCreacion: serverTimestamp(),
          ultimaActualizacion: serverTimestamp()
        });
      }
      
      // Actualizamos el estado local para reflejar el cambio inmediatamente
      await cargarMisAcademias();
      setRolActual(userRole);

    } catch (error) {
      console.error("Error registrando acceso a academia:", error);
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
          ultimaActualizacion: serverTimestamp()
        });

        setMisAcademias(academiasActualizadas);

        if (academiaActual?.id === academiaId) {
          limpiarAcademiaActual();
        }
      }
    } catch (error) {
      console.error("Error eliminando academia de mis academias:", error);
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