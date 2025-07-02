// Hook personalizado para manejar navegación con hash
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useHashNavigation<T extends string>(
  setActiveTab: (tab: T) => void,
  tabMapping: Record<string, T>
) {
  const location = useLocation();

  useEffect(() => {
    // Verificar si hay un hash en la URL
    if (location.hash) {
      const hash = location.hash.replace('#', '');
      const mappedTab = tabMapping[hash];
      
      if (mappedTab) {
        setActiveTab(mappedTab);
        
        // Scroll suave al contenido después de un pequeño delay
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    }
  }, [location.hash, setActiveTab, tabMapping]);
}