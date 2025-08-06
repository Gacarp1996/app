import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useObjective } from '../../contexts/ObjectiveContext'; // ✅ NUEVO IMPORT
import TrainingRecommendations from '../training/TrainingRecommendations';
import Modal from '../shared/Modal';
import { Player, Tournament } from '@/types'; // ✅ Ya no necesita Objective

// ✅ INTERFACE ACTUALIZADA - Sin allObjectives
interface ObjectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayers: Player[];
  allTournaments: Tournament[];
}

const ObjectiveModal: React.FC<ObjectiveModalProps> = ({ 
  isOpen, 
  onClose, 
  selectedPlayers, 
  allTournaments 
}) => {
  const navigate = useNavigate();
  const { objectives: allObjectives } = useObjective(); // ✅ OBTENER DEL CONTEXTO

  const handleObjectiveClick = (objectiveId: string) => {
    navigate(`/objective/${objectiveId}/edit`);
    onClose(); 
  };

  const getNextTournamentInfo = (playerId: string): React.ReactNode => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const playerTournaments = allTournaments
      .filter(t => t.jugadorId === playerId)
      .map(t => ({
        ...t,
        fechaInicioObj: new Date(t.fechaInicio),
        fechaFinObj: new Date(t.fechaFin),
      }))
      .filter(t => {
        const fin = new Date(t.fechaFinObj);
        fin.setHours(0,0,0,0);
        return fin >= today;
      })
      .sort((a, b) => a.fechaInicioObj.getTime() - b.fechaInicioObj.getTime());

    const nextTournament = playerTournaments[0];

    if (!nextTournament) {
      return <p className="text-gray-500 text-sm">No hay torneos próximos para este jugador.</p>;
    }

    let statusText = '';
    let statusColor = '';
    const startDate = new Date(nextTournament.fechaInicioObj);
    startDate.setHours(0,0,0,0);
    const endDate = new Date(nextTournament.fechaFinObj);
    endDate.setHours(0,0,0,0);

    if (startDate.getTime() <= today.getTime() && endDate.getTime() >= today.getTime()) {
      statusText = `En curso (finaliza el ${nextTournament.fechaFinObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})`;
      statusColor = 'text-yellow-400';
    } else if (startDate.getTime() > today.getTime()) {
      const diffTime = startDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        statusText = "Comienza mañana";
        statusColor = 'text-orange-400';
      } else {
        statusText = `Comienza en ${diffDays} días`;
        statusColor = 'text-blue-400';
      }
    }
    
    const getImportanceColor = (importance: string) => {
      switch (importance) {
        case 'Esencial': return 'text-red-400';
        case 'Muy Importante': return 'text-orange-400';
        case 'Importante': return 'text-yellow-400';
        case 'Preparación': return 'text-blue-400';
        default: return 'text-gray-400';
      }
    };
    
    return (
      <div className="mt-3 space-y-2 text-sm">
        <p className="flex items-center gap-2">
          <span className="text-gray-400">Torneo:</span>
          <span className="text-green-400 font-medium">{nextTournament.nombreTorneo}</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="text-gray-400">Estado:</span>
          <span className={`font-medium ${statusColor}`}>{statusText}</span>
        </p>
        <p className="flex items-center gap-2">
          <span className="text-gray-400">Importancia:</span>
          <span className={`font-medium ${getImportanceColor(nextTournament.gradoImportancia)}`}>
            {nextTournament.gradoImportancia}
          </span>
        </p>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Información de Jugadores">
      {selectedPlayers.length === 0 && <p className="text-gray-400">No hay jugadores seleccionados.</p>}
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* Sección de recomendaciones */}
        <TrainingRecommendations players={selectedPlayers} />
        
        {/* Separador visual si hay recomendaciones */}
        {selectedPlayers.length > 0 && (
          <div className="border-t border-gray-700 pt-4"></div>
        )}
        
        {/* Sección de objetivos y torneos */}
        {selectedPlayers.map(player => {
          const playerActiveObjectives = allObjectives.filter(obj => obj.jugadorId === player.id && obj.estado === 'actual-progreso');
          return (
            <div key={player.id} className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <h4 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                {player.name}
              </h4>
              
              <div className="space-y-4">
                <div>
                  <h5 className="text-md font-semibold text-green-400 mb-2">
                    Objetivos Actuales:
                  </h5>
                  {playerActiveObjectives.length > 0 ? (
                    <ul className="space-y-2">
                      {playerActiveObjectives.map((obj) => (
                        <li key={obj.id} 
                            className="bg-gray-800/70 p-3 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/70 cursor-pointer transition-all duration-200 border border-gray-700 hover:border-green-500/50 group"
                            onClick={() => handleObjectiveClick(obj.id)}
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => e.key === 'Enter' && handleObjectiveClick(obj.id)}
                            title={`Ver/Editar: ${obj.textoObjetivo}`}
                        >
                          <p className="text-sm flex items-center justify-between">
                            <span>{obj.textoObjetivo}</span>
                            <svg className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm italic">No hay objetivos actuales.</p>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-700">
                  <h5 className="text-md font-semibold text-green-400 mb-1">
                    Próximo Torneo:
                  </h5>
                  {getNextTournamentInfo(player.id)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={onClose}
        className="mt-6 w-full py-3 px-4 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-black font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/25"
      >
        Cerrar
      </button>
    </Modal>
  );
};

export default ObjectiveModal;