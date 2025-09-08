// app/components/security/RoleMigrationGuard.tsx
import React from 'react';
import { useSecureRoleMigration } from '../../hooks/useSecureRoleMigration';
import { useAuth } from '../../contexts/AuthContext';
import { useAcademia } from '../../contexts/AcademiaContext';

interface RoleMigrationGuardProps {
  children: React.ReactNode;
}

export const RoleMigrationGuard: React.FC<RoleMigrationGuardProps> = ({ children }) => {
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia();
  const { status, skipMigrationTemporarily } = useSecureRoleMigration();

  // Si no hay usuario o academia, mostrar children sin restricciones
  if (!currentUser || !academiaActual) {
    return <>{children}</>;
  }

  // Mientras carga
  if (status.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // 🚨 SISTEMA TEMPORAL: DESHABILITAR AUTO-ASIGNACIÓN DE ROLES
  // Los roles deben ser asignados manualmente por un administrador
  if (status.needsInitialSetup && !status.isComplete) {
    return (
      <div className="min-h-screen bg-red-900/20 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-6 border border-red-500/30">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              � Acceso Temporalmente Suspendido
            </h3>
            <p className="text-sm text-gray-300 mb-4">
              Se detectó una vulnerabilidad de seguridad en el sistema anterior. 
              Los roles deben ser reasignados por el administrador del sistema.
            </p>
            <p className="text-xs text-red-300 mb-4">
              <strong>Usuario:</strong> {currentUser.email}<br/>
              <strong>Academia:</strong> {academiaActual.nombre}
            </p>
          </div>

          {status.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{status.error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-yellow-800/30 border border-yellow-600/50 rounded-md p-3">
              <h4 className="text-sm font-medium text-yellow-300 mb-2">⚠️ Acceso Temporalmente Restringido</h4>
              <p className="text-xs text-yellow-200 mb-3">
                Por seguridad, la auto-asignación de roles ha sido deshabilitada. 
                Contacta al administrador para que te asigne el rol apropiado.
              </p>
            </div>

            <div className="border-t border-gray-600 pt-4">
              <button
                onClick={skipMigrationTemporarily}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Continuar con acceso limitado (temporal)
              </button>
            </div>
          </div>

          <div className="mt-6 text-xs text-gray-400">
            <p>
              <strong>Razón del cambio:</strong> Se detectó que el sistema anterior permitía 
              a los usuarios asignarse roles sin validación, lo cual compromete la seguridad.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Si está todo configurado, mostrar la aplicación normal
  return <>{children}</>;
};

export default RoleMigrationGuard;
