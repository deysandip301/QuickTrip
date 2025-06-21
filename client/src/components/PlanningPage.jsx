import React, { useState } from 'react';
import { tripJourney } from '../services/apiService';
import MapPointSelectorModal from '../components/MapPointSelectorModal';
// CSS imported in App.jsx

// Utility function to calculate distance between two points in kilometers
const calculateDistance = (point1, point2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLon = (point2.lng - point1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const PlanningPage = ({ 
  mode, 
  onBack, 
  onJourneyGenerated, 
  setLoading, 
  setError, 
  loading, 
  error, 
  setCenter 
}) => {
  const [location, setLocation] = useState('Bangalore, India');
  const [preferences, setPreferences] = useState({
    cafe: true, 
    park: true, 
    museum: false, 
    art_gallery: false, 
    tourist_attraction: true
  });  const [duration, setDuration] = useState(360); // Increased default to 6 hours
  const [budget, setBudget] = useState(200); // Increased default budget
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activePointSelector, setActivePointSelector] = useState(null); // 'start' or 'end'
  const preferenceOptions = [
    { key: 'cafe', label: 'Cafés & Restaurants', icon: '☕' },
    { key: 'park', label: 'Parks & Nature', icon: '🌳' },
    { key: 'museum', label: 'Museums & History', icon: '🏛️' },
    { key: 'art_gallery', label: 'Art & Culture', icon: '🎨' },
    { key: 'tourist_attraction', label: 'Attractions & Sights', icon: '🌟' },
    { key: 'shopping_mall', label: 'Shopping Centers', icon: '🛍️' },
    { key: 'amusement_park', label: 'Entertainment', icon: '🎢' },
    { key: 'zoo', label: 'Wildlife & Zoos', icon: '🦁' },
  ];

  const handlePreferenceChange = (key) => {
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let requestData = { 
        location, 
        preferences, 
        duration, 
        budget
      };      if (mode === 'currentLocation') {
        // Get current location
        if (navigator.geolocation) {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              enableHighAccuracy: true,
              maximumAge: 300000
            });
          });
          const startPointCoords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          requestData.startPoint = startPointCoords;
          // For current location mode, we let the API create a circular route
          // that starts and ends near the current location, but don't set endPoint
          // to the exact same coordinates to avoid same start/end point issue
          requestData.mode = 'circular'; // Indicate this is a circular journey
          // Pass coordinates as location for API processing
          requestData.location = `${startPointCoords.lat},${startPointCoords.lng}`;
        }
      } else if (mode === 'customRoute') {
        if (!startPoint || !endPoint) {
          setError('Please select both start and end points for custom route.');
          setLoading(false);
          return;
        }
        
        // Check if start and end points are too close (within ~100 meters)
        const distance = calculateDistance(startPoint, endPoint);
        if (distance < 0.1) {
          setError('Start and end points are too close. Please select different locations.');
          setLoading(false);
          return;
        }
        
        requestData.startPoint = startPoint;
        requestData.endPoint = endPoint;
        requestData.mode = 'point-to-point';
        // Pass start point coordinates as location for API processing
        requestData.location = `${startPoint.lat},${startPoint.lng}`;
      }
      
      const data = await tripJourney(requestData);
      if (data && data.length > 0) {
        const firstStop = data.find(item => !item.isTravelLeg);
        if (firstStop) {
          setCenter(firstStop.location);
        }
        onJourneyGenerated(data);
      } else {
        setError('No suitable journey found. Please try adjusting your criteria.');
      }
    } catch (err) {
      console.error('Journey planning error:', err);
      let userFriendlyMessage = err.message;
      if (err.response && err.response.data && err.response.data.error) {
        userFriendlyMessage = err.response.data.error;
      }
      setError(`Failed to plan journey: ${userFriendlyMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    if (navigator.geolocation) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: true,
            maximumAge: 300000
          });
        });
        
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
          );
          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            setLocation(data.results[0].formatted_address);
          } else {
            setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        } catch (error) {
          console.error('Reverse geocoding failed:', error);
          setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setError('Could not get your location. Please enter manually or check location permissions.');
      }
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  };
  return (
    <div className="planning-container">
      {/* Header */}
      <div className="planning-header">
        <button
          onClick={onBack}
          className="planning-back-button"
        >
          <svg className="planning-back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Home</span>
        </button>
        
        <div className="planning-title-section">
          <div className="planning-icon-container">
            <span className="planning-icon">
              {mode === 'currentLocation' ? '📍' : '🎯'}
            </span>
          </div>
          <div>
            <h1 className="planning-title">
              {mode === 'currentLocation' ? 'Current Location Journey' : 'Custom Route Journey'}
            </h1>
            <p className="planning-subtitle">
              {mode === 'currentLocation' 
                ? 'We\'ll create an amazing journey starting from your current location' 
                : 'Select your start and end points, then customize your journey'
              }            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="planning-error">
          <div className="planning-error-content">
            <svg className="planning-error-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="planning-error-text">{error}</p>
          </div>
        </div>
      )}      {/* Planning Form */}
      <div className="planning-form-container">
        <form onSubmit={handleSubmit} className="planning-form">
          {/* Location Section - Only for Current Location Mode */}
          {mode === 'currentLocation' && (
            <div className="planning-section">
              <h3 className="planning-section-title">
                <span className="planning-section-icon">📍</span>
                <span>Location</span>
              </h3>
              
              <div className="planning-location-row">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="planning-location-input"
                  placeholder="Enter your starting city or area..."
                  required
                />
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="planning-current-location-btn"
                >
                  <svg className="planning-current-location-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span>Current</span>
                </button>
              </div>
            </div>
          )}

          {/* Custom Route Section - Only for Custom Route Mode */}
          {mode === 'customRoute' && (
            <div className="planning-section">
              <h3 className="planning-section-title">
                <span className="planning-section-icon">🗺️</span>
                <span>Route Points</span>
              </h3>
              
              <div className="planning-route-points">                <button
                  type="button"
                  onClick={() => {
                    setActivePointSelector('start');
                    setIsModalOpen(true);
                  }}
                  className="planning-route-selector start"
                >
                  <div className="planning-route-selector-icon">
                    <span className="planning-route-marker start">A</span>
                  </div>
                  <div className="planning-route-selector-content">
                    <span className="planning-route-selector-title">
                      {startPoint ? 'Starting Point Selected' : 'Select Starting Point'}
                    </span>
                    <span className="planning-route-selector-subtitle">
                      {startPoint ? `${startPoint.lat.toFixed(4)}, ${startPoint.lng.toFixed(4)}` : 'Click to select on map'}
                    </span>
                  </div>
                  <svg className="planning-route-selector-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <div className="planning-route-connector">
                  <div className="planning-route-line"></div>
                  <div className="planning-route-dots">
                    <div className="planning-route-dot"></div>
                    <div className="planning-route-dot"></div>
                    <div className="planning-route-dot"></div>
                  </div>
                </div>                <button
                  type="button"
                  onClick={() => {
                    setActivePointSelector('end');
                    setIsModalOpen(true);
                  }}
                  className="planning-route-selector end"
                >
                  <div className="planning-route-selector-icon">
                    <span className="planning-route-marker end">B</span>
                  </div>
                  <div className="planning-route-selector-content">
                    <span className="planning-route-selector-title">
                      {endPoint ? 'Ending Point Selected' : 'Select Ending Point'}
                    </span>
                    <span className="planning-route-selector-subtitle">
                      {endPoint ? `${endPoint.lat.toFixed(4)}, ${endPoint.lng.toFixed(4)}` : 'Click to select on map'}
                    </span>
                  </div>
                  <svg className="planning-route-selector-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              
              {mode === 'customRoute' && (!startPoint || !endPoint) && (
                <div className="planning-route-warning">
                  <svg className="planning-warning-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Please select both starting and ending points to continue</span>
                </div>
              )}
            </div>
          )}

          {/* Preferences Section */}
          <div className="planning-section">            <h3 className="planning-section-title">
              <span className="planning-section-icon">✨</span>
              <span>What interests you?</span>
            </h3>
            
            <div className="planning-preferences-grid">
              {preferenceOptions.map(option => (
                <label 
                  key={option.key} 
                  className="planning-preference-item"
                >
                  <input
                    type="checkbox"
                    checked={preferences[option.key] || false}
                    onChange={() => handlePreferenceChange(option.key)}
                    className="planning-preference-checkbox"
                  />
                  <span className="planning-preference-icon">{option.icon}</span>
                  <span className="planning-preference-label">{option.label}</span>
                  {preferences[option.key] && (
                    <span className="planning-preference-badge">
                      ✓
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>          {/* Duration and Budget */}
          <div className="planning-controls-grid">
            {/* Duration */}
            <div className="planning-section">
              <h3 className="planning-section-title">
                <span className="planning-section-icon">⏰</span>
                <span>Duration</span>
              </h3>
              
              <div className="planning-control-group">
                <div className="planning-control-header">
                  <span className="planning-control-label">Trip Duration</span>
                  <span className="planning-control-value">
                    {Math.floor(duration / 60)}h {duration % 60}m
                  </span>
                </div>
                
                <input
                  type="range"
                  min="60"
                  max="720"
                  step="30"
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value))}
                  className="planning-slider"
                />
                
                <div className="planning-slider-labels">
                  <span>1h</span>
                  <span>6h</span>
                  <span>12h</span>
                </div>
              </div>
            </div>            {/* Budget */}
            <div className="planning-section">
              <h3 className="planning-section-title">
                <span className="planning-section-icon">💰</span>
                <span>Budget</span>
              </h3>
              
              <div className="planning-control-group">
                <div className="planning-control-header">
                  <span className="planning-control-label">Total Budget</span>
                  <span className="planning-control-value budget">₹{budget}</span>
                </div>
                
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="50"
                  value={budget}
                  onChange={e => setBudget(parseInt(e.target.value))}
                  className="planning-slider"
                />
                
                <div className="planning-slider-labels">
                  <span>₹100</span>
                  <span>₹1000</span>
                  <span>₹2000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="planning-submit-section">
            <button
              type="submit"
              disabled={loading || (mode === 'customRoute' && (!startPoint || !endPoint))}
              className={`planning-submit-btn ${
                loading || (mode === 'customRoute' && (!startPoint || !endPoint))
                  ? 'disabled'
                  : 'enabled'
              }`}            >
              {loading ? (
                <div className="planning-submit-loading">
                  <div className="planning-loading-spinner"></div>
                  <span>Creating Your Perfect Journey...</span>
                </div>
              ) : mode === 'customRoute' && (!startPoint || !endPoint) ? (
                '📍 Please Select Start & End Points First'
              ) : (
                '🚀 Create My Perfect Journey'
              )}
            </button>
          </div>
        </form>
      </div>      {/* Map Point Selector Modal */}
      <MapPointSelectorModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActivePointSelector(null);
        }}
        setStartPoint={setStartPoint}
        setEndPoint={setEndPoint}
        setCenter={setCenter}
        activePointSelector={activePointSelector}
      />
    </div>
  );
};

export default PlanningPage;
