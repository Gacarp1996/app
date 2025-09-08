// utils/advancedRateLimiter.ts
import { AuditLogger } from './auditLogger';

interface RateLimitRule {
  key: string;
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
  userId?: string;
}

interface RateLimitRecord {
  count: number;
  firstRequest: number;
  lastRequest: number;
  isBlocked: boolean;
  blockedUntil?: number;
}

export class AdvancedRateLimiter {
  private static storage = new Map<string, RateLimitRecord>();
  
  // 🛡️ RATE LIMITING AVANZADO
  static checkRateLimit(rule: RateLimitRule): { allowed: boolean; resetTime?: number; retryAfter?: number } {
    const now = Date.now();
    const record = this.storage.get(rule.key);

    // Si no existe record, crear uno nuevo
    if (!record) {
      this.storage.set(rule.key, {
        count: 1,
        firstRequest: now,
        lastRequest: now,
        isBlocked: false
      });
      return { allowed: true };
    }

    // Verificar si está bloqueado
    if (record.isBlocked && record.blockedUntil && now < record.blockedUntil) {
      return {
        allowed: false,
        retryAfter: Math.ceil((record.blockedUntil - now) / 1000)
      };
    }

    // Reset si ha pasado la ventana de tiempo
    if (now - record.firstRequest > rule.windowMs) {
      record.count = 1;
      record.firstRequest = now;
      record.lastRequest = now;
      record.isBlocked = false;
      record.blockedUntil = undefined;
      return { allowed: true };
    }

    // Incrementar contador
    record.count++;
    record.lastRequest = now;

    // Verificar límite
    if (record.count > rule.maxRequests) {
      record.isBlocked = true;
      record.blockedUntil = now + (rule.blockDurationMs || rule.windowMs);

      // Log del rate limit hit
      AuditLogger.logRateLimitHit(rule.key, rule.userId);

      return {
        allowed: false,
        resetTime: Math.ceil((record.firstRequest + rule.windowMs - now) / 1000),
        retryAfter: Math.ceil((record.blockedUntil - now) / 1000)
      };
    }

    return { 
      allowed: true,
      resetTime: Math.ceil((record.firstRequest + rule.windowMs - now) / 1000)
    };
  }

  // 🎯 RATE LIMITS PREDEFINIDOS PARA LA APP
  
  // Login attempts - 5 intentos por 15 minutos
  static checkLoginAttempts(email: string): { allowed: boolean; retryAfter?: number } {
    const result = this.checkRateLimit({
      key: `login_${email}`,
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutos
      blockDurationMs: 30 * 60 * 1000 // Bloquear 30 minutos
    });
    return result;
  }

  // Registration attempts - 3 registros por hora por IP
  static checkRegistrationAttempts(ip: string): { allowed: boolean; retryAfter?: number } {
    const result = this.checkRateLimit({
      key: `register_${ip}`,
      maxRequests: 3,
      windowMs: 60 * 60 * 1000, // 1 hora
      blockDurationMs: 60 * 60 * 1000 // Bloquear 1 hora
    });
    return result;
  }

  // API calls generales - 100 por minuto por usuario
  static checkApiCalls(userId: string): { allowed: boolean; retryAfter?: number } {
    const result = this.checkRateLimit({
      key: `api_${userId}`,
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minuto
      userId
    });
    return result;
  }

  // 🧹 LIMPIEZA Y MANTENIMIENTO
  static cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, record] of this.storage.entries()) {
      const isExpired = now - record.lastRequest > 24 * 60 * 60 * 1000; // 24 horas
      const blockExpired = record.isBlocked && record.blockedUntil && now > record.blockedUntil;
      
      if (isExpired || blockExpired) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.storage.delete(key));
  }

  // Obtener estadísticas
  static getStats() {
    return {
      totalKeys: this.storage.size,
      blockedKeys: Array.from(this.storage.values()).filter(r => r.isBlocked).length
    };
  }
}

// 🧹 Auto-cleanup cada 30 minutos
if (typeof window !== 'undefined') {
  setInterval(() => {
    AdvancedRateLimiter.cleanup();
  }, 30 * 60 * 1000);
}
