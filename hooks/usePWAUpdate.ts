// src/hooks/usePWAUpdate.ts
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { registerSW } from 'virtual:pwa-register';

export function usePWAUpdate() {
  const updateToastRef = useRef<string | number>();

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      
      onNeedRefresh() {
    
        
        // Dismiss cualquier toast anterior
        if (updateToastRef.current) {
          toast.dismiss(updateToastRef.current);
        }
        
        // Mostrar notificación de actualización
        updateToastRef.current = toast('🎾 Nueva versión disponible', {
          description: 'Actualiza para obtener las últimas mejoras y correcciones',
          duration: Infinity, // No auto-cerrar
          closeButton: false,
          action: {
            label: 'Actualizar ahora',
            onClick: () => {
              toast.loading('Actualizando...', { 
                id: 'updating',
                duration: 2000 
              });
              // Forzar actualización
              updateSW(true).then(() => {
      
              }).catch((err) => {
           
                window.location.reload();
              });
            }
          },
          cancel: {
            label: 'Más tarde',
            onClick: () => {
              toast.dismiss(updateToastRef.current);
              updateToastRef.current = undefined;
            }
          },
          style: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#fff',
          }
        });
      },
      
      onOfflineReady() {
        
        toast.success('✔ App lista para usar sin conexión', {
          duration: 3000,
          style: {
            background: 'rgba(17, 24, 39, 0.95)',
            border: '1px solid rgba(16, 185, 129, 0.5)',
            color: '#fff',
          }
        });
      },
      
      onRegisteredSW(swUrl, r) {

        
        // Verificar actualizaciones cada hora
        if (r) {
          setInterval(() => {
          
            r.update();
          }, 60 * 60 * 1000); // 1 hora
          
          // Verificar cuando la ventana recupera el foco
          window.addEventListener('focus', () => {
         
            r.update();
          });
        }
      },
      
      onRegisterError(error) {
  
      }
    });

    return () => {
      // Cleanup si el componente se desmonta (aunque App nunca se desmonta)
      if (updateToastRef.current) {
        toast.dismiss(updateToastRef.current);
      }
    };
  }, []);
}