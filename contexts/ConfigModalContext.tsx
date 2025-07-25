// contexts/ConfigModalContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ConfigModalContextType {
  isConfigModalOpen: boolean;
  openConfigModal: () => void;
  closeConfigModal: () => void;
}

const ConfigModalContext = createContext<ConfigModalContextType | undefined>(undefined);

export const ConfigModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const openConfigModal = () => {
    console.log('🔧 Abriendo modal de configuración...');
    setIsConfigModalOpen(true);
  };

  const closeConfigModal = () => {
    console.log('🔧 Cerrando modal de configuración...');
    setIsConfigModalOpen(false);
  };

  return (
    <ConfigModalContext.Provider value={{
      isConfigModalOpen,
      openConfigModal,
      closeConfigModal
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