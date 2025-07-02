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
      const roleOrder = { director: 0, subdirector: 1, entrenador: 2 };
      const sortedUsers = academiaUsers.sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
      setUsers(sortedUsers);
    } catch (error: any) {
      console.error('Error cargando entrenadores:', error);
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
        alert('Entrenador eliminado exitosamente');
      } catch (error) {
        alert('Error al eliminar el entrenador');
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
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setDeleteError('Contraseña incorrecta');
      } else {
        setDeleteError('Error al eliminar la academia');
      }
    } finally {
      setProcessingAction(false);
    }
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'director':
        return 'bg-purple-600/90 text-white shadow-lg shadow-purple-500/20';
      case 'subdirector':
        return 'bg-cyan-500/90 text-black font-bold shadow-lg shadow-cyan-500/20';
      case 'entrenador':
        return 'bg-green-500/90 text-black font-bold shadow-lg shadow-green-500/20';
    }
  };

  const getRoleDisplayName = (role: UserRole) => ({
    director: 'Director',
    subdirector: 'Subdirector',
    entrenador: 'Entrenador',
  }[role]);

  const renderCard = (title: string, children: React.ReactNode) => (
    <div className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-2xl shadow-2xl shadow-green-500/10 mb-8">
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-2xl p-6 sm:p-8">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent mb-6">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
  
  const currentRole = rolActual;

  if (loadingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 shadow-lg shadow-green-500/50"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>

      <div className="relative z-10 max-w-4xl mx-auto pb-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent text-shadow-neon-sm">
            Configuración
          </h1>
        </div>
        
        {!academiaActual && (
            <div className="text-center py-10">
                <p className="text-gray-400 text-lg">No hay ninguna academia seleccionada.</p>
                <button onClick={() => navigate('/select-academia')} className="mt-6 app-button btn-primary">
                    Seleccionar Academia
                </button>
            </div>
        )}

        {permissionError && renderCard("Error de Permisos", 
          <div>
              <p className="text-red-400 mb-4">No tienes permisos para ver los entrenadores de esta academia.</p>
              <p className="text-gray-300 mb-6">Contacta al director para obtener acceso o verifica las reglas de seguridad de Firestore.</p>
              <div className="flex gap-4">
                  <button onClick={() => navigate('/')} className="app-button btn-primary">Volver al Inicio</button>
                  <button onClick={() => window.location.reload()} className="app-button btn-secondary">Reintentar</button>
              </div>
          </div>
        )}
        
        {academiaActual && !permissionError && (
          <>
            {renderCard("Mi Perfil",
              <div className="space-y-3">
                <p><span className="font-semibold text-gray-400">Email:</span> {currentUser?.email}</p>
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-gray-400">Mi rol:</span>
                  {currentRole ? (
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getRoleBadgeStyle(currentRole)}`}>
                      {getRoleDisplayName(currentRole)}
                    </span>
                  ) : <span className="text-gray-500 italic">No asignado</span>}
                </p>
              </div>
            )}

            {renderCard("Información de la Academia",
              <div className="space-y-3">
                  <p><span className="font-semibold text-gray-400">Nombre:</span> {academiaActual.nombre}</p>
                  <p><span className="font-semibold text-gray-400">ID de Academia:</span></p>
                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-center">
                    <span className="font-mono text-xl tracking-widest text-green-400">{academiaActual.id}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2 text-center">Comparte este ID con otros entrenadores para que puedan unirse.</p>
              </div>
            )}

            {(currentRole === 'director' || currentRole === 'subdirector') && renderCard(`Entrenadores de la Academia (${users.length})`,
              loading ? <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto"></div> :
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.userId} className="bg-gray-800/50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4 transition-colors hover:bg-gray-800/80">
                    <div>
                      <p className="font-medium text-white">{user.userName || user.userEmail}</p>
                      <span className={`mt-2 inline-block px-3 py-1 text-sm font-medium rounded-full ${getRoleBadgeStyle(user.role)}`}>
                        {getRoleDisplayName(user.role)}
                        {user.userId === currentUser?.uid && <span className="text-xs opacity-80 ml-2">(Tú)</span>}
                      </span>
                    </div>
                    {currentRole === 'director' && user.userId !== currentUser?.uid && (
                      <div className="flex-shrink-0 flex gap-2 self-end sm:self-center">
                        <button onClick={() => { setSelectedUserId(user.userId); setIsRoleModalOpen(true); }} className="app-button btn-secondary text-sm px-3 py-1" disabled={processingAction}>Cambiar Rol</button>
                        <button onClick={() => handleRemoveUser(user.userId)} className="app-button btn-danger text-sm px-3 py-1" disabled={processingAction}>Eliminar</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {renderCard("Opciones", 
              <div>
                <p className="text-gray-400 mb-4">Vuelve a la pantalla de selección si necesitas acceder a otra academia.</p>
                <button onClick={() => { limpiarAcademiaActual(); navigate('/select-academia'); }} className="app-button btn-primary">Cambiar de Academia</button>
              </div>
            )}

            {currentRole === 'director' &&
              <div className="bg-red-900/40 border border-red-500/50 rounded-2xl p-6 sm:p-8">
                <h2 className="text-2xl font-bold text-red-400 text-shadow-neon-sm mb-4">Zona de Peligro</h2>
                <p className="text-red-300/90 mb-6">Eliminar la academia es una acción permanente. Se borrarán todos los jugadores, objetivos y entrenamientos asociados.</p>
                <button onClick={() => setIsDeleteModalOpen(true)} className="app-button btn-danger" disabled={processingAction}>Eliminar Academia Permanentemente</button>
              </div>
            }
          </>
        )}
        
        <div className="mt-12 text-center">
          <button onClick={() => navigate('/')} className="app-link font-medium">&larr; Volver al Inicio</button>
        </div>
      </div>

      <Modal isOpen={isRoleModalOpen} onClose={() => setIsRoleModalOpen(false)} title="Cambiar Rol de Entrenador">
        {selectedUserId &&
          <div className="space-y-4">
            <p className="text-gray-300">Selecciona el nuevo rol para <span className='font-bold text-white'>{users.find(u => u.userId === selectedUserId)?.userEmail}</span>:</p>
            <div className="space-y-3">
              {[ 'director', 'subdirector', 'entrenador' ].map((role) => (
                <button key={role} onClick={() => handlePromoteUser(selectedUserId, role as UserRole)} className={`w-full text-left p-4 rounded-lg transition-transform hover:scale-105 app-button ${role === 'director' ? 'btn-special' : role === 'subdirector' ? 'btn-secondary' : 'btn-primary'}`} disabled={processingAction}>
                  <span className="font-semibold text-lg">{getRoleDisplayName(role as UserRole)}</span>
                  <p className="text-sm opacity-90 font-normal">{ {director: "Control total, puede eliminar la academia.", subdirector: "Gestiona entrenadores, jugadores y entrenamientos.", entrenador: "Acceso básico a jugadores y entrenamientos."}[role] }</p>
                </button>
              ))}
            </div>
          </div>
        }
      </Modal>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmar Eliminación">
        <form onSubmit={handleDeleteAcademia} className="space-y-6">
          <div className="bg-red-900/50 p-4 rounded-lg border border-red-500/50">
              <p className="text-red-300 font-bold text-lg">⚠️ ¡Atención! Esta acción es irreversible.</p>
              <p className="text-red-400 text-sm mt-2">Para confirmar, escribe tu contraseña. Todos los datos de la academia (<span className='font-bold'>{academiaActual?.nombre}</span>) serán eliminados.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Contraseña</label>
            <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/30" required />
            {deleteError && <p className="text-red-400 text-sm mt-2">{deleteError}</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="app-button btn-secondary flex-1" disabled={processingAction}>Cancelar</button>
            <button type="submit" className="app-button btn-danger flex-1" disabled={processingAction || !deletePassword}>
              {processingAction ? 'Eliminando...' : 'Sí, eliminar esta academia'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AcademiaSettingsPage;