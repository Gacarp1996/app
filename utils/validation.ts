// utils/validation.ts - ARCHIVO COMPLETO CON VALIDACIONES ESTRICTAS
import { TipoType, AreaType, getAreasForTipo, getEjerciciosForTipoArea, tipoRequiereEjercicios } from '../constants/training';
import { 
  TrainingSession, 
  LoggedExercise, 
  Player, 
  TrainingPlan,
  VALIDATION_CONSTANTS
} from '../types/types';
import { UserRole } from '../Database/FirebaseRoles';

// ===== VALIDACIONES DE SEGURIDAD =====

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  sanitizedValue?: string;
}

// Validación de email
export const validateEmail = (email: string): SecurityValidationResult => {
  const errors: string[] = [];
  
  if (!email || email.trim() === '') {
    errors.push('Email es requerido');
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    errors.push('Formato de email inválido');
  }
  
  if (email && email.length > 254) {
    errors.push('Email demasiado largo');
  }
  
  // Verificar caracteres peligrosos
  const dangerousChars = /<script|javascript:|data:|vbscript:|onload|onerror/i;
  if (email && dangerousChars.test(email)) {
    errors.push('Email contiene caracteres no permitidos');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: email?.trim().toLowerCase()
  };
};

// Validación de roles
export const validateUserRole = (role: string): SecurityValidationResult => {
  const errors: string[] = [];
  const validRoles: UserRole[] = [
    'academyDirector', 
    'academySubdirector', 
    'academyCoach', 
    'groupCoach', 
    'assistantCoach'
  ];
  
  if (!role || role.trim() === '') {
    errors.push('Rol es requerido');
  }
  
  if (role && !validRoles.includes(role as UserRole)) {
    errors.push('Rol no válido');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: role?.trim()
  };
};

// Validación de nombres de usuario
export const validateUserName = (userName: string): SecurityValidationResult => {
  const errors: string[] = [];
  
  if (!userName || userName.trim() === '') {
    errors.push('Nombre de usuario es requerido');
  }
  
  if (userName && userName.length > 50) {
    errors.push('Nombre de usuario demasiado largo (máx. 50 caracteres)');
  }
  
  if (userName && userName.length < 2) {
    errors.push('Nombre de usuario demasiado corto (mín. 2 caracteres)');
  }
  
  // Verificar caracteres peligrosos para XSS
  const xssPattern = /<script|javascript:|data:|vbscript:|onload|onerror|<iframe|<object|<embed/i;
  if (userName && xssPattern.test(userName)) {
    errors.push('Nombre contiene caracteres no permitidos');
  }
  
  // Permitir solo letras, números, espacios y algunos caracteres especiales seguros
  const allowedPattern = /^[a-zA-ZÀ-ÿ0-9\s\-_.áéíóúÁÉÍÓÚñÑ]+$/;
  if (userName && !allowedPattern.test(userName)) {
    errors.push('Nombre contiene caracteres no válidos');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: userName?.trim().replace(/\s+/g, ' ') // Limpiar espacios extra
  };
};

// Validación de ID de academia
export const validateAcademiaId = (academiaId: string): SecurityValidationResult => {
  const errors: string[] = [];
  
  if (!academiaId || academiaId.trim() === '') {
    errors.push('ID de academia es requerido');
  }
  
  // Los IDs de Firebase suelen tener entre 20-28 caracteres alfanuméricos
  const idPattern = /^[a-zA-Z0-9_-]+$/;
  if (academiaId && !idPattern.test(academiaId)) {
    errors.push('ID de academia no válido');
  }
  
  if (academiaId && (academiaId.length < 6 || academiaId.length > 50)) {
    errors.push('ID de academia tiene longitud inválida');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: academiaId?.trim()
  };
};

// Validación general de texto libre (para prevenir XSS)
export const validateSafeText = (text: string, maxLength: number = 500): SecurityValidationResult => {
  const errors: string[] = [];
  
  if (text && text.length > maxLength) {
    errors.push(`Texto demasiado largo (máx. ${maxLength} caracteres)`);
  }
  
  // Verificar ataques XSS comunes
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi
  ];
  
  for (const pattern of xssPatterns) {
    if (text && pattern.test(text)) {
      errors.push('Texto contiene contenido potencialmente peligroso');
      break;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: text?.trim()
  };
};

// Función para sanitizar datos de usuario completos
export const validateAndSanitizeUserData = (userData: {
  userId: string;
  userEmail: string;
  userName: string;
  role: UserRole;
}) => {
  const results = {
    userId: validateAcademiaId(userData.userId), // Reutilizamos la validación de ID
    userEmail: validateEmail(userData.userEmail),
    userName: validateUserName(userData.userName),
    role: validateUserRole(userData.role)
  };
  
  const allErrors = Object.values(results).flatMap(result => result.errors);
  const isValid = allErrors.length === 0;
  
  const sanitizedData = isValid ? {
    userId: results.userId.sanitizedValue!,
    userEmail: results.userEmail.sanitizedValue!,
    userName: results.userName.sanitizedValue!,
    role: results.role.sanitizedValue! as UserRole
  } : null;
  
  return {
    isValid,
    errors: allErrors,
    sanitizedData
  };
};
export const validateRole = (role: string): SecurityValidationResult => {
  const validRoles: UserRole[] = ['academyDirector', 'academySubdirector', 'academyCoach', 'groupCoach', 'assistantCoach'];
  const errors: string[] = [];
  
  if (!role) {
    errors.push('Rol es requerido');
  }
  
  if (role && !validRoles.includes(role as UserRole)) {
    errors.push(`Rol inválido. Roles válidos: ${validRoles.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: role
  };
};

// Sanitización de strings
export const sanitizeString = (input: string): string => {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remover < y >
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/data:/gi, '') // Remover data:
    .replace(/vbscript:/gi, '') // Remover vbscript:
    .replace(/onload|onerror|onclick/gi, '') // Remover event handlers
    .slice(0, 1000); // Limitar longitud
};

// Validación completa de usuario
export const validateUserData = (userData: {
  email: string;
  userName: string;
  role: string;
}): SecurityValidationResult => {
  const emailValidation = validateEmail(userData.email);
  const userNameValidation = validateUserName(userData.userName);
  const roleValidation = validateRole(userData.role);
  
  const allErrors = [
    ...emailValidation.errors,
    ...userNameValidation.errors,
    ...roleValidation.errors
  ];
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

// Validación de IDs (para prevenir inyección)
export const validateId = (id: string, fieldName: string = 'ID'): SecurityValidationResult => {
  const errors: string[] = [];
  
  if (!id || id.trim() === '') {
    errors.push(`${fieldName} es requerido`);
  }
  
  // Verificar longitud razonable
  if (id && (id.length < 1 || id.length > 128)) {
    errors.push(`${fieldName} tiene longitud inválida`);
  }
  
  // Verificar caracteres válidos para Firebase IDs
  const validIdRegex = /^[a-zA-Z0-9_-]+$/;
  if (id && !validIdRegex.test(id)) {
    errors.push(`${fieldName} contiene caracteres inválidos`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: id?.trim()
  };
};

// ===== VALIDACIONES EXISTENTES DE ENTRENAMIENTO =====

// NUEVO: Re-declarar interfaces que necesitamos exportar desde aquí
export interface StrictValidationResult {
  isValid: boolean;                    // Pasa validaciones básicas
  isComplete: boolean;                 // Plan 100% completo para generar recomendaciones
  errors: string[];                    // Errores que bloquean guardado
  warnings: string[];                  // Advertencias que no bloquean
  totalPercentage: number;             // Suma total actual
  granularityLevel: 'TIPO' | 'AREA' | 'EJERCICIO';  // Nivel detectado
  canGenerateRecommendations: boolean; // Determina si se pueden generar recomendaciones
}

export interface RecommendationValidation {
  canGenerate: boolean;
  reason?: string;
  validationResult?: StrictValidationResult;
  blockingErrors?: string[];
}

/**
 * ============================================================================
 * VALIDACIONES BÁSICAS EXISTENTES (Mantenidas para compatibilidad)
 * ============================================================================
 */

/**
 * Valida si una combinación tipo/área/ejercicio es válida
 * MODIFICADO: Maneja el caso especial de PUNTOS que no requiere ejercicio
 */
export const isValidExerciseCombination = (
  tipo: TipoType,
  area: AreaType,
  ejercicio: string
): boolean => {
  const validAreas = getAreasForTipo(tipo);
  if (!validAreas.includes(area)) {
    return false;
  }
  
  // PUNTOS no requiere ejercicio, es válido sin él
  if (tipo === TipoType.PUNTOS) {
    return true;
  }
  
  const validEjercicios = getEjerciciosForTipoArea(tipo, area);
  return validEjercicios.includes(ejercicio);
};

/**
 * Valida si un ejercicio tiene todos los campos requeridos
 * MODIFICADO: Permite ejercicio vacío para tipo PUNTOS
 */
export const isValidExercise = (exercise: Partial<LoggedExercise>): boolean => {
  // Validaciones básicas que aplican a todos
  if (!exercise.tipo || !exercise.area || !exercise.tiempoCantidad) {
    return false;
  }
  
  if (exercise.intensidad === undefined || exercise.intensidad < 1 || exercise.intensidad > 10) {
    return false;
  }
  
  // Para PUNTOS, no se requiere campo ejercicio
  if (exercise.tipo === TipoType.PUNTOS) {
    return true;
  }
  
  // Para otros tipos, el ejercicio es obligatorio
  return !!exercise.ejercicio;
};

/**
 * Valida si una sesión tiene ejercicios o observaciones
 */
export const isValidSession = (session: Partial<TrainingSession>): boolean => {
  const hasExercises = session.ejercicios && session.ejercicios.length > 0;
  const hasObservations = session.observaciones && session.observaciones.trim().length > 0;
  return !!(hasExercises || hasObservations);
};

/**
 * Valida si hay jugadores seleccionados
 */
export const hasSelectedPlayers = (activePlayerIds: Set<string>): boolean => {
  return activePlayerIds.size > 0;
};

/**
 * Valida campos del formulario de ejercicio
 * MODIFICADO: Maneja validación especial para tipo PUNTOS
 */
export const validateExerciseForm = (
  tipo: string,
  area: string,
  ejercicio: string,
  tiempoCantidad: string,
  activePlayerIds: Set<string>
): { isValid: boolean; error?: string } => {
  // Validaciones básicas
  if (!tipo || !area || !tiempoCantidad) {
    return { 
      isValid: false, 
      error: 'Por favor, completa tipo, área y tiempo' 
    };
  }
  
  // Para tipo PUNTOS, no validar ejercicio
  if (tipo === TipoType.PUNTOS) {
    if (activePlayerIds.size === 0) {
      return { 
        isValid: false, 
        error: 'Por favor, selecciona al menos un jugador' 
      };
    }
    
    return { isValid: true };
  }
  
  // Para otros tipos, el ejercicio es obligatorio
  if (!ejercicio) {
    return { 
      isValid: false, 
      error: 'Por favor, selecciona un ejercicio' 
    };
  }
  
  if (activePlayerIds.size === 0) {
    return { 
      isValid: false, 
      error: 'Por favor, selecciona al menos un jugador' 
    };
  }
  
  if (!isValidExerciseCombination(tipo as TipoType, area as AreaType, ejercicio)) {
    return { 
      isValid: false, 
      error: 'Combinación de tipo/área/ejercicio inválida' 
    };
  }
  
  return { isValid: true };
};

/**
 * Valida datos de encuesta
 */
export const validateSurveyResponses = (
  responses: Record<string, number | undefined>,
  enabledQuestions: string[]
): boolean => {
  return enabledQuestions.every(question => {
    const value = responses[question];
    return value !== undefined && value >= 1 && value <= 5;
  });
};

/**
 * Valida si un jugador tiene datos suficientes para análisis
 */
export const hasPlayerSufficientData = (
  player: Player,
  sessions: TrainingSession[],
  minSessions: number = 1,
  minExercises: number = 1
): boolean => {
  const playerSessions = sessions.filter(s => s.jugadorId === player.id);
  
  if (playerSessions.length < minSessions) {
    return false;
  }
  
  const totalExercises = playerSessions.reduce(
    (sum, session) => sum + (session.ejercicios?.length || 0),
    0
  );
  
  return totalExercises >= minExercises;
};

/**
 * ============================================================================
 * VALIDACIONES ESTRICTAS NUEVAS (Fase 1 - Sin Hardcode)
 * ============================================================================
 */

/**
 * PRINCIPAL: Validación estricta para Fase 1 - Plan 100% completo obligatorio
 * ✅ ACTUALIZADO: Reconoce que tipo PUNTOS no requiere ejercicios
 */
export const validateStrictTrainingPlan = (plan: TrainingPlan): StrictValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let totalPercentage = 0;
  let granularityLevel: 'TIPO' | 'AREA' | 'EJERCICIO' = 'TIPO';
  
  // 1. Verificar que existe planificación
  if (!plan.planificacion || Object.keys(plan.planificacion).length === 0) {
    errors.push("No se ha definido ningún plan de entrenamiento");
    return {
      isValid: false,
      isComplete: false,
      errors,
      warnings,
      totalPercentage: 0,
      granularityLevel,
      canGenerateRecommendations: false
    };
  }
  
  // 2. Detectar nivel de granularidad utilizado
  // ✅ IMPORTANTE: Solo considerar tipos que requieren ejercicios para determinar granularidad
  let hasAreaLevel = false;
  let hasEjercicioLevel = false;
  
  Object.entries(plan.planificacion).forEach(([tipo, tipoData]) => {
    if (tipoData?.areas && Object.keys(tipoData.areas).length > 0) {
      hasAreaLevel = true;
      
      // ✅ Solo buscar ejercicios en tipos que los requieren
      if (tipoRequiereEjercicios(tipo as TipoType)) {
        Object.values(tipoData.areas).forEach((areaData: any) => {
          if (areaData?.ejercicios && Object.keys(areaData.ejercicios).length > 0) {
            hasEjercicioLevel = true;
          }
        });
      }
    }
  });
  
  if (hasEjercicioLevel) {
    granularityLevel = 'EJERCICIO';
  } else if (hasAreaLevel) {
    granularityLevel = 'AREA';
  }
  
  // 3. Validar completitud según el nivel detectado
  const tipoTotals: Record<string, number> = {};
  
  Object.entries(plan.planificacion).forEach(([tipo, tipoData]) => {
    if (!tipoData) {
      errors.push(`Tipo ${tipo}: datos faltantes`);
      return;
    }
    
    // Validar porcentajeTotal del tipo
    if (tipoData.porcentajeTotal === undefined || tipoData.porcentajeTotal === null) {
      errors.push(`Tipo ${tipo}: porcentaje total no definido`);
      return;
    }
    
    if (tipoData.porcentajeTotal < 0) {
      errors.push(`Tipo ${tipo}: porcentaje no puede ser negativo`);
      return;
    }
    
    tipoTotals[tipo] = tipoData.porcentajeTotal;
    
    // Si hay nivel de área, validar completitud de áreas
    if (granularityLevel === 'AREA' || granularityLevel === 'EJERCICIO') {
      if (!tipoData.areas || Object.keys(tipoData.areas).length === 0) {
        // Solo requerir áreas si el tipo tiene porcentaje > 0
        if (tipoData.porcentajeTotal > 0) {
          errors.push(`Tipo ${tipo}: debe definir al menos un área ya que el plan usa granularidad de áreas y el tipo tiene ${tipoData.porcentajeTotal}%`);
        }
        return;
      }
      
      // Obtener áreas requeridas para este tipo
      const areasRequeridas = getAreasForTipo(tipo as TipoType);
      const areasDefinidas = Object.keys(tipoData.areas) as AreaType[];
      
      // Verificar que todas las áreas presentes sean válidas
      areasDefinidas.forEach(area => {
        if (!areasRequeridas.includes(area)) {
          errors.push(`Tipo ${tipo}: área "${area}" no es válida para este tipo`);
        }
      });
      
      let areaTotalSum = 0;
      
      Object.entries(tipoData.areas).forEach(([area, areaData]) => {
        if (!areaData) {
          errors.push(`Tipo ${tipo}, área ${area}: datos faltantes`);
          return;
        }
        
        if (areaData.porcentajeDelTotal === undefined || areaData.porcentajeDelTotal === null) {
          errors.push(`Tipo ${tipo}, área ${area}: porcentaje no definido`);
          return;
        }
        
        if (areaData.porcentajeDelTotal < 0) {
          errors.push(`Tipo ${tipo}, área ${area}: porcentaje no puede ser negativo`);
          return;
        }
        
        areaTotalSum += areaData.porcentajeDelTotal;
        
        // ✅ CLAVE: Solo validar ejercicios si el tipo los requiere
        const requiresExercises = tipoRequiereEjercicios(tipo as TipoType);
        
        // Si hay nivel de ejercicio Y este tipo requiere ejercicios, validarlos
        if (granularityLevel === 'EJERCICIO' && requiresExercises) {
          if (!areaData.ejercicios || Object.keys(areaData.ejercicios).length === 0) {
            // Solo requerir ejercicios si el área tiene porcentaje > 0
            if (areaData.porcentajeDelTotal > 0) {
              errors.push(`Tipo ${tipo}, área ${area}: debe definir ejercicios ya que el tipo requiere ejercicios y el área tiene ${areaData.porcentajeDelTotal}%`);
            }
            return;
          }
          
          let ejercicioTotalSum = 0;
          Object.entries(areaData.ejercicios).forEach(([ejercicio, ejercicioData]) => {
            if (!ejercicioData) {
              errors.push(`Tipo ${tipo}, área ${area}, ejercicio ${ejercicio}: datos faltantes`);
              return;
            }
            
            if (ejercicioData.porcentajeDelTotal === undefined || ejercicioData.porcentajeDelTotal === null) {
              errors.push(`Tipo ${tipo}, área ${area}, ejercicio ${ejercicio}: porcentaje no definido`);
              return;
            }
            
            if (ejercicioData.porcentajeDelTotal < 0) {
              errors.push(`Tipo ${tipo}, área ${area}, ejercicio ${ejercicio}: porcentaje no puede ser negativo`);
              return;
            }
            
            ejercicioTotalSum += ejercicioData.porcentajeDelTotal;
          });
          
          // Validar que ejercicios sumen al área (tolerancia ±0.5%)
          const ejercicioDiff = Math.abs(ejercicioTotalSum - areaData.porcentajeDelTotal);
          if (ejercicioDiff > VALIDATION_CONSTANTS.TOLERANCE_PERCENTAGE) {
            errors.push(`Tipo ${tipo}, área ${area}: los ejercicios suman ${ejercicioTotalSum.toFixed(1)}% pero el área tiene ${areaData.porcentajeDelTotal}%. La diferencia debe ser ≤ ${VALIDATION_CONSTANTS.TOLERANCE_PERCENTAGE}%`);
          }
        }
        // ✅ IMPORTANTE: Para tipo PUNTOS, no validar ejercicios aunque el plan tenga granularidad EJERCICIO
        else if (granularityLevel === 'EJERCICIO' && !requiresExercises) {
          // No hacer nada - Puntos no requiere ejercicios
          // Podríamos agregar un warning opcional
          if (areaData.ejercicios && Object.keys(areaData.ejercicios).length > 0) {
            warnings.push(`Tipo ${tipo}, área ${area}: tiene ejercicios definidos pero este tipo no los requiere`);
          }
        }
      });
      
      // Validar que áreas sumen al tipo (tolerancia ±0.5%)
      const areaDiff = Math.abs(areaTotalSum - tipoData.porcentajeTotal);
      if (areaDiff > VALIDATION_CONSTANTS.TOLERANCE_PERCENTAGE) {
        errors.push(`Tipo ${tipo}: las áreas suman ${areaTotalSum.toFixed(1)}% pero el tipo tiene ${tipoData.porcentajeTotal}%. La diferencia debe ser ≤ ${VALIDATION_CONSTANTS.TOLERANCE_PERCENTAGE}%`);
      }
      
      totalPercentage += areaTotalSum;
    } else {
      // Solo nivel de tipo
      totalPercentage += tipoData.porcentajeTotal;
    }
  });
  
  // 4. Validar que el total sume 100% (tolerancia ±0.5%)
  const totalDiff = Math.abs(totalPercentage - VALIDATION_CONSTANTS.REQUIRED_TOTAL);
  if (totalDiff > VALIDATION_CONSTANTS.TOLERANCE_PERCENTAGE) {
    errors.push(`El plan total suma ${totalPercentage.toFixed(1)}% en lugar de ${VALIDATION_CONSTANTS.REQUIRED_TOTAL}%. La diferencia debe ser ≤ ${VALIDATION_CONSTANTS.TOLERANCE_PERCENTAGE}%`);
  }
  
  // 5. Validar que todos los tipos requeridos tengan datos
  // En Fase 1, requerimos que al menos un tipo tenga > 0%
  const tiposConDatos = Object.values(tipoTotals).filter(total => total > 0);
  if (tiposConDatos.length === 0) {
    errors.push("El plan debe tener al menos un tipo con porcentaje > 0%");
  }
  
  // 6. Generar warnings para tipos en 0%
  Object.entries(tipoTotals).forEach(([tipo, total]) => {
    if (total === 0) {
      warnings.push(`Tipo ${tipo} excluido explícitamente (0%)`);
    }
  });
  
  const isValid = errors.length === 0;
  const isComplete = isValid && totalDiff <= VALIDATION_CONSTANTS.TOLERANCE_PERCENTAGE;
  
  return {
    isValid,
    isComplete,
    errors,
    warnings,
    totalPercentage: Math.round(totalPercentage * 10) / 10,
    granularityLevel,
    canGenerateRecommendations: isComplete
  };
};

/**
 * Validación para bloquear recomendaciones sin plan completo
 */
export const canGenerateRecommendations = (plan?: TrainingPlan): RecommendationValidation => {
  if (!plan) {
    return {
      canGenerate: false,
      reason: "No se pueden generar recomendaciones porque no se ha definido un plan de trabajo en la planificación."
    };
  }
  
  const validation = validateStrictTrainingPlan(plan);
  
  if (!validation.canGenerateRecommendations) {
    const mainReason = validation.errors.length > 0 
      ? validation.errors[0]
      : "El plan no está completo";
      
    return {
      canGenerate: false,
      reason: `No se pueden generar recomendaciones: ${mainReason}`,
      validationResult: validation,
      blockingErrors: validation.errors
    };
  }
  
  return {
    canGenerate: true,
    validationResult: validation
  };
};

/**
 * Valida la estructura jerárquica de un plan (tipos > áreas > ejercicios válidos)
 */
export const validatePlanHierarchy = (planificacion: any): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  Object.entries(planificacion).forEach(([tipo, tipoData]: [string, any]) => {
    if (!tipoData) {
      errors.push(`Tipo ${tipo}: datos faltantes`);
      return;
    }
    
    // Validar tipo
    if (!Object.values(TipoType).includes(tipo as TipoType)) {
      errors.push(`Tipo ${tipo}: no es un tipo válido`);
      return;
    }
    
    // Validar áreas si existen
    if (tipoData.areas) {
      const validAreas = getAreasForTipo(tipo as TipoType);
      
      Object.entries(tipoData.areas).forEach(([area, areaData]: [string, any]) => {
        if (!validAreas.includes(area as AreaType)) {
          errors.push(`Tipo ${tipo}, área ${area}: no es válida para este tipo`);
          return;
        }
        
        // ✅ Solo validar ejercicios si el tipo los requiere
        if (areaData?.ejercicios && tipoRequiereEjercicios(tipo as TipoType)) {
          const validEjercicios = getEjerciciosForTipoArea(tipo as TipoType, area as AreaType);
          
          Object.keys(areaData.ejercicios).forEach(ejercicio => {
            if (!validEjercicios.includes(ejercicio)) {
              errors.push(`Tipo ${tipo}, área ${area}, ejercicio ${ejercicio}: no es válido para esta combinación`);
            }
          });
        }
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Detecta el nivel de granularidad de un plan
 * ✅ ACTUALIZADO: Solo considera tipos que requieren ejercicios para determinar granularidad
 */
export const detectPlanGranularityLevel = (planificacion: any): 'TIPO' | 'AREA' | 'EJERCICIO' => {
  let hasAreas = false;
  let hasEjercicios = false;
  
  Object.entries(planificacion).forEach(([tipo, tipoData]: [string, any]) => {
    if (tipoData?.areas && Object.keys(tipoData.areas).length > 0) {
      hasAreas = true;
      
      // ✅ Solo buscar ejercicios en tipos que los requieren
      if (tipoRequiereEjercicios(tipo as TipoType)) {
        Object.values(tipoData.areas).forEach((areaData: any) => {
          if (areaData?.ejercicios && Object.keys(areaData.ejercicios).length > 0) {
            hasEjercicios = true;
          }
        });
      }
    }
  });
  
  if (hasEjercicios) return 'EJERCICIO';
  if (hasAreas) return 'AREA';
  return 'TIPO';
};

// ... resto del archivo sin cambios ...

/**
 * Valida porcentajes numéricos básicos
 */
export const validatePercentageValue = (
  value: number,
  fieldName: string,
  min: number = 0,
  max: number = 100
): { isValid: boolean; error?: string } => {
  if (isNaN(value)) {
    return {
      isValid: false,
      error: `${fieldName}: debe ser un número válido`
    };
  }
  
  if (value < min) {
    return {
      isValid: false,
      error: `${fieldName}: no puede ser menor a ${min}%`
    };
  }
  
  if (value > max) {
    return {
      isValid: false,
      error: `${fieldName}: no puede ser mayor a ${max}%`
    };
  }
  
  return { isValid: true };
};

/**
 * ============================================================================
 * FUNCIONES DEPRECADAS (Mantenidas para compatibilidad hacia atrás)
 * ============================================================================
 */

/**
 * DEPRECADO: Usar validateStrictTrainingPlan() en su lugar
 */
export const validateTrainingPlanPercentages = (plan: TrainingPlan): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  total: number;
} => {
  console.warn('validateTrainingPlanPercentages está deprecado. Usar validateStrictTrainingPlan()');
  
  const result = validateStrictTrainingPlan(plan);
  return {
    isValid: result.isValid,
    errors: result.errors,
    warnings: result.warnings,
    total: result.totalPercentage
  };
};

/**
 * DEPRECADO: Usar validateStrictTrainingPlan() para detectar migración necesaria
 */
export const needsPlanMigration = (plan: any): boolean => {
  console.warn('needsPlanMigration está deprecado. Usar MigrationService.needsMigration()');
  
  // Si ya tiene versión 2, no necesita migración
  if (plan?.version === 2) return false;
  
  // Si tiene porcentajeDelTotal en lugar de porcentajeAbsoluto, necesita migración
  let needsMigration = false;
  
  Object.values(plan?.planificacion || {}).forEach((tipoData: any) => {
    if (tipoData?.areas) {
      Object.values(tipoData.areas).forEach((areaData: any) => {
        if (areaData?.porcentajeDelTotal && !areaData?.porcentajeAbsoluto) {
          needsMigration = true;
        }
      });
    }
  });
  
  return needsMigration;
};

/**
 * ============================================================================
 * UTILIDADES PARA VALIDACIONES EN TIEMPO REAL
 * ============================================================================
 */

/**
 * Valida un plan en tiempo real para mostrar errores en la UI
 */
export const validatePlanRealTime = (planificacion: any): {
  fieldErrors: Record<string, string>;
  globalErrors: string[];
  isValidForSave: boolean;
  totalPercentage: number;
} => {
  const fieldErrors: Record<string, string> = {};
  const globalErrors: string[] = [];
  let totalPercentage = 0;
  
  // Crear un plan temporal para validar
  const tempPlan: TrainingPlan = {
    jugadorId: 'temp',
    planificacion: planificacion || {},
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
    version: 2
  };
  
  const validation = validateStrictTrainingPlan(tempPlan);
  
  // Procesar errores específicos por campo
  validation.errors.forEach(error => {
    if (error.includes('Tipo') && error.includes('porcentaje total no definido')) {
      const tipo = error.match(/Tipo (\w+):/)?.[1];
      if (tipo) {
        fieldErrors[`tipo-${tipo}`] = 'Porcentaje requerido';
      }
    } else if (error.includes('área') && error.includes('porcentaje no definido')) {
      const match = error.match(/Tipo (\w+), área ([^:]+):/);
      if (match) {
        fieldErrors[`area-${match[1]}-${match[2]}`] = 'Porcentaje requerido';
      }
    } else if (error.includes('suman') && error.includes('diferencia debe ser')) {
      const match = error.match(/Tipo (\w+)(?:, área ([^:]+))?:/);
      if (match) {
        const key = match[2] ? `area-sum-${match[1]}-${match[2]}` : `tipo-sum-${match[1]}`;
        fieldErrors[key] = 'Suma incorrecta';
      }
    } else {
      globalErrors.push(error);
    }
  });
  
  return {
    fieldErrors,
    globalErrors,
    isValidForSave: validation.isValid,
    totalPercentage: validation.totalPercentage
  };
};

/**
 * Obtiene el estado del plan para mostrar en la UI
 */
export const getPlanStatus = (plan?: TrainingPlan): {
  status: 'COMPLETE' | 'INCOMPLETE' | 'INVALID' | 'EMPTY';
  message: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
} => {
  if (!plan || !plan.planificacion || Object.keys(plan.planificacion).length === 0) {
    return {
      status: 'EMPTY',
      message: 'Sin plan definido',
      color: 'gray'
    };
  }
  
  const validation = validateStrictTrainingPlan(plan);
  
  if (!validation.isValid) {
    return {
      status: 'INVALID',
      message: `Plan inválido - ${validation.errors.length} error(es)`,
      color: 'red'
    };
  }
  
  if (!validation.isComplete) {
    return {
      status: 'INCOMPLETE',
      message: 'Plan válido pero incompleto',
      color: 'yellow'
    };
  }
  
  return {
    status: 'COMPLETE',
    message: 'Plan completo - Recomendaciones habilitadas',
    color: 'green'
  };
};

// Exportar todo para uso en la aplicación
export {
  VALIDATION_CONSTANTS
};