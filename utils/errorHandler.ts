// utils/errorHandler.ts
import { AuditLogger } from './auditLogger';

export interface SecurityError {
  type: 'AUTHENTICATION' | 'AUTHORIZATION' | 'VALIDATION' | 'RATE_LIMIT' | 'XSS' | 'INJECTION' | 'UNKNOWN';
  code: string;
  message: string;
  userMessage: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  shouldLog: boolean;
  shouldAlert: boolean;
}

export class GlobalErrorHandler {
  
  // 🛡️ MAPEO SEGURO DE ERRORES
  private static errorMappings: Record<string, SecurityError> = {
    // Firebase Auth Errors
    'auth/user-not-found': {
      type: 'AUTHENTICATION',
      code: 'auth/user-not-found',
      message: 'Usuario no encontrado en la base de datos',
      userMessage: 'Usuario no encontrado',
      severity: 'MEDIUM',
      shouldLog: true,
      shouldAlert: false
    },
    'auth/wrong-password': {
      type: 'AUTHENTICATION',
      code: 'auth/wrong-password',
      message: 'Contraseña incorrecta proporcionada',
      userMessage: 'Contraseña incorrecta',
      severity: 'MEDIUM',
      shouldLog: true,
      shouldAlert: false
    },
    'auth/invalid-credential': {
      type: 'AUTHENTICATION',
      code: 'auth/invalid-credential',
      message: 'Credenciales inválidas',
      userMessage: 'Credenciales incorrectas',
      severity: 'MEDIUM',
      shouldLog: true,
      shouldAlert: false
    },
    'auth/too-many-requests': {
      type: 'RATE_LIMIT',
      code: 'auth/too-many-requests',
      message: 'Demasiados intentos de autenticación',
      userMessage: 'Demasiados intentos. Cuenta temporalmente bloqueada',
      severity: 'HIGH',
      shouldLog: true,
      shouldAlert: true
    },
    'auth/user-disabled': {
      type: 'AUTHORIZATION',
      code: 'auth/user-disabled',
      message: 'Cuenta de usuario deshabilitada',
      userMessage: 'Cuenta deshabilitada',
      severity: 'HIGH',
      shouldLog: true,
      shouldAlert: true
    },
    'auth/email-already-in-use': {
      type: 'VALIDATION',
      code: 'auth/email-already-in-use',
      message: 'Email ya está en uso',
      userMessage: 'Este email ya está registrado',
      severity: 'LOW',
      shouldLog: true,
      shouldAlert: false
    },
    'auth/weak-password': {
      type: 'VALIDATION',
      code: 'auth/weak-password',
      message: 'Contraseña débil proporcionada',
      userMessage: 'La contraseña debe tener al menos 6 caracteres',
      severity: 'MEDIUM',
      shouldLog: true,
      shouldAlert: false
    },
    'auth/invalid-email': {
      type: 'VALIDATION',
      code: 'auth/invalid-email',
      message: 'Email inválido proporcionado',
      userMessage: 'Email inválido',
      severity: 'LOW',
      shouldLog: true,
      shouldAlert: false
    },
    'permission-denied': {
      type: 'AUTHORIZATION',
      code: 'permission-denied',
      message: 'Permisos insuficientes para la operación',
      userMessage: 'No tienes permisos para realizar esta acción',
      severity: 'HIGH',
      shouldLog: true,
      shouldAlert: true
    },
    'firestore/permission-denied': {
      type: 'AUTHORIZATION',
      code: 'firestore/permission-denied',
      message: 'Acceso denegado a Firestore',
      userMessage: 'Acceso denegado',
      severity: 'HIGH',
      shouldLog: true,
      shouldAlert: true
    }
  };

  // 🛡️ MANEJAR ERROR DE FORMA SEGURA
  static handleError(error: any, context?: string, userId?: string): SecurityError {
    const errorCode = error?.code || error?.name || 'unknown';
    const securityError = this.errorMappings[errorCode] || this.createUnknownError(error);

    // Log del error si es necesario
    if (securityError.shouldLog) {
      AuditLogger.logSecurityEvent({
        eventType: this.getEventType(securityError.type),
        userId,
        details: {
          errorCode: securityError.code,
          context: context || 'unknown',
          message: securityError.message,
          stack: import.meta.env.DEV ? error?.stack : 'hidden'
        },
        severity: securityError.severity,
        success: false
      });
    }

    // Alerta crítica si es necesario
    if (securityError.shouldAlert) {
      this.sendCriticalAlert(securityError, context, userId);
    }

    return securityError;
  }

  // 🚨 DETECTAR PATRONES DE ATAQUE
  static detectAttackPattern(errors: SecurityError[], timeWindow: number = 300000): boolean {
    const now = Date.now();
    const recentErrors = errors.filter(e => now - new Date(e.message).getTime() < timeWindow);

    // Múltiples errores de autenticación
    const authErrors = recentErrors.filter(e => e.type === 'AUTHENTICATION').length;
    if (authErrors >= 5) {
      AuditLogger.logSuspiciousActivity(
        'unknown',
        'multiple_authentication_failures',
        { errorCount: authErrors, timeWindow: timeWindow / 1000 }
      );
      return true;
    }

    // Múltiples errores de autorización
    const authzErrors = recentErrors.filter(e => e.type === 'AUTHORIZATION').length;
    if (authzErrors >= 3) {
      AuditLogger.logSuspiciousActivity(
        'unknown',
        'multiple_authorization_failures',
        { errorCount: authzErrors, timeWindow: timeWindow / 1000 }
      );
      return true;
    }

    return false;
  }

  // 🔍 UTILIDADES PRIVADAS
  private static createUnknownError(error: any): SecurityError {
    return {
      type: 'UNKNOWN',
      code: 'unknown-error',
      message: `Error desconocido: ${error?.message || 'Sin detalles'}`,
      userMessage: 'Ha ocurrido un error inesperado',
      severity: 'MEDIUM',
      shouldLog: true,
      shouldAlert: false
    };
  }

  private static getEventType(errorType: string): any {
    switch (errorType) {
      case 'AUTHENTICATION': return 'FAILED_LOGIN';
      case 'AUTHORIZATION': return 'PERMISSION_DENIED';
      case 'RATE_LIMIT': return 'RATE_LIMIT_HIT';
      case 'XSS': return 'XSS_ATTEMPT';
      default: return 'SUSPICIOUS_ACTIVITY';
    }
  }

  private static sendCriticalAlert(error: SecurityError, context?: string, userId?: string) {
    console.error('🚨 CRITICAL SECURITY ALERT:', {
      error: error.code,
      severity: error.severity,
      context,
      userId,
      timestamp: new Date().toISOString()
    });

    // En producción, aquí enviarías a servicios de alertas (email, Slack, etc.)
  }

  // 📊 ESTADÍSTICAS DE ERRORES
  static getErrorStats(): Record<string, number> {
    const logs = AuditLogger.getAuditLogs();
    const errorStats: Record<string, number> = {};

    logs.forEach(log => {
      if (!log.success && log.details?.errorCode) {
        errorStats[log.details.errorCode] = (errorStats[log.details.errorCode] || 0) + 1;
      }
    });

    return errorStats;
  }
}
