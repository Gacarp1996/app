import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebase/firebase-config'; // ← USAR LA MISMA INSTANCIA
import { logSecurityEvent } from '../utils/securityAudit';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
 
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // 🔒 AUDITORÍA DE AUTENTICACIÓN
      if (user && !currentUser) {
        // Usuario acaba de hacer login
        try {
          await logSecurityEvent({
            type: 'USER_LOGIN',
            severity: 'LOW',
            userId: user.uid,
            userEmail: user.email || undefined,
            academiaId: 'SYSTEM',
            action: 'Usuario autenticado',
            details: {
              email: user.email,
              displayName: user.displayName,
              lastSignInTime: user.metadata.lastSignInTime,
              creationTime: user.metadata.creationTime
            }
          });
        } catch (auditError) {
          console.error('❌ Error en auditoría de login:', auditError);
        }
      } else if (!user && currentUser) {
        // Usuario acaba de hacer logout
        try {
          await logSecurityEvent({
            type: 'USER_LOGOUT',
            severity: 'LOW',
            userId: currentUser.uid,
            userEmail: currentUser.email || undefined,
            academiaId: 'SYSTEM',
            action: 'Usuario cerró sesión',
            details: {
              email: currentUser.email,
              sessionDuration: Date.now() - (new Date(currentUser.metadata.lastSignInTime || 0).getTime())
            }
          });
        } catch (auditError) {
          console.error('❌ Error en auditoría de logout:', auditError);
        }
      }

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