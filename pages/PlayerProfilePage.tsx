// pages/PlayerProfilePage.tsx
import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Player, Objective, TrainingSession, Tournament } from '../types';

import Modal from '../components/shared/Modal';
import TrainingsOnDateModal from '../components/training/TrainingOnDateModal';
import PlanningAccordion from '../components/PlanningAccordion';
import DisputedTournamentFormModal from '../components/tournaments/DisputedTournamentFormModal';
// IMPORTS DE COMPONENTES REFACTORIZADOS
import IndividualMetricsCharts from '../components/player-profile/IndividualMetricsCharts';
import RadarChartOverview from '../components/player-profile/RadarChartOverview';
import DateFilters from '../components/player-profile/DateFilters';
import ExerciseAnalysis from '../components/player-profile/ExerciseAnalysis';
import TrainingCalendarSection from '../components/player-profile/TrainingCalendarSection';
import PlayerHeader from '../components/player-profile/PlayerHeader';
import NavigationTabs, { Tab } from '../components/player-profile/NavigationTabs';
import ProfileSection from '../components/player-profile/ProfileSection';
import ObjectivesSection from '../components/player-profile/ObjectivesSection';
import FutureTournamentsSection from '../components/player-profile/FutureTournamentsSection';
import DisputedTournamentsSection from '../components/player-profile/DisputedTournamentsSection';
import PlanningSection from '../components/player-profile/PlanningSection';
import TournamentSubTabs from '../components/player-profile/TournamentSubTabs';
// IMPORTS DE HOOKS PERSONALIZADOS
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { useTrainingPlan } from '../hooks/useTrainingPlan';
import { usePlayerTournaments } from '../hooks/usePlayerTournaments';
import { usePlayerTrainings } from '../hooks/usePlayerTrainings';
// UTILIDADES
import { formatDate } from '../components/player-profile/utils';
import TournamentFormModal from '@/components/tournaments/TournamentFormModal';

interface PlayerProfilePageProps {
  players: Player[];
  objectives: Objective[];
  sessions: TrainingSession[];
  tournaments: Tournament[];
  onDataChange: () => void;
  academiaId: string;
}

const PlayerProfilePage: React.FC<PlayerProfilePageProps> = ({ 
  players, 
  objectives, 
  sessions, 
  tournaments, 
  onDataChange, 
  academiaId 
}) => {
  const { playerId } = useParams<{ playerId: string }>();
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState<Tab>("perfil");
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isPlanningAnalysisOpen, setIsPlanningAnalysisOpen] = useState(false);

  // Hooks personalizados
  const { 
    player, 
    profileData, 
    profileSetters, 
    handlers: profileHandlers 
  } = usePlayerProfile({ 
    players, 
    playerId, 
    academiaId, 
    onDataChange 
  });

  const {
    planLoading,
    planSaving,
    rangoAnalisis,
    planificacion,
    setRangoAnalisis,
    handlers: planHandlers,
    calculations: planCalculations
  } = useTrainingPlan({ 
    playerId, 
    academiaId, 
    activeTab 
  });

  const {
    isTournamentModalOpen,
    editingTournament,
    playerDisputedTournaments,
    isDisputedTournamentModalOpen,
    editingDisputedTournament,
    tournamentToConvert,
    activeSubTab,
    setActiveSubTab,
    futureTournamentHandlers,
    disputedTournamentHandlers
  } = usePlayerTournaments({ 
    playerId, 
    academiaId, 
    activeTab, 
    onDataChange 
  });

  const {
    startDate,
    endDate,
    setStartDate,
    setEndDate,
    resetDateFilters,
    drillDownPath,
    drillDownData,
    areaChartTitle,
    intensityChartData,
    intensityChartTitle,
    playerSurveys,
    surveysLoading,
    radarData,
    selectedDate,
    isTrainingsModalOpen,
    setIsTrainingsModalOpen,
    trainingsForSelectedDate,
    dateFilteredSessions,
    handlePieSliceClick,
    handleBreadcrumbClick,
    handleDateClick,
    prepareIndividualChartData,
    METRIC_CONFIG,
  } = usePlayerTrainings({ 
    playerId, 
    academiaId, 
    sessions, 
    activeTab 
  });

  // Datos calculados
  const playerAllObjectives = useMemo(() => {
    if (!objectives || !Array.isArray(objectives)) return [];
    return objectives.filter(obj => obj.jugadorId === playerId);
  }, [objectives, playerId]);

  const playerActualObjectivesCount = useMemo(() => 
    playerAllObjectives.filter(obj => obj.estado === 'actual-progreso').length, 
    [playerAllObjectives]
  );

  const playerTournaments = useMemo(() => 
    tournaments.filter(t => t.jugadorId === playerId)
      .sort((a,b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()), 
    [tournaments, playerId]
  );

  const totalPercentage = planCalculations.calculateTotalPercentage();
  const validation = planCalculations.validateFlexiblePlan();

  // Handlers locales
  const handleArchiveClick = () => setIsArchiveModalOpen(true);
  const confirmArchivePlayer = async () => {
    await profileHandlers.handleArchivePlayer();
    setIsArchiveModalOpen(false);
  };

  if (!player) return <div className="text-center py-10 text-gray-400">Cargando...</div>;
  
  if (!objectives || !sessions || !tournaments) {
    return <div className="text-center py-10 text-gray-400">Cargando datos...</div>;
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Efectos de fondo */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="fixed top-20 left-20 w-64 h-64 lg:w-96 lg:h-96 bg-green-500/5 rounded-full blur-3xl"></div>
      <div className="fixed bottom-20 right-20 w-64 h-64 lg:w-96 lg:h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Modales */}
        <Modal isOpen={isArchiveModalOpen} onClose={() => setIsArchiveModalOpen(false)} title="Confirmar Archivar">
          <p>¿Archivar a <strong>{player.name}</strong>?</p>
          <div className="flex justify-end space-x-3 mt-4">
            <button onClick={() => setIsArchiveModalOpen(false)} className="app-button btn-secondary">Cancelar</button>
            <button onClick={confirmArchivePlayer} className="app-button btn-warning">Sí, Archivar</button>
          </div>
        </Modal>
        
        {isTournamentModalOpen && playerId && (
          <TournamentFormModal 
            isOpen={isTournamentModalOpen} 
            onClose={() => futureTournamentHandlers.setIsTournamentModalOpen(false)} 
            onSave={futureTournamentHandlers.handleSaveTournament} 
            playerId={playerId} 
            existingTournament={editingTournament} 
          />
        )}
        
        <TrainingsOnDateModal
          isOpen={isTrainingsModalOpen}
          onClose={() => setIsTrainingsModalOpen(false)}
          date={selectedDate}
          sessions={trainingsForSelectedDate}
        />

        {isDisputedTournamentModalOpen && playerId && (
          <DisputedTournamentFormModal
            isOpen={isDisputedTournamentModalOpen}
            onClose={() => disputedTournamentHandlers.setIsDisputedTournamentModalOpen(false)}
            onSave={disputedTournamentHandlers.handleSaveDisputedTournament}
            playerId={playerId}
            existingDisputedTournament={editingDisputedTournament}
            futureTournamentToConvert={tournamentToConvert}
          />
        )}

        {/* Header y navegación */}
        <PlayerHeader 
          player={player} 
          onArchiveClick={handleArchiveClick}
        />

        <NavigationTabs 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          playerActualObjectivesCount={playerActualObjectivesCount}
        />
        
        {/* Contenido según tab activa */}
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
            <DateFilters 
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onReset={resetDateFilters}
            />

            <ExerciseAnalysis
              dateFilteredSessions={dateFilteredSessions}
              drillDownPath={drillDownPath}
              drillDownData={drillDownData}
              areaChartTitle={areaChartTitle}
              intensityChartData={intensityChartData}
              intensityChartTitle={intensityChartTitle}
              onBreadcrumbClick={handleBreadcrumbClick}
              onPieSliceClick={handlePieSliceClick}
              playerId={playerId}
              allSessions={sessions}
            />
            
            <div className="border-t border-gray-800 pt-8 lg:pt-12">
              <h2 className="text-2xl lg:text-3xl font-semibold text-green-400 mb-6 lg:mb-8">Mentalidad y Rendimiento</h2>
              {surveysLoading ? (
                <div className="text-center py-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-400 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Cargando encuestas...</p>
                </div>
              ) : playerSurveys.length === 0 ? (
                <div className="bg-gray-900/50 p-6 lg:p-8 rounded-xl shadow-lg border border-gray-800 text-center">
                  <p className="text-gray-400 text-lg">
                    No hay encuestas registradas para este jugador en el período seleccionado.
                  </p>
                </div>
              ) : (
                <div className="space-y-8 lg:space-y-10">
                  <RadarChartOverview 
                    radarData={radarData}
                    surveysCount={playerSurveys.length}
                  />

                  <IndividualMetricsCharts
                    prepareIndividualChartData={prepareIndividualChartData}
                    METRIC_CONFIG={METRIC_CONFIG}
                  />
                </div>
              )}
            </div>

            <TrainingCalendarSection
              sessions={sessions}
              playerId={playerId!}
              onDateClick={handleDateClick}
            />
          </section>
        )}

        {activeTab === "objectives" && (
          <ObjectivesSection
            playerId={playerId!}
            playerAllObjectives={playerAllObjectives}
          />
        )}

        {activeTab === "tournaments" && (
          <section className="space-y-6">
            <TournamentSubTabs
              activeSubTab={activeSubTab}
              onSubTabChange={setActiveSubTab}
              futureTournamentsCount={playerTournaments.length}
              disputedTournamentsCount={playerDisputedTournaments.length}
            />

            {activeSubTab === 'future' ? (
              <FutureTournamentsSection
                playerTournaments={playerTournaments}
                onAddClick={futureTournamentHandlers.handleOpenAddTournamentModal}
                onEditClick={futureTournamentHandlers.handleEditTournamentClick}
                onDeleteClick={futureTournamentHandlers.handleDeleteTournament}
                onConvertClick={futureTournamentHandlers.handleConvertTournamentClick}
                formatDate={formatDate}
              />
            ) : (
              <DisputedTournamentsSection
                playerDisputedTournaments={playerDisputedTournaments}
                onAddClick={disputedTournamentHandlers.handleOpenAddDisputedTournamentModal}
                onEditClick={disputedTournamentHandlers.handleEditDisputedTournamentClick}
                onDeleteClick={disputedTournamentHandlers.handleDeleteDisputedTournament}
                formatDate={formatDate}
              />
            )}
          </section>
        )}

        {activeTab === "planificacion" && (
          <PlanningSection
            planLoading={planLoading}
            planSaving={planSaving}
            rangoAnalisis={rangoAnalisis}
            planificacion={planificacion}
            totalPercentage={totalPercentage}
            validation={validation}
            onRangoAnalisisChange={setRangoAnalisis}
            onTipoPercentageChange={planHandlers.handleTipoPercentageChange}
            onAreaPercentageChange={planHandlers.handleAreaPercentageChange}
            onEjercicioPercentageChange={planHandlers.handleEjercicioPercentageChange}
            calculateAreasTotalPercentage={planCalculations.calculateAreasTotalPercentage}
            calculateEjerciciosTotalPercentage={planCalculations.calculateEjerciciosTotalPercentage}
            hasDetailAtLevel={planCalculations.hasDetailAtLevel}
            onSavePlan={planHandlers.handleSavePlan}
            onAnalysisClick={() => setIsPlanningAnalysisOpen(true)}
          />
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
                  <PlanningAccordion 
                    player={player} 
                    academiaId={academiaId} 
                  />
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