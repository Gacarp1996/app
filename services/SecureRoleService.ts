// app/services/SecureRoleService.ts
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  addDoc 
} from 'firebase/firestore';
import { getAuth, User } from 'firebase/auth';
import { db } from '../firebase/firebase-config';
import { AuditLogger } from '../utils/auditLogger';

// 🛡️ TIPOS DE ROLES
export type UserRole = 'academyDirector' | 'academySubdirector' | 'academyCoach' | 'groupCoach' | 'assistantCoach';

interface UserRoleData {
  userId: string;
  academiaId: string;
  role: UserRole;
  assignedBy: string;
  assignedAt: string;
  lastUpdated: string;
  isActive: boolean;
}

interface RoleValidation {
  isValid: boolean;
  userRole: UserRole | null;
  hasPermission: boolean;
  reason?: string;
}

class SecureRoleService {
  private auth = getAuth();

  // 🔥 JERARQUÍA DE ROLES (INMUTABLE)
  private readonly ROLE_HIERARCHY: Record<UserRole, number> = {
    'academyDirector': 5,
    'academySubdirector': 4,
    'academyCoach': 3,
    'groupCoach': 2,
    'assistantCoach': 1
  };

  // 🛡️ PERMISOS POR ROL (INMUTABLE)
  private readonly ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    'academyDirector': [
      'manage_users', 'delete_users', 'manage_academy', 'view_all_data',
      'manage_tournaments', 'manage_training_plans', 'view_analytics'
    ],
    'academySubdirector': [
      'manage_users', 'manage_academy', 'view_all_data',
      'manage_tournaments', 'manage_training_plans', 'view_analytics'
    ],
    'academyCoach': [
      'view_all_data', 'manage_training_plans', 'view_analytics', 'manage_players'
    ],
    'groupCoach': [
      'view_group_data', 'manage_group_training', 'view_group_analytics'
    ],
    'assistantCoach': [
      'view_assigned_data', 'assist_training'
    ]
  };

  // 🔥 ASIGNAR ROL (CON VALIDACIÓN MÚLTIPLE)
  async assignRole(
    targetUserId: string,
    academiaId: string,
    newRole: UserRole,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      // 🛡️ VERIFICAR PERMISOS DEL USUARIO ACTUAL
      const canAssign = await this.canManageUsers(currentUser.uid, academiaId);
      if (!canAssign.hasPermission) {
        throw new Error(`Sin permisos para asignar roles: ${canAssign.reason}`);
      }

      // 🛡️ VERIFICAR JERARQUÍA
      const currentUserRole = await this.getUserRole(currentUser.uid, academiaId);
      if (!this.canAssignRole(currentUserRole, newRole)) {
        throw new Error(`No puedes asignar un rol igual o superior al tuyo`);
      }

      // 🔥 GUARDAR EN FIRESTORE (COLECCIÓN SEGURA)
      const roleData: UserRoleData = {
        userId: targetUserId,
        academiaId,
        role: newRole,
        assignedBy: currentUser.uid,
        assignedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        isActive: true
      };

      await setDoc(
        doc(db, 'secure_user_roles', `${targetUserId}_${academiaId}`),
        roleData
      );

      // 📝 LOG DE AUDITORÍA
      await AuditLogger.logSecurityEvent({
        eventType: 'ROLE_CHANGE',
        severity: 'HIGH',
        success: true,
        userId: currentUser.uid,
        academiaId,
        details: {
          targetUserId,
          newRole,
          assignedBy: currentUser.uid,
          reason: reason || 'No especificado'
        }
      });

      return {
        success: true,
        message: `Rol ${newRole} asignado correctamente`
      };

    } catch (error) {
      await AuditLogger.logSecurityEvent({
        eventType: 'ROLE_CHANGE',
        severity: 'CRITICAL',
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          targetUserId,
          academiaId,
          attemptedRole: newRole
        }
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // 🛡️ VERIFICAR PERMISOS
  async verifyPermission(
    userId: string,
    academiaId: string,
    requiredPermission: string
  ): Promise<RoleValidation> {
    try {
      // 🔍 OBTENER ROL DESDE FIRESTORE
      const userRole = await this.getUserRole(userId, academiaId);
      
      if (!userRole) {
        return {
          isValid: false,
          userRole: null,
          hasPermission: false,
          reason: 'Usuario sin rol asignado'
        };
      }

      // 🔍 VERIFICAR PERMISOS
      const permissions = this.ROLE_PERMISSIONS[userRole];
      const hasPermission = permissions.includes(requiredPermission);

      // 📝 LOG SI NO TIENE PERMISOS
      if (!hasPermission) {
        await AuditLogger.logSecurityEvent({
          eventType: 'PERMISSION_DENIED',
          severity: 'MEDIUM',
          success: false,
          userId,
          academiaId,
          details: {
            requiredPermission,
            userRole,
            availablePermissions: permissions
          }
        });
      }

      return {
        isValid: true,
        userRole,
        hasPermission,
        reason: hasPermission ? 'Permitido' : 'Permiso insuficiente'
      };

    } catch (error) {
      await AuditLogger.logSecurityEvent({
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        success: false,
        userId,
        academiaId,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          action: 'verify_permission'
        }
      });

      return {
        isValid: false,
        userRole: null,
        hasPermission: false,
        reason: 'Error al verificar permisos'
      };
    }
  }

  // 🔍 OBTENER ROL DE USUARIO
  async getUserRole(userId: string, academiaId: string): Promise<UserRole | null> {
    try {
      const roleDoc = await getDoc(
        doc(db, 'secure_user_roles', `${userId}_${academiaId}`)
      );

      if (!roleDoc.exists()) {
        return null;
      }

      const data = roleDoc.data() as UserRoleData;
      return data.isActive ? data.role : null;

    } catch (error) {
      console.error('Error obteniendo rol:', error);
      return null;
    }
  }

  // 🛡️ VERIFICAR SI PUEDE GESTIONAR USUARIOS
  async canManageUsers(userId: string, academiaId: string): Promise<RoleValidation> {
    return this.verifyPermission(userId, academiaId, 'manage_users');
  }

  // 🛡️ VERIFICAR JERARQUÍA DE ROLES
  private canAssignRole(currentRole: UserRole | null, targetRole: UserRole): boolean {
    if (!currentRole) return false;
    
    const currentLevel = this.ROLE_HIERARCHY[currentRole];
    const targetLevel = this.ROLE_HIERARCHY[targetRole];
    
    // Solo puede asignar roles de nivel inferior
    return currentLevel > targetLevel;
  }

  // 🔥 MIDDLEWARE PARA PROTEGER ACCIONES
  async requirePermission(
    userId: string,
    academiaId: string,
    requiredPermission: string,
    action: string
  ): Promise<void> {
    const validation = await this.verifyPermission(userId, academiaId, requiredPermission);
    
    if (!validation.hasPermission) {
      throw new Error(
        `Acceso denegado para "${action}". ${validation.reason}. Rol actual: ${validation.userRole || 'ninguno'}`
      );
    }
  }

  // 📊 OBTENER TODOS LOS USUARIOS CON ROLES
  async getAcademiaUsers(academiaId: string): Promise<Array<{
    userId: string;
    role: UserRole;
    assignedBy: string;
    assignedAt: string;
  }>> {
    try {
      const q = query(
        collection(db, 'secure_user_roles'),
        where('academiaId', '==', academiaId),
        where('isActive', '==', true)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data() as UserRoleData;
        return {
          userId: data.userId,
          role: data.role,
          assignedBy: data.assignedBy,
          assignedAt: data.assignedAt
        };
      });

    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      return [];
    }
  }

  // 🚫 REVOCAR ROL
  async revokeRole(targetUserId: string, academiaId: string): Promise<{ success: boolean; message: string }> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuario no autenticado');
      }

      // Verificar permisos
      const canRevoke = await this.canManageUsers(currentUser.uid, academiaId);
      if (!canRevoke.hasPermission) {
        throw new Error('Sin permisos para revocar roles');
      }

      // Marcar como inactivo
      await updateDoc(
        doc(db, 'secure_user_roles', `${targetUserId}_${academiaId}`),
        {
          isActive: false,
          revokedBy: currentUser.uid,
          revokedAt: new Date().toISOString()
        }
      );

      // Log de auditoría
      await AuditLogger.logSecurityEvent({
        eventType: 'ROLE_CHANGE',
        severity: 'HIGH',
        success: true,
        userId: currentUser.uid,
        academiaId,
        details: {
          action: 'revoke_role',
          targetUserId,
          revokedBy: currentUser.uid
        }
      });

      return { success: true, message: 'Rol revocado correctamente' };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // 🎯 PREPARADO PARA CLOUD FUNCTIONS (FUTURO)
  async migrateToCloudFunctions(): Promise<void> {
    console.log('🚀 Sistema listo para migrar a Cloud Functions cuando se upgradie el plan');
    // Aquí se implementará la migración automática cuando se upgradie
  }
}

// Singleton instance
export const secureRoleService = new SecureRoleService();
export default secureRoleService;
