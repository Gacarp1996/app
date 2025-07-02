import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  priority?: 'normal' | 'high'; // Para manejar modales superpuestos
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, priority = 'normal' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Z-index dinámico para modales superpuestos
  const zIndexClass = priority === 'high' ? 'z-[200]' : 'z-[100]';

  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center`}>
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Efectos de fondo animados */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }}></div>
      
      {/* Modal con safe area */}
      <div 
        className="relative z-10 mx-4 my-8 w-full max-w-lg"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        <div
          className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl shadow-2xl shadow-green-500/20 h-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl flex flex-col h-full overflow-hidden">
            {/* Encabezado del Modal - Fijo */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-800 flex-shrink-0">
              <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent pr-2">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-green-400 transition-all duration-200 hover:rotate-90 transform flex-shrink-0 ml-2"
                aria-label="Cerrar modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Contenido del Modal (con scroll) */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;