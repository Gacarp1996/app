// components/academia-settings/sections/AcademiaInfoSection.tsx
import React, { useState, useEffect } from 'react';
import { obtenerIdPublico, rotarCodigoPublico } from '../../../Database/FirebaseAcademias';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../hooks/useNotification';
import { UserRole } from '../../../Database/FirebaseRoles';

interface AcademiaInfoSectionProps {
  academiaName: string;
  academiaId: string; // Este es el Firebase ID
  currentUserRole?: UserRole | null; // ✅ AGREGADO para verificar permisos
}

export const AcademiaInfoSection: React.FC<AcademiaInfoSectionProps> = ({ 
  academiaName, 
  academiaId,
  currentUserRole 
}) => {
  const [publicId, setPublicId] = useState<string | null>(null);
  const [loadingPublicId, setLoadingPublicId] = useState(true);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const { currentUser } = useAuth();
  const notification = useNotification();

  useEffect(() => {
    const loadPublicId = async () => {
      try {
        // ✅ OBTENER EL ID PÚBLICO DE 6 CARACTERES
        const id = await obtenerIdPublico(academiaId);
        setPublicId(id);
      } catch (error) {
        
      } finally {
        setLoadingPublicId(false);
      }
    };

    loadPublicId();
  }, [academiaId]);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback para contextos no seguros
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          return true;
        } finally {
          textArea.remove();
        }
      }
    } catch (error) {
     
      return false;
    }
  };

  const handleCopyId = async () => {
    if (!publicId) return;
    
    const success = await copyToClipboard(publicId);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRotateCode = async () => {
    if (!currentUser || rotating) return;

    const confirmed = await notification.confirm({
      title: 'Rotar código de academia',
      message: 'Esto generará un nuevo código y el anterior dejará de funcionar. Todas las solicitudes pendientes con el código anterior serán invalidadas. ¿Continuar?',
      type: 'warning',
      confirmText: 'Sí, rotar código',
      cancelText: 'Cancelar'
    });
    
    if (!confirmed) return;

    setRotating(true);
    try {
      const result = await rotarCodigoPublico(academiaId, currentUser.uid, 'Rotación manual por director');
      if (result.success && result.newCode) {
        setPublicId(result.newCode);
        notification.success('Código actualizado exitosamente', `El nuevo código es: ${result.newCode}`);
      } else {
        notification.error('Error al rotar código', result.message);
      }
    } catch (error) {

      notification.error('Error inesperado', 'No se pudo rotar el código');
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">Información de la Academia</h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-gray-400 text-sm mb-1">Nombre:</p>
          <p className="text-white font-semibold text-lg">{academiaName}</p>
        </div>
        
        <div>
          <p className="text-gray-400 text-sm mb-2">ID de Academia:</p>
          {loadingPublicId ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
              <span className="text-gray-500">Cargando ID...</span>
            </div>
          ) : publicId ? (
            <div className="flex items-center gap-3">
              <code className="text-green-400 font-mono text-xl font-bold bg-gray-900/50 px-3 py-2 rounded border tracking-wider">
                {publicId}
              </code>
              <button
                onClick={handleCopyId}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors group relative"
                title="Copiar ID"
              >
                {copied ? (
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>

              {/* ✅ BOTÓN PARA ROTAR CÓDIGO - Solo directores */}
              {currentUserRole === 'academyDirector' && (
                <button
                  onClick={handleRotateCode}
                  disabled={rotating}
                  className="p-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded-lg transition-colors group"
                  title="Generar nuevo código"
                >
                  {rotating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </button>
              )}

              {copied && (
                <span className="text-green-400 text-sm font-medium animate-fade-in">
                  ¡Copiado!
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-red-400">Error cargando ID público</span>
            </div>
          )}
          
          <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm flex items-start gap-2">
              <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Comparte este código de 6 caracteres con otros entrenadores para que puedan solicitar unirse a la academia.
                {currentUserRole === 'academyDirector' && (
                  <span className="block mt-2 text-yellow-300">
                    Como director, deberás aprobar todas las solicitudes de unión desde la sección de configuración.
                  </span>
                )}
              </span>
            </p>
          </div>

          {/* ✅ ADVERTENCIA SOBRE ROTACIÓN DE CÓDIGO */}
          {currentUserRole === 'academyDirector' && (
            <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <p className="text-orange-300 text-xs flex items-start gap-2">
                <svg className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span>
                  <strong>Rotar código:</strong> Usa el botón naranja para generar un nuevo código si el actual ha sido comprometido. 
                  El código anterior dejará de funcionar inmediatamente.
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};