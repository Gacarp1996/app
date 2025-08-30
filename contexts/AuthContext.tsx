import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase/firebase-config'; // ← USAR LA MISMA INSTANCIA

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
 
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {

      setCurrentUser(user);
      setLoading(false);
    }, (error) => {
      console.error('❌ Error en onAuthStateChanged:', error);
      setLoading(false);
    });

    return () => {

      unsubscribe();
    };
  }, []); // ← Sin dependencias, solo se ejecuta una vez

  return (
    <AuthContext.Provider value={{ currentUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};