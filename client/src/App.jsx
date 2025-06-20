import React, { useState } from 'react';
import Controls from './components/Controls';
import MapDisplay from './components/MapDisplay';
import JourneyList from './components/JourneyList';
import { APIProvider } from '@vis.gl/react-google-maps';
import { saveJourney } from './services/firebase';
import { tripJourney } from './services/apiService';
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
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong</h2>
            <p className="text-gray-700 mb-4">An unexpected error occurred. Please refresh the page to try again.</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
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
  const [journey, setJourney] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [center, setCenter] = useState({ lat: 12.9716, lng: 77.5946 }); // Default to Bangalore

  const handleSaveJourney = async () => {
    if (journey.length > 0) {
      try {
        await saveJourney(journey);
        alert('Journey saved successfully!');
      } catch (err) {
        console.error("Failed to save journey:", err);
        setError('Failed to save journey. Please try again.');
      }
    }
  };

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  
  // If API key is missing, show a simplified version without maps
  if (!apiKey) {
    return <AppWithoutMaps 
      journey={journey}
      setJourney={setJourney}
      loading={loading}
      setLoading={setLoading}
      error={error}
      setError={setError}
      setCenter={setCenter}
      handleSaveJourney={handleSaveJourney}
    />;
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">QuickTrip</h1>
                  <p className="text-sm text-gray-500">Your intelligent city guide</p>
                </div>
              </div>
              
              {journey.length > 0 && !loading && (
                <button 
                  onClick={handleSaveJourney} 
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
                >
                  Save Journey
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Controls Panel */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6 h-full flex flex-col">
                <Controls 
                  setJourney={setJourney} 
                  setLoading={setLoading} 
                  setError={setError} 
                  setCenter={setCenter} 
                />
                <div className="flex-grow mt-6 overflow-y-auto">
                  <JourneyList journey={journey} loading={loading} error={error} />
                </div>
              </div>
            </div>

            {/* Map Panel */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-lg overflow-hidden map-container">
              <MapDisplay journey={journey} center={center} />
            </div>
          </div>
        </div>
      </div>
    </APIProvider>
  );
}

// Simplified version without Google Maps for when API key is not available
const AppWithoutMaps = ({ journey, setJourney, loading, setLoading, error, setError, setCenter, handleSaveJourney }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">QuickTrip</h1>
                <p className="text-sm text-gray-500">Your intelligent city guide</p>
              </div>
            </div>
            
            {journey.length > 0 && !loading && (
              <button 
                onClick={handleSaveJourney} 
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                Save Journey
              </button>
            )}
          </div>
        </div>
      </header>

      {/* API Key Warning */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <div className="text-amber-500">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-amber-800 font-semibold">Limited Features</h3>
              <p className="text-amber-700 text-sm">Google Maps API key is missing. Map features are disabled. Add VITE_GOOGLE_MAPS_API_KEY to your .env file to enable full functionality.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls Panel */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <SimpleControls 
                setJourney={setJourney} 
                setLoading={setLoading} 
                setError={setError} 
                setCenter={setCenter} 
              />
            </div>
          </div>

          {/* Journey List Panel */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <JourneyList journey={journey} loading={loading} error={error} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Simplified controls without map functionality
const SimpleControls = ({ setJourney, setLoading, setError, setCenter }) => {
  const [location, setLocation] = useState('Bangalore, India');
  const [preferences, setPreferences] = useState({
    cafe: true, park: true, museum: false, art_gallery: false, tourist_attraction: true
  });
  const [duration, setDuration] = useState(240);
  const [budget, setBudget] = useState(100);

  const handlePreferenceChange = (e) => {
    setPreferences({ ...preferences, [e.target.name]: e.target.checked });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setJourney([]);

    try {
      const data = await tripJourney({ location, preferences, duration, budget });
      if (data && data.length > 0) {
        const firstStop = data.find(item => !item.isTravelLeg);
        if (firstStop) {
          setCenter(firstStop.location);
        }
        setJourney(data);
      } else {
        setError('No suitable journey found. Please try adjusting your criteria.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const preferenceOptions = [
    { key: 'cafe', label: 'Cafés & Restaurants', icon: '☕', color: 'bg-amber-100 text-amber-800' },
    { key: 'park', label: 'Parks & Nature', icon: '🌳', color: 'bg-green-100 text-green-800' },
    { key: 'museum', label: 'Museums', icon: '🏛️', color: 'bg-purple-100 text-purple-800' },
    { key: 'art_gallery', label: 'Art Galleries', icon: '🎨', color: 'bg-pink-100 text-pink-800' },
    { key: 'tourist_attraction', label: 'Tourist Attractions', icon: '🏰', color: 'bg-blue-100 text-blue-800' }
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Plan Your Journey</h2>
        <p className="text-gray-600 text-sm">Discover amazing places tailored to your preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-grow flex flex-col space-y-6">
        {/* Location Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📍 Starting Location
          </label>
          <input 
            type="text" 
            value={location} 
            onChange={e => setLocation(e.target.value)}
            className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Enter city or address..."
            required 
          />
        </div>

        {/* Preferences */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            ✨ What interests you?
          </label>
          <div className="space-y-2">
            {preferenceOptions.map(option => (
              <label key={option.key} className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors duration-200 journey-card">
                <input
                  type="checkbox"
                  name={option.key}
                  checked={preferences[option.key]}
                  onChange={handlePreferenceChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-lg">{option.icon}</span>
                <span className="ml-2 text-sm font-medium text-gray-700 flex-grow">{option.label}</span>
                {preferences[option.key] && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
                    Selected
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ⏰ Duration ({Math.floor(duration / 60)}h {duration % 60}m)
          </label>
          <input
            type="range"
            min="60"
            max="480"
            step="30"
            value={duration}
            onChange={e => setDuration(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1h</span>
            <span>4h</span>
            <span>8h</span>
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            💰 Budget (₹{budget})
          </label>
          <input
            type="range"
            min="50"
            max="500"
            step="25"
            value={budget}
            onChange={e => setBudget(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>₹50</span>
            <span>₹250</span>
            <span>₹500</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          🚀 Create My Journey
        </button>
      </form>
    </div>
  );
};

function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export default Root;
