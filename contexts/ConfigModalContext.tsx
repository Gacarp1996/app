// contexts/ConfigModalContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConfigModalContextType {
  // Modal principal
  isConfigModalOpen: boolean;
  openConfigModal: () => void;
  closeConfigModal: () => void;
  
  // Modal avanzado
  isAdvancedModalOpen: boolean;
  openAdvancedModal: () => void;
  closeAdvancedModal: () => void;
}

const ConfigModalContext = createContext<ConfigModalContextType | undefined>(undefined);

export const ConfigModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);

  const openConfigModal = () => {
    console.log('🔧 Abriendo modal de configuración...');
    setIsConfigModalOpen(true);
  };

  const closeConfigModal = () => {
    console.log('🔧 Cerrando modal de configuración...');
    setIsConfigModalOpen(false);
  };

  const openAdvancedModal = () => {
    console.log('🔧 Abriendo modal avanzado...');
    setIsAdvancedModalOpen(true);
    // Cerrar el modal principal cuando se abre el avanzado
    setIsConfigModalOpen(false);
  };

  const closeAdvancedModal = () => {
    console.log('🔧 Cerrando modal avanzado...');
    setIsAdvancedModalOpen(false);
  };

  return (
    <ConfigModalContext.Provider value={{
      isConfigModalOpen,
      openConfigModal,
      closeConfigModal,
      isAdvancedModalOpen,
      openAdvancedModal,
      closeAdvancedModal
    }}>
      {children}
    </ConfigModalContext.Provider>
  );
};

export const useConfigModal = (): ConfigModalContextType => {
  const context = useContext(ConfigModalContext);
  if (!context) {
    throw new Error('useConfigModal debe ser usado dentro de ConfigModalProvider');
  }
  return context;
};