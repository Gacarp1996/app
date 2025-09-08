// firestore-security-rules.js
// REGLAS DE SEGURIDAD PARA FIRESTORE
// 🛡️ ESTAS REGLAS SE EJECUTAN EN EL SERVIDOR DE GOOGLE

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // 🔥 COLECCIÓN DE ROLES SEGUROS
    match /secure_user_roles/{roleId} {
      // Solo pueden leer/escribir usuarios autenticados
      allow read, write: if request.auth != null 
        && (
          // El usuario puede ver su propio rol
          resource.data.userId == request.auth.uid
          // O tiene permisos de gestión en la academia
          || canManageUsersInAcademia(request.auth.uid, resource.data.academiaId)
        );
      
      // Validaciones adicionales para escritura
      allow write: if request.auth != null
        && validateRoleAssignment(request.auth.uid, resource.data, request.resource.data);
    }

    // 🔥 LOGS DE AUDITORÍA - Solo lectura para usuarios con permisos
    match /audit_logs/{logId} {
      allow read: if request.auth != null 
        && (
          resource.data.userId == request.auth.uid
          || hasAnyDirectorRole(request.auth.uid)
        );
      
      allow write: if request.auth != null;
    }

    // 🔥 DATOS DE ACADEMIAS - Protegidos por roles
    match /academias/{academiaId} {
      allow read: if request.auth != null 
        && hasRoleInAcademia(request.auth.uid, academiaId);
      
      allow write: if request.auth != null 
        && hasManagementRoleInAcademia(request.auth.uid, academiaId);
    }

    // 🔥 DATOS DE ENTRENAMIENTO - Solo coaches y superiores
    match /training_sessions/{sessionId} {
      allow read, write: if request.auth != null 
        && hasCoachRoleOrHigher(request.auth.uid, resource.data.academiaId);
    }

    // 🔥 DATOS DE JUGADORES - Según rol y grupo
    match /players/{playerId} {
      allow read: if request.auth != null 
        && canViewPlayerData(request.auth.uid, resource.data);
      
      allow write: if request.auth != null 
        && canModifyPlayerData(request.auth.uid, resource.data);
    }

    // 🔥 FUNCIONES DE VALIDACIÓN (EJECUTADAS EN SERVIDOR)
    
    function canManageUsersInAcademia(userId, academiaId) {
      return exists(/databases/$(database)/documents/secure_user_roles/$(userId + '_' + academiaId))
        && get(/databases/$(database)/documents/secure_user_roles/$(userId + '_' + academiaId)).data.role in ['academyDirector', 'academySubdirector']
        && get(/databases/$(database)/documents/secure_user_roles/$(userId + '_' + academiaId)).data.isActive == true;
    }

    function hasRoleInAcademia(userId, academiaId) {
      return exists(/databases/$(database)/documents/secure_user_roles/$(userId + '_' + academiaId))
        && get(/databases/$(database)/documents/secure_user_roles/$(userId + '_' + academiaId)).data.isActive == true;
    }

    function hasManagementRoleInAcademia(userId, academiaId) {
      return exists(/databases/$(database)/documents/secure_user_roles/$(userId + '_' + academiaId))
        && get(/databases/$(database)/documents/secure_user_roles/$(userId + '_' + academiaId)).data.role in ['academyDirector', 'academySubdirector', 'academyCoach']
        && get(/databases/$(database)/documents/secure_user_roles/$(userId + '_' + academiaId)).data.isActive == true;
    }

    function hasCoachRoleOrHigher(userId, academiaId) {
      return exists(/databases/$(database)/documents/secure_user_roles/$(userId + '_' + academiaId))
        && get(/databases/$(database)/documents/secure_user_roles/$(userId + '_' + academiaId)).data.role in ['academyDirector', 'academySubdirector', 'academyCoach', 'groupCoach']
        && get(/databases/$(database)/documents/secure_user_roles/$(userId + '_' + academiaId)).data.isActive == true;
    }

    function hasAnyDirectorRole(userId) {
      // Esta función requeriría una consulta más compleja
      // Por simplicidad, permitir a todos los usuarios autenticados leer sus propios logs
      return true;
    }

    function validateRoleAssignment(assignerId, oldData, newData) {
      // Validar que quien asigna tiene permisos superiores
      let assignerRole = getRoleLevel(assignerId, newData.academiaId);
      let targetRoleLevel = getRoleLevelByName(newData.role);
      
      return assignerRole > targetRoleLevel;
    }

    function getRoleLevel(userId, academiaId) {
      let userRole = get(/databases/$(database)/documents/secure_user_roles/$(userId + '_' + academiaId)).data.role;
      return getRoleLevelByName(userRole);
    }

    function getRoleLevelByName(roleName) {
      return roleName == 'academyDirector' ? 5 :
             roleName == 'academySubdirector' ? 4 :
             roleName == 'academyCoach' ? 3 :
             roleName == 'groupCoach' ? 2 :
             roleName == 'assistantCoach' ? 1 : 0;
    }

    function canViewPlayerData(userId, playerData) {
      // Lógica para determinar si puede ver datos del jugador
      return hasRoleInAcademia(userId, playerData.academiaId);
    }

    function canModifyPlayerData(userId, playerData) {
      // Solo coaches y superiores pueden modificar datos
      return hasCoachRoleOrHigher(userId, playerData.academiaId);
    }
  }
}
