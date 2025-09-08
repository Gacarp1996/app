// utils/inputValidator.ts
import { SecurityUtils } from './security';
import { AuditLogger } from './auditLogger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue: string;
  warnings: string[];
}

export class InputValidator {
  
  // 🛡️ VALIDACIÓN COMPLETA DE EMAIL
  static validateEmail(email: string, userId?: string): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      sanitizedValue: '',
      warnings: []
    };

    if (!email) {
      result.errors.push('Email es requerido');
      return result;
    }

    // Sanitizar primero
    result.sanitizedValue = SecurityUtils.sanitizeEmail(email);
    
    // Validaciones de seguridad
    if (email !== result.sanitizedValue) {
      result.warnings.push('Email contenía caracteres sospechosos que fueron removidos');
      AuditLogger.logXSSAttempt(email, result.sanitizedValue, userId);
    }

    // Validación de formato
    if (!SecurityUtils.isValidEmail(result.sanitizedValue)) {
      result.errors.push('Formato de email inválido');
      return result;
    }

    // Validación de longitud
    if (result.sanitizedValue.length > 254) {
      result.errors.push('Email demasiado largo (máximo 254 caracteres)');
      return result;
    }

    // Detectar patrones sospechosos
    const suspiciousPatterns = [
      /admin@/i,
      /root@/i,
      /test@test\./i,
      /noreply@/i,
      /donotreply@/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(result.sanitizedValue)) {
        result.warnings.push('Email con patrón potencialmente sospechoso');
        AuditLogger.logSuspiciousActivity(
          userId || 'unknown',
          'suspicious_email_pattern',
          { email: result.sanitizedValue, pattern: pattern.source }
        );
        break;
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  // 🛡️ VALIDACIÓN COMPLETA DE TEXTO GENERAL
  static validateText(text: string, maxLength: number = 100, fieldName: string = 'texto', userId?: string): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      sanitizedValue: '',
      warnings: []
    };

    if (!text) {
      result.errors.push(`${fieldName} es requerido`);
      return result;
    }

    // Sanitizar
    result.sanitizedValue = SecurityUtils.sanitizeInput(text, userId);

    // Detectar intentos XSS
    if (text !== result.sanitizedValue) {
      result.warnings.push('Contenido sospechoso fue sanitizado');
    }

    // Validación de longitud
    if (result.sanitizedValue.length > maxLength) {
      result.errors.push(`${fieldName} demasiado largo (máximo ${maxLength} caracteres)`);
      result.sanitizedValue = result.sanitizedValue.slice(0, maxLength);
    }

    // Validación de contenido mínimo
    if (result.sanitizedValue.trim().length < 2) {
      result.errors.push(`${fieldName} debe tener al menos 2 caracteres`);
      return result;
    }

    // Detectar spam patterns
    const spamPatterns = [
      /(.)\1{10,}/, // 10+ caracteres repetidos
      /https?:\/\//gi, // URLs
      /\b(viagra|casino|lottery|winner|congratulations)\b/gi
    ];

    for (const pattern of spamPatterns) {
      if (pattern.test(result.sanitizedValue)) {
        result.warnings.push('Contenido potencialmente spam detectado');
        AuditLogger.logSuspiciousActivity(
          userId || 'unknown',
          'potential_spam_content',
          { fieldName, content: result.sanitizedValue.slice(0, 50) }
        );
        break;
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  // 🛡️ VALIDACIÓN DE NÚMEROS CON SEGURIDAD
  static validateNumber(value: any, min?: number, max?: number, fieldName: string = 'número'): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      sanitizedValue: '',
      warnings: []
    };

    if (value === undefined || value === null || value === '') {
      result.errors.push(`${fieldName} es requerido`);
      return result;
    }

    const num = parseFloat(value);
    
    if (isNaN(num)) {
      result.errors.push(`${fieldName} debe ser un número válido`);
      return result;
    }

    if (min !== undefined && num < min) {
      result.errors.push(`${fieldName} debe ser mayor o igual a ${min}`);
      return result;
    }

    if (max !== undefined && num > max) {
      result.errors.push(`${fieldName} debe ser menor o igual a ${max}`);
      return result;
    }

    // Detectar valores extremos sospechosos
    if (Math.abs(num) > 1000000) {
      result.warnings.push('Valor numérico extremadamente alto detectado');
    }

    result.sanitizedValue = num.toString();
    result.isValid = true;
    return result;
  }

  // 🛡️ VALIDACIÓN DE ARCHIVO (para futuros uploads)
  static validateFile(file: File, allowedTypes: string[], maxSize: number = 5 * 1024 * 1024): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      sanitizedValue: file.name,
      warnings: []
    };

    // Validar tipo
    if (!allowedTypes.includes(file.type)) {
      result.errors.push(`Tipo de archivo no permitido. Permitidos: ${allowedTypes.join(', ')}`);
    }

    // Validar tamaño
    if (file.size > maxSize) {
      result.errors.push(`Archivo demasiado grande. Máximo: ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
    }

    // Sanitizar nombre
    result.sanitizedValue = file.name.replace(/[<>:"/\\|?*]/g, '_').slice(0, 100);

    if (file.name !== result.sanitizedValue) {
      result.warnings.push('Nombre de archivo contenía caracteres no permitidos');
    }

    // Detectar extensiones dobles sospechosas
    if (/\.(exe|bat|cmd|scr|pif|com|vbs|js)(\.|$)/i.test(file.name)) {
      result.errors.push('Extensión de archivo potencialmente peligrosa');
      AuditLogger.logSuspiciousActivity(
        'unknown',
        'dangerous_file_upload_attempt',
        { fileName: file.name, fileType: file.type, fileSize: file.size }
      );
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  // 🛡️ VALIDAR MÚLTIPLES CAMPOS A LA VEZ
  static validateForm(fields: Record<string, any>, rules: Record<string, any>): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};

    for (const [fieldName, value] of Object.entries(fields)) {
      const rule = rules[fieldName];
      if (!rule) continue;

      switch (rule.type) {
        case 'email':
          results[fieldName] = this.validateEmail(value, rule.userId);
          break;
        case 'text':
          results[fieldName] = this.validateText(value, rule.maxLength, fieldName, rule.userId);
          break;
        case 'number':
          results[fieldName] = this.validateNumber(value, rule.min, rule.max, fieldName);
          break;
        default:
          results[fieldName] = this.validateText(value, 100, fieldName, rule.userId);
      }
    }

    return results;
  }
}
