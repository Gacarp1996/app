// contexts/AcademiaContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { Academia } from '../Database/FirebaseAcademias';
import { getUserRoleInAcademia, addUserToAcademia, UserRole } from '../Database/FirebaseRoles';

interface UserAcademia {
  academiaId: string;
  nombre: string;
  id?: string;
  ultimoAcceso: Date;
  role?: UserRole; // Agregamos el rol aquí
}

interface AcademiaContextType {
  academiaActual: Academia | null;
  rolActual: UserRole | null; // Nuevo: rol del usuario en la academia actual
  misAcademias: UserAcademia[];
  loading: boolean;
  setAcademiaActual: (academia: Academia | null) => void;
  cargarMisAcademias: () => Promise<void>;
  registrarAccesoAcademia: (academiaId: string, nombre: string) => Promise<void>;
  limpiarAcademiaActual: () => void;
}

const AcademiaContext = createContext<AcademiaContextType | undefined>(undefined);

export const AcademiaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [academiaActual, setAcademiaActualState] = useState<Academia | null>(null);
  const [rolActual, setRolActual] = useState<UserRole | null>(null);
  const [misAcademias, setMisAcademias] = useState<UserAcademia[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  // Función actualizada para establecer la academia actual y cargar el rol
  const setAcademiaActual = async (academia: Academia | null) => {
    setAcademiaActualState(academia);
    
    if (academia && currentUser) {
      // Cargar el rol del usuario en esta academia
      const role = await getUserRoleInAcademia(academia.id, currentUser.uid);
      setRolActual(role);
    } else {
      setRolActual(null);
    }
  };

  useEffect(() => {
    if (currentUser) {
      cargarMisAcademias();
    } else {
      setMisAcademias([]);
      setAcademiaActualState(null);
      setRolActual(null);
    }
    setLoading(false);
  }, [currentUser]);

  const cargarMisAcademias = async () => {
    if (!currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'userAcademias', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const academias = data.academias || [];
        
        // Cargar el ID y rol de cada academia
        const academiasConIdYRol = await Promise.all(
          academias.map(async (academia: UserAcademia) => {
            if (!academia.id && academia.academiaId) {
              const academiaDoc = await getDoc(doc(db, 'academias', academia.academiaId));
              if (academiaDoc.exists()) {
                academia.id = academiaDoc.data().id;
              }
            }
            
            // Cargar el rol del usuario en esta academia
            const role = await getUserRoleInAcademia(academia.academiaId, currentUser.uid);
            academia.role = role || undefined;
            
            return academia;
          })
        );
        
        setMisAcademias(academiasConIdYRol);
      }
    } catch (error) {
      console.error('Error cargando mis academias:', error);
    }
  };

  const registrarAccesoAcademia = async (academiaId: string, nombre: string) => {
    if (!currentUser) return;

    try {
      // Obtener el ID público de la academia
      const academiaDoc = await getDoc(doc(db, 'academias', academiaId));
      const academiaData = academiaDoc.exists() ? academiaDoc.data() : null;
      await cargarMisAcademias();

        // Forzar recarga del rol después de registrar acceso
        const role = await getUserRoleInAcademia(academiaId, currentUser.uid);setRolActual(role);} catch (error) {
        console.error('Error registrando acceso:', error);
        }
        };



      // Verificar si el usuario tiene un rol en esta academia
      let userRole = await getUserRoleInAcademia(academiaId, currentUser.uid);
      
      // Si no tiene rol, asignarlo como entrenador
      if (!userRole) {
        await addUserToAcademia(
          academiaId,
          currentUser.uid,
          currentUser.email || '',
          'entrenador',
          currentUser.displayName || currentUser.email?.split('@')[0]
        );
        userRole = 'entrenador';
      }
      
      const nuevoAcceso = {
        academiaId,
        nombre,
        id: academiaData?.id || '',
        ultimoAcceso: new Date(),
        role: userRole
      };

      const userRef = doc(db, 'userAcademias', currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        // Actualizar el array, removiendo duplicados
        const academias = userDoc.data().academias || [];
        const academiasActualizadas = academias.filter((a: UserAcademia) => a.academiaId !== academiaId);
        academiasActualizadas.unshift(nuevoAcceso);
        
        await updateDoc(userRef, { academias: academiasActualizadas });
      } else {
        // Crear documento nuevo
        await setDoc(userRef, { academias: [nuevoAcceso] });
      }
      
      await cargarMisAcademias();
    } catch (error) {
      console.error('Error registrando acceso:', error);
    }
  };

  const limpiarAcademiaActual = () => {
    setAcademiaActualState(null);
    setRolActual(null);
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
      limpiarAcademiaActual
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