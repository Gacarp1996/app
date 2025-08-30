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

const x = 5;

const ConfigModalContext = createContext<ConfigModalContextType | undefined>(undefined);

export const ConfigModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false);

  const openConfigModal = () => {
   
    setIsConfigModalOpen(true);
  };

  const closeConfigModal = () => {

    setIsConfigModalOpen(false);
  };

  const openAdvancedModal = () => {

    setIsAdvancedModalOpen(true);
    // Cerrar el modal principal cuando se abre el avanzado
    setIsConfigModalOpen(false);
  };

  const closeAdvancedModal = () => {

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