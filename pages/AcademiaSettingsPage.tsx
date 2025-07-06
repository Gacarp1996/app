import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';
import { 
  getAcademiaUsers, 
  updateUserRole, 
  removeUserFromAcademia, 
  countDirectors,
  deleteAcademia,
  AcademiaUser,
  UserRole,
  getUserRoleInAcademia
} from '../Database/FirebaseRoles';
import Modal from '../components/shared/Modal';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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

const AcademiaSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { academiaActual, rolActual, limpiarAcademiaActual, setAcademiaActual, eliminarAcademiaDeMisAcademias } = useAcademia();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<AcademiaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRole, setLoadingRole] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (academiaActual && currentUser) {
        try {
          if (!rolActual) {
            const role = await getUserRoleInAcademia(academiaActual.id, currentUser.uid);
            if (role) {
              await setAcademiaActual(academiaActual);
            }
          }
          
          await loadUsers();
        } catch (error: any) {
          console.error('Error cargando datos:', error);
          if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
            setPermissionError(true);
          }
        } finally {
          setLoadingRole(false);
        }
      } else {
        setLoadingRole(false);
      }
    };

    loadData();
  }, [academiaActual, currentUser, rolActual, setAcademiaActual]);

  const loadUsers = async () => {
    if (!academiaActual) return;
    
    setLoading(true);
    try {
      const academiaUsers = await getAcademiaUsers(academiaActual.id);
      const sortedUsers = academiaUsers.sort((a, b) => {
        const roleOrder = { director: 0, subdirector: 1, entrenador: 2 };
        return roleOrder[a.role] - roleOrder[b.role];
      });
      setUsers(sortedUsers);
    } catch (error: any) {
      console.error('Error cargando usuarios:', error);
      if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
        setPermissionError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!academiaActual || !currentUser) return;
    
    const userToRemove = users.find(u => u.userId === userId);
    if (!userToRemove) return;
    
    if (userToRemove.role === 'director') {
      const directorCount = await countDirectors(academiaActual.id);
      if (directorCount <= 1) {
        alert('No puedes eliminar al último director de la academia.');
        return;
      }
    }
    
    if (window.confirm(`¿Estás seguro de eliminar a ${userToRemove.userEmail} de la academia?`)) {
      setProcessingAction(true);
      try {
        await removeUserFromAcademia(academiaActual.id, userId);
        await loadUsers();
        alert('Usuario eliminado exitosamente');
      } catch (error) {
        console.error('Error eliminando usuario:', error);
        alert('Error al eliminar el usuario');
      } finally {
        setProcessingAction(false);
      }
    }
  };

  const handlePromoteUser = async (userId: string, newRole: UserRole) => {
    if (!academiaActual) return;
    
    setProcessingAction(true);
    try {
      await updateUserRole(academiaActual.id, userId, newRole);
      await loadUsers();
      setIsRoleModalOpen(false);
      setSelectedUserId(null);
      alert('Rol actualizado exitosamente');
    } catch (error) {
      console.error('Error actualizando rol:', error);
      alert('Error al actualizar el rol');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDeleteAcademia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academiaActual || !currentUser || !currentUser.email) return;
    
    setDeleteError('');
    setProcessingAction(true);
    
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, currentUser.email, deletePassword);
      
      await deleteAcademia(academiaActual.id);
      await eliminarAcademiaDeMisAcademias(academiaActual.id);
      
      alert('Academia eliminada exitosamente');
      navigate('/select-academia');
    } catch (error: any) {
      console.error('Error eliminando academia:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setDeleteError('Contraseña incorrecta');
      } else {
        setDeleteError('Error al eliminar la academia');
      }
    } finally {
      setProcessingAction(false);
    }
  };

  const handleChangeAcademia = () => {
    limpiarAcademiaActual();
    navigate('/select-academia');
  };

  // Estados de carga y error
  if (!academiaActual) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No hay academia seleccionada</p>
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <LoadingSpinner message="Cargando configuración..." />
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <PermissionError 
          onRetry={() => window.location.reload()} 
          onGoHome={() => navigate('/')} 
        />
      </div>
    );
  }

  const currentRole = rolActual;

  return (
    <div className="min-h-screen bg-black relative">
      {/* Efectos de fondo */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="fixed top-20 left-20 w-64 h-64 lg:w-96 lg:h-96 bg-green-500/5 rounded-full blur-3xl"></div>
      <div className="fixed bottom-20 right-20 w-64 h-64 lg:w-96 lg:h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      {/* Efectos de fondo */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="fixed top-20 left-20 w-64 h-64 lg:w-96 lg:h-96 bg-green-500/5 rounded-full blur-3xl"></div>
      <div className="fixed bottom-20 right-20 w-64 h-64 lg:w-96 lg:h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      
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
          <div className="bg-gray-900/50 backdrop-blur-sm p-6 rounded-lg shadow-lg mb-6 border border-gray-700">
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
                    onChangeRole={() => {
                      setSelectedUserId(user.userId);
                      setIsRoleModalOpen(true);
                    }}
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
            onDeleteClick={() => setIsDeleteModalOpen(true)} 
            processingAction={processingAction} 
          />
        )}

        {/* Modal para cambiar rol */}
        <Modal 
          isOpen={isRoleModalOpen} 
          onClose={() => {
            setIsRoleModalOpen(false);
            setSelectedUserId(null);
          }} 
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
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletePassword('');
            setDeleteError('');
          }} 
          title="Confirmar Eliminación de Academia"
        >
          <form onSubmit={handleDeleteAcademia} className="space-y-4">
            <div className="bg-red-900/30 p-4 rounded-lg border border-red-700">
              <p className="text-red-900 font-semibold">
                ⚠️ Esta acción es irreversible
              </p>
              <p className="text-red-900 text-sm mt-2">
                Se eliminarán permanentemente:
              </p>
              <ul className="list-disc list-inside text-red-900 text-sm mt-1">
                <li>Todos los jugadores</li>
                <li>Todos los objetivos</li>
                <li>Todas las sesiones de entrenamiento</li>
                <li>Todos los torneos</li>
                <li>Todos los usuarios asociados</li>
              </ul>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Ingresa tu contraseña para confirmar:
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full p-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-200"
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
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletePassword('');
                  setDeleteError('');
                }}
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