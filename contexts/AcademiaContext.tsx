// contexts/AcademiaContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
// CORRECCIÓN 1: Se importa 'Academia' y 'TipoEntidad' desde el archivo de tipos centralizado.
import { Academia, TipoEntidad } from '../types'; 
import { getUserRoleInAcademia, addUserToAcademia, UserRole } from '../Database/FirebaseRoles';

interface UserAcademia {
  academiaId: string;
  nombre: string;
  id?: string;
  ultimoAcceso: Date;
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

        const academiasConIdYRol = await Promise.all(
          academias.map(async (academia: UserAcademia) => {
            if (!academia.id && academia.academiaId) {
              const academiaDoc = await getDoc(doc(db, 'academias', academia.academiaId));
              if (academiaDoc.exists()) {
                academia.id = academiaDoc.data().id;
              }
            }

            const role = await getUserRoleInAcademia(academia.academiaId, currentUser.uid);
            if (role) {
              academia.role = role;
            }

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
      const academiaDocRef = doc(db, 'academias', academiaId);
      const academiaDoc = await getDoc(academiaDocRef);
      const academiaData = academiaDoc.exists() ? academiaDoc.data() : null;

      let userRole = await getUserRoleInAcademia(academiaId, currentUser.uid);

      if (!userRole && academiaData && academiaData.creadorId !== currentUser.uid) {
        // Si no tiene rol y no es el creador, se le asigna 'entrenador'
        await addUserToAcademia(
          academiaId,
          currentUser.uid,
          currentUser.email || '',
          'entrenador',
          currentUser.displayName || currentUser.email?.split('@')[0]
        );
        userRole = 'entrenador';
      }

      // CORRECCIÓN 2: Se construye el objeto 'nuevoAcceso' con la sintaxis correcta.
      const nuevoAcceso: UserAcademia = {
        academiaId: academiaId,
        nombre: nombre,
        id: academiaData?.id || '',
        ultimoAcceso: new Date(),
        role: userRole || undefined, // Asignamos el rol obtenido
        tipo: academiaData?.tipo || undefined
      };

      const userRef = doc(db, 'userAcademias', currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const academias = userDoc.data().academias || [];
        const academiasActualizadas = academias.filter((a: UserAcademia) => a.academiaId !== academiaId);
        academiasActualizadas.unshift(nuevoAcceso);

        await updateDoc(userRef, { academias: academiasActualizadas });
      } else {
        await setDoc(userRef, { academias: [nuevoAcceso] });
      }

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

        await updateDoc(userRef, { academias: academiasActualizadas });

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