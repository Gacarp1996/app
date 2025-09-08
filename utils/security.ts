// utils/security.ts
export class SecurityUtils {
  
  // 🛡️ SANITIZACIÓN DE INPUTS - PREVENIR XSS
  static sanitizeInput(input: string, userId?: string): string {
    if (!input || typeof input !== 'string') return '';
    
    const original = input;
    const sanitized = input
      .trim()
      // Remover scripts maliciosos
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      // Remover eventos peligrosos
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      // Escapar caracteres HTML peligrosos
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      // Limitar longitud
      .slice(0, 1000);

    // 🚨 LOG DE INTENTO XSS si se detecta contenido malicioso
    if (original !== sanitized && 
        (original.includes('<script') || original.includes('javascript:') || original.includes('on'))) {
      // Lazy import para evitar circular dependency
      import('./auditLogger').then(({ AuditLogger }) => {
        AuditLogger.logXSSAttempt(original, sanitized, userId);
      });
    }

    return sanitized;
  }

  // 🛡️ SANITIZACIÓN ESPECÍFICA PARA NOMBRES
  static sanitizeName(name: string): string {
    if (!name) return '';
    
    return name
      .trim()
      .replace(/[<>\"'&]/g, '') // Remover caracteres peligrosos
      .replace(/\s+/g, ' ') // Normalizar espacios
      .slice(0, 100); // Máximo 100 caracteres
  }

  // 🛡️ SANITIZACIÓN PARA EMAILS
  static sanitizeEmail(email: string): string {
    if (!email) return '';
    
    return email
      .trim()
      .toLowerCase()
      .replace(/[<>\"'&]/g, '')
      .slice(0, 254); // RFC 5321 limit
  }

  // 🛡️ VALIDACIÓN DE EMAIL
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  // 🛡️ VALIDACIÓN DE CONTRASEÑA FUERTE
  static validatePassword(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('La contraseña es requerida');
      return { isValid: false, errors };
    }
    
    if (password.length < 8) {
      errors.push('Mínimo 8 caracteres');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Debe contener al menos una letra minúscula');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Debe contener al menos una letra mayúscula');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Debe contener al menos un número');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Debe contener al menos un carácter especial');
    }
    
    if (password.length > 128) {
      errors.push('Máximo 128 caracteres');
    }
    
    // Verificar patrones comunes débiles
    const weakPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /(.)\1{3,}/ // 4 o más caracteres repetidos
    ];
    
    for (const pattern of weakPatterns) {
      if (pattern.test(password)) {
        errors.push('La contraseña contiene un patrón común débil');
        break;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // 🛡️ RATE LIMITING SIMPLE
  private static rateLimitMap = new Map<string, { count: number; lastReset: number }>();
  
  static checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000, userId?: string): boolean {
    const now = Date.now();
    const record = this.rateLimitMap.get(key);
    
    if (!record || now - record.lastReset > windowMs) {
      this.rateLimitMap.set(key, { count: 1, lastReset: now });
      return true;
    }
    
    if (record.count >= maxRequests) {
      // 🚨 LOG DE RATE LIMIT HIT
      import('./auditLogger').then(({ AuditLogger }) => {
        AuditLogger.logRateLimitHit(key, userId);
      });
      return false;
    }
    
    record.count++;
    return true;
  }

  // 🛡️ ESCAPE PARA PREVENIR INJECTION
  static escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 🛡️ VALIDACIÓN DE NÚMEROS
  static sanitizeNumber(value: any, min?: number, max?: number): number | null {
    const num = parseFloat(value);
    
    if (isNaN(num)) return null;
    if (min !== undefined && num < min) return min;
    if (max !== undefined && num > max) return max;
    
    return num;
  }
}
