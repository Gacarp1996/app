import React, { JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    // Mostrar un spinner o pantalla de carga mientras se verifica la autenticación
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent mx-auto"></div>
          <p className="mt-4 text-app-secondary">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    // Si no hay usuario, redirigir a la página de login
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;