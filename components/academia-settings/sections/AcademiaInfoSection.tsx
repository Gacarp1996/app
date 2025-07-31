import React, { useState, useEffect } from 'react';
import { obtenerIdPublico } from '../../../Database/FirebaseAcademias';
import { copyToClipboard } from './helpers';

interface AcademiaInfoSectionProps {
  academiaName: string;
  academiaId: string; // Este es el Firebase ID
}

export const AcademiaInfoSection: React.FC<AcademiaInfoSectionProps> = ({ 
  academiaName, 
  academiaId 
}) => {
  const [publicId, setPublicId] = useState<string | null>(null);
  const [loadingPublicId, setLoadingPublicId] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadPublicId = async () => {
      try {
        // ✅ OBTENER EL ID PÚBLICO DE 6 CARACTERES
        const id = await obtenerIdPublico(academiaId);
        setPublicId(id);
      } catch (error) {
        console.error('Error obteniendo ID público:', error);
      } finally {
        setLoadingPublicId(false);
      }
    };

    loadPublicId();
  }, [academiaId]);

  const handleCopyId = async () => {
    if (!publicId) return;
    
    const success = await copyToClipboard(publicId);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
                Comparte este código de 6 caracteres con otros entrenadores para que puedan unirse a la academia.
                Es la forma más fácil y segura de invitar nuevos miembros.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};