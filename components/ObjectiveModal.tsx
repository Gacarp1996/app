import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Objective, Player, Tournament } from '../types';
import Modal from './Modal';

interface ObjectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayers: Player[];
  allObjectives: Objective[];
  allTournaments: Tournament[];
}

const ObjectiveModal: React.FC<ObjectiveModalProps> = ({ isOpen, onClose, selectedPlayers, allObjectives, allTournaments }) => {
  const navigate = useNavigate();

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
      return <p className="text-app-secondary text-sm">No hay torneos próximos para este jugador.</p>;
    }

    let statusText = '';
    const startDate = new Date(nextTournament.fechaInicioObj);
    startDate.setHours(0,0,0,0);
    const endDate = new Date(nextTournament.fechaFinObj);
    endDate.setHours(0,0,0,0);


    if (startDate.getTime() <= today.getTime() && endDate.getTime() >= today.getTime()) {
      statusText = `En curso (finaliza el ${nextTournament.fechaFinObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })})`;
    } else if (startDate.getTime() > today.getTime()) {
      const diffTime = startDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        statusText = "Comienza mañana";
      } else {
        statusText = `Comienza en ${diffDays} días`;
      }
    }
    
    return (
      <div className="mt-3 space-y-1 text-sm text-app-primary">
        <p><span className="font-semibold text-app-accent">Torneo:</span> {nextTournament.nombreTorneo}</p>
        <p><span className="font-semibold text-app-accent">Estado:</span> {statusText}</p>
        <p><span className="font-semibold text-app-accent">Importancia:</span> {nextTournament.gradoImportancia}</p>
      </div>
    );
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Información de Jugadores">
      {selectedPlayers.length === 0 && <p className="text-app-secondary">No hay jugadores seleccionados.</p>}
      <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {selectedPlayers.map(player => {
          // LÍNEA CORREGIDA:
const playerActiveObjectives = allObjectives.filter(obj => obj.jugadorId === player.id && obj.estado === 'actual-progreso');
          return (
            <div key={player.id} className="bg-app-surface-alt p-4 rounded-lg">
              <h4 className="text-xl font-semibold text-app-accent mb-2">{player.name}</h4>
              
              <h5 className="text-md font-semibold text-app-accent mb-1 mt-3">Objetivos Actuales:</h5>
              {playerActiveObjectives.length > 0 ? (
                <ul className="space-y-2">
                  {playerActiveObjectives.map((obj) => (
                    <li key={obj.id} 
                        className="bg-app-surface p-3 rounded-md text-app-primary shadow hover:bg-[var(--color-surface-alt)] cursor-pointer transition-colors"
                        onClick={() => handleObjectiveClick(obj.id)}
                        role="button"
                        tabIndex={0}
                        onKeyPress={(e) => e.key === 'Enter' && handleObjectiveClick(obj.id)}
                        title={`Ver/Editar: ${obj.textoObjetivo}`}
                    >
                      <p className="text-sm">{obj.textoObjetivo}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-app-secondary text-sm">No hay objetivos actuales.</p>
              )}

              <h5 className="text-md font-semibold text-app-accent mb-1 mt-4 pt-2 border-t border-app">Próximo Torneo:</h5>
              {getNextTournamentInfo(player.id)}
            </div>
          );
        })}
      </div>
      <button
        onClick={onClose}
        className="mt-6 app-button btn-primary text-white font-semibold py-2 px-4 rounded-lg w-full transition-colors shadow-md"
      >
        Cerrar
      </button>
    </Modal>
  );
};

export default ObjectiveModal;
