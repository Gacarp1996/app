// pages/AcademiaSettingsPage.tsx (Simplificado)
import { FC, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { getUserRoleInAcademia, UserRole } from '../Database/FirebaseRoles';

// Importar componentes
import { DashboardRenderer } from '../components/academia-settings/shared/DashboardRenderer';
import { LoadingSpinner } from '../components/academia-settings';

const AcademiaSettingsPage: FC = () => {
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia();
  
  // Estados principales
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Efecto para obtener el rol del usuario
  useEffect(() => {
    const fetchUserRole = async () => {
      if (currentUser && academiaActual) {
        setLoading(true);
        try {
          const role = await getUserRoleInAcademia(academiaActual.id, currentUser.uid);
          setUserRole(role);
        } catch (error) {
          console.error('Error obteniendo rol del usuario:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchUserRole();
  }, [currentUser, academiaActual]);

  // Renders condicionales
  if (!academiaActual) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">No hay academia seleccionada</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner message="Cargando configuración..." />
      </div>
    );
  }

  // Renderizar solo el dashboard según el rol
  return <DashboardRenderer userRole={userRole} />;
};

export default AcademiaSettingsPage;