// hooks/useDeveloperMode.ts
import { useState, useEffect } from 'react';

export const useDeveloperMode = () => {
  const [isDeveloper, setIsDeveloper] = useState(false);

  useEffect(() => {
    const checkDeveloperMode = () => {
      // Solo en modo desarrollo
      if (!import.meta.env.DEV) return false;

      // Verificar múltiples condiciones para activar modo desarrollador
      const conditions = [
        localStorage.getItem('isDeveloper') === 'true',
        window.location.hostname === 'localhost',
        window.location.search.includes('dev=true'),
        window.location.search.includes('debug=true'),
        sessionStorage.getItem('devMode') === 'true'
      ];

      return conditions.some(condition => condition);
    };

    setIsDeveloper(checkDeveloperMode());

    // Escuchar cambios en localStorage
    const handleStorageChange = () => {
      setIsDeveloper(checkDeveloperMode());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Función para activar/desactivar modo desarrollador
  const toggleDeveloperMode = () => {
    const newValue = !isDeveloper;
    localStorage.setItem('isDeveloper', newValue.toString());
    setIsDeveloper(newValue);
  };

  // Función para activar temporalmente (solo esta sesión)
  const enableDeveloperModeTemp = () => {
    sessionStorage.setItem('devMode', 'true');
    setIsDeveloper(true);
  };

  return {
    isDeveloper,
    toggleDeveloperMode,
    enableDeveloperModeTemp
  };
};

// 🎯 FUNCIÓN GLOBAL PARA ACTIVAR DESDE CONSOLA
if (typeof window !== 'undefined') {
  (window as any).enableDevMode = () => {
    localStorage.setItem('isDeveloper', 'true');
    console.log('🛡️ Modo desarrollador activado. Recarga la página.');
  };
  
  (window as any).disableDevMode = () => {
    localStorage.removeItem('isDeveloper');
    sessionStorage.removeItem('devMode');
    console.log('🚫 Modo desarrollador desactivado. Recarga la página.');
  };
}
