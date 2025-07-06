import React from 'react';

interface DeleteAcademiaSectionProps {
  onDeleteClick: () => void;
  processingAction: boolean;
}

export const DeleteAcademiaSection: React.FC<DeleteAcademiaSectionProps> = ({ 
  onDeleteClick, 
  processingAction 
}) => {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-lg">
      <h2 className="text-2xl font-semibold text-red-600 dark:text-red-400 mb-4">
        Zona de Peligro
      </h2>
      <p className="text-app-primary mb-4">
        Eliminar la academia es una acción permanente que no se puede deshacer. 
        Se eliminarán todos los datos asociados (jugadores, objetivos, sesiones, torneos).
      </p>
      <button
        onClick={onDeleteClick}
        className="app-button btn-danger"
        disabled={processingAction}
      >
        Eliminar Academia
      </button>
    </div>
  );
};