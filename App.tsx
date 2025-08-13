// src/App.tsx - ACTUALIZADO con TournamentProvider y Sonner

import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner'; // ✅ NUEVO IMPORT
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AcademiaProvider, useAcademia } from './contexts/AcademiaContext';
import { ConfigModalProvider } from './contexts/ConfigModalContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { ObjectiveProvider } from './contexts/ObjectiveContext';
import { TournamentProvider } from './contexts/TournamentContext';
import ProtectedRoute from './components/shared/protectedRoute';
import LoginPage from './pages/LoginPage';
import AcademiaSelectPage from './pages/AcademiaSelectPage';
import AppWithAcademia from './components/shared/AppWithAcademia';
import { SessionProvider } from './contexts/SessionContext';

// Componente que maneja la lógica de rutas después de la autenticación
const AuthenticatedApp: React.FC = () => {
  const { currentUser } = useAuth();
  const { academiaActual, loading } = useAcademia();

  if (!currentUser) {
    return <LoginPage />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto shadow-lg shadow-green-500/50"></div>
          <p className="mt-4 text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route 
        path="/select-academia" 
        element={
          <ProtectedRoute>
            <AcademiaSelectPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            {academiaActual ? (
              <AppWithAcademia />
            ) : (
              <Navigate to="/select-academia" replace />
            )}
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

// Componente principal de la aplicación
const App: React.FC = () => {
  return (
    <ThemeProvider>
      <HashRouter>
        <AuthProvider>
          <AcademiaProvider>
            <ConfigModalProvider>
              <PlayerProvider>
                <ObjectiveProvider>
                  <TournamentProvider> 
                    <SessionProvider>
                      <AuthenticatedApp />
                      
                      {/* ✅ NUEVO: Toaster de Sonner configurado para tema oscuro */}
                      <Toaster 
                        theme="dark"
                        position="top-right"
                        toastOptions={{
                          duration: 4000,
                          style: {
                            background: 'rgba(17, 24, 39, 0.95)',
                            color: '#fff',
                            border: '1px solid rgba(55, 65, 81, 0.5)',
                            backdropFilter: 'blur(12px)',
                            fontSize: '14px',
                          },
                          className: 'sonner-toast-custom',
                        }}
                        closeButton
                        richColors
                        expand={false}
                        visibleToasts={5}
                        offset="80px" // Para que no tape el header
                      />
                    </SessionProvider>
                  </TournamentProvider>
                </ObjectiveProvider>
              </PlayerProvider>
            </ConfigModalProvider>
          </AcademiaProvider>
        </AuthProvider>
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;