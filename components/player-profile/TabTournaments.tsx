import React, { useState } from 'react';
import { Tournament, DisputedTournament } from '../../types';
import TournamentFormModal from '../TournamentFormModal';
import DisputedTournamentFormModal from '../DisputedTournamentFormModal';
import TournamentPerformanceChart from './TournamentPerformanceChart';

interface TabTournamentsProps {
  playerId: string | undefined;
  playerTournaments: Tournament[];
  playerDisputedTournaments: DisputedTournament[];
  onOpenAddTournamentModal: () => void;
  onEditTournamentClick: (tournament: Tournament) => void;
  onDeleteTournament: (id: string) => void;
  onOpenAddDisputedTournamentModal: () => void;
  onEditDisputedTournamentClick: (tournament: DisputedTournament) => void;
  onConvertTournamentClick: (tournament: Tournament) => void;
  onDeleteDisputedTournament: (id: string) => void;
  isTournamentModalOpen: boolean;
  setIsTournamentModalOpen: (open: boolean) => void;
  editingTournament: Tournament | null;
  onSaveTournament: (data: Omit<Tournament, 'id' | 'jugadorId'>) => void;
  isDisputedTournamentModalOpen: boolean;
  setIsDisputedTournamentModalOpen: (open: boolean) => void;
  editingDisputedTournament: DisputedTournament | null;
  tournamentToConvert: Tournament | null;
  onSaveDisputedTournament: (data: Omit<DisputedTournament, 'id' | 'jugadorId' | 'fechaRegistro'>) => void;
}

const TabTournaments: React.FC<TabTournamentsProps> = ({
  playerId,
  playerTournaments,
  playerDisputedTournaments,
  onOpenAddTournamentModal,
  onEditTournamentClick,
  onDeleteTournament,
  onOpenAddDisputedTournamentModal,
  onEditDisputedTournamentClick,
  onConvertTournamentClick,
  onDeleteDisputedTournament,
  isTournamentModalOpen,
  setIsTournamentModalOpen,
  editingTournament,
  onSaveTournament,
  isDisputedTournamentModalOpen,
  setIsDisputedTournamentModalOpen,
  editingDisputedTournament,
  tournamentToConvert,
  onSaveDisputedTournament
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'future' | 'disputed'>('future');

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString;
    }
  };

  const getEvaluacionColor = (evaluacion: string | undefined): string => {
    if (!evaluacion) return 'text-gray-500';
    
    switch (evaluacion) {
      case 'Excelente':
        return 'text-green-500';
      case 'Muy bueno':
        return 'text-blue-500';
      case 'Bueno':
        return 'text-yellow-500';
      case 'Regular':
        return 'text-orange-500';
      case 'Malo':
      case 'Muy malo':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const handleDeleteTournament = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este torneo?')) {
      onDeleteTournament(id);
    }
  };

  const handleDeleteDisputedTournament = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este torneo disputado?')) {
      onDeleteDisputedTournament(id);
    }
  };

  return (
    <section className="space-y-6">
      {/* Sub-tabs */}
      <div className="border-b border-gray-800">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveSubTab('future')}
            className={`py-2 px-1 font-medium transition-colors ${
              activeSubTab === 'future'
                ? 'border-b-2 border-green-400 text-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Próximos Torneos ({playerTournaments.length})
          </button>
          <button
            onClick={() => setActiveSubTab('disputed')}
            className={`py-2 px-1 font-medium transition-colors ${
              activeSubTab === 'disputed'
                ? 'border-b-2 border-green-400 text-green-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Torneos Disputados ({playerDisputedTournaments.length})
          </button>
        </nav>
      </div>

      {/* Content based on active sub-tab */}
      {activeSubTab === 'future' ? (
        // Future tournaments section
        <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-2xl lg:text-3xl font-semibold text-green-400">Próximos Torneos</h2>
            <button 
              onClick={onOpenAddTournamentModal} 
              className="px-6 py-2 lg:px-8 lg:py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25 w-full sm:w-auto"
            >
              Agregar Torneo
            </button>
          </div>
          
          {playerTournaments.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-lg">No hay torneos próximos programados.</p>
          ) : (
            <ul className="space-y-4">
              {playerTournaments.map(tournament => {
                const tournamentEnded = new Date(tournament.fechaFin) < new Date();
                return (
                  <li key={tournament.id} className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700 hover:border-green-500/50 transition-all duration-200">
                    <div className="flex flex-col lg:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-xl lg:text-2xl text-white">{tournament.nombreTorneo}</h3>
                        <p className="text-sm lg:text-base text-gray-400 mt-1">{tournament.gradoImportancia}</p>
                        <p className="text-sm lg:text-base text-gray-300 mt-1">
                          {formatDate(tournament.fechaInicio)} - {formatDate(tournament.fechaFin)}
                        </p>
                        {tournamentEnded && (
                          <p className="text-sm lg:text-base text-yellow-400 mt-2">
                            ⚠️ Este torneo ya finalizó
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                        {tournamentEnded && (
                          <button
                            onClick={() => onConvertTournamentClick(tournament)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-lg transition-all duration-200 text-sm lg:text-base flex-1 sm:flex-initial"
                            title="Registrar resultado del torneo"
                          >
                            📊 Registrar Resultado
                          </button>
                        )}
                        <button 
                          onClick={() => onEditTournamentClick(tournament)} 
                          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50 text-sm lg:text-base flex-1 sm:flex-initial"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDeleteTournament(tournament.id)} 
                          className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-400 font-semibold rounded-lg transition-all duration-200 border border-red-800 hover:border-red-600 text-sm lg:text-base flex-1 sm:flex-initial"
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
      ) : (
        // Disputed tournaments section
        <div className="space-y-6">
          <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-2xl lg:text-3xl font-semibold text-green-400">Torneos Disputados</h2>
              <button 
                onClick={onOpenAddDisputedTournamentModal} 
                className="px-6 py-2 lg:px-8 lg:py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25 w-full sm:w-auto"
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
                {/* List of disputed tournaments */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
                  {playerDisputedTournaments.map(tournament => (
                    <div key={tournament.id} className="bg-gray-800/50 p-4 lg:p-6 rounded-lg border border-gray-700 hover:border-green-500/50 transition-all duration-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg lg:text-xl text-white">{tournament.nombreTorneo}</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 text-sm lg:text-base">
                            <p>
                              <span className="text-gray-400">Fecha:</span>{' '}
                              <span className="text-white">
                                {formatDate(tournament.fechaInicio)}
                                {tournament.fechaFin && tournament.fechaFin !== tournament.fechaInicio && 
                                  ` - ${formatDate(tournament.fechaFin)}`
                                }
                              </span>
                            </p>
                            <p>
                              <span className="text-gray-400">Resultado:</span>{' '}
                              <span className="font-medium text-green-400">{tournament.resultado}</span>
                            </p>
                            <p>
                              <span className="text-gray-400">Evaluación:</span>{' '}
                              <span className={`font-medium ${getEvaluacionColor(
                                tournament.evaluacionGeneral || tournament.rendimientoJugador
                              )}`}>
                                {tournament.evaluacionGeneral || tournament.rendimientoJugador || 'No especificada'}
                              </span>
                            </p>
                            <p>
                              <span className="text-gray-400">Dificultad:</span>{' '}
                              <span className="font-medium">
                                {'⭐'.repeat(tournament.nivelDificultad || 0)}
                                <span className="text-gray-400 ml-1">({tournament.nivelDificultad || 0}/5)</span>
                              </span>
                            </p>
                          </div>
                          {tournament.observaciones && (
                            <p className="mt-3 text-sm lg:text-base text-gray-500 italic">
                              "{tournament.observaciones}"
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => onEditDisputedTournamentClick(tournament)}
                            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-700 hover:border-green-500/50 text-sm"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteDisputedTournament(tournament.id)}
                            className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 text-red-400 font-semibold rounded-lg transition-all duration-200 border border-red-800 hover:border-red-600 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Performance charts */}
                {playerDisputedTournaments.length > 0 && (
                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-xl lg:text-2xl font-semibold text-green-400 mb-4">
                      Análisis de Rendimiento en Torneos
                    </h3>
                    <TournamentPerformanceChart 
                      tournaments={playerDisputedTournaments}
                      showRadar={true}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Tournament modals */}
      {isTournamentModalOpen && playerId && (
        <TournamentFormModal 
          isOpen={isTournamentModalOpen} 
          onClose={() => setIsTournamentModalOpen(false)} 
          onSave={onSaveTournament} 
          playerId={playerId} 
          existingTournament={editingTournament} 
        />
      )}

      {isDisputedTournamentModalOpen && playerId && (
        <DisputedTournamentFormModal
          isOpen={isDisputedTournamentModalOpen}
          onClose={() => setIsDisputedTournamentModalOpen(false)}
          onSave={onSaveDisputedTournament}
          playerId={playerId}
          existingDisputedTournament={editingDisputedTournament}
          futureTournamentToConvert={tournamentToConvert}
        />
      )}
    </section>
  );
};

export default TabTournaments;