import React from 'react';

interface ChangeAcademiaSectionProps {
  onChangeAcademia: () => void;
}

export const ChangeAcademiaSection: React.FC<ChangeAcademiaSectionProps> = ({ 
  onChangeAcademia 
}) => {
  return (
    <div className="bg-app-surface p-6 rounded-lg shadow-lg mb-6">
      <h2 className="text-2xl font-semibold text-app-accent mb-4">Cambiar de Academia</h2>
      <p className="text-app-secondary mb-4">
        Si necesitas acceder a otra academia, puedes cambiar desde aquí.
      </p>
      <button
        onClick={onChangeAcademia}
        className="app-button btn-primary"
      >
        Cambiar Academia
      </button>
    </div>
  );
};
