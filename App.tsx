// src/App.tsx
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AcademiaProvider, useAcademia } from './contexts/AcademiaContext';
import ProtectedRoute from './components/protectedRoute';
import LoginPage from './pages/LoginPage';
import AcademiaSelectPage from './pages/AcademiaSelectPage';
import AppWithAcademia from './components/AppWithAcademia';

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
            <AuthenticatedApp />
          </AcademiaProvider>
        </AuthProvider>
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;