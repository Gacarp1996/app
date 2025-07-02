import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Player } from '../types';
import { useAcademia } from '../contexts/AcademiaContext';
import PlanningAccordion from '../components/PlanningAccordion';

interface PlanningAnalysisPageProps {
  players: Player[];
}

const PlanningAnalysisPage: React.FC<PlanningAnalysisPageProps> = ({ players }) => {
  const { playerId } = useParams<{ playerId: string }>();
  const { academiaActual } = useAcademia();
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    const foundPlayer = players.find(p => p.id === playerId);
    if (foundPlayer) {
      setPlayer(foundPlayer);
    }
  }, [playerId, players]);

  if (!player) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-app-secondary">Jugador no encontrado</p>
          <Link to="/players" className="app-link mt-4 inline-block">
            Volver a jugadores
          </Link>
        </div>
      </div>
    );
  }

  if (!academiaActual) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-app-secondary">No se ha seleccionado una academia</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 bg-app-surface rounded-lg shadow-xl p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-app-accent mb-2">
              Análisis de Planificación
            </h1>
            <p className="text-lg text-app-secondary">
              {player.name}
            </p>
          </div>
          <Link 
            to={`/player/${playerId}`} 
            className="app-button btn-secondary"
          >
            ← Volver al perfil
          </Link>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="bg-app-surface rounded-lg shadow-lg p-6">
        <PlanningAccordion 
          player={player} 
          academiaId={academiaActual.id} 
        />
      </div>
    </div>
  );
};

export default PlanningAnalysisPage;