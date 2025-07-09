import { useState, useEffect } from 'react';
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
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Hook principal para la configuración de academia
export const useAcademiaSettings = () => {
  const { currentUser } = useAuth();
  const { academiaActual, rolActual, limpiarAcademiaActual, setAcademiaActual, eliminarAcademiaDeMisAcademias } = useAcademia();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AcademiaUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRole, setLoadingRole] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  // Cargar datos iniciales
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

  // Cargar usuarios
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

  return {
    // Estados
    currentUser,
    academiaActual,
    rolActual,
    users,
    loading,
    loadingRole,
    permissionError,
    processingAction,
    setProcessingAction,
    
    // Funciones
    loadUsers,
    limpiarAcademiaActual,
    navigate,
    eliminarAcademiaDeMisAcademias
  };
};

// Hook para manejo de usuarios
export const useUserManagement = (
  academiaActual: any,
  currentUser: any,
  users: AcademiaUser[],
  loadUsers: () => Promise<void>,
  setProcessingAction: (value: boolean) => void
) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

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

  const openRoleModal = (userId: string) => {
    setSelectedUserId(userId);
    setIsRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setIsRoleModalOpen(false);
    setSelectedUserId(null);
  };

  return {
    selectedUserId,
    isRoleModalOpen,
    handleRemoveUser,
    handlePromoteUser,
    openRoleModal,
    closeRoleModal
  };
};

// Hook para eliminar academia
export const useDeleteAcademia = (
  academiaActual: any,
  currentUser: any,
  eliminarAcademiaDeMisAcademias: (id: string) => Promise<void>,
  navigate: (path: string) => void,
  setProcessingAction: (value: boolean) => void
) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

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

  const openDeleteModal = () => setIsDeleteModalOpen(true);
  
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletePassword('');
    setDeleteError('');
  };

  return {
    isDeleteModalOpen,
    deletePassword,
    setDeletePassword,
    deleteError,
    handleDeleteAcademia,
    openDeleteModal,
    closeDeleteModal
  };
};