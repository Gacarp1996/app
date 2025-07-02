import React, { createContext, useContext } from 'react';

export type Theme = 'exteriores'; // Solo tema oscuro

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Siempre usa tema oscuro
  const theme: Theme = 'exteriores';

  // Función vacía para mantener compatibilidad
  const toggleTheme = () => {
    // No hace nada - el tema siempre es oscuro
    console.log('Cambio de tema deshabilitado - siempre modo oscuro');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};