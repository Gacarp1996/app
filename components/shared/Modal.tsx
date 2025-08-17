import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      // Bloquear scroll del body completamente
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      // Restaurar scroll del body
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      // Limpiar al desmontar
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Overlay principal con blur y efecto oscuro
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-2 sm:p-4 overflow-hidden"
      onClick={onClose}
      style={{ touchAction: 'none' }}
    >
      {/* Efectos de fondo animados */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }}></div>
      
      {/* Contenedor del modal con borde neón */}
      <div
        className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl w-full max-w-lg shadow-2xl shadow-green-500/20 h-auto max-h-[95vh] min-h-0"
        onClick={(e) => e.stopPropagation()}
        style={{ touchAction: 'auto' }}
      >
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl flex flex-col h-full max-h-[95vh] overflow-hidden">
          {/* Encabezado del Modal */}
          <div className="flex justify-between items-start gap-3 p-4 sm:p-6 border-b border-gray-800 flex-shrink-0">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent leading-tight flex-1 min-w-0 break-words">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-green-400 transition-all duration-200 hover:rotate-90 transform flex-shrink-0 ml-2"
              aria-label="Cerrar modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Contenido del Modal (con scroll) */}
          <div 
            className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 overscroll-contain" 
            style={{ 
              maxHeight: 'calc(95vh - 80px)',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;