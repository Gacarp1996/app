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
import Modal from '../components/Modal';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const AcademiaSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { academiaActual, rolActual, limpiarAcademiaActual } = useAcademia();
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
          // Si no hay rol, solo intentar cargarlo
          if (!rolActual) {
            const role = await getUserRoleInAcademia(academiaActual.id, currentUser.uid);
            
            // Si no se encuentra rol, no asignar nada automáticamente
            // El rol debería haberse asignado al crear o unirse a la academia
            if (!role) {
              console.log('Usuario sin rol en la academia. Rol debe asignarse al crear o unirse.');
            }
          }
          
          // Cargar usuarios independientemente del rol
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
  }, [academiaActual, currentUser, rolActual]);

  const loadUsers = async () => {
    if (!academiaActual) return;
    
    setLoading(true);
    try {
      const academiaUsers = await getAcademiaUsers(academiaActual.id);
      // Ordenar por rol: directores primero, luego subdirectores, luego entrenadores
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
    
    // Verificar que no se está eliminando al último director
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
      // Verificar la contraseña
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, currentUser.email, deletePassword);
      
      // Eliminar la academia
      await deleteAcademia(academiaActual.id);
      
      alert('Academia eliminada exitosamente');
      limpiarAcademiaActual();
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

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'director':
        return 'bg-red-500 text-white';
      case 'subdirector':
        return 'bg-orange-500 text-white';
      case 'entrenador':
        return 'bg-blue-500 text-white';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'director':
        return 'Director';
      case 'subdirector':
        return 'Subdirector';
      case 'entrenador':
        return 'Entrenador';
    }
  };

  // Cambiar la validación inicial
  if (!academiaActual) {
    return (
      <div className="text-center py-10">
        <p className="text-app-secondary">No hay academia seleccionada</p>
        <button 
          onClick={() => navigate('/select-academia')} 
          className="mt-4 app-button btn-primary"
        >
          Seleccionar Academia
        </button>
      </div>
    );
  }

  if (loadingRole) {
    return (
      <div className="text-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-app-accent mx-auto"></div>
        <p className="mt-4 text-app-secondary">Cargando configuración...</p>
      </div>
    );
  }

  // Si hay error de permisos, mostrar mensaje específico
  if (permissionError) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
            Error de Permisos
          </h2>
          <p className="text-app-primary mb-4">
            No tienes permisos para acceder a la configuración de la academia. 
            Esto puede deberse a que las reglas de seguridad de Firebase no están configuradas correctamente.
          </p>
          <p className="text-app-primary mb-4">
            Por favor, contacta al administrador del sistema para que configure las reglas de Firestore 
            para permitir el acceso a la subcolección de usuarios.
          </p>
          <div className="mt-6 space-y-2">
            <button 
              onClick={() => navigate('/')} 
              className="app-button btn-primary mr-2"
            >
              Volver al Inicio
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="app-button btn-secondary"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Usar el rol actual sin valor por defecto
  const currentRole = rolActual;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
      <h1 className="text-3xl font-bold text-app-accent mb-8">Configuración de Academia</h1>

      {/* Información del Usuario */}
      <div className="bg-app-surface p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-2xl font-semibold text-app-accent mb-4">Mi Perfil</h2>
        <div className="space-y-2">
          <p className="text-app-primary">
            <span className="font-semibold">Email:</span> {currentUser?.email}
          </p>
          <p className="text-app-primary">
            <span className="font-semibold">Mi rol:</span>{' '}
            {currentRole ? (
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(currentRole)}`}>
                {getRoleDisplayName(currentRole)}
              </span>
            ) : (
              <span className="text-app-secondary italic">Cargando rol...</span>
            )}
          </p>
        </div>
      </div>

      {/* Información de la Academia */}
      <div className="bg-app-surface p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-2xl font-semibold text-app-accent mb-4">Información de la Academia</h2>
        <div className="space-y-2">
          <p className="text-app-primary">
            <span className="font-semibold">Nombre:</span> {academiaActual.nombre}
          </p>
          <p className="text-app-primary">
            <span className="font-semibold">ID de Academia:</span>{' '}
            <span className="font-mono text-xl bg-app-surface-alt px-3 py-1 rounded">
              {academiaActual.id}
            </span>
          </p>
          <p className="text-sm text-app-secondary mt-2">
            Comparte este ID con otros entrenadores para que puedan unirse a la academia
          </p>
        </div>
      </div>

      {/* Lista de Usuarios - Solo visible para directores y subdirectores */}
      {currentRole && (currentRole === 'director' || currentRole === 'subdirector') && !permissionError && (
        <div className="bg-app-surface p-6 rounded-lg shadow-lg mb-6">
          <h2 className="text-2xl font-semibold text-app-accent mb-4">
            Usuarios de la Academia ({users.length})
          </h2>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div 
                  key={user.userId} 
                  className="bg-app-surface-alt p-4 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  <div className="flex-grow">
                    <p className="text-app-primary font-medium">{user.userName || user.userEmail}</p>
                    <p className="text-app-secondary text-sm">{user.userEmail}</p>
                    <div className="mt-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(user.role)}`}>
                        {getRoleDisplayName(user.role)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Solo los directores pueden modificar usuarios */}
                  {currentRole && currentRole === 'director' && user.userId !== currentUser?.uid && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedUserId(user.userId);
                          setIsRoleModalOpen(true);
                        }}
                        className="app-button btn-primary text-sm px-3 py-1"
                        disabled={processingAction}
                      >
                        Cambiar Rol
                      </button>
                      <button
                        onClick={() => handleRemoveUser(user.userId)}
                        className="app-button btn-danger text-sm px-3 py-1"
                        disabled={processingAction}
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Botón de Cambiar Academia - Visible para todos */}
      <div className="bg-app-surface p-6 rounded-lg shadow-lg mb-6">
        <h2 className="text-2xl font-semibold text-app-accent mb-4">Cambiar de Academia</h2>
        <p className="text-app-secondary mb-4">
          Si necesitas acceder a otra academia, puedes cambiar desde aquí.
        </p>
        <button
          onClick={() => {
            limpiarAcademiaActual();
            navigate('/select-academia');
          }}
          className="app-button btn-primary"
        >
          Cambiar Academia
        </button>
      </div>

      {/* Sección de Eliminar Academia - Solo para directores */}
      {currentRole && currentRole === 'director' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold text-red-600 dark:text-red-400 mb-4">
            Zona de Peligro
          </h2>
          <p className="text-app-primary mb-4">
            Eliminar la academia es una acción permanente que no se puede deshacer. 
            Se eliminarán todos los datos asociados (jugadores, objetivos, sesiones, torneos).
          </p>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="app-button btn-danger"
            disabled={processingAction}
          >
            Eliminar Academia
          </button>
        </div>
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
            <p className="text-app-primary">
              Selecciona el nuevo rol para {users.find(u => u.userId === selectedUserId)?.userEmail}:
            </p>
            <div className="space-y-2">
              <button
                onClick={() => handlePromoteUser(selectedUserId, 'director')}
                className="w-full app-button btn-danger text-left px-4 py-3"
                disabled={processingAction}
              >
                <span className="font-semibold">Director</span>
                <p className="text-sm opacity-90">Todos los permisos de gestión</p>
              </button>
              <button
                onClick={() => handlePromoteUser(selectedUserId, 'subdirector')}
                className="w-full app-button btn-warning text-left px-4 py-3"
                disabled={processingAction}
              >
                <span className="font-semibold">Subdirector</span>
                <p className="text-sm opacity-90">Puede ver información pero no eliminar</p>
              </button>
              <button
                onClick={() => handlePromoteUser(selectedUserId, 'entrenador')}
                className="w-full app-button btn-primary text-left px-4 py-3"
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
          <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
            <p className="text-red-700 dark:text-red-300 font-semibold">
              ⚠️ Esta acción es irreversible
            </p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-2">
              Se eliminarán permanentemente:
            </p>
            <ul className="list-disc list-inside text-red-600 dark:text-red-400 text-sm mt-1">
              <li>Todos los jugadores</li>
              <li>Todos los objetivos</li>
              <li>Todas las sesiones de entrenamiento</li>
              <li>Todos los torneos</li>
              <li>Todos los usuarios asociados</li>
            </ul>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-app-secondary mb-2">
              Ingresa tu contraseña para confirmar:
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="w-full p-3 app-input rounded-md"
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
              className="flex-1 app-button btn-danger"
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
              className="flex-1 app-button btn-secondary"
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
          className="app-link font-medium"
        >
          &larr; Volver al Inicio
        </button>
      </div>
    </div>
  );
};

export default AcademiaSettingsPage;