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
    setPlayer(foundPlayer || null);
  }, [playerId, players]);
  
  const renderMessageScreen = (message: string, showButton: boolean = false) => (
    <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
        <div className="text-center">
            <p className="text-lg text-gray-400">{message}</p>
            {showButton && (
                <Link to="/players" className="mt-6 app-button btn-primary">
                    Volver a la lista de jugadores
                </Link>
            )}
        </div>
    </div>
  );

  if (!player) {
    return renderMessageScreen("Jugador no encontrado.", true);
  }

  if (!academiaActual) {
    return renderMessageScreen("No se ha seleccionado ninguna academia.");
  }

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 relative overflow-hidden">
      {/* Efectos de fondo animados */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Cabecera con efecto de cristal */}
        <div className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl shadow-2xl shadow-green-500/10 mb-8">
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent text-shadow-neon-sm mb-2">
                            Análisis de Planificación
                        </h1>
                        <p className="text-xl text-gray-300">
                            {player.name}
                        </p>
                    </div>
                    <Link 
                        to={`/player/${playerId}`} 
                        className="app-button btn-secondary flex-shrink-0"
                    >
                        &larr; Volver al Perfil
                    </Link>
                </div>
            </div>
        </div>

        {/* Contenido principal con efecto de cristal */}
        <div className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl shadow-2xl shadow-green-500/10">
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8">
                <PlanningAccordion 
                    player={player} 
                    academiaId={academiaActual.id} 
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default PlanningAnalysisPage;