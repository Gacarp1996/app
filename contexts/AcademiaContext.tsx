// contexts/AcademiaContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore'; 
import { db } from '../firebase/firebase-config';
import { Academia, TipoEntidad } from '../types'; 
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

export const AcademiaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [academiaActual, setAcademiaActualState] = useState<Academia | null>(null);
  const [rolActual, setRolActual] = useState<UserRole | null>(null);
  const [misAcademias, setMisAcademias] = useState<UserAcademia[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  const setAcademiaActual = async (academia: Academia | null) => {
    setAcademiaActualState(academia);
    
    if (academia && currentUser) {
      const role = await getUserRoleInAcademia(academia.id, currentUser.uid);
      setRolActual(role);
      console.log('Rol cargado para la academia:', role);
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
                    tipo: academiaData.tipo,
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
      const academiaDocRef = doc(db, 'academias', academiaId);
      const academiaDoc = await getDoc(academiaDocRef);
      const academiaData = academiaDoc.exists() ? academiaDoc.data() as Academia : null;

      // CORRECCIÓN CLAVE: Si la academia no existe en la BD, no continuamos.
      if (!academiaData) {
        console.error("No se puede registrar acceso a una academia que no existe:", academiaId);
        return;
      }
      
      let userRole = await getUserRoleInAcademia(academiaId, currentUser.uid);

      if (!userRole && academiaData.creadorId !== currentUser.uid) {
        // Asignamos 'entrenador' por defecto si no tiene rol y no es creador
        await addUserToAcademia(
          academiaId,
          currentUser.uid,
          currentUser.email || 'no-email-provided', // Evitamos undefined
          'entrenador',
          currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario Anónimo'
        );
        userRole = 'entrenador';
      }

      // CORRECCIÓN: Usamos Date.now() en lugar de serverTimestamp() para arrays
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
          // Opcionalmente, puedes usar serverTimestamp() aquí fuera del array
          ultimaActualizacion: serverTimestamp()
        });
      } else {
        academiasActualizadas = [nuevoAcceso];
        await setDoc(userRef, { 
          academias: academiasActualizadas,
          // Opcionalmente, puedes usar serverTimestamp() aquí fuera del array
          fechaCreacion: serverTimestamp(),
          ultimaActualizacion: serverTimestamp()
        });
      }
      
      // Actualizamos el estado local para reflejar el cambio inmediatamente
      await cargarMisAcademias();
      
      const role = await getUserRoleInAcademia(academiaId, currentUser.uid);
      setRolActual(role);

    } catch (error) {
      console.error('Error registrando acceso:', error);
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