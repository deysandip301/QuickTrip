// State persistence utilities for maintaining page state across navigation

export const STORAGE_KEYS = {
  JOURNEY: 'quicktrip_current_journey',
  CENTER: 'quicktrip_current_center', 
  SUMMARY: 'quicktrip_journey_summary',
  PLANNING_STATE: 'quicktrip_planning_state',
  NAVIGATION_HISTORY: 'quicktrip_navigation_history'
};

// Save complete page state
export const savePageState = (pagePath, state) => {
  try {
    const timestamp = Date.now();
    const pageState = {
      ...state,
      timestamp,
      path: pagePath
    };
    sessionStorage.setItem(`${STORAGE_KEYS.PLANNING_STATE}_${pagePath}`, JSON.stringify(pageState));
    
    // Also save to navigation history
    const history = getNavigationHistory();
    const existingIndex = history.findIndex(item => item.path === pagePath);
    
    if (existingIndex >= 0) {
      history[existingIndex] = pageState;
    } else {
      history.push(pageState);
    }
    
    // Keep only last 5 pages in history
    if (history.length > 5) {
      history.splice(0, history.length - 5);
    }    sessionStorage.setItem(STORAGE_KEYS.NAVIGATION_HISTORY, JSON.stringify(history));
  } catch {
    // Failed to save page state
  }
};

// Load page state
export const loadPageState = (pagePath) => {
  try {    const saved = sessionStorage.getItem(`${STORAGE_KEYS.PLANNING_STATE}_${pagePath}`);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

// Get navigation history
export const getNavigationHistory = () => {
  try {
    const history = sessionStorage.getItem(STORAGE_KEYS.NAVIGATION_HISTORY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    return [];
  }
};

// Get previous page state
export const getPreviousPageState = (currentPath) => {
  const history = getNavigationHistory();
  const currentIndex = history.findIndex(item => item.path === currentPath);
  
  if (currentIndex > 0) {
    return history[currentIndex - 1];
  }
  
  // If no specific previous page, get the most recent one that's not current
  const filtered = history.filter(item => item.path !== currentPath);
  return filtered.length > 0 ? filtered[filtered.length - 1] : null;
};

// Clear page state
export const clearPageState = (pagePath) => {
  try {
    sessionStorage.removeItem(`${STORAGE_KEYS.PLANNING_STATE}_${pagePath}`);  } catch {
    // Failed to clear page state
  }
};

// Clear all state
export const clearAllState = () => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      sessionStorage.removeItem(key);
    });
    
    // Also clear page-specific states
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('quicktrip_planning_state_')) {
        sessionStorage.removeItem(key);
      }    }
  } catch {
    // Failed to clear all state
  }
};
