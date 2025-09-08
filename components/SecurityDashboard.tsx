// components/SecurityDashboard.tsx - Dashboard de Seguridad
import React, { useState, useEffect } from 'react';
import { validateSecureEnvironment } from '../utils/securityHeaders';
import { logSecurityEvent, SecurityEvent, AuditLogEntry, detectSuspiciousPatterns } from '../utils/securityAudit';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { useAuth } from '../contexts/AuthContext';
import { useAcademia } from '../contexts/AcademiaContext';

interface SecurityMetrics {
  totalAuditLogs: number;
  criticalEvents: number;
  recentLogins: number;
  securityScore: number;
  vulnerabilities: string[];
  recommendations: string[];
}

const SecurityDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const { academiaActual } = useAcademia();
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalAuditLogs: 0,
    criticalEvents: 0,
    recentLogins: 0,
    securityScore: 0,
    vulnerabilities: [],
    recommendations: []
  });
  const [loading, setLoading] = useState(true);

  // Función auxiliar para obtener logs de auditoría
  const getRecentAuditLogs = async (academiaId: string, limitCount: number = 50): Promise<SecurityEvent[]> => {
    try {
      const auditCollection = collection(db, 'securityAudit');
      const q = query(
        auditCollection,
        where('academiaId', '==', academiaId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as SecurityEvent);
    } catch (error) {
      console.error('❌ Error getting audit logs:', error);
      return [];
    }
  };

  useEffect(() => {
    if (!currentUser || !academiaActual) return;

    const loadSecurityMetrics = async () => {
      setLoading(true);
      
      try {
        // 1. Obtener logs de auditoría recientes
        const recentLogs = await getRecentAuditLogs(academiaActual.id, 100);
        
        // 2. Calcular métricas
        const criticalEvents = recentLogs.filter((log: SecurityEvent) => log.severity === 'CRITICAL').length;
        const recentLogins = recentLogs.filter((log: SecurityEvent) => log.type === 'USER_LOGIN').length;
        
        // 3. Validar entorno seguro
        const securityChecks = validateSecureEnvironment();
        const vulnerabilities = Object.entries(securityChecks)
          .filter(([_, isValid]) => !isValid)
          .map(([check]) => check);
          
        // 4. Detectar patrones sospechosos
        const suspiciousPatterns = await detectSuspiciousPatterns(currentUser.uid, academiaActual.id);
        
        // 5. Calcular score de seguridad (0-100)
        let securityScore = 100;
        securityScore -= vulnerabilities.length * 20; // -20 por cada vulnerabilidad
        securityScore -= criticalEvents * 5; // -5 por cada evento crítico
        securityScore -= suspiciousPatterns ? 10 : 0; // -10 si hay patrones sospechosos
        securityScore = Math.max(0, securityScore);
        
        // 6. Generar recomendaciones
        const recommendations: string[] = [];
        if (vulnerabilities.includes('httpsInProduction')) {
          recommendations.push('Configurar HTTPS en producción');
        }
        if (criticalEvents > 0) {
          recommendations.push('Revisar eventos críticos de seguridad');
        }
        if (suspiciousPatterns) {
          recommendations.push('Investigar patrones de actividad sospechosos');
        }
        if (recentLogs.length < 10) {
          recommendations.push('Aumentar monitoreo de actividad');
        }
        
        setMetrics({
          totalAuditLogs: recentLogs.length,
          criticalEvents,
          recentLogins,
          securityScore,
          vulnerabilities,
          recommendations
        });
        
      } catch (error) {
        console.error('Error loading security metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSecurityMetrics();
  }, [currentUser, academiaActual]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { text: 'Excelente', color: 'bg-green-500' };
    if (score >= 60) return { text: 'Bueno', color: 'bg-yellow-500' };
    return { text: 'Crítico', color: 'bg-red-500' };
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const badge = getScoreBadge(metrics.securityScore);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              🛡️ Dashboard de Seguridad
            </h1>
            <p className="text-gray-400 mt-1">
              Monitoreo y análisis de seguridad para {academiaActual?.nombre}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(metrics.securityScore)}`}>
              {metrics.securityScore}/100
            </div>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${badge.color}`}>
              {badge.text}
            </div>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-400">{metrics.totalAuditLogs}</div>
            <div className="text-sm text-gray-300">Eventos de Auditoría</div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-400">{metrics.criticalEvents}</div>
            <div className="text-sm text-gray-300">Eventos Críticos</div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{metrics.recentLogins}</div>
            <div className="text-sm text-gray-300">Logins Recientes</div>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-400">{metrics.vulnerabilities.length}</div>
            <div className="text-sm text-gray-300">Vulnerabilidades</div>
          </div>
        </div>
      </div>

      {/* Vulnerabilidades */}
      {metrics.vulnerabilities.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
            ⚠️ Vulnerabilidades Detectadas
          </h3>
          <ul className="space-y-2">
            {metrics.vulnerabilities.map((vuln, index) => (
              <li key={index} className="text-red-300 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                {vuln}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recomendaciones */}
      {metrics.recommendations.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
            💡 Recomendaciones de Seguridad
          </h3>
          <ul className="space-y-2">
            {metrics.recommendations.map((rec, index) => (
              <li key={index} className="text-yellow-300 flex items-center gap-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Resumen de mejoras implementadas */}
      <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
          ✅ Mejoras de Seguridad Implementadas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-green-300 mb-2">🛡️ Validación y Sanitización</h4>
            <ul className="text-sm text-green-200 space-y-1">
              <li>• Validación de emails y nombres de usuario</li>
              <li>• Sanitización contra XSS</li>
              <li>• Validación de roles y permisos</li>
              <li>• Validación de IDs de academia</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-green-300 mb-2">📋 Auditoría y Monitoreo</h4>
            <ul className="text-sm text-green-200 space-y-1">
              <li>• Registro de logins/logouts</li>
              <li>• Auditoría de cambios de roles</li>
              <li>• Detección de actividad sospechosa</li>
              <li>• Rate limiting básico</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-green-300 mb-2">🔒 Headers de Seguridad</h4>
            <ul className="text-sm text-green-200 space-y-1">
              <li>• Content Security Policy (CSP)</li>
              <li>• X-Frame-Options</li>
              <li>• X-Content-Type-Options</li>
              <li>• Referrer Policy</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-green-300 mb-2">🔥 Firestore Security Rules</h4>
            <ul className="text-sm text-green-200 space-y-1">
              <li>• Validación server-side de roles</li>
              <li>• Control de acceso granular</li>
              <li>• Protección contra escalación</li>
              <li>• Validación de estructura de datos</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Estado general */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Estado General de Seguridad</h3>
          <p className="text-gray-300">
            {metrics.securityScore >= 80 
              ? "🎉 Tu aplicación tiene un excelente nivel de seguridad."
              : metrics.securityScore >= 60
              ? "⚡ Tu aplicación está bien protegida, pero puede mejorar."
              : "🚨 Se requiere atención inmediata a los problemas de seguridad."
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;
