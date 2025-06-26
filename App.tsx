// src/App.tsx
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { TrainingProvider } from './contexts/TrainingContext';
import { AuthProvider, useAuth } from './contexts/AuthContext'; // Importar AuthProvider y useAuth
import { getPlayers } from "./Database/FirebasePlayers";
import { getObjectives } from './Database/FirebaseObjectives';
import { getSessions } from './Database/FirebaseSessions';
import { getTournaments } from './Database/FirebaseTournaments';
import GlobalHeader from './components/GlobalHeader';
import ProtectedRoute from './components/protectedRoute'; // El nombre debería coincidir
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import PlayersListPage from './pages/PlayersListPage';
// ...otros imports de páginas
import { Player, Objective, TrainingSession, Tournament } from './types';
import StartTrainingPage from './pages/StartTrainingPage';
import TrainingSessionPage from './pages/TrainingSessionPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import EditObjectivesPage from './pages/EditObjectivesPage';
import ObjectiveDetailPage from './pages/ObjectiveDetailPage';
import SessionDetailPage from './pages/SessionDetailPage';


// El layout principal de la app
const AppLayout: React.FC = () => {
    const [players, setPlayers] = useState<Player[]>([]);
    const [objectives, setObjectives] = useState<Objective[]>([]);
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [tournaments, setTournaments] = useState<Tournament[]>([]);

    const fetchData = async () => {
        setPlayers(await getPlayers());
        setObjectives(await getObjectives());
        setSessions(await getSessions());
        setTournaments(await getTournaments());
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="min-h-screen flex flex-col pt-[60px]">
            <GlobalHeader />
            <main className="container mx-auto p-4 flex-grow">
                 {/* Todas las rutas aquí dentro ya están protegidas por el wrapper en App */}
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/players" element={<PlayersListPage players={players} onDataChange={fetchData} />} />
                    <Route path="/player/:playerId" element={<PlayerProfilePage players={players} objectives={objectives} sessions={sessions} tournaments={tournaments} onDataChange={fetchData} />} />
                    <Route path="/start-training" element={<StartTrainingPage players={players} />} />
                    <Route path="/training/:playerId" element={<TrainingSessionPage allPlayers={players} allObjectives={objectives} allTournaments={tournaments} onDataChange={fetchData}/>} />
                    <Route path="/session/:sessionId" element={<SessionDetailPage sessions={sessions} players={players} />} />
                    <Route path="/objective/:objectiveId/edit" element={<ObjectiveDetailPage allObjectives={objectives} players={players} onDataChange={fetchData} />} />
                    <Route path="/player/:playerId/edit-objectives" element={<EditObjectivesPage players={players} allObjectives={objectives} onDataChange={fetchData} />} />
                    {/* Una ruta catch-all para redirigir al home si no encuentra la página */}
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>
            <footer className="bg-app-footer text-center text-sm p-3 text-app-footer">
                © 2024 TenisCoaching App
            </footer>
        </div>
    );
};


const AppContent: React.FC = () => {
    const { currentUser } = useAuth();
    
    return (
        <Routes>
            {/* Si NO hay usuario, cualquier ruta redirige a /login */}
            {!currentUser && <Route path="*" element={<LoginPage />} />}
            
            {/* Si HAY usuario, la ruta /login redirige al home, y el resto usa AppLayout */}
            {currentUser && (
                <>
                    <Route path="/login" element={<Navigate to="/" replace />} />
                    <Route path="/*" element={
                        <ProtectedRoute>
                            <TrainingProvider>
                                <AppLayout />
                            </TrainingProvider>
                        </ProtectedRoute>
                    } />
                </>
            )}
        </Routes>
    )
}

// Componente Raíz
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <HashRouter>
        <AuthProvider>
            <AppContent />
        </AuthProvider>
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;