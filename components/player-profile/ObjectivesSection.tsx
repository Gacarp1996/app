
import React from 'react';
import { Link } from 'react-router-dom';
import { Objective, ObjectiveEstado } from '../../types';
import { OBJECTIVE_ESTADOS } from '../../constants';

interface ObjectivesSectionProps {
  playerId: string;
  playerAllObjectives: Objective[];
}

const ObjectivesSection: React.FC<ObjectivesSectionProps> = ({
  playerId,
  playerAllObjectives
}) => {
  return (
    <section className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
      <div className="flex justify-between items-center mb-6 lg:mb-8">
        <h2 className="text-2xl lg:text-3xl font-semibold text-green-400">Objetivos</h2>
        <Link 
          to={`/player/${playerId}/edit-objectives`} 
          className="px-6 py-2 lg:px-8 lg:py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
        >
          Gestionar
        </Link>
      </div>
      
      {/* Grid para objetivos en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {(Object.keys(OBJECTIVE_ESTADOS) as ObjectiveEstado[]).map(estado => {
          const objectivesInState = playerAllObjectives.filter(obj => obj.estado === estado);
          if (objectivesInState.length === 0) return null;
          return (
            <div key={estado} className="space-y-4">
              <h3 className="text-xl lg:text-2xl font-semibold text-gray-300 border-b border-gray-700 pb-2">
                {OBJECTIVE_ESTADOS[estado]} ({objectivesInState.length})
              </h3>
              <ul className="space-y-3">
                {objectivesInState.map(obj => (
                  <li key={obj.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-green-500/50 transition-all duration-200">
                    <Link to={`/objective/${obj.id}/edit`} className="text-white hover:text-green-400 transition-colors">
                      <p className="text-base lg:text-lg">{obj.textoObjetivo}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {playerAllObjectives.length === 0 && (
          <p className="text-gray-400 col-span-full text-center text-lg">No hay objetivos registrados.</p>
        )}
      </div>
    </section>
  );
};

export default ObjectivesSection;