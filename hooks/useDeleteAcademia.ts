// hooks/useDeleteAcademia.ts - MIGRADO CON SONNER
import { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db } from '../firebase/firebase-config';
import { Academia } from '../types/types';
import { User } from 'firebase/auth';
import { useNotification } from './useNotification';

interface UseDeleteAcademiaProps {
  academiaActual: Academia | null;
  currentUser: User | null;
  eliminarAcademiaDeMisAcademias: (academiaId: string) => Promise<void>;
  navigate: (path: string) => void;
  onSuccess?: () => void;
}

export const useDeleteAcademia = ({
  academiaActual,
  currentUser,
  eliminarAcademiaDeMisAcademias,
  navigate,
  onSuccess = () => {}
}: UseDeleteAcademiaProps) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const notification = useNotification();

  const openDeleteModal = () => {
   
    setDeleteError('');
    setDeletePassword('');
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {

    setIsDeleteModalOpen(false);
    setDeletePassword('');
    setDeleteError('');
    setIsDeleting(false);
  };

  const handleDeleteAcademia = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

  

    if (!academiaActual || !currentUser) {
      setDeleteError('Error: Faltan datos necesarios');
      return;
    }

    if (!deletePassword.trim()) {
      setDeleteError('Por favor ingresa tu contraseña');
      return;
    }

    if (!currentUser.email) {
      setDeleteError('Error: Usuario sin email registrado');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        deletePassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);

      await updateDoc(doc(db, 'academias', academiaActual.id), {
        activa: false,
        fechaEliminacion: new Date(),
        eliminadaPor: currentUser.uid,
        motivoEliminacion: 'Eliminación por usuario',
      });

      await eliminarAcademiaDeMisAcademias(academiaActual.id);

      if (onSuccess) {
        onSuccess();
      }

      closeDeleteModal();
      navigate('/select-academia');

      const entityType = academiaActual.tipo === 'grupo-entrenamiento' ? 'grupo' : 'academia';
      notification.success(
        `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} eliminada exitosamente`,
        'Los datos se mantienen para auditoría'
      );

    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || 
          error.code === 'auth/invalid-credential' ||
          error.code === 'auth/invalid-login-credentials') {
        setDeleteError('Contraseña incorrecta. Verifica e intenta nuevamente.');
      } else if (error.code === 'auth/too-many-requests') {
        setDeleteError('Demasiados intentos fallidos. Espera unos minutos antes de intentar nuevamente.');
      } else if (error.code === 'auth/network-request-failed') {
        setDeleteError('Error de conexión. Verifica tu internet e intenta nuevamente.');
      } else if (error.code === 'permission-denied') {
        setDeleteError('No tienes permisos para eliminar esta academia.');
      } else {
        setDeleteError(`Error al eliminar: ${error.message || 'Error desconocido'}. Intenta nuevamente.`);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAcademiaComplete = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

   

    if (!academiaActual || !currentUser || !currentUser.email) {
      setDeleteError('Error: Faltan datos necesarios');
      return;
    }

    if (!deletePassword.trim()) {
      setDeleteError('Por favor ingresa tu contraseña');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        deletePassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);

      await updateDoc(doc(db, 'academias', academiaActual.id), {
        activa: false,
        eliminacionCompleta: true,
        fechaEliminacion: new Date(),
        eliminadaPor: currentUser.uid,
        motivoEliminacion: 'Eliminación completa por usuario',
        publicIdAnterior: (academiaActual as any).publicId,
        publicId: `DEL_${Date.now()}_${(academiaActual as any).publicId}`
      });

      await eliminarAcademiaDeMisAcademias(academiaActual.id);

      if (onSuccess) onSuccess();
      closeDeleteModal();
      navigate('/select-academia');

      const entityType = academiaActual.tipo === 'grupo-entrenamiento' ? 'grupo' : 'academia';
      notification.success(
        `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} eliminada completamente`,
        'El ID público ha sido liberado para reutilización'
      );

    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setDeleteError('Contraseña incorrecta');
      } else {
        setDeleteError(`Error: ${error.message || 'Error desconocido'}`);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const canDelete = (): boolean => {
    return !!(academiaActual && currentUser && currentUser.email);
  };

  const getEntityType = (): string => {
    if (!academiaActual) return 'entidad';
    return academiaActual.tipo === 'grupo-entrenamiento' ? 'grupo' : 'academia';
  };

  return {
    isDeleteModalOpen,
    deletePassword,
    deleteError,
    isDeleting,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteAcademia,
    handleDeleteAcademiaComplete,
    setDeletePassword,
    canDelete,
    getEntityType,
    entityName: academiaActual?.nombre || '',
    entityId: academiaActual?.id || '',
    entityType: getEntityType()
  };
};