import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';

interface Academia {
  id: string;
  nombre: string;
  creadorId: string;
  fechaCreacion: Date;
  activa: boolean;
}

interface UserAcademia {
  academiaId: string;
  nombre: string;
  ultimoAcceso: Date;
}

interface AcademiaContextType {
  academiaActual: Academia | null;
  misAcademias: UserAcademia[];
  loading: boolean;
  setAcademiaActual: (academia: Academia | null) => void;
  cargarMisAcademias: () => Promise<void>;
  registrarAccesoAcademia: (academiaId: string, nombre: string) => Promise<void>;
  limpiarAcademiaActual: () => void;
}

const AcademiaContext = createContext<AcademiaContextType | undefined>(undefined);

export const AcademiaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [academiaActual, setAcademiaActual] = useState<Academia | null>(null);
  const [misAcademias, setMisAcademias] = useState<UserAcademia[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      cargarMisAcademias();
    } else {
      setMisAcademias([]);
      setAcademiaActual(null);
    }
    setLoading(false);
  }, [currentUser]);

  const cargarMisAcademias = async () => {
    if (!currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'userAcademias', currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setMisAcademias(data.academias || []);
      }
    } catch (error) {
      console.error('Error cargando mis academias:', error);
    }
  };

  const registrarAccesoAcademia = async (academiaId: string, nombre: string) => {
    if (!currentUser) return;

    const nuevoAcceso = {
      academiaId,
      nombre,
      ultimoAcceso: new Date()
    };

    try {
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
    setAcademiaActual(null);
  };

  return (
    <AcademiaContext.Provider value={{
      academiaActual,
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