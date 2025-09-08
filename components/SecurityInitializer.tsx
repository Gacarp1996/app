// components/SecurityInitializer.tsx - Inicializador de Seguridad
import { useEffect } from 'react';
import { validateSecureEnvironment, useRateLimit } from '../utils/securityHeaders';
import { useAuth } from '../contexts/AuthContext';

const SecurityInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const loginRateLimit = useRateLimit('login');

  useEffect(() => {
    // Validar entorno seguro al inicializar la aplicación
    const securityChecks = validateSecureEnvironment();
    
    // Mostrar advertencias de seguridad críticas
    const criticalIssues = Object.entries(securityChecks)
      .filter(([_, isValid]) => !isValid)
      .map(([check]) => check);
    
    if (criticalIssues.length > 0) {
      console.group('🚨 PROBLEMAS DE SEGURIDAD DETECTADOS');
      criticalIssues.forEach(issue => {
        console.error(`❌ ${issue}`);
      });
      console.groupEnd();
      
      // En producción, podrías querer redirigir a una página de error de seguridad
      if (!import.meta.env.DEV && criticalIssues.includes('httpsInProduction')) {
        alert('⚠️ Esta aplicación debe ejecutarse bajo HTTPS en producción por razones de seguridad.');
      }
    }
    
    // Configurar detección de ataques básicos
    const detectSuspiciousActivity = () => {
      // Detectar múltiples pestañas (posible session hijacking)
      const storageKey = 'app_session_tab_id';
      const currentTabId = Date.now().toString();
      
      // Si ya existe otro tab ID, es sospechoso
      const existingTabId = localStorage.getItem(storageKey);
      if (existingTabId && existingTabId !== currentTabId) {
        console.warn('⚠️ SEGURIDAD: Múltiples pestañas detectadas');
        // Podrías implementar logout automático aquí
      }
      
      localStorage.setItem(storageKey, currentTabId);
      
      // Limpiar al cerrar la pestaña
      window.addEventListener('beforeunload', () => {
        if (localStorage.getItem(storageKey) === currentTabId) {
          localStorage.removeItem(storageKey);
        }
      });
    };
    
    detectSuspiciousActivity();
    
    // Prevenir algunas técnicas de ataque comunes
    const preventCommonAttacks = () => {
      // Prevenir drag & drop de archivos maliciosos
      document.addEventListener('dragover', (e) => e.preventDefault());
      document.addEventListener('drop', (e) => e.preventDefault());
      
      // Detectar herramientas de desarrollo abiertas (básico)
      let devtools = { open: false, orientation: null };
      const threshold = 160;
      
      setInterval(() => {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          if (!devtools.open) {
            devtools.open = true;
            console.warn('⚠️ SEGURIDAD: Herramientas de desarrollo detectadas');
            // En un entorno muy sensible, podrías cerrar la sesión
          }
        } else {
          devtools.open = false;
        }
      }, 500);
      
      // Detectar cambios en el DOM que podrían indicar inyección de scripts
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) { // Element node
                const element = node as Element;
                // Detectar scripts inyectados
                if (element.tagName === 'SCRIPT' && !element.hasAttribute('data-allowed')) {
                  console.error('🚨 SEGURIDAD CRÍTICA: Script no autorizado detectado');
                  element.remove();
                }
                // Detectar iframes inyectados
                if (element.tagName === 'IFRAME') {
                  console.error('🚨 SEGURIDAD CRÍTICA: Iframe no autorizado detectado');
                  element.remove();
                }
              }
            });
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    };
    
    preventCommonAttacks();
    
    // Solo inicializar una vez
  }, []);

  // Monitorear intentos de login fallidos
  useEffect(() => {
    if (!currentUser) return;
    
    const userId = currentUser.uid;
    
    // Verificar si el usuario está limitado por rate limiting
    if (loginRateLimit.isRateLimited(userId)) {
      const remaining = loginRateLimit.getRemainingAttempts(userId);
      console.warn(`⚠️ SEGURIDAD: Usuario ${userId} limitado. Intentos restantes: ${remaining}`);
    }
  }, [currentUser, loginRateLimit]);

  return <>{children}</>;
};

export default SecurityInitializer;
