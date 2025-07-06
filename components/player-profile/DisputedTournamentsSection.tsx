// components/player-profile/DisputedTournamentsSection.tsx
import React from 'react';
import TournamentPerformanceChart from '../tournaments/TournamentPerformanceChart';
import { DisputedTournament } from '../../types';

interface DisputedTournamentsSectionProps {
  playerDisputedTournaments: DisputedTournament[];
  onAddClick: () => void;
  onEditClick: (tournament: DisputedTournament) => void;
  onDeleteClick: (id: string) => void;
  formatDate: (dateString: string) => string;
}

const DisputedTournamentsSection: React.FC<DisputedTournamentsSectionProps> = ({
  playerDisputedTournaments,
  onAddClick,
  onEditClick,
  onDeleteClick,
  formatDate
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl lg:text-3xl font-semibold text-green-400">Torneos Disputados</h2>
          <button 
            onClick={onAddClick} 
            className="px-6 py-2 lg:px-8 lg:py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
          >
            Registrar Torneo Disputado
          </button>
        </div>
        
        {playerDisputedTournaments.length === 0 ? (
          <p className="text-gray-400 text-center py-8 text-lg">
            No hay torneos disputados registrados. Comience registrando los resultados de torneos pasados.
          </p>
        ) : (
          <>
            {/* Lista de torneos disputados - Grid en desktop */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
              {playerDisputedTournaments.map(t => (
                <div key={t.id} className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700 hover:border-green-500/50 transition-all duration-200">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg lg:text-xl text-white">{t.nombreTorneo}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm lg:text-base">
                        <p>
                          <span className="text-gray-400">Fecha:</span>{' '}
                          {formatDate(t.fechaInicio)} - {formatDate(t.fechaFin)}
                        </p>
                        <p>
                          <span className="text-gray-400">Resultado:</span>{' '}
                          <span className="font-medium text-green-400">{t.resultado}</span>
                        </p>
                        <p>
                          <span className="text-gray-400">Rendimiento:</span>{' '}
                          <span className={`font-medium ${
                            t.rendimientoJugador === 'Excelente' ? 'text-green-500' :
                            t.rendimientoJugador === 'Muy bueno' ? 'text-blue-500' :
                            t.rendimientoJugador === 'Bueno' ? 'text-yellow-500' :
                            'text-red-500'
                          }`}>
                            {t.rendimientoJugador}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-400">Dificultad:</span>{' '}
                          <span className="font-medium">
                            {'⭐'.repeat(t.nivelDificultad)}
                            <span className="text-gray-400 ml-1">({t.nivelDificultad}/5)</span>
                          </span>
                        </p>
                      </div>
                      {t.observaciones && (
                        <p className="mt-3 text-sm lg:text-base text-gray-500 italic">
                          "{t.observaciones}"
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => onEditClick(t)}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50 text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDeleteClick(t.id)}
                        className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-400 font-semibold rounded-lg transition-all duration-200 border border-red-800 hover:border-red-600 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gráficos de rendimiento */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-xl lg:text-2xl font-semibold text-green-400 mb-4">
                Análisis de Rendimiento en Torneos
              </h3>
              <TournamentPerformanceChart 
                tournaments={playerDisputedTournaments}
                showRadar={true}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DisputedTournamentsSection;