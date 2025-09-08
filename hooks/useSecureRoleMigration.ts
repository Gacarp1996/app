// app/hooks/useSecureRoleMigration.ts
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { secureRoleService } from '../services/SecureRoleService';
import { AuditLogger } from '../utils/auditLogger';

interface MigrationStatus {
  isComplete: boolean;
  isLoading: boolean;
  error: string | null;
  needsInitialSetup: boolean;
}

export const useSecureRoleMigration = () => {
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia();
  const [status, setStatus] = useState<MigrationStatus>({
    isComplete: false,
    isLoading: true,
    error: null,
    needsInitialSetup: false
  });

  useEffect(() => {
    if (currentUser && academiaActual) {
      checkMigrationStatus();
    }
  }, [currentUser, academiaActual]);

  const checkMigrationStatus = async () => {
    try {
      if (!currentUser || !academiaActual?.id) return;

      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      // 🔍 Verificar si el usuario ya tiene rol en el nuevo sistema
      const userRole = await secureRoleService.getUserRole(currentUser.uid, academiaActual.id);

      if (userRole) {
        // ✅ Usuario ya migrado
        setStatus({
          isComplete: true,
          isLoading: false,
          error: null,
          needsInitialSetup: false
        });
      } else {
        // ⚠️ Usuario necesita migración/setup inicial
        setStatus({
          isComplete: false,
          isLoading: false,
          error: null,
          needsInitialSetup: true
        });
      }

    } catch (error) {
      console.error('Error verificando migración:', error);
      setStatus({
        isComplete: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        needsInitialSetup: true
      });
    }
  };

  const performInitialSetup = async (roleToAssign: 'academyDirector' | 'academySubdirector' = 'academyDirector') => {
    try {
      if (!currentUser || !academiaActual?.id) {
        throw new Error('Usuario o academia no disponible');
      }

      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      // 🚀 Asignar rol inicial (primer usuario = director)
      const result = await secureRoleService.assignRole(
        currentUser.uid,
        academiaActual.id,
        roleToAssign,
        'Configuración inicial del sistema de roles'
      );

      if (result.success) {
        // 📝 Log del setup inicial
        await AuditLogger.logSecurityEvent({
          eventType: 'ROLE_CHANGE',
          severity: 'HIGH',
          success: true,
          userId: currentUser.uid,
          academiaId: academiaActual.id,
          details: {
            action: 'initial_setup',
            role: roleToAssign,
            isFirstUser: true
          }
        });

        setStatus({
          isComplete: true,
          isLoading: false,
          error: null,
          needsInitialSetup: false
        });

        return { success: true, message: `Rol ${roleToAssign} asignado correctamente` };
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error en setup inicial';
      
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      return { success: false, message: errorMessage };
    }
  };

  const skipMigrationTemporarily = () => {
    setStatus({
      isComplete: true,
      isLoading: false,
      error: null,
      needsInitialSetup: false
    });
  };

  return {
    status,
    performInitialSetup,
    skipMigrationTemporarily,
    checkMigrationStatus
  };
};
