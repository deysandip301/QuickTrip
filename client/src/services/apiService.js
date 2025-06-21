// services/apiService.js

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export const tripJourney = async (params) => {
  try {
    const response = await fetch(`${API_URL}/trip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await response.json();

    if (!response.ok) {
      // Enhanced error handling with specific error types
      let errorMessage = data.message || 'Failed to fetch journey';
      let errorType = 'GENERAL';
      
      if (response.status === 403 && data.message?.includes('API key')) {
        errorType = 'API_KEY';
        errorMessage = 'Google Maps API key issue. Please check your API configuration.';
      } else if (response.status === 403 && data.message?.includes('REQUEST_DENIED')) {
        errorType = 'API_PERMISSIONS';
        errorMessage = 'Some Google Maps APIs are not enabled. Please enable all required APIs.';
      } else if (response.status === 429) {
        errorType = 'QUOTA_EXCEEDED';
        errorMessage = 'API quota exceeded. Please try again later.';
      } else if (response.status >= 500) {
        errorType = 'SERVER_ERROR';
        errorMessage = 'Server error occurred. Please try again.';
      }
      
      const error = new Error(errorMessage);
      error.type = errorType;
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('API Service Error:', error);
    
    // Network or connection errors
    if (!error.type) {
      error.type = 'NETWORK_ERROR';
      error.message = error.message || 'Failed to connect to the server. Please ensure the backend is running.';
    }
    
    throw error;
  }
};

// Helper function to generate Google Maps fallback URLs
export const generateMapsFallbackLinks = (journey) => {
  if (!journey || journey.length === 0) return null;
  
  const stops = journey.filter(item => !item.isTravelLeg);
  
  if (stops.length === 0) return null;
  
  // Single location
  if (stops.length === 1) {
    const stop = stops[0];
    return {
      type: 'single',
      url: `https://www.google.com/maps/search/?api=1&query=${stop.location.lat},${stop.location.lng}`,
      title: `View ${stop.name} on Google Maps`
    };
  }
  
  // Multiple locations - full route
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1);
  
  let routeUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.location.lat},${origin.location.lng}&destination=${destination.location.lat},${destination.location.lng}`;
  
  if (waypoints.length > 0) {
    const waypointStr = waypoints.map(stop => `${stop.location.lat},${stop.location.lng}`).join('|');
    routeUrl += `&waypoints=${waypointStr}`;
  }
  
  routeUrl += '&travelmode=driving';
  
  // Individual location links
  const locationLinks = stops.map((stop, index) => ({
    name: stop.name,
    url: `https://www.google.com/maps/search/?api=1&query=${stop.location.lat},${stop.location.lng}&query_place_id=${stop.placeId || ''}`,
    isStart: index === 0,
    isEnd: index === stops.length - 1
  }));
  
  return {
    type: 'route',
    routeUrl,
    locationLinks,
    title: `View ${stops.length}-stop journey on Google Maps`
  };
};
