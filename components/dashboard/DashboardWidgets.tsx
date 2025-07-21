// components/DashboardWidgets.tsx
import React from 'react';
import { useDashboardData } from '../../hooks/useDashboardData';

const DashboardWidgets: React.FC = () => {
  const {
    activeTrainers,
    playerStatus,
    todayTrainings,
    weeklySatisfaction,
    loading,
    error,
    refreshData
  } = useDashboardData();

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto shadow-lg shadow-green-500/50"></div>
        <p className="mt-4 text-gray-400">Cargando métricas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        <button 
          onClick={refreshData}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold rounded-lg transition-all duration-200"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header de métricas */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Métricas en Tiempo Real</h2>
          <p className="text-gray-400 text-sm">
            Última actualización: {new Date().toLocaleTimeString()}
          </p>
        </div>
        <button 
          onClick={refreshData}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          title="Actualizar métricas"
        >
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Grid principal - Primera fila */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Widget 1: Entrenadores Activos */}
        <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Entrenadores Activos</h3>
          </div>
          
          {activeTrainers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No hay entrenadores activos hoy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTrainers.slice(0, 5).map((trainer) => (
                <div key={trainer.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    <div>
                      <p className="text-white font-medium">{trainer.name}</p>
                      <p className="text-xs text-gray-400">{trainer.sessionsToday} sesiones hoy</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
              {activeTrainers.length > 5 && (
                <p className="text-center text-sm text-gray-400 mt-3">
                  +{activeTrainers.length - 5} entrenadores más
                </p>
              )}
            </div>
          )}
        </div>

        {/* Widget 2: Jugadores Activos */}
        <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Estado de Jugadores</h3>
          </div>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Activos hoy</p>
              <p className="text-green-400 text-lg font-semibold">{playerStatus.active.length}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Inactivos hoy</p>
              <p className="text-yellow-400 text-lg font-semibold">{playerStatus.inactive.length}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Sin planificación</p>
              <p className="text-red-400 text-lg font-semibold">{playerStatus.withoutPlan.length}</p>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Total: {playerStatus.active.length + playerStatus.inactive.length} jugadores
            </p>
          </div>
        </div>

        {/* Widget 3: Entrenamientos Hoy */}
        <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Entrenamientos Hoy</h3>
          </div>
          
          <div className="text-center">
            <p className="text-5xl font-bold text-green-400 mb-2">{todayTrainings}</p>
            <p className="text-gray-400 text-sm">
              {todayTrainings === 1 ? 'Sesión registrada' : 'Sesiones registradas'}
            </p>
            <div className="mt-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${
                todayTrainings > 0 ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
              }`}>
                {todayTrainings > 0 ? 'Activo' : 'Sin actividad'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Segunda fila */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Widget 4: Satisfacción Semanal */}
        <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Satisfacción Semanal</h3>
          </div>
          
          {weeklySatisfaction.totalSurveys === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No hay encuestas en los últimos 7 días</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <p className="text-4xl font-bold text-yellow-400 mb-1">
                  {weeklySatisfaction.generalAverage}
                  <span className="text-xl text-gray-400">/5</span>
                </p>
                <p className="text-gray-400 text-sm">
                  Promedio general ({weeklySatisfaction.totalSurveys} encuestas)
                </p>
              </div>
              
              {weeklySatisfaction.playerAverages.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium text-gray-300 mb-2">Por jugador:</p>
                  {weeklySatisfaction.playerAverages.slice(0, 5).map((player) => (
                    <div key={player.playerId} className="flex justify-between items-center p-2 bg-gray-800/30 rounded">
                      <span className="text-sm text-gray-300">{player.playerName}</span>
                      <div className="text-right">
                        <span className="text-sm font-medium text-yellow-400">{player.average}/5</span>
                        <span className="text-xs text-gray-500 ml-1">({player.surveysCount})</span>
                      </div>
                    </div>
                  ))}
                  {weeklySatisfaction.playerAverages.length > 5 && (
                    <p className="text-center text-xs text-gray-400 mt-2">
                      +{weeklySatisfaction.playerAverages.length - 5} jugadores más
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Widget adicional: Resumen de planificación */}
        <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Resumen de Planificación</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm">Con planificación</p>
              <p className="text-green-400 text-2xl font-semibold">
                {(playerStatus.active.length + playerStatus.inactive.length) - playerStatus.withoutPlan.length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-400 text-sm">Sin planificación</p>
              <p className="text-red-400 text-2xl font-semibold">{playerStatus.withoutPlan.length}</p>
            </div>
          </div>
          
          {playerStatus.withoutPlan.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-2">Requieren atención:</p>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {playerStatus.withoutPlan.slice(0, 3).map((player) => (
                  <p key={player.id} className="text-xs text-red-300">{player.name}</p>
                ))}
                {playerStatus.withoutPlan.length > 3 && (
                  <p className="text-xs text-gray-500">+{playerStatus.withoutPlan.length - 3} más</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardWidgets;