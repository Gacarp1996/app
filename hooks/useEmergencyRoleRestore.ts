// hooks/useEmergencyRoleRestore.ts
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { emergencyRoleRestore, checkUserRoleStatus } from '../utils/emergencyRoleRestore';

interface RestoreStatus {
  isChecking: boolean;
  isRestoring: boolean;
  completed: boolean;
  error: string | null;
}

export const useEmergencyRoleRestore = () => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<RestoreStatus>({
    isChecking: false,
    isRestoring: false,
    completed: false,
    error: null
  });

  const performEmergencyRestore = async () => {
    if (!currentUser) return;

    setStatus(prev => ({ ...prev, isRestoring: true, error: null }));
    
    try {
      console.log('🚨 Iniciando restauración de emergencia...');
      await emergencyRoleRestore(currentUser.uid, currentUser.email || undefined);
      
      setStatus(prev => ({ 
        ...prev, 
        isRestoring: false, 
        completed: true 
      }));
      
      console.log('✅ Restauración completada exitosamente');
      
      // Recargar la página para que los cambios tomen efecto
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Error en restauración:', error);
      setStatus(prev => ({ 
        ...prev, 
        isRestoring: false, 
        error: error.message || 'Error durante la restauración' 
      }));
    }
  };

  const checkRoleStatus = async () => {
    if (!currentUser) return;

    setStatus(prev => ({ ...prev, isChecking: true }));
    
    try {
      await checkUserRoleStatus(currentUser.uid);
      setStatus(prev => ({ ...prev, isChecking: false }));
    } catch (error: any) {
      console.error('❌ Error verificando estado:', error);
      setStatus(prev => ({ 
        ...prev, 
        isChecking: false, 
        error: error.message 
      }));
    }
  };

  return {
    status,
    performEmergencyRestore,
    checkRoleStatus
  };
};
