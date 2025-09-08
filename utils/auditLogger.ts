// utils/auditLogger.ts
export interface AuditEvent {
  eventType: 'LOGIN' | 'LOGOUT' | 'REGISTER' | 'PASSWORD_CHANGE' | 'ROLE_CHANGE' | 
            'DATA_ACCESS' | 'DATA_MODIFY' | 'FAILED_LOGIN' | 'SUSPICIOUS_ACTIVITY' |
            'PERMISSION_DENIED' | 'RATE_LIMIT_HIT' | 'XSS_ATTEMPT';
  userId?: string;
  email?: string;
  academiaId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  success: boolean;
}

export class AuditLogger {
  
  // 🛡️ LOG DE EVENTOS DE SEGURIDAD
  static async logSecurityEvent(event: Omit<AuditEvent, 'timestamp' | 'ipAddress' | 'userAgent'>) {
    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent
    };

    // Log en consola para desarrollo
    if (import.meta.env.DEV) {
      console.group(`🛡️ AUDIT LOG - ${auditEvent.severity}`);
      console.log('Event:', auditEvent.eventType);
      console.log('User:', auditEvent.userId || auditEvent.email || 'Unknown');
      console.log('Details:', auditEvent.details);
      console.log('Timestamp:', auditEvent.timestamp);
      console.groupEnd();
    }

    // En producción, enviar a Firebase o servicio de logs
    if (import.meta.env.PROD) {
      try {
        await this.sendToFirestore(auditEvent);
      } catch (error) {
        console.error('Error sending audit log:', error);
      }
    }

    // Para eventos críticos, también alertar inmediatamente
    if (auditEvent.severity === 'CRITICAL') {
      await this.sendCriticalAlert(auditEvent);
    }
  }

  // 🔍 LOGS ESPECÍFICOS POR TIPO DE EVENTO

  static logSuccessfulLogin(userId: string, email: string, academiaId?: string) {
    this.logSecurityEvent({
      eventType: 'LOGIN',
      userId,
      email,
      academiaId,
      details: { loginMethod: 'email_password' },
      severity: 'LOW',
      success: true
    });
  }

  static logFailedLogin(email: string, reason: string, attemptCount: number) {
    this.logSecurityEvent({
      eventType: 'FAILED_LOGIN',
      email,
      details: { reason, attemptCount },
      severity: attemptCount >= 3 ? 'HIGH' : 'MEDIUM',
      success: false
    });
  }

  static logSuspiciousActivity(userId: string, activity: string, details: Record<string, any>) {
    this.logSecurityEvent({
      eventType: 'SUSPICIOUS_ACTIVITY',
      userId,
      details: { activity, ...details },
      severity: 'HIGH',
      success: false
    });
  }

  static logXSSAttempt(input: string, sanitized: string, userId?: string) {
    this.logSecurityEvent({
      eventType: 'XSS_ATTEMPT',
      userId,
      details: { 
        originalInput: input.slice(0, 200), // Limitar tamaño
        sanitizedInput: sanitized.slice(0, 200),
        inputLength: input.length
      },
      severity: 'HIGH',
      success: false
    });
  }

  static logRateLimitHit(key: string, userId?: string) {
    this.logSecurityEvent({
      eventType: 'RATE_LIMIT_HIT',
      userId,
      details: { rateLimitKey: key },
      severity: 'MEDIUM',
      success: false
    });
  }

  static logPermissionDenied(userId: string, attemptedAction: string, requiredRole: string, userRole: string) {
    this.logSecurityEvent({
      eventType: 'PERMISSION_DENIED',
      userId,
      details: { 
        attemptedAction, 
        requiredRole, 
        userRole 
      },
      severity: 'MEDIUM',
      success: false
    });
  }

  static logDataAccess(userId: string, dataType: string, resourceId: string, academiaId?: string) {
    this.logSecurityEvent({
      eventType: 'DATA_ACCESS',
      userId,
      academiaId,
      details: { dataType, resourceId },
      severity: 'LOW',
      success: true
    });
  }

  static logDataModification(userId: string, dataType: string, resourceId: string, changes: Record<string, any>) {
    this.logSecurityEvent({
      eventType: 'DATA_MODIFY',
      userId,
      details: { 
        dataType, 
        resourceId, 
        changes: Object.keys(changes) // Solo las claves, no los valores sensibles
      },
      severity: 'MEDIUM',
      success: true
    });
  }

  // 🌐 UTILIDADES

  private static async getClientIP(): Promise<string> {
    try {
      // En desarrollo, IP local
      if (import.meta.env.DEV) {
        return '127.0.0.1';
      }

      // En producción, usar timestamp como identificador único en lugar de IP
      // Esto evita problemas de CSP y GDPR
      return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } catch {
      return 'unknown';
    }
  }

  private static async sendToFirestore(event: AuditEvent) {
    // TODO: Implementar cuando tengamos Cloud Functions
    // Por ahora, guardar en localStorage para development
    if (import.meta.env.DEV) {
      const logs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
      logs.push(event);
      
      // Mantener solo los últimos 100 logs en localStorage
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('audit_logs', JSON.stringify(logs));
    }
  }

  private static async sendCriticalAlert(event: AuditEvent) {
    // TODO: Implementar alertas críticas (email, Slack, etc.)
    console.error('🚨 CRITICAL SECURITY EVENT:', event);
    
    // En desarrollo, mostrar notificación visual
    if (import.meta.env.DEV && 'Notification' in window) {
      new Notification('🚨 Critical Security Event', {
        body: `${event.eventType}: ${event.details}`,
        icon: '/favicon.ico'
      });
    }
  }

  // 📊 UTILIDADES PARA VER LOGS

  static getAuditLogs(): AuditEvent[] {
    if (import.meta.env.DEV) {
      return JSON.parse(localStorage.getItem('audit_logs') || '[]');
    }
    return [];
  }

  static clearAuditLogs() {
    if (import.meta.env.DEV) {
      localStorage.removeItem('audit_logs');
    }
  }

  static getSecuritySummary() {
    const logs = this.getAuditLogs();
    const summary = {
      total: logs.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      recentCritical: logs.filter(l => l.severity === 'CRITICAL').slice(-5)
    };

    logs.forEach(log => {
      summary.byType[log.eventType] = (summary.byType[log.eventType] || 0) + 1;
      summary.bySeverity[log.severity] = (summary.bySeverity[log.severity] || 0) + 1;
    });

    return summary;
  }
}
