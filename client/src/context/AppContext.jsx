import { createContext, useContext } from 'react';

// Create App Context for sharing state between pages
export const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within a Layout component');
  }
  return context;
};
