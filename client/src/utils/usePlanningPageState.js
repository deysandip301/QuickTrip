import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { savePageState, loadPageState } from './stateUtils';

// Custom hook for managing planning page state persistence
export const usePlanningPageState = (initialState) => {
  const location = useLocation();
  const planningPath = location.pathname;

  // Load saved state on initialization
  const loadSavedState = useCallback(() => {
    const savedState = loadPageState(planningPath);
    if (savedState && savedState.timestamp) {
      // Only load state if it's recent (within last hour)
      const hourAgo = Date.now() - (60 * 60 * 1000);
      if (savedState.timestamp > hourAgo) {
        console.log('🔄 Restoring planning page state:', savedState);
        return { ...initialState, ...savedState };
      }
    }
    return initialState;
  }, [planningPath, initialState]);

  const [state, setState] = useState(loadSavedState);

  // Save state to sessionStorage with debouncing
  const saveState = useCallback((stateToSave) => {
    // Debounce the save operation to avoid too many writes
    clearTimeout(saveState.timeout);
    saveState.timeout = setTimeout(() => {
      savePageState(planningPath, {
        ...stateToSave,
        timestamp: Date.now(),
        path: planningPath
      });
    }, 500);
  }, [planningPath]);

  // Enhanced setState that also saves to storage
  const setStateAndSave = useCallback((newState) => {
    setState(prevState => {
      const updatedState = typeof newState === 'function' ? newState(prevState) : newState;
      saveState(updatedState);
      return updatedState;
    });
  }, [saveState]);

  // Save state when state changes
  useEffect(() => {
    saveState(state);
  }, [state, saveState]);

  // Save state when component unmounts
  useEffect(() => {
    return () => {
      saveState(state);
    };
  }, [state, saveState]);

  return [state, setStateAndSave];
};
