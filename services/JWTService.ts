// app/services/JWTService.ts
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, User } from 'firebase/auth';
import { AuditLogger } from '../utils/auditLogger';

interface UserRole {
  role: 'academyDirector' | 'academySubdirector' | 'academyCoach' | 'groupCoach' | 'assistantCoach';
  joinedAt: string;
}

interface CustomClaims {
  academias: Record<string, UserRole>;
  lastUpdated: string;
}

interface PermissionCheck {
  academiaId: string;
  requiredRole: string;
  action: string;
}

class JWTService {
  private functions = getFunctions();
  private auth = getAuth();

  // 🔥 ACTUALIZAR ROL DE USUARIO
  async updateUserRole(
    userId: string, 
    academiaId: string, 
    role: string, 
    updatedBy: string
  ): Promise<{ success: boolean; message: string; newClaims?: CustomClaims }> {
    try {
      const updateRole = httpsCallable(this.functions, 'updateUserRole');
      
      const result = await updateRole({
        userId,
        academiaId,
        role,
        updatedBy
      });

      if (result.data) {
        await AuditLogger.logSecurityEvent({
          eventType: 'ROLE_CHANGE',
          severity: 'HIGH',
          success: true,
          details: {
            targetUserId: userId,
            academiaId,
            newRole: role,
            updatedBy
          }
        });

        return result.data as { success: boolean; message: string; newClaims?: CustomClaims };
      }

      throw new Error('No se recibió respuesta del servidor');

    } catch (error) {
      await AuditLogger.logSecurityEvent({
        eventType: 'ROLE_CHANGE',
        severity: 'CRITICAL',
        success: false,
        details: {
          targetUserId: userId,
          academiaId,
          role,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Error al actualizar el rol del usuario'
      );
    }
  }

  // 🔥 VERIFICAR PERMISOS
  async verifyPermission(data: PermissionCheck): Promise<{
    success: boolean;
    userRole: string;
    hasPermission: boolean;
  }> {
    try {
      const verifyPerm = httpsCallable(this.functions, 'verifyPermission');
      
      const result = await verifyPerm(data);

      if (result.data) {
        const response = result.data as {
          success: boolean;
          userRole: string;
          hasPermission: boolean;
        };

        // Log de verificación exitosa
        if (!response.hasPermission) {
          await AuditLogger.logSecurityEvent({
            eventType: 'PERMISSION_DENIED',
            severity: 'MEDIUM',
            success: false,
            details: {
              action: data.action,
              academiaId: data.academiaId,
              requiredRole: data.requiredRole,
              userRole: response.userRole
            }
          });
        }

        return response;
      }

      throw new Error('No se recibió respuesta del servidor');

    } catch (error) {
      await AuditLogger.logSecurityEvent({
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        success: false,
        details: {
          action: data.action,
          academiaId: data.academiaId,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Error al verificar permisos'
      );
    }
  }

  // 🔥 OBTENER CLAIMS ACTUALES
  async getUserClaims(): Promise<{ success: boolean; claims: CustomClaims; userId: string }> {
    try {
      const getClaims = httpsCallable(this.functions, 'getUserClaims');
      
      const result = await getClaims();

      if (result.data) {
        return result.data as { success: boolean; claims: CustomClaims; userId: string };
      }

      throw new Error('No se recibió respuesta del servidor');

    } catch (error) {
      await AuditLogger.logSecurityEvent({
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Error al obtener claims del usuario'
      );
    }
  }

  // 🔥 REFRESCAR TOKEN
  async refreshUserToken(): Promise<{ success: boolean; message: string }> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      // Forzar refresh del token
      await currentUser.getIdToken(true);

      const refreshToken = httpsCallable(this.functions, 'refreshUserToken');
      const result = await refreshToken();

      if (result.data) {
        await AuditLogger.logSecurityEvent({
          eventType: 'LOGIN',
          severity: 'LOW',
          success: true,
          details: {
            userId: currentUser.uid,
            action: 'token_refresh'
          }
        });

        return result.data as { success: boolean; message: string };
      }

      throw new Error('No se recibió respuesta del servidor');

    } catch (error) {
      await AuditLogger.logSecurityEvent({
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'MEDIUM',
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'token_refresh_failed'
        }
      });

      throw new Error(
        error instanceof Error 
          ? error.message 
          : 'Error al refrescar token'
      );
    }
  }

  // 🛡️ VERIFICAR SI USUARIO PUEDE GESTIONAR ROLES
  async canManageUsers(academiaId: string): Promise<boolean> {
    try {
      const result = await this.verifyPermission({
        academiaId,
        requiredRole: 'academySubdirector', // Mínimo requerido para gestionar usuarios
        action: 'manage_users'
      });

      return result.hasPermission;
    } catch (error) {
      console.error('Error verificando permisos de gestión:', error);
      return false;
    }
  }

  // 🛡️ VERIFICAR ROL ESPECÍFICO
  async hasRole(academiaId: string, requiredRole: string): Promise<boolean> {
    try {
      const result = await this.verifyPermission({
        academiaId,
        requiredRole,
        action: `check_role_${requiredRole}`
      });

      return result.hasPermission;
    } catch (error) {
      console.error('Error verificando rol:', error);
      return false;
    }
  }

  // 🛡️ OBTENER ROL DEL USUARIO EN ACADEMIA
  async getUserRoleInAcademia(academiaId: string): Promise<string | null> {
    try {
      const claims = await this.getUserClaims();
      return claims.claims.academias[academiaId]?.role || null;
    } catch (error) {
      console.error('Error obteniendo rol del usuario:', error);
      return null;
    }
  }

  // 🛡️ MIDDLEWARE PARA PROTEGER ACCIONES
  async requirePermission(
    academiaId: string, 
    requiredRole: string, 
    action: string
  ): Promise<void> {
    const result = await this.verifyPermission({
      academiaId,
      requiredRole,
      action
    });

    if (!result.hasPermission) {
      throw new Error(
        `Acceso denegado. Se requiere rol: ${requiredRole}, actual: ${result.userRole}`
      );
    }
  }

  // 🔥 VALIDAR TOKEN JWT ACTUAL
  async validateCurrentToken(): Promise<boolean> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        return false;
      }

      // Obtener token actual
      const token = await currentUser.getIdToken();
      
      // Verificar que el token contiene claims personalizados
      const tokenResult = await currentUser.getIdTokenResult();
      const hasCustomClaims = tokenResult.claims.academias !== undefined;

      if (!hasCustomClaims) {
        // Token sin claims personalizados, necesita refresh
        await this.refreshUserToken();
        return false;
      }

      await AuditLogger.logSecurityEvent({
        eventType: 'LOGIN',
        severity: 'LOW',
        success: true,
        details: {
          userId: currentUser.uid,
          hasCustomClaims,
          action: 'token_validation'
        }
      });

      return true;

    } catch (error) {
      await AuditLogger.logSecurityEvent({
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'MEDIUM',
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'token_validation_failed'
        }
      });

      return false;
    }
  }
}

// Singleton instance
export const jwtService = new JWTService();
export default jwtService;
