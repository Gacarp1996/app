"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserClaims = exports.onUserCreate = exports.refreshUserToken = exports.verifyPermission = exports.updateUserRole = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
exports.updateUserRole = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    const { userId, academiaId, role, updatedBy } = data;
    const currentUserId = context.auth.uid;
    try {
        const currentUserRecord = await admin.auth().getUser(currentUserId);
        const currentClaims = currentUserRecord.customClaims || { academias: {}, lastUpdated: '' };
        const currentUserRole = (_b = (_a = currentClaims.academias) === null || _a === void 0 ? void 0 : _a[academiaId]) === null || _b === void 0 ? void 0 : _b.role;
        if (!canManageRoles(currentUserRole)) {
            throw new functions.https.HttpsError('permission-denied', 'No tienes permisos para gestionar roles');
        }
        const targetUserRecord = await admin.auth().getUser(userId);
        const targetClaims = targetUserRecord.customClaims || { academias: {}, lastUpdated: '' };
        const updatedClaims = {
            ...targetClaims,
            academias: {
                ...targetClaims.academias,
                [academiaId]: {
                    role: role,
                    joinedAt: ((_d = (_c = targetClaims.academias) === null || _c === void 0 ? void 0 : _c[academiaId]) === null || _d === void 0 ? void 0 : _d.joinedAt) || new Date().toISOString()
                }
            },
            lastUpdated: new Date().toISOString()
        };
        await admin.auth().setCustomUserClaims(userId, updatedClaims);
        await admin.firestore().collection('audit_logs').add({
            eventType: 'ROLE_CHANGE',
            userId: userId,
            academiaId: academiaId,
            details: {
                oldRole: ((_f = (_e = targetClaims.academias) === null || _e === void 0 ? void 0 : _e[academiaId]) === null || _f === void 0 ? void 0 : _f.role) || 'none',
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
    }
    catch (error) {
        console.error('Error updating user role:', error);
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
exports.verifyPermission = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    try {
        const userRecord = await admin.auth().getUser(context.auth.uid);
        const claims = userRecord.customClaims;
        const userRole = (_b = (_a = claims === null || claims === void 0 ? void 0 : claims.academias) === null || _a === void 0 ? void 0 : _a[data.academiaId]) === null || _b === void 0 ? void 0 : _b.role;
        const hasPermission = checkPermission(userRole, data.requiredRole);
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
    }
    catch (error) {
        console.error('Error verifying permission:', error);
        throw new functions.https.HttpsError('internal', 'Error al verificar permisos');
    }
});
exports.refreshUserToken = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    try {
        return {
            success: true,
            message: 'Token refresh initiated',
            timestamp: new Date().toISOString()
        };
    }
    catch (error) {
        console.error('Error refreshing token:', error);
        throw new functions.https.HttpsError('internal', 'Error al refrescar token');
    }
});
function canManageRoles(role) {
    return role === 'academyDirector' || role === 'academySubdirector';
}
function checkPermission(userRole, requiredRole) {
    if (!userRole || !requiredRole)
        return false;
    const roleHierarchy = {
        'academyDirector': 5,
        'academySubdirector': 4,
        'academyCoach': 3,
        'groupCoach': 2,
        'assistantCoach': 1
    };
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    var _a;
    try {
        const initialClaims = {
            academias: {},
            lastUpdated: new Date().toISOString()
        };
        await admin.auth().setCustomUserClaims(user.uid, initialClaims);
        await admin.firestore().collection('audit_logs').add({
            eventType: 'USER_CREATED',
            userId: user.uid,
            details: {
                email: user.email,
                provider: ((_a = user.providerData[0]) === null || _a === void 0 ? void 0 : _a.providerId) || 'unknown'
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            severity: 'LOW',
            success: true
        });
        console.log('Initial claims set for new user:', user.uid);
    }
    catch (error) {
        console.error('Error setting initial claims:', error);
    }
});
exports.getUserClaims = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Usuario no autenticado');
    }
    try {
        const userRecord = await admin.auth().getUser(context.auth.uid);
        const claims = userRecord.customClaims || { academias: {}, lastUpdated: '' };
        return {
            success: true,
            claims: claims,
            userId: context.auth.uid
        };
    }
    catch (error) {
        console.error('Error getting user claims:', error);
        throw new functions.https.HttpsError('internal', 'Error al obtener claims');
    }
});
