import React, { useState, useEffect } from 'react';
import HomePage from './components/HomePage';
import PlanningPage from './components/PlanningPage';
import JourneyResultPage from './components/JourneyResultPage';
import SavedJourneys from './components/SavedJourneys';
import Header from './components/Header';
import Footer from './components/Footer';
import { APIProvider } from '@vis.gl/react-google-maps';
import { saveJourney, onAuthChange } from './services/firebase';
import AuthPage from './components/AuthPage';
import { getSmartLocation } from './utils/geolocation';

// Import all component CSS files
import './components/AuthPage.css';
import './components/HomePage.css';
import './components/PlanningPage.css';
import './components/JourneyResultPage.css';
import './components/JourneyList.css';
import './components/SavedJourneys.css';
import './components/MapDisplay.css';
import './components/MapPointSelector.css';
import './components/MapPointSelectorModal.css';
import './components/Controls.css';
import './components/Header.css';
import './components/Footer.css';
import './App.css';

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

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'planning', 'result', 'saved'
  const [journeyMode, setJourneyMode] = useState(null); // 'currentLocation' or 'customRoute'
  const [journey, setJourney] = useState([]);
  const [center, setCenter] = useState({ lat: 12.9716, lng: 77.5946 }); // Default to Bangalore
  const [locationLoading, setLocationLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedJourneySummary, setSavedJourneySummary] = useState(null); // For displaying saved journey stats

  // Initialize user location on app start
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        setLocationLoading(true);
        const locationData = await getSmartLocation({
          timeout: 8000, // 8 second timeout
          maximumAge: 600000 // 10 minutes cache
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
        // Keep default Bangalore coordinates
      } finally {
        setLocationLoading(false);
      }
    };

    initializeLocation();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);
  const navigateToPlanning = (mode) => {
    setJourneyMode(mode);
    setCurrentPage('planning');
    setError('');
    setSavedJourneySummary(null); // Reset saved journey summary
  };
  const navigateToHome = () => {
    setCurrentPage('home');
    setJourneyMode(null);
    setJourney([]);
    setError('');
    setSavedJourneySummary(null); // Reset saved journey summary
  };
  const navigateToResult = (journeyData) => {
    // Check if this is a saved journey with summary data or a regular journey array
    if (journeyData.isSavedJourney) {
      // It's a saved journey with summary data
      setJourney(journeyData.journey);
      setSavedJourneySummary(journeyData.summary);
      setCenter(journeyData.center);
    } else {
      // It's a regular journey array (newly generated)
      setJourney(journeyData);
      setSavedJourneySummary(null);
    }
    setCurrentPage('result');
  };
  const navigateToSaved = () => {
    setCurrentPage('saved');
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

  if (!user) {
    return <AuthPage />;
  }
  return (
    <ErrorBoundary>      <APIProvider 
        apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={['places', 'geometry', 'marker']}
        version="weekly"
      >
        <div className="app-layout">
          {/* Header */}
          <Header 
            user={user}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onNavigateHome={navigateToHome}
            onNavigateSaved={navigateToSaved}
          />

          {/* Main Content */}
          <main className="app-main">
            {currentPage === 'home' && (
              <HomePage onModeSelect={navigateToPlanning} />
            )}
            
            {currentPage === 'planning' && (
              <PlanningPage 
                mode={journeyMode}
                onBack={navigateToHome}
                onJourneyGenerated={navigateToResult}
                setLoading={setLoading}
                setError={setError}
                loading={loading}
                error={error}
                setCenter={setCenter}
              />
            )}
              {currentPage === 'result' && (
              <JourneyResultPage 
                journey={journey}
                onBack={navigateToHome}
                savedJourneySummary={savedJourneySummary}
                onSave={async (journeyData) => {
                  try {
                    await saveJourney(journeyData, user);
                    setError('');
                    alert('Journey saved successfully!');
                  } catch (err) {
                    console.error('Save error:', err);
                    setError('Failed to save journey. Please try again.');
                  }
                }}
                center={center}
                user={user}
              />
            )}
            
            {currentPage === 'saved' && (
              <SavedJourneys 
                user={user}
                onBack={navigateToHome}
                onJourneySelect={navigateToResult}
              />
            )}
          </main>

          {/* Footer */}
          <Footer />
        </div>
      </APIProvider>
    </ErrorBoundary>
  );
}

function Root() {
  return <App />;
}

export default Root;
