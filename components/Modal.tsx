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
      // Cuando el modal está abierto, deshabilita el scroll del body
      document.body.style.overflow = 'hidden';
    } else {
      // Cuando se cierra, lo vuelve a habilitar
      document.body.style.overflow = 'unset';
    }

    // Cleanup para reestablecer el scroll si el componente se desmonta
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    // Overlay principal
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4"
      onClick={onClose} // Cierra el modal si se hace clic en el fondo
    >
      {/* Contenedor del modal */}
      <div
        className="bg-app-surface rounded-lg shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} // Evita que el clic dentro del modal se propague al fondo
      >
        {/* Encabezado del Modal */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-app">
          <h3 className="text-xl sm:text-2xl font-semibold text-app-accent">{title}</h3>
          <button
            onClick={onClose}
            className="text-app-secondary hover:text-app-primary transition-colors"
            aria-label="Cerrar modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Contenido del Modal (con scroll) */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;