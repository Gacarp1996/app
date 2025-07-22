// hooks/useDeleteAcademia.ts - Versión completamente corregida
import { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db } from '../firebase/firebase-config';
import { Academia } from '../types';
import { User } from 'firebase/auth';

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

  const openDeleteModal = () => {
    console.log('🗑️ Abriendo modal de eliminación');
    setDeleteError('');
    setDeletePassword('');
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    console.log('❌ Cerrando modal de eliminación');
    setIsDeleteModalOpen(false);
    setDeletePassword('');
    setDeleteError('');
    setIsDeleting(false);
  };

  const handleDeleteAcademia = async (e?: React.FormEvent) => {
    // Prevenir submit del formulario si viene de un form
    if (e) {
      e.preventDefault();
    }

    console.log('🚀 Iniciando proceso de eliminación de academia');

    if (!academiaActual || !currentUser) {
      console.error('❌ Faltan datos necesarios para eliminar');
      setDeleteError('Error: Faltan datos necesarios');
      return;
    }

    if (!deletePassword.trim()) {
      console.warn('⚠️ Contraseña vacía');
      setDeleteError('Por favor ingresa tu contraseña');
      return;
    }

    if (!currentUser.email) {
      console.error('❌ Usuario sin email registrado');
      setDeleteError('Error: Usuario sin email registrado');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      console.log(`🔐 Verificando contraseña para usuario: ${currentUser.email}`);
      
      // 1. Verificar la contraseña del usuario
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        deletePassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      console.log('✅ Contraseña verificada correctamente');

      console.log(`🗑️ Marcando academia como inactiva: ${academiaActual.id} (${academiaActual.nombre})`);
      
      // 2. Marcar como inactiva (eliminación suave)
      await updateDoc(doc(db, 'academias', academiaActual.id), {
        activa: false,
        fechaEliminacion: new Date(),
        eliminadaPor: currentUser.uid,
        motivoEliminacion: 'Eliminación por usuario',
        // Mantener publicId para auditoría pero podría liberarse en el futuro
      });

      console.log('✅ Academia marcada como inactiva exitosamente');

      console.log('🔄 Removiendo academia de la lista del usuario');
      
      // 3. Remover de la lista del usuario
      await eliminarAcademiaDeMisAcademias(academiaActual.id);
      console.log('✅ Academia removida de la lista del usuario');

      // 4. Ejecutar callback de éxito si existe
      if (onSuccess) {
        console.log('🎯 Ejecutando callback de éxito');
        onSuccess();
      }

      // 5. Limpiar estados y navegar
      console.log('🚀 Navegando a selección de academia');
      closeDeleteModal();
      navigate('/select-academia');

      // 6. Mostrar confirmación al usuario
      const entityType = academiaActual.tipo === 'grupo-entrenamiento' ? 'grupo' : 'academia';
      alert(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} eliminada exitosamente`);

      console.log('🎉 Proceso de eliminación completado exitosamente');

    } catch (error: any) {
      console.error('❌ Error durante el proceso de eliminación:', error);
      
      // Manejar diferentes tipos de errores de autenticación
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

  // FUNCIÓN ADICIONAL: Eliminación completa (para casos especiales)
  const handleDeleteAcademiaComplete = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    console.log('🚨 ADVERTENCIA: Iniciando eliminación COMPLETA de academia');

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
      // 1. Verificar contraseña
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        deletePassword
      );
      
      await reauthenticateWithCredential(currentUser, credential);
      console.log('✅ Contraseña verificada para eliminación completa');

      // 2. En lugar de eliminar completamente, marcar con una bandera especial
      // Esto mantiene la auditoría pero libera el ID público para reutilización
      await updateDoc(doc(db, 'academias', academiaActual.id), {
        activa: false,
        eliminacionCompleta: true,
        fechaEliminacion: new Date(),
        eliminadaPor: currentUser.uid,
        motivoEliminacion: 'Eliminación completa por usuario',
        // Agregar timestamp al publicId para liberarlo
        publicIdAnterior: (academiaActual as any).publicId,
        publicId: `DEL_${Date.now()}_${(academiaActual as any).publicId}` // Marcar como eliminado
      });

      console.log('✅ Academia marcada para eliminación completa');

      // 3. Remover de la lista del usuario
      await eliminarAcademiaDeMisAcademias(academiaActual.id);

      // 4. Limpiar y navegar
      if (onSuccess) onSuccess();
      closeDeleteModal();
      navigate('/select-academia');

      const entityType = academiaActual.tipo === 'grupo-entrenamiento' ? 'grupo' : 'academia';
      alert(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} eliminada completamente`);

      console.log('🎉 Eliminación completa realizada exitosamente');

    } catch (error: any) {
      console.error('❌ Error en eliminación completa:', error);
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setDeleteError('Contraseña incorrecta');
      } else {
        setDeleteError(`Error: ${error.message || 'Error desconocido'}`);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // FUNCIÓN DE UTILIDAD: Verificar si se puede eliminar
  const canDelete = (): boolean => {
    return !!(academiaActual && currentUser && currentUser.email);
  };

  // FUNCIÓN DE UTILIDAD: Obtener el tipo de entidad
  const getEntityType = (): string => {
    if (!academiaActual) return 'entidad';
    return academiaActual.tipo === 'grupo-entrenamiento' ? 'grupo' : 'academia';
  };

  return {
    // Estados
    isDeleteModalOpen,
    deletePassword,
    deleteError,
    isDeleting,
    
    // Funciones de control del modal
    openDeleteModal,
    closeDeleteModal,
    
    // Funciones de eliminación
    handleDeleteAcademia,           // Eliminación suave (recomendada)
    handleDeleteAcademiaComplete,   // Eliminación completa (casos especiales)
    
    // Setters
    setDeletePassword,
    
    // Utilidades
    canDelete,
    getEntityType,
    
    // Información de la entidad actual
    entityName: academiaActual?.nombre || '',
    entityId: academiaActual?.id || '',
    entityType: getEntityType()
  };
};