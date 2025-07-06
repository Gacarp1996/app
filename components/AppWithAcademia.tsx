import React, { useEffect, useState } from 'react';
// El 'BrowserRouter' no es necesario aquí si ya está en un nivel superior de tu app.
// Lo quito para evitar conflictos, pero mantengo 'Routes', 'Route', etc.
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { TrainingProvider } from '../contexts/TrainingContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { getPlayers } from "../Database/FirebasePlayers";
import { getObjectives } from '../Database/FirebaseObjectives';
import { getSessions } from '../Database/FirebaseSessions';
import { getTournaments } from '../Database/FirebaseTournaments';
import { getDisputedTournaments } from '../Database/FirebaseDisputedTournaments'; // NUEVO IMPORT
import GlobalHeader from './shared/GlobalHeader';
import HomePage from '../pages/HomePage'; // Esta importación ya la tenías, ¡perfecto!
import PlayersListPage from '../pages/PlayersListPage';
import StartTrainingPage from '../pages/StartTrainingPage';
import TrainingSessionPage from '../pages/TrainingSessionPage';
import PlayerProfilePage from '../pages/PlayerProfilePage';
import EditObjectivesPage from '../pages/EditObjectivesPage';
import ObjectiveDetailPage from '../pages/ObjectiveDetailPage';
import SessionDetailPage from '../pages/SessionDetailPage';
import { Player, Objective, TrainingSession, Tournament, DisputedTournament } from '../types'; // ACTUALIZADO
import AcademiaSettingsPage from '../pages/AcademiaSettingsPage';


const AppWithAcademia: React.FC = () => {
  const { academiaActual } = useAcademia();
  const navigate = useNavigate();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [disputedTournaments, setDisputedTournaments] = useState<DisputedTournament[]>([]);
  const [dataLoading, setDataLoading] = useState(true); // NUEVO ESTADO

  useEffect(() => {
    if (!academiaActual) {
      navigate('/select-academia');
      return;
    }
    
    fetchData();
  }, [academiaActual, navigate]);

  const fetchData = async () => {
    if (!academiaActual) return;
    
    setDataLoading(true);
    try {
      const [playersData, objectivesData, sessionsData, tournamentsData, disputedData] = await Promise.all([
        getPlayers(academiaActual.id),
        getObjectives(academiaActual.id),
        getSessions(academiaActual.id),
        getTournaments(academiaActual.id),
        getDisputedTournaments(academiaActual.id)
      ]);
      
      setPlayers(playersData || []);
      setObjectives(objectivesData || []);
      setSessions(sessionsData || []);
      setTournaments(tournamentsData || []);
      setDisputedTournaments(disputedData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Establecer arrays vacíos en caso de error
      setPlayers([]);
      setObjectives([]);
      setSessions([]);
      setTournaments([]);
      setDisputedTournaments([]);
    } finally {
      setDataLoading(false);
    }
  };

  if (!academiaActual) {
    return null;
  }

  // Mostrar loading mientras se cargan los datos
  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-[60px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent mx-auto"></div>
          <p className="mt-4 text-app-secondary">Cargando datos de la academia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-[60px]">
      <GlobalHeader />
      <main className="container mx-auto p-4 flex-grow">
        <TrainingProvider>
          <Routes>
            {/* AQUÍ ESTÁ LA LÍNEA AÑADIDA:
              Esta es la ruta para tu página de inicio. Ahora sí se va a renderizar.
            */}
            <Route path="/" element={<HomePage />} />

            <Route path="/players" element={
             <PlayersListPage 
             players={players || []} 
             onDataChange={fetchData} 
             academiaId={academiaActual.id}
             academiaActual={academiaActual}
            />
          } />
            <Route path="/academia-settings" element={
              <AcademiaSettingsPage />
                } />

            <Route path="/player/:playerId" element={
              <PlayerProfilePage 
                players={players || []} 
                objectives={objectives || []} 
                sessions={sessions || []} 
                tournaments={tournaments || []} 
                onDataChange={fetchData}
                academiaId={academiaActual.id}
              />
            } />
            <Route path="/start-training" element={
              <StartTrainingPage 
                players={players || []} 
              />
            } />
            <Route path="/training/:playerId" element={
              <TrainingSessionPage 
                allPlayers={players || []} 
                allObjectives={objectives || []} 
                allTournaments={tournaments || []} 
                onDataChange={fetchData}
                academiaId={academiaActual.id}
              />
            } />
            <Route path="/session/:sessionId" element={
              <SessionDetailPage 
                sessions={sessions || []} 
                players={players || []} 
              />
            } />
            <Route path="/objective/:objectiveId/edit" element={
              <ObjectiveDetailPage 
                allObjectives={objectives || []} 
                players={players || []} 
                onDataChange={fetchData}
                academiaId={academiaActual.id}
              />
            } />
            <Route path="/player/:playerId/edit-objectives" element={
              <EditObjectivesPage 
                players={players || []} 
                allObjectives={objectives || []} 
                onDataChange={fetchData}
                academiaId={academiaActual.id}
              />
            } />
            {/* Esta redirección ahora tiene más sentido, si no encuentra ninguna ruta, va a la de inicio */ }
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </TrainingProvider>
      </main>
      <footer className="bg-app-footer text-center text-sm p-3 text-app-footer">
        © 2024 TenisCoaching App - {academiaActual.nombre}
        {academiaActual.tipo === 'grupo-entrenamiento' && ' | Grupo de Entrenamiento Personal'}
      </footer>
    </div>
  );
};

export default AppWithAcademia;