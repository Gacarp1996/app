// components/academia-settings/sections/LeaveAcademiaModal.tsx
import React, { useState, useEffect } from 'react';
import { canDirectorLeaveAcademia } from '../../../Database/FirebaseRoles';

interface LeaveAcademiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  academiaId: string;
  academiaName: string;
  userId: string;
  userRole: string | null;
}

const LeaveAcademiaModal: React.FC<LeaveAcademiaModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  academiaId,
  academiaName,
  userId,
  userRole
}) => {
  const [loading, setLoading] = useState(false);
  const [canLeave, setCanLeave] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [directorCount, setDirectorCount] = useState(0);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    const checkCanLeave = async () => {
      if (!isOpen || !userRole) return;
      
      setLoading(true);
      try {
        const result = await canDirectorLeaveAcademia(academiaId, userId);
        setCanLeave(result.canLeave);
        setValidationMessage(result.message);
        setDirectorCount(result.directorCount);
      } catch (error) {
        console.error('Error verificando permisos:', error);
        setCanLeave(false);
        setValidationMessage('Error al verificar permisos');
      } finally {
        setLoading(false);
      }
    };

    checkCanLeave();
  }, [isOpen, academiaId, userId, userRole]);

  const handleConfirm = async () => {
    if (confirmText !== 'ABANDONAR' || !canLeave) return;
    
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setConfirmText('');
    }
  };

  if (!isOpen) return null;

  const isDirector = userRole === 'academyDirector';

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-gradient-to-br from-orange-500/10 to-red-500/10 p-[1px] rounded-xl w-[90vw] max-w-[500px] shadow-2xl shadow-red-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-800">
            <h3 className="text-xl font-bold text-orange-400">
              Abandonar Academia
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-orange-400 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Contenido */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-400"></div>
              </div>
            ) : (
              <>
                {/* Info de la academia */}
                <div className="mb-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <p className="text-sm text-gray-400 mb-1">Academia:</p>
                  <p className="text-lg font-medium text-white">{academiaName}</p>
                  {isDirector && directorCount > 0 && (
                    <p className="text-sm text-gray-400 mt-2">
                      Directores actuales: <span className="text-white font-medium">{directorCount}</span>
                    </p>
                  )}
                </div>

                {/* Mensaje de validación */}
                <div className={`p-4 rounded-lg border mb-6 ${
                  canLeave 
                    ? 'bg-yellow-900/20 border-yellow-600/50' 
                    : 'bg-red-900/20 border-red-600/50'
                }`}>
                  <p className={`text-sm ${canLeave ? 'text-yellow-400' : 'text-red-400'}`}>
                    {validationMessage}
                  </p>
                </div>

                {canLeave && (
                  <>
                    {/* Advertencias */}
                    <div className="space-y-3 mb-6">
                      <h4 className="text-sm font-medium text-gray-300">
                        Al abandonar la academia:
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-400">
                        <li className="flex items-start gap-2">
                          <span className="text-red-400 mt-0.5">•</span>
                          <span>Perderás acceso a todos los datos y jugadores</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-400 mt-0.5">•</span>
                          <span>No podrás recuperar tu rol de {userRole === 'academyDirector' ? 'director' : 'usuario'}</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-red-400 mt-0.5">•</span>
                          <span>Necesitarás ser invitado nuevamente para volver</span>
                        </li>
                        {isDirector && (
                          <li className="flex items-start gap-2">
                            <span className="text-yellow-400 mt-0.5">•</span>
                            <span>Los otros {directorCount - 1} director(es) continuarán gestionando la academia</span>
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Campo de confirmación */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Escribe <span className="font-mono text-orange-400">ABANDONAR</span> para confirmar:
                      </label>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-orange-500 focus:outline-none"
                        placeholder="ABANDONAR"
                      />
                    </div>
                  </>
                )}

                {/* Botones */}
                <div className="flex justify-end gap-3">
                  <button
                    onClick={onClose}
                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all duration-200"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  {canLeave && (
                    <button
                      onClick={handleConfirm}
                      disabled={confirmText !== 'ABANDONAR' || loading}
                      className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Procesando...' : 'Abandonar Academia'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveAcademiaModal;