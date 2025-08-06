// pages/PlayerProfilePage.tsx - MIGRADO A SESSIONCONTEXT
import React, { useState, useMemo, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Player, Objective, Tournament } from '../types';
import { usePlayer } from '../contexts/PlayerContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { useSession } from '../contexts/SessionContext'; // ✅ NUEVO IMPORT

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

// ✅ INTERFACE ACTUALIZADA - Sin sessions prop
interface PlayerProfilePageProps {
  objectives: Objective[];
  tournaments: Tournament[];
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
  objectives, 
  tournaments, 
  onDataChange
}) => {
  const { playerId } = useParams<{ playerId: string }>();
  const { players } = usePlayer();
  const { academiaActual } = useAcademia();
  const academiaId = academiaActual?.id || '';
  
  // ✅ USAR SessionContext
  const { getSessionsByPlayer } = useSession();
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState<Tab>("perfil");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPlanningAnalysisOpen, setIsPlanningAnalysisOpen] = useState(false);

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

  // HOOKS CONDICIONALES - Ahora sin pasar sessions como prop
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

  // Datos calculados básicos (solo cuando son necesarios)
  const playerAllObjectives = useMemo(() => {
    if (!objectives || !Array.isArray(objectives) || (activeTab !== "objectives" && activeTab !== "perfil")) return [];
    return objectives.filter(obj => obj.jugadorId === playerId);
  }, [objectives, playerId, activeTab]);

  const playerActualObjectivesCount = useMemo(() => 
    playerAllObjectives.filter(obj => obj.estado === 'actual-progreso').length, 
    [playerAllObjectives]
  );

  const playerTournaments = useMemo(() => {
    if (activeTab !== "tournaments") return [];
    return tournaments.filter(t => t.jugadorId === playerId)
      .sort((a,b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
  }, [tournaments, playerId, activeTab]);

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
        
        {/* Modal de eliminación - cambio simple */}
        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Eliminación">
          <p>¿Eliminar a <strong>{player.name}</strong>?</p>
          <p className="text-sm text-gray-400 mt-2">Esta acción no se puede deshacer.</p>
          <div className="flex justify-end space-x-3 mt-4">
            <button onClick={() => setIsDeleteModalOpen(false)} className="app-button btn-secondary">Cancelar</button>
            <button onClick={confirmDeletePlayer} className="app-button btn-danger">Sí, Eliminar</button>
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

            {/* ✅ TrainingCalendarSection ya no necesita sessions prop */}
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
                disputedTournamentsCount={tournamentsHook.playerDisputedTournaments.length || 0}
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
                  playerDisputedTournaments={tournamentsHook.playerDisputedTournaments || []}
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
              planLoading={planningHook.planLoading || false}
              planSaving={planningHook.planSaving || false}
              rangoAnalisis={planningHook.rangoAnalisis || 0}
              planificacion={planningHook.planificacion || {}}
              totalPercentage={planningHook.calculations?.calculateTotalPercentage() || 0}
              validation={planningHook.calculations?.validateFlexiblePlan() || { isValid: true, errors: [] }}
              onRangoAnalisisChange={planningHook.setRangoAnalisis || (() => {})}
              onTipoPercentageChange={planningHook.handlers?.handleTipoPercentageChange || (() => {})}
              onAreaPercentageChange={planningHook.handlers?.handleAreaPercentageChange || (() => {})}
              onEjercicioPercentageChange={planningHook.handlers?.handleEjercicioPercentageChange || (() => {})}
              calculateAreasTotalPercentage={planningHook.calculations?.calculateAreasTotalPercentage || (() => 0)}
              calculateEjerciciosTotalPercentage={planningHook.calculations?.calculateEjerciciosTotalPercentage || (() => 0)}
              hasDetailAtLevel={planningHook.calculations?.hasDetailAtLevel || (() => false)}
              onSavePlan={planningHook.handlers?.handleSavePlan || (() => {})}
              onAnalysisClick={() => setIsPlanningAnalysisOpen(true)}
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
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-800">
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