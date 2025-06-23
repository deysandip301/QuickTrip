import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Header, Footer } from './index';
import { APIProvider } from '@vis.gl/react-google-maps';
import { onAuthChange } from '../../services/firebase';
import { getSmartLocation } from '../../utils/geolocation';
import { AppContext } from '../../context/AppContext';
import { savePageState, getPreviousPageState, STORAGE_KEYS } from '../../utils/stateUtils';

// Import CSS files from their new locations
import '../../pages/HomePage.css';
import '../../pages/PlanningPage.css';
import '../../pages/JourneyResultPage.css';
import '../../pages/SavedJourneys.css';
import '../../pages/ErrorPage.css';
import '../../features/auth/AuthPage.css';
import '../../features/journey/JourneyList.css';
import '../../features/map/MapDisplay.css';
import '../../features/map/MapPointSelector.css';
import '../../features/map/MapPointSelectorModal.css';
import '../../features/planning/Controls.css';
import '../../components/ui/LocationPrompt.css';
import './Header.css';
import './Footer.css';
import '../../App.css';
import './Footer.css';
import '../../App.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="error-boundary-title">Oops! Something went wrong</h2>
            <p className="error-boundary-text">An unexpected error occurred. Please refresh the page to try again.</p>
            <button 
              onClick={() => window.location.reload()}
              className="error-boundary-button"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Layout = () => {
  // Global state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [journey, setJourney] = useState([]);
  const [center, setCenter] = useState({ lat: 12.9716, lng: 77.5946 }); // Default to Bangalore
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedJourneySummary, setSavedJourneySummary] = useState(null);
  const [pendingJourneyToSave, setPendingJourneyToSave] = useState(null);  const navigate = useNavigate();
  const location = useLocation();

  // Load persisted state on mount
  useEffect(() => {
    const loadPersistedState = () => {
      try {
        // Load journey data
        const savedJourney = sessionStorage.getItem(STORAGE_KEYS.JOURNEY);
        if (savedJourney) {
          setJourney(JSON.parse(savedJourney));
        }

        // Load center
        const savedCenter = sessionStorage.getItem(STORAGE_KEYS.CENTER);
        if (savedCenter) {
          setCenter(JSON.parse(savedCenter));
        }

        // Load summary
        const savedSummary = sessionStorage.getItem(STORAGE_KEYS.SUMMARY);
        if (savedSummary) {
          setSavedJourneySummary(JSON.parse(savedSummary));
        }
      } catch (error) {
        console.warn('Failed to load persisted state:', error);
      }
    };

    loadPersistedState();
  }, []); // Only run on mount

  // Persist state when it changes
  useEffect(() => {
    if (journey.length > 0) {
      sessionStorage.setItem(STORAGE_KEYS.JOURNEY, JSON.stringify(journey));
    }
  }, [journey]);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEYS.CENTER, JSON.stringify(center));
  }, [center]);

  useEffect(() => {
    if (savedJourneySummary) {
      sessionStorage.setItem(STORAGE_KEYS.SUMMARY, JSON.stringify(savedJourneySummary));
    }
  }, [savedJourneySummary]);

  // Initialize user location on app start
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const locationData = await getSmartLocation({
          timeout: 8000,
          maximumAge: 600000
        });
        
        setCenter({
          lat: locationData.lat,
          lng: locationData.lng
        });
        
        if (locationData.success) {
          console.log('✅ Location detected:', locationData.city || 'Current Location');
        } else {
          console.log('📍 Using fallback location:', locationData.city);
        }
      } catch (error) {
        console.warn('❌ Location detection failed, using default:', error);
      }
    };

    initializeLocation();
  }, []);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);
  // Navigation functions that preserve state and use history
  const navigateToPlanning = (mode) => {
    setError('');
    setSavedJourneySummary(null);
    // Store current location for back navigation
    navigate(`/planning/${mode}`, { 
      state: { 
        from: location.pathname,
        preserveJourney: true 
      } 
    });
  };

  const navigateToHome = () => {
    // Clear journey state when going home
    setJourney([]);
    setError('');
    setSavedJourneySummary(null);
    sessionStorage.removeItem(STORAGE_KEYS.JOURNEY);
    sessionStorage.removeItem(STORAGE_KEYS.SUMMARY);
    navigate('/');
  };
  const navigateToResult = (journeyData) => {
    // Save current page state before navigation
    savePageState(location.pathname, {
      journey,
      center,
      savedJourneySummary,
      error,
      timestamp: Date.now()
    });

    // Store the journey data in state
    if (journeyData.isSavedJourney) {
      setJourney(journeyData.journey);
      setSavedJourneySummary(journeyData.summary);
      setCenter(journeyData.center);
    } else {
      setJourney(journeyData);
      setSavedJourneySummary(null);
    }
    
    // Navigate to result page with state for back navigation
    navigate('/journey-result', {
      state: {
        from: location.pathname,
        journeyData: journeyData,
        timestamp: Date.now()
      }
    });
  };

  const navigateToSaved = () => {
    if (!user) {
      // Store where user wanted to go and redirect to auth
      navigate('/auth', { 
        state: { 
          returnTo: '/saved-journeys',
          from: location.pathname 
        } 
      });
      return;
    }
    navigate('/saved-journeys', {
      state: {
        from: location.pathname
      }
    });
  };

  const navigateToAuth = (journeyToSave = null, returnTo = '/') => {
    if (journeyToSave) {
      setPendingJourneyToSave(journeyToSave);
    }
    navigate('/auth', { 
      state: { 
        returnTo,
        from: location.pathname,
        pendingJourney: journeyToSave 
      } 
    });
  };  const handleAuthSuccess = () => {
    const returnTo = location.state?.returnTo || '/';
    
    // If there's a pending journey to save, handle it
    if (pendingJourneyToSave) {
      setPendingJourneyToSave(null);
    }
    
    // Navigate back to where the user came from or intended destination
    navigate(returnTo, {
      state: {
        authSuccess: true,
        from: '/auth'
      }
    });
  };

  // Enhanced back navigation that preserves state
  const navigateBack = () => {
    // Check if we have navigation state that tells us where to go back
    const fromPath = location.state?.from;
    
    if (fromPath) {
      // Try to get the previous page state
      const previousState = getPreviousPageState(location.pathname);
      
      if (previousState && previousState.path === fromPath) {
        // Restore the previous page state
        if (previousState.journey && previousState.journey.length > 0) {
          setJourney(previousState.journey);
        }
        if (previousState.center) {
          setCenter(previousState.center);
        }
        if (previousState.savedJourneySummary) {
          setSavedJourneySummary(previousState.savedJourneySummary);
        }        if (previousState.error) {
          setError(previousState.error);
        }
      }
      
      // Navigate back to the previous page
      navigate(fromPath, { replace: true });
    } else {
      // Fallback: use browser back or go home
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }
  };

  // Context value that all pages can access
  const contextValue = {
    // State
    user,
    authLoading,
    journey,
    center,
    loading,
    error,
    savedJourneySummary,
    pendingJourneyToSave,
    
    // Setters
    setJourney,
    setCenter,
    setLoading,
    setError,
    setSavedJourneySummary,
    setPendingJourneyToSave,    
    // Navigation functions
    navigateToPlanning,
    navigateToHome,
    navigateToResult,
    navigateToSaved,
    navigateToAuth,
    handleAuthSuccess,
    navigateBack
  };

  if (authLoading) {
    return (
      <div className="auth-loading-container">
        <div className="auth-loading-content">
          <div className="auth-loading-spinner"></div>
          <p className="auth-loading-text">Loading QuickTrip...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <APIProvider 
        apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={['places', 'geometry', 'marker']}
        version="weekly"
      >
        <AppContext.Provider value={contextValue}>
          <div className="app-layout">
            {/* Header */}
            <Header 
              user={user}
              currentPage={location.pathname}
              onNavigateHome={navigateToHome}
              onNavigateSaved={navigateToSaved}
              onNavigateAuth={() => navigateToAuth()}
            />

            {/* Main Content */}
            <main className="app-main">
              <Outlet />
            </main>

            {/* Footer */}
            <Footer />
          </div>
        </AppContext.Provider>
      </APIProvider>
    </ErrorBoundary>
  );
};

export default Layout;
