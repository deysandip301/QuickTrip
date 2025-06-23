import React, { useState } from 'react';
import { getCurrentLocation } from '../utils/geolocation';

const LocationPrompt = ({ onLocationUpdate, onDismiss }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestLocation = async () => {
    setLoading(true);
    setError('');
    
    try {
      const location = await getCurrentLocation({
        timeout: 10000,
        enableHighAccuracy: true
      });
      
      onLocationUpdate(location);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="location-prompt-overlay">
      <div className="location-prompt-modal">
        <div className="location-prompt-content">
          <div className="location-icon">📍</div>
          <h3>Enable Location Access</h3>
          <p>
            Allow QuickTrip to access your location for a personalized experience. 
            We'll show nearby attractions and provide better travel recommendations.
          </p>
          
          {error && (
            <div className="location-error">
              <span>⚠️</span> {error}
            </div>
          )}
          
          <div className="location-prompt-actions">
            <button 
              onClick={handleRequestLocation}
              disabled={loading}
              className="location-allow-btn"
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Getting Location...
                </>
              ) : (
                <>
                  <span>📍</span>
                  Use My Location
                </>
              )}
            </button>
            
            <button 
              onClick={onDismiss}
              className="location-dismiss-btn"
              disabled={loading}
            >
              Maybe Later
            </button>
          </div>
          
          <div className="location-privacy-note">
            <small>
              🔒 Your location data is only used for map centering and is not stored or shared.
            </small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPrompt;
