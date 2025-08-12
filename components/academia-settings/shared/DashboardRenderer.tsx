// components/academia-settings/shared/DashboardRenderer.tsx - IMPLEMENTACIÓN REAL
import React from 'react';
import { UserRole } from '../../../Database/FirebaseRoles';
import { AcademiaConfig } from '../../../Database/FirebaseAcademiaConfig';
import { useAuth } from '../../../contexts/AuthContext';
import { useAcademia } from '../../../contexts/AcademiaContext';
import DashboardDirectorView from '@/pages/Dashboard/DashboardDirectorView';
import DashboardSubdirectorView from '@/pages/Dashboard/DashboardSubDirectorView';
import DashboardAcademyCoachView from '@/pages/Dashboard/DashboardAcademyCoachView';

// Importar las vistas específicas de dashboard


interface DashboardRendererProps {
  userRole: UserRole | null;
  // Props existentes para surveys (mantener compatibilidad)
  surveyConfig?: AcademiaConfig | null;
  loadingSurveyConfig?: boolean;
  savingSurveyConfig?: boolean;
  onLoadSurveyConfig?: () => Promise<void>; // ✅ NUEVO: Función para cargar config
  onToggleSurveys?: (enabled: boolean) => void;
  onSurveyConfigChange?: (key: keyof AcademiaConfig['preguntasEncuesta'], checked: boolean) => void;
  onSaveSurveyConfig?: () => Promise<void>;
  // ✅ NUEVAS PROPS para configuración de recomendaciones
  recommendationsConfig?: AcademiaConfig | null;
  loadingRecommendationsConfig?: boolean;
  savingRecommendationsConfig?: boolean;
  onRecommendationsConfigChange?: (days: number) => void;
  onSaveRecommendationsConfig?: () => Promise<void>;
}

export const DashboardRenderer: React.FC<DashboardRendererProps> = ({
  userRole,
  // Todas las props se reciben pero no se usan en esta vista
  // ya que cada dashboard tiene su propia lógica
  ...configProps
}) => {
  const { academiaActual } = useAcademia();
  const { currentUser } = useAuth();

  // Renderizar según el rol del usuario
  const renderDashboardByRole = () => {
    switch (userRole) {
      case 'academyDirector':
        return <DashboardDirectorView />;
      
      case 'academySubdirector':
        return <DashboardSubdirectorView />;
      
      case 'academyCoach':
        return <DashboardAcademyCoachView />;
      
      // Los roles de grupo no tienen dashboard en la página de settings
      case 'groupCoach':
      case 'assistantCoach':
        return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Dashboard de Grupo</h2>
              <p className="text-gray-400 mb-6">
                Los grupos de entrenamiento tienen su propio dashboard independiente
              </p>
              <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-6 max-w-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <span className="text-blue-400 text-xl">🏃</span>
                  </div>
                  <div>
                    <h3 className="text-blue-400 font-semibold">Acceso a tu grupo</h3>
                    <p className="text-blue-300 text-sm">
                      Gestiona tu grupo personal desde la aplicación principal
                    </p>
                  </div>
                </div>
                
                {/* Información sobre configuración de recomendaciones para grupos */}
                {configProps.recommendationsConfig && (
                  <div className="mt-4 p-3 bg-purple-900/20 border border-purple-600/50 rounded">
                    <h4 className="text-purple-300 font-medium mb-2">Configuración Aplicada</h4>
                    <p className="text-white text-sm">
                      Ventana de análisis: <span className="font-bold">{configProps.recommendationsConfig.recommendationsAnalysisWindowDays} días</span>
                    </p>
                    <p className="text-purple-400 text-xs mt-1">
                      Esta configuración se aplica automáticamente a las recomendaciones de tu grupo
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="mb-6">
                <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h2 className="text-2xl font-bold text-white mb-2">Acceso No Autorizado</h2>
                <p className="text-gray-400 mb-4">
                  No tienes permisos para acceder a esta sección
                </p>
              </div>
              
              <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-red-300 text-sm">
                  <strong>Información de sesión:</strong><br/>
                  Usuario: {currentUser?.email || 'No identificado'}<br/>
                  Academia: {academiaActual?.nombre || 'No seleccionada'}<br/>
                  Rol detectado: {userRole || 'Sin rol asignado'}
                </p>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200"
                >
                  Recargar Página
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return renderDashboardByRole();
};