// components/academia-settings/sections/PendingRequestsSection.tsx
import React, { useState, useEffect } from 'react';
import { obtenerSolicitudesPendientes, procesarSolicitud } from '../../../Database/FirebaseAcademias';
import { JoinRequest } from '../../../types/types';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotification } from '../../../hooks/useNotification';

interface PendingRequestsSectionProps {
  academiaId: string;
  onRequestProcessed?: () => void;
}

export const PendingRequestsSection: React.FC<PendingRequestsSectionProps> = ({
  academiaId,
  onRequestProcessed
}) => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const notification = useNotification();

  useEffect(() => {
    loadRequests();
  }, [academiaId]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const pending = await obtenerSolicitudesPendientes(academiaId);
      setRequests(pending);
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      notification.error('Error cargando solicitudes');
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async (requestId: string, action: 'approve' | 'reject') => {
    if (!currentUser) return;
    
    const confirmed = await notification.confirm({
      title: action === 'approve' ? 'Aprobar solicitud' : 'Rechazar solicitud',
      message: `¿Estás seguro de ${action === 'approve' ? 'aprobar' : 'rechazar'} esta solicitud?`,
      type: action === 'approve' ? 'info' : 'warning'
    });

    if (!confirmed) return;

    setProcessing(requestId);
    try {
      const result = await procesarSolicitud(
        academiaId,
        requestId,
        action,
        currentUser.uid
      );

      if (result.success) {
        notification.success(result.message);
        await loadRequests();
        onRequestProcessed?.();
      } else {
        notification.error(result.message);
      }
    } catch (error) {
      notification.error('Error procesando solicitud');
    } finally {
      setProcessing(null);
    }
  };

  const getTimeLeft = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return 'Expirando pronto';
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          <span className="text-gray-400">Cargando solicitudes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg relative">
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-white">Solicitudes de Unión</h2>
        </div>
        
        <button 
          onClick={loadRequests}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          title="Recargar"
        >
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <p>No hay solicitudes pendientes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div key={request.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-semibold">{request.userName}</p>
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                      Pendiente
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">{request.userEmail}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Código usado: {request.publicIdUsed}</span>
                    <span>Expira en: {getTimeLeft(request.expiresAt)}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleProcess(request.id, 'approve')}
                    disabled={processing === request.id}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 
                             text-white text-sm rounded-lg transition-colors"
                  >
                    {processing === request.id ? '...' : 'Aprobar'}
                  </button>
                  <button
                    onClick={() => handleProcess(request.id, 'reject')}
                    disabled={processing === request.id}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 
                             text-white text-sm rounded-lg transition-colors"
                  >
                    {processing === request.id ? '...' : 'Rechazar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};