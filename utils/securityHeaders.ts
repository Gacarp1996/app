// utils/securityHeaders.ts - Configuración de Headers de Seguridad
export const securityHeaders = {
  // Content Security Policy - Prevenir XSS
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://www.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://firestore.googleapis.com wss://*.firebaseio.com",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),

  // Prevenir que el sitio sea embebido en iframes
  'X-Frame-Options': 'DENY',

  // Prevenir MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Habilitar XSS protection del navegador
  'X-XSS-Protection': '1; mode=block',

  // Forzar HTTPS (solo en producción)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Controlar información del referrer
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Controlar qué características del navegador puede usar el sitio
  'Permissions-Policy': [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'speaker=()'
  ].join(', '),

  // Prevenir carga de recursos de otros dominios
  'Cross-Origin-Embedder-Policy': 'credentialless',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site'
};

// Función para aplicar headers en desarrollo (middleware)
export const applySecurityHeaders = (response: any) => {
  Object.entries(securityHeaders).forEach(([header, value]) => {
    // En desarrollo, no aplicar HSTS
    if (header === 'Strict-Transport-Security' && import.meta.env.DEV) {
      return;
    }
    response.setHeader(header, value);
  });
};

// Configuración para Vite en desarrollo
export const viteSecurityHeaders = () => {
  return {
    name: 'security-headers',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        // Aplicar headers de seguridad en desarrollo
        Object.entries(securityHeaders).forEach(([header, value]) => {
          if (header !== 'Strict-Transport-Security') { // No HSTS en dev
            res.setHeader(header, value);
          }
        });
        next();
      });
    }
  };
};

// Validación de entorno seguro
export const validateSecureEnvironment = () => {
  const checks = {
    httpsInProduction: true,
    firebaseConfigSecure: true,
    noDebugInProduction: true,
    validDomain: true
  };

  // Verificar HTTPS en producción
  if (!import.meta.env.DEV && window.location.protocol !== 'https:') {
    checks.httpsInProduction = false;
    console.warn('⚠️ SEGURIDAD: Aplicación en producción sin HTTPS');
  }

  // Verificar que no hay claves de Firebase expuestas
  const firebaseConfig = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!firebaseConfig || firebaseConfig.includes('your-api-key')) {
    checks.firebaseConfigSecure = false;
    console.warn('⚠️ SEGURIDAD: Configuración de Firebase no válida');
  }

  // Verificar que no está en modo debug en producción
  if (!import.meta.env.DEV && import.meta.env.VITE_DEBUG === 'true') {
    checks.noDebugInProduction = false;
    console.warn('⚠️ SEGURIDAD: Modo debug habilitado en producción');
  }

  // Verificar dominio válido en producción
  if (!import.meta.env.DEV) {
    const allowedDomains = [
      'localhost', 
      'teniscoaching-app.web.app', 
      'tennis-academy-34074.web.app',
      'tenniscoachingapp.com',
      'your-domain.com'
    ];
    const currentDomain = window.location.hostname;
    if (!allowedDomains.includes(currentDomain)) {
      checks.validDomain = false;
      console.warn('⚠️ SEGURIDAD: Dominio no autorizado:', currentDomain);
    }
  }

  return checks;
};

// Rate limiting básico para prevenir ataques
class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return false;
    }

    if (now > attempt.resetTime) {
      this.attempts.set(identifier, { count: 1, resetTime: now + this.windowMs });
      return false;
    }

    attempt.count++;
    return attempt.count > this.maxAttempts;
  }

  getRemainingAttempts(identifier: string): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt || Date.now() > attempt.resetTime) {
      return this.maxAttempts;
    }
    return Math.max(0, this.maxAttempts - attempt.count);
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Instancias de rate limiters para diferentes acciones
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 intentos por 15 min
export const roleChangeRateLimiter = new RateLimiter(3, 60 * 60 * 1000); // 3 cambios por hora
export const dataAccessRateLimiter = new RateLimiter(100, 60 * 1000); // 100 accesos por minuto

// Hook para usar rate limiting
export const useRateLimit = (type: 'login' | 'roleChange' | 'dataAccess') => {
  const limiter = {
    login: loginRateLimiter,
    roleChange: roleChangeRateLimiter,
    dataAccess: dataAccessRateLimiter
  }[type];

  return {
    isRateLimited: (identifier: string) => limiter.isRateLimited(identifier),
    getRemainingAttempts: (identifier: string) => limiter.getRemainingAttempts(identifier),
    reset: (identifier: string) => limiter.reset(identifier)
  };
};
