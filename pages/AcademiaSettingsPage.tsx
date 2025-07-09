import React from 'react';
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

const AcademiaSettingsPage: React.FC = () => {
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

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Efectos de fondo - Una sola instancia */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
      <div className="fixed top-20 left-20 w-64 h-64 lg:w-96 lg:h-96 bg-green-500/10 rounded-full blur-3xl"></div>
      <div className="fixed bottom-20 right-20 w-64 h-64 lg:w-96 lg:h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-green-400 mb-8">Configuración de Academia</h1>

        <UserProfileSection 
          userEmail={currentUser?.email} 
          currentRole={currentRole} 
        />

        <AcademiaInfoSection 
          academiaName={academiaActual.nombre} 
          academiaId={academiaActual.id} 
        />

        {/* Lista de Usuarios */}
        {currentRole && (currentRole === 'director' || currentRole === 'subdirector') && !permissionError && (
          <div className="bg-gray-800/80 backdrop-blur-sm p-6 rounded-lg shadow-lg mb-6 border border-gray-700">
            <h2 className="text-2xl font-semibold text-green-400 mb-4">
              Usuarios de la Academia ({users.length})
            </h2>
            
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <UserCard
                    key={user.userId}
                    user={user}
                    isCurrentUser={user.userId === currentUser?.uid}
                    canManageUsers={currentRole === 'director'}
                    onChangeRole={() => openRoleModal(user.userId)}
                    onRemoveUser={() => handleRemoveUser(user.userId)}
                    processingAction={processingAction}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <ChangeAcademiaSection onChangeAcademia={handleChangeAcademia} />

        {currentRole && currentRole === 'director' && (
          <DeleteAcademiaSection 
            onDeleteClick={openDeleteModal} 
            processingAction={processingAction} 
          />
        )}

        {/* Modal para cambiar rol */}
        <Modal 
          isOpen={isRoleModalOpen} 
          onClose={closeRoleModal} 
          title="Cambiar Rol de Usuario"
        >
          {selectedUserId && (
            <div className="space-y-4">
              <p className="text-white">
                Selecciona el nuevo rol para {users.find(u => u.userId === selectedUserId)?.userEmail}:
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handlePromoteUser(selectedUserId, 'director')}
                  className="w-full text-left px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg transition-all duration-200"
                  disabled={processingAction}
                >
                  <span className="font-semibold">Director</span>
                  <p className="text-sm opacity-90">Todos los permisos de gestión</p>
                </button>
                <button
                  onClick={() => handlePromoteUser(selectedUserId, 'subdirector')}
                  className="w-full text-left px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-all duration-200"
                  disabled={processingAction}
                >
                  <span className="font-semibold">Subdirector</span>
                  <p className="text-sm opacity-90">Puede ver información pero no eliminar</p>
                </button>
                <button
                  onClick={() => handlePromoteUser(selectedUserId, 'entrenador')}
                  className="w-full text-left px-4 py-3 bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-semibold rounded-lg transition-all duration-200"
                  disabled={processingAction}
                >
                  <span className="font-semibold">Entrenador</span>
                  <p className="text-sm opacity-90">Acceso básico para entrenamientos</p>
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal para eliminar academia */}
        <Modal 
          isOpen={isDeleteModalOpen} 
          onClose={closeDeleteModal} 
          title="Confirmar Eliminación de Academia"
        >
          <form onSubmit={handleDeleteAcademia} className="space-y-4">
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-700/50">
              <p className="text-red-400 font-semibold">
                ⚠️ Esta acción es irreversible
              </p>
              <p className="text-red-400 text-sm mt-2">
                Se eliminarán permanentemente:
              </p>
              <ul className="list-disc list-inside text-red-400 text-sm mt-1">
                <li>Todos los jugadores</li>
                <li>Todos los objetivos</li>
                <li>Todas las sesiones de entrenamiento</li>
                <li>Todos los torneos</li>
                <li>Todos los usuarios asociados</li>
              </ul>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Ingresa tu contraseña para confirmar:
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full p-3 bg-gray-800/80 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
                placeholder="Tu contraseña"
                required
              />
              {deleteError && (
                <p className="text-red-500 text-sm mt-2">{deleteError}</p>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={processingAction || !deletePassword}
              >
                {processingAction ? 'Eliminando...' : 'Eliminar Academia'}
              </button>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200 border border-gray-600"
                disabled={processingAction}
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>

        {/* Botón para volver */}
        <div className="mt-8 text-center">
          <button 
            onClick={() => navigate('/')} 
            className="text-gray-400 hover:text-green-400 transition-colors duration-200 font-medium"
          >
            &larr; Volver al Inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcademiaSettingsPage;