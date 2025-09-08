// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Inicializar Firebase Admin
admin.initializeApp();

// 🛡️ TIPOS DE ROLES
type UserRole = 'academyDirector' | 'academySubdirector' | 'academyCoach' | 'groupCoach' | 'assistantCoach';

interface RoleUpdate {
  userId: string;
  academiaId: string;
  role: UserRole;
  updatedBy: string;
}

interface CustomClaims {
  academias: Record<string, {
    role: UserRole;
    joinedAt: string;
  }>;
  lastUpdated: string;
}

// 🔥 FUNCIÓN PARA ACTUALIZAR ROLES EN JWT
export const updateUserRole = functions.https.onCall(async (data: RoleUpdate, context: functions.https.CallableContext) => {
  // 🛡️ VERIFICAR AUTENTICACIÓN
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  const { userId, academiaId, role, updatedBy } = data;
  const currentUserId = context.auth.uid;

  try {
    // 🛡️ VERIFICAR PERMISOS DEL USUARIO ACTUAL
    const currentUserRecord = await admin.auth().getUser(currentUserId);
    const currentClaims = currentUserRecord.customClaims as CustomClaims || { academias: {}, lastUpdated: '' };
    
    const currentUserRole = currentClaims.academias?.[academiaId]?.role;
    
    if (!canManageRoles(currentUserRole)) {
      throw new functions.https.HttpsError('permission-denied', 'No tienes permisos para gestionar roles');
    }

    // 🛡️ VERIFICAR QUE EL USUARIO EXISTE
    const targetUserRecord = await admin.auth().getUser(userId);
    const targetClaims = targetUserRecord.customClaims as CustomClaims || { academias: {}, lastUpdated: '' };

    // 🛡️ ACTUALIZAR CLAIMS
    const updatedClaims: CustomClaims = {
      ...targetClaims,
      academias: {
        ...targetClaims.academias,
        [academiaId]: {
          role: role,
          joinedAt: targetClaims.academias?.[academiaId]?.joinedAt || new Date().toISOString()
        }
      },
      lastUpdated: new Date().toISOString()
    };

    // 🔥 APLICAR CLAIMS AL TOKEN JWT
    await admin.auth().setCustomUserClaims(userId, updatedClaims);

    // 📝 LOG DE AUDITORÍA EN FIRESTORE
    await admin.firestore().collection('audit_logs').add({
      eventType: 'ROLE_CHANGE',
      userId: userId,
      academiaId: academiaId,
      details: {
        oldRole: targetClaims.academias?.[academiaId]?.role || 'none',
        newRole: role,
        updatedBy: currentUserId,
        updatedByEmail: context.auth.token.email
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      severity: 'HIGH',
      success: true
    });

    return {
      success: true,
      message: 'Rol actualizado correctamente',
      newClaims: updatedClaims
    };

  } catch (error) {
    console.error('Error updating user role:', error);
    
    // 📝 LOG DE ERROR
    await admin.firestore().collection('audit_logs').add({
      eventType: 'ROLE_CHANGE',
      userId: userId,
      academiaId: academiaId,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedBy: currentUserId
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      severity: 'CRITICAL',
      success: false
    });

    throw new functions.https.HttpsError('internal', 'Error al actualizar el rol');
  }
});

// 🔥 FUNCIÓN PARA VERIFICAR PERMISOS
export const verifyPermission = functions.https.onCall(async (data: { 
  academiaId: string; 
  requiredRole: UserRole;
  action: string;
}, context: functions.https.CallableContext) => {
  
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  try {
    const userRecord = await admin.auth().getUser(context.auth.uid);
    const claims = userRecord.customClaims as CustomClaims;
    
    const userRole = claims?.academias?.[data.academiaId]?.role;
    const hasPermission = checkPermission(userRole, data.requiredRole);

    // 📝 LOG DE VERIFICACIÓN
    await admin.firestore().collection('audit_logs').add({
      eventType: 'PERMISSION_CHECK',
      userId: context.auth.uid,
      academiaId: data.academiaId,
      details: {
        action: data.action,
        userRole: userRole || 'none',
        requiredRole: data.requiredRole,
        granted: hasPermission
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      severity: hasPermission ? 'LOW' : 'MEDIUM',
      success: hasPermission
    });

    if (!hasPermission) {
      throw new functions.https.HttpsError('permission-denied', `Rol insuficiente. Requerido: ${data.requiredRole}, Actual: ${userRole || 'none'}`);
    }

    return { success: true, userRole, hasPermission };

  } catch (error) {
    console.error('Error verifying permission:', error);
    throw new functions.https.HttpsError('internal', 'Error al verificar permisos');
  }
});

// 🔥 FUNCIÓN PARA REFRESCAR TOKEN
export const refreshUserToken = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  try {
    // Simplemente devolver éxito - el cliente manejará el refresh del token
    return { 
      success: true, 
      message: 'Token refresh initiated',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw new functions.https.HttpsError('internal', 'Error al refrescar token');
  }
});

// 🛡️ FUNCIONES HELPER

function canManageRoles(role?: UserRole): boolean {
  return role === 'academyDirector' || role === 'academySubdirector';
}

function checkPermission(userRole?: UserRole, requiredRole?: UserRole): boolean {
  if (!userRole || !requiredRole) return false;

  const roleHierarchy: Record<UserRole, number> = {
    'academyDirector': 5,
    'academySubdirector': 4,
    'academyCoach': 3,
    'groupCoach': 2,
    'assistantCoach': 1
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// 🔥 TRIGGER PARA NUEVOS USUARIOS
export const onUserCreate = functions.auth.user().onCreate(async (user: admin.auth.UserRecord) => {
  try {
    // Establecer claims iniciales vacíos
    const initialClaims: CustomClaims = {
      academias: {},
      lastUpdated: new Date().toISOString()
    };

    await admin.auth().setCustomUserClaims(user.uid, initialClaims);

    // Log de nuevo usuario
    await admin.firestore().collection('audit_logs').add({
      eventType: 'USER_CREATED',
      userId: user.uid,
      details: {
        email: user.email,
        provider: user.providerData[0]?.providerId || 'unknown'
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      severity: 'LOW',
      success: true
    });

    console.log('Initial claims set for new user:', user.uid);
  } catch (error) {
    console.error('Error setting initial claims:', error);
  }
});

// 🔥 FUNCIÓN PARA OBTENER CLAIMS ACTUALES
export const getUserClaims = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
  }

  try {
    const userRecord = await admin.auth().getUser(context.auth.uid);
    const claims = userRecord.customClaims as CustomClaims || { academias: {}, lastUpdated: '' };

    return {
      success: true,
      claims: claims,
      userId: context.auth.uid
    };
  } catch (error) {
    console.error('Error getting user claims:', error);
    throw new functions.https.HttpsError('internal', 'Error al obtener claims');
  }
});
