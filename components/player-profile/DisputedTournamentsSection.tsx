// components/player-profile/DisputedTournamentsSection.tsx
import React from 'react';
import TournamentPerformanceChart from '../tournaments/TournamentPerformanceChart';
import { DisputedTournament } from '../../types/types';

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
            {/* Lista de torneos disputados - Diseño mejorado */}
            <div className="space-y-4 mb-8">
              {playerDisputedTournaments.map(t => {
                // Función para obtener el icono según el resultado
                const getResultIcon = (resultado: string) => {
                  if (resultado === 'Campeón') return '🏆';
                  if (resultado === 'Finalista') return '🥈';
                  if (resultado === 'Semifinal') return '🥉';
                  if (resultado.includes('Cuartos')) return '⭐';
                  if (resultado.includes('Octavos')) return '✨';
                  return '🎾';
                };

                // Función para obtener el color del rendimiento
                const getRendimientoColor = (rendimiento: string) => {
                  switch (rendimiento) {
                    case 'Excelente': return 'text-emerald-400 bg-emerald-500/10';
                    case 'Muy bueno': return 'text-blue-400 bg-blue-500/10';
                    case 'Bueno': return 'text-yellow-400 bg-yellow-500/10';
                    case 'Malo': return 'text-orange-400 bg-orange-500/10';
                    case 'Muy malo': return 'text-red-400 bg-red-500/10';
                    default: return 'text-gray-400 bg-gray-500/10';
                  }
                };

                return (
                  <div key={t.id} className="group bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden hover:border-green-500/30 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300">
                    {/* Header con título y acciones */}
                    <div className="flex items-center justify-between p-4 lg:p-6 border-b border-gray-700/30">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getResultIcon(t.resultado)}</span>
                        <div>
                          <h3 className="font-semibold text-lg lg:text-xl text-white group-hover:text-green-400 transition-colors">
                            {t.nombreTorneo}
                          </h3>
                          <p className="text-sm text-gray-400">
                            {formatDate(t.fechaInicio)} - {formatDate(t.fechaFin)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEditClick(t)}
                          className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white transition-all duration-200 opacity-0 group-hover:opacity-100"
                          title="Editar torneo"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDeleteClick(t.id)}
                          className="p-2 rounded-lg bg-red-900/30 hover:bg-red-800/40 text-red-400 hover:text-red-300 transition-all duration-200 opacity-0 group-hover:opacity-100"
                          title="Eliminar torneo"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Contenido principal */}
                    <div className="p-4 lg:p-6">
                      <div className="flex flex-wrap items-center gap-4">
                        {/* Resultado */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Resultado</span>
                          <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-sm font-medium">
                            {t.resultado}
                          </span>
                        </div>

                        {/* Rendimiento */}
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rendimiento</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRendimientoColor(t.rendimientoJugador)}`}>
                            {t.rendimientoJugador}
                          </span>
                        </div>
                      </div>

                      {/* Observaciones */}
                      {t.observaciones && (
                        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                          <p className="text-sm text-gray-300 italic">
                            "{t.observaciones}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gráficos de rendimiento */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-xl lg:text-2xl font-semibold text-green-400 mb-4">
                Análisis de Rendimiento en Torneos
              </h3>
              <TournamentPerformanceChart 
                tournaments={playerDisputedTournaments}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DisputedTournamentsSection;