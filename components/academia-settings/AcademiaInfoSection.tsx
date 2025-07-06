import React from 'react';

interface AcademiaInfoSectionProps {
  academiaName: string;
  academiaId: string;
}

export const AcademiaInfoSection: React.FC<AcademiaInfoSectionProps> = ({ 
  academiaName, 
  academiaId 
}) => {
  return (
    <div className="bg-app-surface p-6 rounded-lg shadow-lg mb-6">
      <h2 className="text-2xl font-semibold text-app-accent mb-4">Información de la Academia</h2>
      <div className="space-y-2">
        <p className="text-app-primary">
          <span className="font-semibold">Nombre:</span> {academiaName}
        </p>
        <p className="text-app-primary">
          <span className="font-semibold">ID de Academia:</span>{' '}
          <span className="font-mono text-xl bg-app-surface-alt px-3 py-1 rounded">
            {academiaId}
          </span>
        </p>
        <p className="text-sm text-app-secondary mt-2">
          Comparte este ID con otros entrenadores para que puedan unirse a la academia
        </p>
      </div>
    </div>
  );
};