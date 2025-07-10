import { FC, useState } from 'react';
import Modal from '../components/shared/Modal';

// Importar componentes extraídos
import { 
  UserCard,
  AcademiaInfoSection,
  UserProfileSection,
  DeleteAcademiaSection,
  ChangeAcademiaSection,
  LoadingSpinner,
  PermissionError
} from '../components/academia-settings';

// Importar hooks personalizados
import { 
  useAcademiaSettings, 
  useUserManagement, 
  useDeleteAcademia 
} from '../hooks/useAcademiaSettings';

const AcademiaSettingsPage: FC = () => {
  // Estado para controlar el modal de configuración
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Hook principal
  const {
    currentUser,
    academiaActual,
    rolActual,
    users,
    loading,
    loadingRole,
    permissionError,
    processingAction,
    setProcessingAction,
    loadUsers,
    limpiarAcademiaActual,
    navigate,
    eliminarAcademiaDeMisAcademias
  } = useAcademiaSettings();

  // Hook para manejo de usuarios
  const {
    selectedUserId,
    isRoleModalOpen,
    handleRemoveUser,
    handlePromoteUser,
    openRoleModal,
    closeRoleModal
  } = useUserManagement(
    academiaActual,
    currentUser,
    users,
    loadUsers,
    setProcessingAction
  );

  // Hook para eliminar academia
  const {
    isDeleteModalOpen,
    deletePassword,
    setDeletePassword,
    deleteError,
    handleDeleteAcademia,
    openDeleteModal,
    closeDeleteModal
  } = useDeleteAcademia(
    academiaActual,
    currentUser,
    eliminarAcademiaDeMisAcademias,
    navigate,
    setProcessingAction
  );

  // Manejadores simples
  const handleChangeAcademia = () => {
    limpiarAcademiaActual();
    navigate('/select-academia');
  };

  // Estados de carga y error
  if (!academiaActual) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">No hay academia seleccionada</p>
          <button 
            onClick={() => navigate('/select-academia')} 
            className="mt-4 px-6 py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold rounded-lg transition-all duration-200"
          >
            Seleccionar Academia
          </button>
        </div>
      </div>
    );
  }

  if (loadingRole) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner message="Cargando configuración..." />
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <PermissionError 
          onRetry={() => window.location.reload()} 
          onGoHome={() => navigate('/')} 
        />
      </div>
    );
  }
  const currentRole = rolActual;

  // Componente para vista de Director
  const DirectorView = () => (
    <div className="min-h-screen bg-black">
      {/* Efectos de fondo */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="fixed top-20 left-20 w-64 h-64 lg:w-96 lg:h-96 bg-green-500/5 rounded-full blur-3xl"></div>
      <div className="fixed bottom-20 right-20 w-64 h-64 lg:w-96 lg:h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Dashboard con contenedor */}
        <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                {academiaActual.nombre} - Vista Director
              </h1>
              <p className="text-gray-400">Panel de control y métricas</p>
              <p className="text-sm text-gray-500">Última actualización: Hace 5 minutos</p>
            </div>
            <div className="flex gap-3">
              <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5z" />
                </svg>
              </button>
              <button 
                onClick={() => setIsConfigModalOpen(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configuración
              </button>
            </div>
          </div>
        </div>

        {/* Grid principal - Primera fila */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Entrenadores Activos */}
          <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m3 5.197H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Entrenadores Activos</h3>
            </div>
            <div className="space-y-3">
              {users.slice(0, 3).map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                    <div>
                      <p className="text-white font-medium">{user.userName || user.userEmail.split('@')[0]}</p>
                      <p className="text-xs text-gray-400">Hace {index + 1} horas</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Jugadores Activos */}
          <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Jugadores Activos</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <p className="text-gray-400 text-sm">Activos</p>
                <p className="text-white text-lg font-semibold">{users.length * 15}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Inactivos</p>
                <p className="text-white text-lg font-semibold">{Math.floor(users.length * 3.2)}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Sin Plan</p>
                <p className="text-white text-lg font-semibold">{Math.floor(users.length * 2.1)}</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm">Total de jugadores: {users.length * 20}</p>
          </div>

          {/* Entrenamientos Hoy */}
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
              <p className="text-5xl font-bold text-green-400 mb-2">14</p>
              <p className="text-gray-400 text-sm">Sesiones registradas</p>
              <button className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm">
                Ver Detalles
              </button>
            </div>
          </div>
        </div>

        {/* Segunda fila */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Planificación */}
          <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Planificación</h3>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-orange-400 mb-1">76%</p>
                <p className="text-gray-400 text-sm">Con planificación</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-orange-400 mb-1">61%</p>
                <p className="text-gray-400 text-sm">Con objetivos</p>
              </div>
            </div>
          </div>

          {/* Satisfacción Semanal */}
          <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Satisfacción Semanal</h3>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-yellow-400 mb-1">4.5<span className="text-xl text-gray-400">/5</span></p>
              <div className="flex justify-center mb-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17H7V7" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">Basado en {users.length * 6} encuestas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Componente para vista de Configuración para Director
  // Componente para vista de Entrenador/Subdirector (por implementar)
  const TrainerView = () => (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-xl border border-gray-800 mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
            {academiaActual.nombre} - Vista Entrenador
          </h1>
          <p className="text-gray-400">Panel de información básica</p>
        </div>
        
        <UserProfileSection 
          userEmail={currentUser?.email} 
          currentRole={currentRole} 
        />

        <AcademiaInfoSection 
          academiaName={academiaActual.nombre} 
          academiaId={academiaActual.id} 
        />

        <ChangeAcademiaSection onChangeAcademia={handleChangeAcademia} />
      </div>
    </div>
  );

  // Lógica para determinar qué vista mostrar basada en el rol
  const renderViewByRole = () => {
    // TEMPORAL: Por ahora todos ven la vista de Director como solicitado
    // En el futuro, descomentar esta lógica para usar roles reales:
    /*
    if (currentRole === 'director' || currentRole === 'subdirector') {
      return <DirectorView />;
    } else {
      return <TrainerView />;
    }
    */
    
    // Mostrar vista de Director para todos los usuarios por ahora
    return <DirectorView />;
  };

  return (
    <>
      {renderViewByRole()}
      
      {/* Modal de Configuración */}
      {isConfigModalOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => setIsConfigModalOpen(false)}
        >
          {/* Efectos de fondo animados */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          
          {/* Contenedor del modal - LAYOUT VERTICAL AMPLIO */}
          <div
            className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl w-[90vw] max-w-[1200px] shadow-2xl shadow-green-500/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl flex flex-col max-h-[90vh]">
              {/* Encabezado del Modal */}
              <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-800">
                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                  Configuración
                </h3>
                <button
                  onClick={() => setIsConfigModalOpen(false)}
                  className="text-gray-400 hover:text-green-400 transition-all duration-200 hover:rotate-90 transform"
                  aria-label="Cerrar modal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Contenido del Modal - LAYOUT VERTICAL CON ELEMENTOS HORIZONTALES INTERNOS */}
              <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-6">
                  
                  {/* PRIMERA SECCIÓN: Configuración de estructura de ejercicios */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white text-center">Configuración de estructura de ejercicios</h3>
                    
                    {/* Headers horizontales centrados con flechas - MÁS AMPLIO */}
                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                      <div className="flex items-center justify-between text-sm text-gray-300 font-medium">
                        <div className="text-center flex-1">
                          <span>Tipo</span>
                        </div>
                        <svg className="w-4 h-4 text-gray-500 mx-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="text-center flex-1">
                          <span>Área</span>
                        </div>
                        <svg className="w-4 h-4 text-gray-500 mx-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="text-center flex-1">
                          <span>Ejercicio</span>
                        </div>
                        <svg className="w-4 h-4 text-gray-500 mx-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div className="text-center flex-1">
                          <span>Ejercicio específico (opcional)</span>
                        </div>
                      </div>
                    </div>

                    {/* Checkboxes apilados verticalmente - SIN COLUMNAS */}
                    <div className="space-y-3">
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" checked={true} readOnly className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500" />
                          <span className="text-gray-300">Registrar hasta Área</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" checked={true} readOnly className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500" />
                          <span className="text-gray-300">Registrar hasta Ejercicio</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600">
                        <div className="flex items-center space-x-3">
                          <input type="checkbox" checked={true} readOnly className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500" />
                          <span className="text-gray-300">Registrar hasta Ejercicio específico</span>
                        </div>
                      </div>
                    </div>

                    {/* Input para agregar ejercicio - más amplio */}
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                      <div className="flex items-center gap-4">
                        <input 
                          type="text" 
                          placeholder="Nombre del ejercicio específico"
                          className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                        />
                        <button className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                          Agregar
                        </button>
                      </div>
                    </div>
                      
                    {/* Ejercicios existentes apilados verticalmente - SIN COLUMNAS */}
                    <div className="space-y-3">
                      <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Volea profunda con efecto</span>
                          <div className="flex items-center space-x-2">
                            <button className="p-2 text-yellow-400 hover:text-yellow-300">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                              </svg>
                            </button>
                            <button className="p-2 text-red-400 hover:text-red-300">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                        
                      <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Saque plano al cuerpo</span>
                          <div className="flex items-center space-x-2">
                            <button className="p-2 text-yellow-400 hover:text-yellow-300">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                              </svg>
                            </button>
                            <button className="p-2 text-red-400 hover:text-red-300">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Texto explicativo y gráfico apilados verticalmente */}
                    <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                      <p className="text-sm text-gray-400">Este nivel es personalizable por cada entrenador</p>
                    </div>
                    
                    <div className="flex justify-center">
                      <div className="w-20 h-20 rounded-full border-4 border-gray-600" style={{
                        background: 'conic-gradient(from 0deg, #10b981 0deg 120deg, #f59e0b 120deg 240deg, #8b5cf6 240deg 360deg)'
                      }}></div>
                    </div>
                  </div>

                  {/* SEGUNDA SECCIÓN: Configuración de encuestas post-entrenamiento */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white text-center">Configuración de encuestas post-entrenamiento</h3>
                    
                    {/* Preguntas apiladas verticalmente - SIN COLUMNAS */}
                    <div className="space-y-3">
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600 flex items-start space-x-3">
                        <input 
                          type="checkbox" 
                          defaultChecked={true} 
                          className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500 mt-1 flex-shrink-0" 
                        />
                        <span className="text-gray-300">¿Cómo te sentiste físicamente durante el entrenamiento?</span>
                      </div>
                      
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600 flex items-start space-x-3">
                        <input 
                          type="checkbox" 
                          defaultChecked={true} 
                          className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500 mt-1 flex-shrink-0" 
                        />
                        <span className="text-gray-300">¿Qué tan desafiante fue el entrenamiento?</span>
                      </div>
                      
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600 flex items-start space-x-3">
                        <input 
                          type="checkbox" 
                          defaultChecked={false} 
                          className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500 mt-1 flex-shrink-0" 
                        />
                        <span className="text-gray-300">¿Cómo evalúas tu progreso técnico?</span>
                      </div>
                      
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600 flex items-start space-x-3">
                        <input 
                          type="checkbox" 
                          defaultChecked={true} 
                          className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500 mt-1 flex-shrink-0" 
                        />
                        <span className="text-gray-300">¿Qué tan motivado te sentís para el próximo entrenamiento?</span>
                      </div>
                      
                      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-600 flex items-start space-x-3">
                        <input 
                          type="checkbox" 
                          defaultChecked={false} 
                          className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 rounded focus:ring-green-500 mt-1 flex-shrink-0" 
                        />
                        <span className="text-gray-300">¿Cómo calificarías la comunicación con tu entrenador?</span>
                      </div>
                    </div>

                    {/* Información de escala */}
                    <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                      <p className="text-sm text-blue-300">
                        <strong>Escala de respuestas:</strong> Todas las preguntas utilizan una escala de 5 niveles:
                        Pésimo (1 a 5) Cualitativo (Muy malo, Malo, Bueno, Muy bueno, Excelente)
                      </p>
                    </div>

                    {/* Manejo de cambios apilado verticalmente */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white text-center">Manejo de cambios en encuestas</h4>
                      
                      <div className="space-y-3">
                        <label className="flex items-start space-x-3 p-4 bg-green-900/20 border border-green-700 rounded-lg cursor-pointer">
                          <input type="radio" name="surveyChanges" defaultChecked={true} className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 focus:ring-green-500 mt-1 flex-shrink-0" />
                          <div>
                            <div className="text-green-300 font-medium">Conservar datos por 7 días</div>
                            <div className="text-sm text-green-400">Podés revertir los cambios durante ese plazo. Luego se eliminan automáticamente.</div>
                          </div>
                        </label>
                        
                        <label className="flex items-start space-x-3 p-4 bg-gray-800 border border-gray-600 rounded-lg cursor-pointer">
                          <input type="radio" name="surveyChanges" defaultChecked={false} className="w-4 h-4 text-green-400 bg-gray-800 border-gray-600 focus:ring-green-500 mt-1 flex-shrink-0" />
                          <div>
                            <div className="text-gray-300 font-medium">Eliminar datos inmediatamente</div>
                            <div className="text-sm text-red-400">Al modificar esta configuración se eliminarán todos los registros anteriores de encuestas</div>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AcademiaSettingsPage;