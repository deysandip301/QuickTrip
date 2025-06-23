// utils/geolocation.js
// Utility functions for handling device geolocation

/**
 * Get the user's current location using the Geolocation API
 * @param {Object} options - Geolocation options
 * @returns {Promise<{lat: number, lng: number}>} - Promise resolving to coordinates
 */
export const getCurrentLocation = (options = {}) => {
  return new Promise((resolve, reject) => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 seconds timeout
      maximumAge: 300000, // 5 minutes cache
      ...options
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({
          lat: latitude,
          lng: longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let errorMessage = 'Unable to get location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
          default:
            errorMessage = 'An unknown error occurred while getting location';
        }
        
        reject(new Error(errorMessage));
      },
      defaultOptions
    );
  });
};

/**
 * Watch the user's location for changes
 * @param {Function} onSuccess - Callback for successful location updates
 * @param {Function} onError - Callback for location errors
 * @param {Object} options - Geolocation options
 * @returns {number} - Watch ID that can be used to clear the watch
 */
export const watchLocation = (onSuccess, onError, options = {}) => {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported by this browser'));
    return null;
  }

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 60000, // 1 minute cache for watching
    ...options
  };

  return navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      onSuccess({
        lat: latitude,
        lng: longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      });
    },
    onError,
    defaultOptions
  );
};

/**
 * Clear a location watch
 * @param {number} watchId - The watch ID returned by watchLocation
 */
export const clearLocationWatch = (watchId) => {
  if (watchId && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
};

/**
 * Check if the browser supports geolocation
 * @returns {boolean} - True if geolocation is supported
 */
export const isGeolocationSupported = () => {
  return 'geolocation' in navigator;
};

/**
 * Get a fallback location based on timezone or other heuristics
 * @returns {Object} - Default coordinates for common locations
 */
export const getFallbackLocation = () => {
  // Try to determine location based on timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const timezoneToLocation = {
    'America/New_York': { lat: 40.7128, lng: -74.0060, city: 'New York' },
    'America/Los_Angeles': { lat: 34.0522, lng: -118.2437, city: 'Los Angeles' },
    'America/Chicago': { lat: 41.8781, lng: -87.6298, city: 'Chicago' },
    'Europe/London': { lat: 51.5074, lng: -0.1278, city: 'London' },
    'Europe/Paris': { lat: 48.8566, lng: 2.3522, city: 'Paris' },
    'Europe/Berlin': { lat: 52.5200, lng: 13.4050, city: 'Berlin' },
    'Asia/Tokyo': { lat: 35.6762, lng: 139.6503, city: 'Tokyo' },
    'Asia/Shanghai': { lat: 31.2304, lng: 121.4737, city: 'Shanghai' },
    'Asia/Kolkata': { lat: 22.5726, lng: 88.3639, city: 'Kolkata' },
    'Asia/Mumbai': { lat: 19.0760, lng: 72.8777, city: 'Mumbai' },
    'Asia/Bangalore': { lat: 12.9716, lng: 77.5946, city: 'Bangalore' },
    'Australia/Sydney': { lat: -33.8688, lng: 151.2093, city: 'Sydney' },
    'Australia/Melbourne': { lat: -37.8136, lng: 144.9631, city: 'Melbourne' }
  };

  return timezoneToLocation[timezone] || { 
    lat: 12.9716, 
    lng: 77.5946, 
    city: 'Bangalore' // Default fallback
  };
};

/**
 * Smart location detection with fallback
 * Tries to get user location, falls back to timezone-based location
 * @param {Object} options - Geolocation options
 * @returns {Promise<{lat: number, lng: number, source: string}>}
 */
export const getSmartLocation = async (options = {}) => {
  try {
    const location = await getCurrentLocation(options);
    return {
      ...location,
      source: 'geolocation',
      success: true
    };
  } catch (error) {
    console.warn('Geolocation failed, using fallback:', error.message);
    const fallback = getFallbackLocation();
    return {
      ...fallback,
      source: 'timezone-fallback',
      success: false,
      error: error.message
    };
  }
};
