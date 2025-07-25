import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = 'Cargando...' 
}) => {
  return (
    <div className="text-center py-10">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent mx-auto"></div>
      <p className="mt-4 text-app-secondary">{message}</p>
    </div>
  );
};
