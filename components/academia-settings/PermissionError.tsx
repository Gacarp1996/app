import React from 'react';

interface PermissionErrorProps {
  onRetry: () => void;
  onGoHome: () => void;
}

export const PermissionError: React.FC<PermissionErrorProps> = ({ 
  onRetry, 
  onGoHome 
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
          Error de Permisos
        </h2>
        <p className="text-app-primary mb-4">
          No tienes permisos para acceder a la configuración de la academia. 
          Esto puede deberse a que las reglas de seguridad de Firebase no están configuradas correctamente.
        </p>
        <p className="text-app-primary mb-4">
          Por favor, contacta al administrador del sistema para que configure las reglas de Firestore 
          para permitir el acceso a la subcolección de usuarios.
        </p>
        <div className="mt-6 space-y-2">
          <button 
            onClick={onGoHome} 
            className="app-button btn-primary mr-2"
          >
            Volver al Inicio
          </button>
          <button 
            onClick={onRetry} 
            className="app-button btn-secondary"
          >
            Reintentar
          </button>
        </div>
      </div>
    </div>
  );
};