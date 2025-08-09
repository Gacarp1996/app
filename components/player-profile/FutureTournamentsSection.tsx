// components/player-profile/FutureTournamentsSection.tsx
import React from 'react';
import { Tournament } from '../../types/types';

interface FutureTournamentsSectionProps {
  playerTournaments: Tournament[];
  onAddClick: () => void;
  onEditClick: (tournament: Tournament) => void;
  onDeleteClick: (id: string) => void;
  onConvertClick: (tournament: Tournament) => void;
  formatDate: (dateString: string) => string;
}

const FutureTournamentsSection: React.FC<FutureTournamentsSectionProps> = ({
  playerTournaments,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onConvertClick,
  formatDate
}) => {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl lg:text-3xl font-semibold text-green-400">Próximos Torneos</h2>
        <button 
          onClick={onAddClick} 
          className="px-6 py-2 lg:px-8 lg:py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
        >
          Agregar Torneo
        </button>
      </div>
      {playerTournaments.length === 0 ? (
        <p className="text-gray-400 text-center py-8 text-lg">No hay torneos próximos programados.</p>
      ) : (
        <ul className="space-y-4">
          {playerTournaments.map(t => {
            const tournamentEnded = new Date(t.fechaFin) < new Date();
            return (
              <li key={t.id} className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700 hover:border-green-500/50 transition-all duration-200">
                <div className="flex flex-col lg:flex-row justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-xl lg:text-2xl text-white">{t.nombreTorneo}</h3>
                    <p className="text-sm lg:text-base text-gray-400 mt-1">{t.gradoImportancia}</p>
                    <p className="text-sm lg:text-base text-gray-300 mt-1">
                      {formatDate(t.fechaInicio)} - {formatDate(t.fechaFin)}
                    </p>
                    {tournamentEnded && (
                      <p className="text-sm lg:text-base text-yellow-400 mt-2">
                        ⚠️ Este torneo ya finalizó
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 lg:space-x-3">
                    {tournamentEnded && (
                      <button
                        onClick={() => onConvertClick(t)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all duration-200 text-sm lg:text-base"
                        title="Registrar resultado del torneo"
                      >
                        📊 Registrar Resultado
                      </button>
                    )}
                    <button 
                      onClick={() => onEditClick(t)} 
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50 text-sm lg:text-base"
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => onDeleteClick(t.id)} 
                      className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-400 font-semibold rounded-lg transition-all duration-200 border border-red-800 hover:border-red-600 text-sm lg:text-base"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default FutureTournamentsSection;