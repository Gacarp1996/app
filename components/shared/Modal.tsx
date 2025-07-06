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
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Overlay principal con blur y efecto oscuro
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      {/* Efectos de fondo animados */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      {/* Contenedor del modal con borde neón */}
      <div
        className="relative bg-gradient-to-br from-green-500/10 to-cyan-500/10 p-[1px] rounded-xl w-full max-w-lg shadow-2xl shadow-green-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl flex flex-col max-h-[90vh]">
          {/* Encabezado del Modal */}
          <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-800">
            <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-green-400 transition-all duration-200 hover:rotate-90 transform"
              aria-label="Cerrar modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Contenido del Modal (con scroll) */}
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;