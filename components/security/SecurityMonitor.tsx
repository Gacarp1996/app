// components/security/SecurityMonitor.tsx
import { useState, useEffect } from 'react';
import { AuditLogger } from '../../utils/auditLogger';
import { useDeveloperMode } from '../../hooks/useDeveloperMode';

export default function SecurityMonitor() {
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { isDeveloper } = useDeveloperMode();

  useEffect(() => {
    if (isDeveloper && import.meta.env.DEV) {
      const interval = setInterval(() => {
        setLogs(AuditLogger.getAuditLogs());
        setSummary(AuditLogger.getSecuritySummary());
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isDeveloper]);

  // 🚫 NO MOSTRAR SI NO ES DESARROLLADOR
  if (!isDeveloper || !import.meta.env.DEV) {
    return null;
  }

  return (
    <>
      {/* 🛡️ BOTÓN FLOTANTE PARA ABRIR MONITOR */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          background: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
        title="Monitor de Seguridad"
      >
        🛡️
      </button>

      {/* 🛡️ PANEL DE MONITOREO */}
      {isVisible && (
        <div style={{
          position: 'fixed',
          top: '50px',
          right: '20px',
          width: '400px',
          maxHeight: '80vh',
          background: 'white',
          border: '2px solid #dc3545',
          borderRadius: '8px',
          zIndex: 9998,
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
        }}>
          
          {/* HEADER */}
          <div style={{
            background: '#dc3545',
            color: 'white',
            padding: '15px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0 }}>🛡️ Security Monitor</h3>
            <button
              onClick={() => setIsVisible(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>

          {/* SUMMARY */}
          {summary && (
            <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
              <h4 style={{ margin: '0 0 10px 0' }}>📊 Resumen</h4>
              <div style={{ fontSize: '14px' }}>
                <div>Total eventos: <strong>{summary.total}</strong></div>
                <div style={{ marginTop: '8px' }}>
                  <strong>Por severidad:</strong>
                  {Object.entries(summary.bySeverity).map(([severity, count]) => (
                    <div key={severity} style={{ marginLeft: '10px' }}>
                      {severity}: <span style={{ 
                        color: severity === 'CRITICAL' ? '#dc3545' : 
                               severity === 'HIGH' ? '#fd7e14' : 
                               severity === 'MEDIUM' ? '#ffc107' : '#28a745'
                      }}>{count as number}</span>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => {
                    AuditLogger.clearAuditLogs();
                    setLogs([]);
                    setSummary(null);
                  }}
                  style={{
                    marginTop: '10px',
                    padding: '5px 10px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🗑️ Limpiar Logs
                </button>
              </div>
            </div>
          )}

          {/* LOGS */}
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            padding: '15px'
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>📋 Eventos Recientes</h4>
            
            {logs.length === 0 ? (
              <div style={{ color: '#6c757d', fontStyle: 'italic' }}>
                No hay eventos de seguridad registrados
              </div>
            ) : (
              logs.slice(-20).reverse().map((log, index) => (
                <div key={index} style={{
                  background: log.severity === 'CRITICAL' ? '#f8d7da' :
                            log.severity === 'HIGH' ? '#fff3cd' :
                            log.severity === 'MEDIUM' ? '#d1ecf1' : '#d4edda',
                  border: `1px solid ${
                    log.severity === 'CRITICAL' ? '#dc3545' :
                    log.severity === 'HIGH' ? '#ffc107' :
                    log.severity === 'MEDIUM' ? '#17a2b8' : '#28a745'
                  }`,
                  borderRadius: '4px',
                  padding: '8px',
                  marginBottom: '8px',
                  fontSize: '12px'
                }}>
                  <div style={{ 
                    fontWeight: 'bold',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span>{log.eventType}</span>
                    <span style={{ fontSize: '10px' }}>
                      {log.severity}
                    </span>
                  </div>
                  
                  <div style={{ marginTop: '4px', color: '#495057' }}>
                    {log.userId && <div>User: {log.userId.slice(0, 8)}...</div>}
                    {log.email && <div>Email: {log.email}</div>}
                    <div>Time: {new Date(log.timestamp).toLocaleTimeString()}</div>
                    {Object.keys(log.details).length > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        <strong>Details:</strong> {JSON.stringify(log.details, null, 0).slice(0, 100)}...
                      </div>
                    )}
                  </div>
                  
                  <div style={{
                    marginTop: '4px',
                    fontSize: '10px',
                    color: log.success ? '#28a745' : '#dc3545'
                  }}>
                    {log.success ? '✅ Success' : '❌ Failed/Blocked'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
