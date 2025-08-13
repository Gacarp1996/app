// pages/PlayerProfilePage.tsx - ACTUALIZADO CON VALIDACIONES ESTRICTAS Y AUTO-SELECCIÓN DE TAB
import React, { useState, useMemo, Suspense, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { usePlayer } from '../contexts/PlayerContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { useSession } from '../contexts/SessionContext';
import { useObjective } from '../contexts/ObjectiveContext';
import { useTournament } from '../contexts/TournamentContext';

import Modal from '../components/shared/Modal';
import TrainingsOnDateModal from '../components/training/TrainingOnDateModal';
import PlanningAccordion from '../components/PlanningAccordion';
import DisputedTournamentFormModal from '../components/tournaments/DisputedTournamentFormModal';
import TournamentFormModal from '@/components/tournaments/TournamentFormModal';

// IMPORTS BÁSICOS (siempre cargados)
import PlayerHeader from '../components/player-profile/PlayerHeader';
import NavigationTabs, { Tab } from '../components/player-profile/NavigationTabs';
import ProfileSection from '../components/player-profile/ProfileSection';

// IMPORTS CONDICIONALES - Solo se importan cuando se necesitan
const DateFilters = React.lazy(() => import('../components/player-profile/DateFilters'));
const ExerciseAnalysis = React.lazy(() => import('../components/player-profile/ExerciseAnalysis'));
const IndividualMetricsCharts = React.lazy(() => import('../components/player-profile/IndividualMetricsCharts'));
const RadarChartOverview = React.lazy(() => import('../components/player-profile/RadarChartOverview'));
const TrainingCalendarSection = React.lazy(() => import('../components/player-profile/TrainingCalendarSection'));
const ObjectivesSection = React.lazy(() => import('../components/player-profile/ObjectivesSection'));
const FutureTournamentsSection = React.lazy(() => import('../components/player-profile/FutureTournamentsSection'));
const DisputedTournamentsSection = React.lazy(() => import('../components/player-profile/DisputedTournamentsSection'));
const PlanningSection = React.lazy(() => import('../components/player-profile/PlanningSection'));
const TournamentSubTabs = React.lazy(() => import('../components/player-profile/TournamentSubTabs'));

// HOOKS BÁSICOS
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { usePlayerTrainings } from '../hooks/usePlayerTrainings';
import { useTrainingPlan } from '../hooks/useTrainingPlan';
import { usePlayerTournaments } from '../hooks/usePlayerTournaments';

// UTILIDADES
import { formatDate } from '../components/player-profile/utils';

interface PlayerProfilePageProps {
  onDataChange: () => void;
}

// LOADING COMPONENT REUTILIZABLE
const TabLoadingSkeleton: React.FC<{ message?: string }> = ({ message = "Cargando..." }) => (
  <div className="space-y-6 animate-pulse">
    <div className="bg-gray-900/50 backdrop-blur-sm p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-6 h-6 bg-gray-700 rounded"></div>
        <div className="h-6 bg-gray-700 rounded w-48"></div>
      </div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-4 bg-gray-700 rounded w-full"></div>
        ))}
      </div>
    </div>
    <div className="text-center py-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
      <p className="mt-2 text-gray-400 text-sm">{message}</p>
    </div>
  </div>
);

const PlayerProfilePage: React.FC<PlayerProfilePageProps> = ({ 
  onDataChange
}) => {
  const { playerId } = useParams<{ playerId: string }>();
  const [searchParams] = useSearchParams(); // ✅ NUEVO: Para leer parámetros URL
  const { players } = usePlayer();
  const { academiaActual } = useAcademia();
  const academiaId = academiaActual?.id || '';
  
  // ✅ USAR SessionContext
  const { getSessionsByPlayer } = useSession();
  
  // ✅ USAR ObjectiveContext
  const { getObjectivesByPlayer, getObjectivesByState } = useObjective();
  
  // ✅ USAR TournamentContext
  const { 
    getTournamentsByPlayer, 
    getDisputedTournamentsByPlayer,
    tournaments
  } = useTournament();
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState<Tab>("perfil");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPlanningAnalysisOpen, setIsPlanningAnalysisOpen] = useState(false);

  // ✅ NUEVO: Efecto para establecer tab automáticamente desde URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      const validTabs: Tab[] = ["perfil", "trainings", "objectives", "tournaments", "planificacion"];
      if (validTabs.includes(tabFromUrl as Tab)) {
        setActiveTab(tabFromUrl as Tab);
      }
    }
  }, [searchParams]);

  // Hook básico del jugador (siempre cargado)
  const { 
    player, 
    profileData, 
    profileSetters, 
    handlers: profileHandlers 
  } = usePlayerProfile({ 
    playerId
  });

  // ✅ OBTENER SESIONES DEL JUGADOR
  const playerSessions = useMemo(() => {
    if (!playerId) return [];
    return getSessionsByPlayer(playerId);
  }, [playerId, getSessionsByPlayer]);

  // HOOKS CONDICIONALES
  const trainingsHook = usePlayerTrainings({ 
    playerId, 
    academiaId, 
    activeTab,
    skipExecution: activeTab !== "trainings"
  });

  const planningHook = useTrainingPlan({ 
    playerId, 
    academiaId, 
    activeTab
  });

  const tournamentsHook = usePlayerTournaments({ 
    playerId, 
    activeTab
  });

  // ✅ OBTENER OBJETIVOS DEL JUGADOR DESDE EL CONTEXTO
  const playerAllObjectives = useMemo(() => {
    if (!playerId || (activeTab !== "objectives" && activeTab !== "perfil")) return [];
    return getObjectivesByPlayer(playerId);
  }, [playerId, activeTab, getObjectivesByPlayer]);

  const playerActualObjectivesCount = useMemo(() => {
    if (!playerId) return 0;
    return getObjectivesByState(playerId, 'actual-progreso').length;
  }, [playerId, getObjectivesByState]);

  // ✅ OBTENER TORNEOS DEL JUGADOR DESDE EL CONTEXTO
  const playerTournaments = useMemo(() => {
    if (!playerId || activeTab !== "tournaments") return [];
    return getTournamentsByPlayer(playerId);
  }, [playerId, activeTab, getTournamentsByPlayer]);

  const playerDisputedTournaments = useMemo(() => {
    if (!playerId || activeTab !== "tournaments") return [];
    return getDisputedTournamentsByPlayer(playerId);
  }, [playerId, activeTab, getDisputedTournamentsByPlayer]);

  // Handlers locales
  const handleDeleteClick = () => setIsDeleteModalOpen(true);
  const confirmDeletePlayer = async () => {
    await profileHandlers.handleArchivePlayer();
    setIsDeleteModalOpen(false);
  };

  if (!player) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Cargando jugador...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Efectos de fondo REDUCIDOS - más sutiles */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="fixed top-20 left-20 w-64 h-64 lg:w-96 lg:h-96 bg-green-500/3 rounded-full blur-3xl"></div>
      <div className="fixed bottom-20 right-20 w-64 h-64 lg:w-96 lg:h-96 bg-cyan-500/3 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        
        {/* Modal de eliminación mejorado */}
        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="">
          <div className="p-6">
            {/* Header con icono de advertencia */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-400 mb-1">Eliminar Jugador</h3>
                <p className="text-gray-400 text-sm">Esta acción es permanente</p>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="mb-6">
              <p className="text-gray-300 text-lg mb-3">
                ¿Estás seguro de que quieres eliminar a{' '}
                <span className="text-white font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                  {player.name}
                </span>
                ?
              </p>
              
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                  </svg>
                  <div className="text-sm">
                    <p className="text-red-300 font-medium mb-1">Esta acción eliminará:</p>
                    <ul className="text-red-200 space-y-1">
                      <li>• Todos los datos del perfil del jugador</li>
                      <li>• Historial de entrenamientos y sesiones</li>
                      <li>• Objetivos y planificaciones</li>
                      <li>• Datos de torneos y competencias</li>
                    </ul>
                  </div>
                </div>
              </div>

              <p className="text-gray-400 text-sm">
                <strong>Nota:</strong> Esta acción no se puede deshacer. Considera archivar al jugador en lugar de eliminarlo.
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-all duration-200 border border-gray-600 hover:border-gray-500"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeletePlayer}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-500/25 border border-red-500/50"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Sí, Eliminar Definitivamente
                </div>
              </button>
            </div>
          </div>
        </Modal>
        
        {/* Modales condicionales de torneos */}
        {activeTab === "tournaments" && tournamentsHook.isTournamentModalOpen && playerId && (
          <Suspense fallback={null}>
            <TournamentFormModal 
              isOpen={tournamentsHook.isTournamentModalOpen} 
              onClose={() => tournamentsHook.futureTournamentHandlers.setIsTournamentModalOpen(false)} 
              onSave={tournamentsHook.futureTournamentHandlers.handleSaveTournament} 
              playerId={playerId} 
              existingTournament={tournamentsHook.editingTournament} 
            />
          </Suspense>
        )}
        
        {/* Modal de entrenamientos */}
        {activeTab === "trainings" && trainingsHook.isTrainingsModalOpen && (
          <Suspense fallback={null}>
            <TrainingsOnDateModal
              isOpen={trainingsHook.isTrainingsModalOpen}
              onClose={() => trainingsHook.setIsTrainingsModalOpen(false)}
              date={trainingsHook.selectedDate}
              sessions={trainingsHook.trainingsForSelectedDate}
            />
          </Suspense>
        )}

        {activeTab === "tournaments" && tournamentsHook.isDisputedTournamentModalOpen && playerId && (
          <Suspense fallback={null}>
            <DisputedTournamentFormModal
              isOpen={tournamentsHook.isDisputedTournamentModalOpen}
              onClose={() => tournamentsHook.disputedTournamentHandlers.setIsDisputedTournamentModalOpen(false)}
              onSave={tournamentsHook.disputedTournamentHandlers.handleSaveDisputedTournament}
              playerId={playerId}
              existingDisputedTournament={tournamentsHook.editingDisputedTournament}
              futureTournamentToConvert={tournamentsHook.tournamentToConvert}
            />
          </Suspense>
        )}

        {/* Header y navegación */}
        <PlayerHeader 
          player={player} 
          onDeleteClick={handleDeleteClick}
        />

        <NavigationTabs 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          playerActualObjectivesCount={playerActualObjectivesCount}
        />
        
        {/* Contenido según tab activa - LAZY LOADED */}
        {activeTab === "perfil" && (
          <ProfileSection
            {...profileData}
            onEdadChange={profileSetters.setEdad}
            onAlturaChange={profileSetters.setAltura}
            onPesoChange={profileSetters.setPeso}
            onPesoIdealChange={profileSetters.setPesoIdeal}
            onBrazoDominanteChange={profileSetters.setBrazoDominante}
            onCanalComunicacionChange={profileSetters.setCanalComunicacion}
            onOjoDominanteChange={profileSetters.setOjoDominante}
            onHistoriaDeportivaChange={profileSetters.setHistoriaDeportiva}
            onLesionesActualesChange={profileSetters.setLesionesActuales}
            onLesionesPasadasChange={profileSetters.setLesionesPasadas}
            onFrecuenciaSemanalChange={profileSetters.setFrecuenciaSemanal}
            onSave={profileHandlers.handleProfileSave}
          />
        )}

        {activeTab === "trainings" && (
          <section className="space-y-8 lg:space-y-12">
            <Suspense fallback={<TabLoadingSkeleton message="Cargando filtros..." />}>
              <DateFilters 
                startDate={trainingsHook.startDate || ''}
                endDate={trainingsHook.endDate || ''}
                onStartDateChange={trainingsHook.setStartDate || (() => {})}
                onEndDateChange={trainingsHook.setEndDate || (() => {})}
                onReset={trainingsHook.resetDateFilters || (() => {})}
              />
            </Suspense>

            <Suspense fallback={<TabLoadingSkeleton message="Cargando análisis de ejercicios..." />}>
              <ExerciseAnalysis
                dateFilteredSessions={trainingsHook.dateFilteredSessions || []}
                drillDownPath={trainingsHook.drillDownPath || []}
                drillDownData={trainingsHook.drillDownData || []}
                areaChartTitle={trainingsHook.areaChartTitle || ''}
                intensityChartData={trainingsHook.intensityChartData || []}
                intensityChartTitle={trainingsHook.intensityChartTitle || ''}
                onBreadcrumbClick={trainingsHook.handleBreadcrumbClick || (() => {})}
                onPieSliceClick={trainingsHook.handlePieSliceClick || (() => {})}
              />
            </Suspense>
            
            <div className="border-t border-gray-800 pt-8 lg:pt-12">
              <h2 className="text-2xl lg:text-3xl font-semibold text-green-400 mb-6 lg:mb-8">Mentalidad y Rendimiento</h2>
              {trainingsHook.surveysLoading ? (
                <TabLoadingSkeleton message="Cargando encuestas..." />
              ) : trainingsHook.playerSurveys.length === 0 ? (
                <div className="bg-gray-900/50 p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800 text-center">
                  <p className="text-gray-400 text-lg">
                    No hay encuestas registradas para este jugador en el período seleccionado.
                  </p>
                </div>
              ) : (
                <div className="space-y-8 lg:space-y-10">
                  <Suspense fallback={<TabLoadingSkeleton message="Cargando gráfico radar..." />}>
                    <RadarChartOverview 
                      radarData={trainingsHook.radarData || []}
                      surveysCount={trainingsHook.playerSurveys.length || 0}
                    />
                  </Suspense>

                  <Suspense fallback={<TabLoadingSkeleton message="Cargando gráficos individuales..." />}>
                    <IndividualMetricsCharts
                      prepareIndividualChartData={trainingsHook.prepareIndividualChartData || (() => [])}
                      METRIC_CONFIG={trainingsHook.METRIC_CONFIG || {}}
                    />
                  </Suspense>
                </div>
              )}
            </div>

            <Suspense fallback={<TabLoadingSkeleton message="Cargando calendario..." />}>
              <TrainingCalendarSection
                playerId={playerId!}
                onDateClick={trainingsHook.handleDateClick || (() => {})}
              />
            </Suspense>
          </section>
        )}

        {activeTab === "objectives" && (
          <Suspense fallback={<TabLoadingSkeleton message="Cargando objetivos..." />}>
            <ObjectivesSection
              playerId={playerId!}
              playerAllObjectives={playerAllObjectives}
            />
          </Suspense>
        )}

        {activeTab === "tournaments" && (
          <section className="space-y-6">
            <Suspense fallback={<TabLoadingSkeleton message="Cargando torneos..." />}>
              <TournamentSubTabs
                activeSubTab={tournamentsHook.activeSubTab || 'future'}
                onSubTabChange={tournamentsHook.setActiveSubTab || (() => {})}
                futureTournamentsCount={playerTournaments.length}
                disputedTournamentsCount={playerDisputedTournaments.length}
              />

              {tournamentsHook.activeSubTab === 'future' ? (
                <FutureTournamentsSection
                  playerTournaments={playerTournaments}
                  onAddClick={tournamentsHook.futureTournamentHandlers.handleOpenAddTournamentModal || (() => {})}
                  onEditClick={tournamentsHook.futureTournamentHandlers.handleEditTournamentClick || (() => {})}
                  onDeleteClick={tournamentsHook.futureTournamentHandlers.handleDeleteTournament || (() => {})}
                  onConvertClick={tournamentsHook.futureTournamentHandlers.handleConvertTournamentClick || (() => {})}
                  formatDate={formatDate}
                />
              ) : (
                <DisputedTournamentsSection
                  playerDisputedTournaments={playerDisputedTournaments}
                  onAddClick={tournamentsHook.disputedTournamentHandlers.handleOpenAddDisputedTournamentModal || (() => {})}
                  onEditClick={tournamentsHook.disputedTournamentHandlers.handleEditDisputedTournamentClick || (() => {})}
                  onDeleteClick={tournamentsHook.disputedTournamentHandlers.handleDeleteDisputedTournament || (() => {})}
                  formatDate={formatDate}
                />
              )}
            </Suspense>
          </section>
        )}

        {activeTab === "planificacion" && (
          <Suspense fallback={<TabLoadingSkeleton message="Cargando planificación..." />}>
            <PlanningSection
              // ✅ Props básicas mantenidas
              planLoading={planningHook.planLoading || false}
              planSaving={planningHook.planSaving || false}
              rangoAnalisis={planningHook.rangoAnalisis || 0}
              planificacion={planningHook.planificacion || {}}
              onRangoAnalisisChange={planningHook.setRangoAnalisis || (() => {})}
              onTipoPercentageChange={planningHook.handlers?.handleTipoPercentageChange || (() => {})}
              onAreaPercentageChange={planningHook.handlers?.handleAreaPercentageChange || (() => {})}
              onEjercicioPercentageChange={planningHook.handlers?.handleEjercicioPercentageChange || (() => {})}
              calculateAreasTotalPercentage={planningHook.calculations?.calculateAreasTotalPercentage || (() => 0)}
              calculateEjerciciosTotalPercentage={planningHook.calculations?.calculateEjerciciosTotalPercentage || (() => 0)}
              hasDetailAtLevel={planningHook.calculations?.hasDetailAtLevel || (() => false)}
              onSavePlan={planningHook.handlers?.handleSavePlan || (() => {})}
              onAnalysisClick={() => setIsPlanningAnalysisOpen(true)}
              
              // ✅ NUEVAS props con validación estricta
              totalPercentage={planningHook.calculations?.calculateTotalPercentage() || 0}
              strictValidation={planningHook.strictValidation || {
                isValid: true,
                isComplete: false,
                errors: [],
                warnings: [],
                totalPercentage: 0,
                granularityLevel: 'TIPO' as const,
                canGenerateRecommendations: false
              }}
              canGenerateRecommendations={planningHook.canGenerateRecommendations || false}
              planStatus={planningHook.planStatus || { 
                status: 'EMPTY' as const, 
                message: 'Sin plan definido', 
                color: 'gray' as const 
              }}
              realTimeValidation={planningHook.realTimeValidation || {
                fieldErrors: {},
                globalErrors: [],
                isValidForSave: false,
                totalPercentage: 0
              }}
              
              // ✅ MANTENER prop legacy para compatibilidad hasta que se actualice PlanningSection
              validation={planningHook.calculations?.validateStrictPlan() || { 
                isValid: true, 
                errors: [],
                warnings: [],
                isComplete: false,
                totalPercentage: 0,
                granularityLevel: 'TIPO' as const,
                canGenerateRecommendations: false
              }}
            />
          </Suspense>
        )}
        
        <div className="mt-8 lg:mt-12 text-center pb-8">
          <Link to="/players" className="inline-flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors duration-200 font-medium text-lg lg:text-xl group">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 lg:w-6 lg:h-6 group-hover:-translate-x-1 transition-transform duration-200">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Volver a Jugadores</span>
          </Link>
        </div>
        
        {/* Modal de Análisis de Planificación */}
        {isPlanningAnalysisOpen && player && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
           <div className="bg-gray-900/95 backdrop-blur-xl rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-gray-800">
             <div className="p-6 border-b border-gray-700 flex-shrink-0">
               <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold text-green-400">
                   {player.name} - Análisis de Planificación
                        </h2>
                 <button
                   onClick={() => setIsPlanningAnalysisOpen(false)}
                   className="text-gray-400 hover:text-gray-300 transition-colors"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>
             </div>
             
             <div className="flex-1 overflow-y-auto">
               <div className="p-6">
                 <Suspense fallback={<TabLoadingSkeleton message="Cargando análisis..." />}>
                   <PlanningAccordion 
                     player={player} 
                     academiaId={academiaId}
                     rangoAnalisis={planningHook.rangoAnalisis}  // ✅ NUEVO: Pasar el valor actual
                     onRangoAnalisisChange={planningHook.setRangoAnalisis}  // ✅ NUEVO: Sincronizar cambios
                    
                   />
                 </Suspense>
                       </div>
                     </div>
                   </div>
                 </div>
               )}
             </div>
           </div>
         );
       };

export default PlayerProfilePage;