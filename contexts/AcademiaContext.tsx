// contexts/AcademiaContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { Academia } from '../Database/FirebaseAcademias';
import { getUserRoleInAcademia, addUserToAcademia, UserRole } from '../Database/FirebaseRoles';
import { TipoEntidad } from '../types';

interface UserAcademia {
  academiaId: string;
  nombre: string;
  id?: string;
  ultimoAcceso: Date;
  role?: UserRole; // Agregamos el rol aquí
  tipo?: TipoEntidad; // NUEVO
}

interface AcademiaContextType {
  academiaActual: Academia | null;
  rolActual: UserRole | null; // Nuevo: rol del usuario en la academia actual
  misAcademias: UserAcademia[];
  loading: boolean;
  setAcademiaActual: (academia: Academia | null) => Promise<void>;
  cargarMisAcademias: () => Promise<void>;
  registrarAccesoAcademia: (academiaId: string, nombre: string) => Promise<void>;
  limpiarAcademiaActual: () => void;
  eliminarAcademiaDeMisAcademias: (academiaId: string) => Promise<void>; // Nuevo método
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
            if (role) {academia.role = role;
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
      const academiaDoc = await getDoc(doc(db, 'academias', academiaId));
      const academiaData = academiaDoc.exists() ? academiaDoc.data() : null;

      let userRole = await getUserRoleInAcademia(academiaId, currentUser.uid);

      if (!userRole) {
        const academiaDoc = await getDoc(doc(db, 'academias', academiaId));
        const academiaData = academiaDoc.exists() ? academiaDoc.data() : null;

        if (academiaData && academiaData.creadorId !== currentUser.uid) {
          await addUserToAcademia(
            academiaId,
            currentUser.uid,
            currentUser.email || '',
            'entrenador',
            currentUser.displayName || currentUser.email?.split('@')[0]
          );
          userRole = 'entrenador';
        } else {
          userRole = await getUserRoleInAcademia(academiaId, currentUser.uid);
        }
      }

      const nuevoAcceso: UserAcademia = {
        academiaId,
        nombre,
        id: academiaData?.id || '',
        ultimoAcceso: new Date(),
        role: userRole,
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