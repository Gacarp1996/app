// components/academia-settings/shared/DashboardRenderer.tsx
import React from 'react';
import { UserRole } from '../../../Database/FirebaseRoles';
import DashboardDirectorView from '../../../pages/Dashboard/DashboardDirectorView';
import DashboardSubdirectorView from '../../../pages/Dashboard/DashboardSubDirectorView';
import DashboardAcademyCoachView from '../../../pages/Dashboard/DashboardAcademyCoachView';

interface DashboardRendererProps {
  userRole: UserRole | null;
}

export const DashboardRenderer: React.FC<DashboardRendererProps> = ({ userRole }) => {
  switch (userRole) {
    case 'academyDirector':
      return <DashboardDirectorView />;
    
    case 'academySubdirector':
      return <DashboardSubdirectorView />;
    
    case 'academyCoach':
      return <DashboardAcademyCoachView />;
    
    // ✅ CAMBIO: groupCoach y assistantCoach NO tienen dashboard
    // Simplemente no renderizamos nada especial - van directo al HomePage normal
    case 'groupCoach':
    case 'assistantCoach':
      return null;
    
    default:
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-300">No tienes permisos para ver esta sección</p>
          </div>
        </div>
      );
  }
};