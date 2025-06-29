import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { TrainingProvider } from '../contexts/TrainingContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { getPlayers } from "../Database/FirebasePlayers";
import { getObjectives } from '../Database/FirebaseObjectives';
import { getSessions } from '../Database/FirebaseSessions';
import { getTournaments } from '../Database/FirebaseTournaments';
import GlobalHeader from './GlobalHeader';
import HomePage from '../pages/HomePage';
import PlayersListPage from '../pages/PlayersListPage';
import StartTrainingPage from '../pages/StartTrainingPage';
import TrainingSessionPage from '../pages/TrainingSessionPage';
import PlayerProfilePage from '../pages/PlayerProfilePage';
import EditObjectivesPage from '../pages/EditObjectivesPage';
import ObjectiveDetailPage from '../pages/ObjectiveDetailPage';
import SessionDetailPage from '../pages/SessionDetailPage';
import { Player, Objective, TrainingSession, Tournament } from '../types';
import AcademiaSettingsPage from '../pages/AcademiaSettingsPage';


const AppWithAcademia: React.FC = () => {
  const { academiaActual } = useAcademia();
  const navigate = useNavigate();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  useEffect(() => {
    if (!academiaActual) {
      navigate('/select-academia');
      return;
    }
    
    fetchData();
  }, [academiaActual, navigate]);

  const fetchData = async () => {
    if (!academiaActual) return;
    
    setPlayers(await getPlayers(academiaActual.id));
    setObjectives(await getObjectives(academiaActual.id));
    setSessions(await getSessions(academiaActual.id));
    setTournaments(await getTournaments(academiaActual.id));
  };

  if (!academiaActual) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col pt-[60px]">
      <GlobalHeader />
      <main className="container mx-auto p-4 flex-grow">
        <TrainingProvider>
          <Routes>
            <Route path="/players" element={
             <PlayersListPage 
             players={players} 
             onDataChange={fetchData} 
             academiaId={academiaActual.id}
             academiaActual={academiaActual} // NUEVO: pasar academiaActual
            />
          } />
            <Route path="/academia-settings" element={
              <AcademiaSettingsPage />
                } />

            <Route path="/player/:playerId" element={
              <PlayerProfilePage 
                players={players} 
                objectives={objectives} 
                sessions={sessions} 
                tournaments={tournaments} 
                onDataChange={fetchData}
                academiaId={academiaActual.id}
              />
            } />
            <Route path="/start-training" element={
              <StartTrainingPage 
                players={players} 
              />
            } />
            <Route path="/training/:playerId" element={
              <TrainingSessionPage 
                allPlayers={players} 
                allObjectives={objectives} 
                allTournaments={tournaments} 
                onDataChange={fetchData}
                academiaId={academiaActual.id}
              />
            } />
            <Route path="/session/:sessionId" element={
              <SessionDetailPage 
                sessions={sessions} 
                players={players} 
              />
            } />
            <Route path="/objective/:objectiveId/edit" element={
              <ObjectiveDetailPage 
                allObjectives={objectives} 
                players={players} 
                onDataChange={fetchData}
                academiaId={academiaActual.id}
              />
            } />
            <Route path="/player/:playerId/edit-objectives" element={
              <EditObjectivesPage 
                players={players} 
                allObjectives={objectives} 
                onDataChange={fetchData}
                academiaId={academiaActual.id}
              />
            } />
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
