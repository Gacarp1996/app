// utils/securityAudit.ts - Sistema de Auditoría de Seguridad
import { db } from '../firebase/firebase-config';
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { UserRole } from '../Database/FirebaseRoles';

export interface SecurityEvent {
  type: 'USER_LOGIN' | 'USER_LOGOUT' | 'ROLE_CHANGE' | 'USER_ADDED' | 'USER_REMOVED' | 'PERMISSION_DENIED' | 'SUSPICIOUS_ACTIVITY' | 'DATA_ACCESS' | 'CONFIG_CHANGE' | 'ACADEMIA_CREATED' | 'ACADEMIA_DELETED';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId: string;
  userEmail?: string;
  academiaId: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: any; // Firestore timestamp
}

export interface AuditLogEntry {
  id?: string;
  event: SecurityEvent;
  createdAt: any;
}

// Función principal para registrar eventos de seguridad
export const logSecurityEvent = async (event: Omit<SecurityEvent, 'timestamp'>): Promise<void> => {
  try {
    const auditEvent: SecurityEvent = {
      ...event,
      timestamp: serverTimestamp()
    };

    // Registrar en Firestore
    await addDoc(collection(db, 'securityAudit'), auditEvent);

    // También registrar en consola según severidad
    switch (event.severity) {
      case 'CRITICAL':
        console.error('🚨 CRITICAL SECURITY EVENT:', event);
        break;
      case 'HIGH':
        console.warn('⚠️ HIGH SEVERITY SECURITY EVENT:', event);
        break;
      case 'MEDIUM':
        console.warn('⚡ MEDIUM SECURITY EVENT:', event);
        break;
      case 'LOW':
        console.log('📝 SECURITY EVENT:', event);
        break;
    }
  } catch (error) {
    console.error('Error logging security event:', error);
    // No lanzar error para no interrumpir la operación principal
  }
};

// Funciones específicas para eventos comunes

export const logRoleChange = async (params: {
  userId: string;
  userEmail: string;
  academiaId: string;
  oldRole: UserRole | null;
  newRole: UserRole;
  changedBy: string;
  changedByEmail: string;
}) => {
  await logSecurityEvent({
    type: 'ROLE_CHANGE',
    severity: 'HIGH',
    userId: params.changedBy,
    userEmail: params.changedByEmail,
    academiaId: params.academiaId,
    action: 'Role assignment changed',
    details: {
      targetUserId: params.userId,
      targetUserEmail: params.userEmail,
      oldRole: params.oldRole,
      newRole: params.newRole,
      reason: 'Manual role change'
    }
  });
};

export const logUserAdded = async (params: {
  newUserId: string;
  newUserEmail: string;
  academiaId: string;
  role: UserRole;
  addedBy: string;
  addedByEmail: string;
}) => {
  await logSecurityEvent({
    type: 'USER_ADDED',
    severity: 'MEDIUM',
    userId: params.addedBy,
    userEmail: params.addedByEmail,
    academiaId: params.academiaId,
    action: 'User added to academia',
    details: {
      newUserId: params.newUserId,
      newUserEmail: params.newUserEmail,
      assignedRole: params.role
    }
  });
};

export const logPermissionDenied = async (params: {
  userId: string;
  userEmail: string;
  academiaId: string;
  attemptedAction: string;
  userRole?: UserRole | null;
  requiredRole?: UserRole;
}) => {
  await logSecurityEvent({
    type: 'PERMISSION_DENIED',
    severity: 'MEDIUM',
    userId: params.userId,
    userEmail: params.userEmail,
    academiaId: params.academiaId,
    action: 'Permission denied',
    details: {
      attemptedAction: params.attemptedAction,
      userRole: params.userRole,
      requiredRole: params.requiredRole
    }
  });
};

export const logSuspiciousActivity = async (params: {
  userId: string;
  userEmail: string;
  academiaId: string;
  suspiciousAction: string;
  details: Record<string, any>;
}) => {
  await logSecurityEvent({
    type: 'SUSPICIOUS_ACTIVITY',
    severity: 'CRITICAL',
    userId: params.userId,
    userEmail: params.userEmail,
    academiaId: params.academiaId,
    action: 'Suspicious activity detected',
    details: {
      suspiciousAction: params.suspiciousAction,
      ...params.details
    }
  });
};

export const logDataAccess = async (params: {
  userId: string;
  userEmail: string;
  academiaId: string;
  dataType: string;
  action: 'READ' | 'WRITE' | 'DELETE';
  recordCount?: number;
}) => {
  await logSecurityEvent({
    type: 'DATA_ACCESS',
    severity: 'LOW',
    userId: params.userId,
    userEmail: params.userEmail,
    academiaId: params.academiaId,
    action: `Data ${params.action.toLowerCase()}`,
    details: {
      dataType: params.dataType,
      operation: params.action,
      recordCount: params.recordCount || 1
    }
  });
};

export const logConfigChange = async (params: {
  userId: string;
  userEmail: string;
  academiaId: string;
  configType: string;
  oldValue: any;
  newValue: any;
}) => {
  await logSecurityEvent({
    type: 'CONFIG_CHANGE',
    severity: 'HIGH',
    userId: params.userId,
    userEmail: params.userEmail,
    academiaId: params.academiaId,
    action: 'Configuration changed',
    details: {
      configType: params.configType,
      oldValue: params.oldValue,
      newValue: params.newValue
    }
  });
};

// Función para obtener logs de auditoría (solo para administradores)
export const getSecurityLogs = async (academiaId: string, limit_: number = 100): Promise<AuditLogEntry[]> => {
  try {
    const logsQuery = query(
      collection(db, 'securityAudit'),
      where('academiaId', '==', academiaId),
      orderBy('timestamp', 'desc'),
      limit(limit_)
    );
    
    const querySnapshot = await getDocs(logsQuery);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      event: doc.data() as SecurityEvent,
      createdAt: doc.data().timestamp
    }));
  } catch (error) {
    console.error('Error fetching security logs:', error);
    return [];
  }
};

// Función para detectar patrones sospechosos
export const detectSuspiciousPatterns = async (userId: string, academiaId: string): Promise<boolean> => {
  try {
    const recentLogsQuery = query(
      collection(db, 'securityAudit'),
      where('userId', '==', userId),
      where('academiaId', '==', academiaId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    
    const querySnapshot = await getDocs(recentLogsQuery);
    const events = querySnapshot.docs.map(doc => doc.data() as SecurityEvent);
    
    // Detectar múltiples intentos de permisos denegados
    const deniedEvents = events.filter(e => e.type === 'PERMISSION_DENIED');
    if (deniedEvents.length > 5) {
      await logSuspiciousActivity({
        userId,
        userEmail: deniedEvents[0]?.userEmail || 'unknown',
        academiaId,
        suspiciousAction: 'Multiple permission denied attempts',
        details: {
          deniedAttempts: deniedEvents.length,
          timeframe: '5 minutes'
        }
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error detecting suspicious patterns:', error);
    return false;
  }
};
