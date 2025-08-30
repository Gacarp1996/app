// pages/AcademiaSettingsPage.tsx - VERSIÓN SIMPLIFICADA (sin DashboardRenderer)
import { FC, useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { getUserRoleInAcademia, UserRole } from '../Database/FirebaseRoles';
import { 
  getAcademiaConfig, 
  saveAcademiaConfig, 
  AcademiaConfig,
  updateRecommendationsAnalysisWindow 
} from '../Database/FirebaseAcademiaConfig';

// Importar componentes de configuración
import { LoadingSpinner } from '../components/academia-settings';
import { MainConfigModal } from '../components/academia-settings/sections/MainConfigModal';
import { AdvancedConfigModal } from '../components/academia-settings/sections/AdvancedConfigModal';
import DashboardDirectorView from './Dashboard/DashboardDirectorView';
import DashboardAcademyCoachView from './Dashboard/DashboardAcademyCoachView';
import DashboardSubdirectorView from './Dashboard/DashboardSubDirectorView';

// ✅ IMPORTAR TUS DASHBOARDS EXISTENTES



const AcademiaSettingsPage: FC = () => {
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia();
  
  // Estados principales
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // ✅ ESTADOS para configuración de recomendaciones
  const [recommendationsConfig, setRecommendationsConfig] = useState<AcademiaConfig | null>(null);
  const [loadingRecommendationsConfig, setLoadingRecommendationsConfig] = useState(false);
  const [savingRecommendationsConfig, setSavingRecommendationsConfig] = useState(false);
  const [pendingRecommendationsDays, setPendingRecommendationsDays] = useState<number>(7);

  // Estados para surveys (mantener compatibilidad)
  const [surveyConfig, setSurveyConfig] = useState<AcademiaConfig | null>(null);
  const [loadingSurveyConfig, setLoadingSurveyConfig] = useState(false);
  const [savingSurveyConfig, setSavingSurveyConfig] = useState(false);

  // Estados para modales
  const [showMainModal, setShowMainModal] = useState(false);
  const [showAdvancedModal, setShowAdvancedModal] = useState(false);

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

  // ✅ CARGAR CONFIGURACIÓN DE RECOMENDACIONES
  useEffect(() => {
    const loadRecommendationsConfig = async () => {
      if (!academiaActual?.id) return;
      
      setLoadingRecommendationsConfig(true);
      try {
        const config = await getAcademiaConfig(academiaActual.id);
        setRecommendationsConfig(config);
        setSurveyConfig(config); // También para surveys
        setPendingRecommendationsDays(config.recommendationsAnalysisWindowDays);
      } catch (error) {
        console.error('❌ Error cargando configuración:', error);
      } finally {
        setLoadingRecommendationsConfig(false);
      }
    };

    loadRecommendationsConfig();
  }, [academiaActual?.id]);

  // ✅ HANDLERS para configuración de recomendaciones
  const handleRecommendationsConfigChange = (days: number) => {
    setPendingRecommendationsDays(days);
  };

  const handleSaveRecommendationsConfig = async () => {
    if (!academiaActual?.id || !recommendationsConfig) return;

    setSavingRecommendationsConfig(true);
    try {
      await updateRecommendationsAnalysisWindow(academiaActual.id, pendingRecommendationsDays);
      
      setRecommendationsConfig({
        ...recommendationsConfig,
        recommendationsAnalysisWindowDays: pendingRecommendationsDays
      });


    } catch (error) {
      console.error('❌ Error guardando configuración de recomendaciones:', error);
    } finally {
      setSavingRecommendationsConfig(false);
    }
  };

  // Handlers para surveys (mantener compatibilidad)
  const handleToggleSurveys = (enabled: boolean) => {
    if (surveyConfig) {
      setSurveyConfig({ ...surveyConfig, encuestasHabilitadas: enabled });
    }
  };

  const handleSurveyConfigChange = (key: keyof AcademiaConfig['preguntasEncuesta'], checked: boolean) => {
    if (surveyConfig) {
      setSurveyConfig({
        ...surveyConfig,
        preguntasEncuesta: { ...surveyConfig.preguntasEncuesta, [key]: checked }
      });
    }
  };

  const handleSaveSurveyConfig = async () => {
    if (!academiaActual?.id || !surveyConfig) return;

    setSavingSurveyConfig(true);
    try {
      await saveAcademiaConfig(academiaActual.id, {
        encuestasHabilitadas: surveyConfig.encuestasHabilitadas,
        preguntasEncuesta: surveyConfig.preguntasEncuesta
      });
    } catch (error) {
      console.error('Error guardando configuración de encuestas:', error);
    } finally {
      setSavingSurveyConfig(false);
    }
  };

  // ✅ FUNCIÓN para renderizar dashboard según rol (usando tus componentes existentes)
  const renderDashboardByRole = () => {
    if (showSettings) {
      return (
        <div className="min-h-screen bg-gray-900 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white">Configuración</h1>
                <p className="text-gray-400">Gestiona la configuración de tu academia</p>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all duration-200"
              >
                Volver al Dashboard
              </button>
            </div>

            {/* Información sobre configuración actual */}
            {recommendationsConfig && (
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Estado de Configuración</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-purple-900/20 border border-purple-600/50 rounded-lg p-4">
                    <h4 className="font-medium text-purple-300 mb-2">Análisis de Recomendaciones</h4>
                    <p className="text-white text-lg font-bold">
                      {recommendationsConfig.recommendationsAnalysisWindowDays} días
                    </p>
                    <p className="text-purple-400 text-sm">
                      Ventana de análisis para recomendaciones de entrenamiento
                    </p>
                  </div>
                  
                  <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-300 mb-2">Encuestas Post-Entrenamiento</h4>
                    <p className="text-white text-lg font-bold">
                      {recommendationsConfig.encuestasHabilitadas ? 'Habilitadas' : 'Deshabilitadas'}
                    </p>
                    <p className="text-blue-400 text-sm">
                      {recommendationsConfig.encuestasHabilitadas ? 
                        `${Object.values(recommendationsConfig.preguntasEncuesta).filter(Boolean).length} preguntas activas` :
                        'Las encuestas están desactivadas'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de configuración */}
            <div className="grid grid-cols-1 gap-4 sm:gap-6">
              <button
                onClick={() => setShowMainModal(true)}
                className="p-4 sm:p-6 bg-gradient-to-r from-green-500/20 to-cyan-500/20 border border-green-500/30 rounded-xl hover:from-green-500/30 hover:to-cyan-500/30 transition-all duration-200"
              >
                <div className="text-left">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Configuración Principal</h3>
                  <p className="text-gray-400 text-sm sm:text-base">Usuarios, academia y configuración general</p>
                </div>
              </button>

              <button
                onClick={() => setShowAdvancedModal(true)}
                className="p-4 sm:p-6 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl hover:from-purple-500/30 hover:to-blue-500/30 transition-all duration-200"
              >
                <div className="text-left">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Configuración Avanzada</h3>
                  <p className="text-gray-400 text-sm sm:text-base">Recomendaciones, encuestas y estructura</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // ✅ USAR TUS DASHBOARDS EXISTENTES (sin botones flotantes redundantes)
    switch (userRole) {
      case 'academyDirector':
        return <DashboardDirectorView />;
      
      case 'academySubdirector':
        return <DashboardSubdirectorView />;
      
      case 'academyCoach':
        return <DashboardAcademyCoachView />;
      
      default:
        return (
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-300">No tienes permisos para acceder a esta sección</p>
            </div>
          </div>
        );
    }
  };

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

  return (
    <>
      {renderDashboardByRole()}

      {/* Modales de configuración */}
      <MainConfigModal
        isOpen={showMainModal}
        onClose={() => setShowMainModal(false)}
        onOpenAdvancedConfig={() => {
          setShowMainModal(false);
          setShowAdvancedModal(true);
        }}
        // Aquí irían las props necesarias para MainConfigModal
        entityName={academiaActual.nombre}
        entityId={academiaActual.id}
        entityType="academia"
        users={[]}
        currentUserId={currentUser?.uid}
        currentUserEmail={currentUser?.email}
        currentUserRole={userRole}
        loadingUsers={false}
        processingAction={false}
        onRemoveUser={async () => {}}
        onChangeRole={() => {}}
        onChangeAcademia={() => {}}
        onDeleteEntity={() => {}}
      />

      <AdvancedConfigModal
        isOpen={showAdvancedModal}
        onClose={() => setShowAdvancedModal(false)}
        // Props existentes para surveys
        surveyConfig={surveyConfig}
        loadingSurveyConfig={loadingSurveyConfig}
        savingSurveyConfig={savingSurveyConfig}
        onToggleSurveys={handleToggleSurveys}
        onSurveyConfigChange={handleSurveyConfigChange}
        onSaveSurveyConfig={handleSaveSurveyConfig}
        // ✅ NUEVAS PROPS para recomendaciones
        recommendationsConfig={recommendationsConfig}
        loadingRecommendationsConfig={loadingRecommendationsConfig}
        savingRecommendationsConfig={savingRecommendationsConfig}
        onRecommendationsConfigChange={handleRecommendationsConfigChange}
        onSaveRecommendationsConfig={handleSaveRecommendationsConfig}
      />
    </>
  );
};

export default AcademiaSettingsPage;
