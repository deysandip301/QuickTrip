// Utility functions for time and distance formatting

/**
 * Converts minutes to a human-readable format (hours and minutes)
 * @param {number} totalMinutes - Total minutes
 * @returns {string} Formatted time string (e.g., "2h 30m", "45m")
 */
export const formatTime = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) return '0m';
  
  const roundedMinutes = Math.round(totalMinutes);
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  
  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
};

/**
 * Parses duration from various formats and returns minutes
 * @param {string|number|object} duration - Duration in various formats
 * @returns {number} Duration in minutes
 */
export const parseDuration = (duration) => {
  if (!duration) return 0;
  
  // If it's already a number (minutes)
  if (typeof duration === 'number') {
    return Math.round(duration);
  }
  
  // If it's a string like "5 mins", "12 min", "1 hour 30 mins"
  if (typeof duration === 'string') {
    // Extract all numbers followed by time units
    const hourMatch = duration.match(/(\d+)\s*h(?:our|r)?s?/i);
    const minuteMatch = duration.match(/(\d+)\s*m(?:in|inute)?s?/i);
    
    let totalMinutes = 0;
    
    if (hourMatch) {
      totalMinutes += parseInt(hourMatch[1]) * 60;
    }
    
    if (minuteMatch) {
      totalMinutes += parseInt(minuteMatch[1]);
    }
    
    // If no specific pattern found, try to extract any number
    if (totalMinutes === 0) {
      const numberMatch = duration.match(/(\d+)/);
      if (numberMatch) {
        totalMinutes = parseInt(numberMatch[1]);
      }
    }
    
    return Math.round(totalMinutes);
  }
  
  // If it's an object with value property (Google API format)
  if (typeof duration === 'object' && duration.value) {
    return Math.round(duration.value / 60); // Convert seconds to minutes
  }
  
  return 0;
};

/**
 * Formats travel time for display in journey legs
 * @param {string|number|object} duration - Duration in various formats
 * @returns {string} Formatted duration string
 */
export const formatTravelTime = (duration) => {
  const minutes = parseDuration(duration);
  return formatTime(minutes);
};

/**
 * Calculates total travel time from journey legs
 * @param {Array} journey - Journey array with travel legs
 * @returns {number} Total travel time in minutes
 */
export const calculateTotalTravelTime = (journey) => {
  return journey
    .filter(item => item.isTravelLeg)
    .reduce((total, leg) => total + parseDuration(leg.duration), 0);
};

/**
 * Parses distance from various formats and returns kilometers
 * @param {string|number|object} distance - Distance in various formats
 * @returns {number} Distance in kilometers
 */
export const parseDistance = (distance) => {
  if (!distance) return 0;
  
  // If it's already a number (kilometers)
  if (typeof distance === 'number') {
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }
  
  // If it's a string like "5 km", "1,200 m", "0.5 miles"
  if (typeof distance === 'string') {
    // Remove commas and normalize
    const normalizedDistance = distance.toLowerCase().replace(/,/g, '');
    
    // Try to match kilometers
    const kmMatch = normalizedDistance.match(/(\d+\.?\d*)\s*km/);
    if (kmMatch) {
      return Math.round(parseFloat(kmMatch[1]) * 100) / 100;
    }
    
    // Try to match meters
    const mMatch = normalizedDistance.match(/(\d+\.?\d*)\s*m(?:eter)?s?(?!\w)/);
    if (mMatch) {
      return Math.round(parseFloat(mMatch[1]) / 10) / 100; // Convert to km and round
    }
    
    // Try to match miles
    const milesMatch = normalizedDistance.match(/(\d+\.?\d*)\s*mi(?:le)?s?/);
    if (milesMatch) {
      return Math.round(parseFloat(milesMatch[1]) * 160.934) / 100; // Convert to km
    }
    
    // If no specific pattern found, try to extract any number and assume km
    const numberMatch = normalizedDistance.match(/(\d+\.?\d*)/);
    if (numberMatch) {
      return Math.round(parseFloat(numberMatch[1]) * 100) / 100;
    }
  }
  
  // If it's an object with value property (Google API format)
  if (typeof distance === 'object' && distance.value) {
    return Math.round((distance.value / 1000) * 100) / 100; // Convert meters to km
  }
  
  return 0;
};

/**
 * Formats distance for display
 * @param {number} totalKm - Total distance in kilometers
 * @returns {string} Formatted distance string (e.g., "12.5 km", "1.2 km")
 */
export const formatDistance = (totalKm) => {
  if (!totalKm || totalKm <= 0) return '0 km';
  
  if (totalKm < 1) {
    return `${Math.round(totalKm * 1000)} m`;
  } else {
    return `${totalKm} km`;
  }
};

/**
 * Calculates total distance from journey legs
 * @param {Array} journey - Journey array with travel legs
 * @returns {number} Total distance in kilometers
 */
export const calculateTotalDistance = (journey) => {
  return journey
    .filter(item => item.isTravelLeg)
    .reduce((total, leg) => total + parseDistance(leg.distance), 0);
};

/**
 * Generates a Google Maps route URL for the journey
 * @param {Array} journey - Journey array with stops
 * @returns {string} Google Maps URL
 */
export const generateGoogleMapsRoute = (journey) => {
  const stops = journey.filter(item => !item.isTravelLeg);
  
  if (stops.length < 2) return '';
  
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(1, -1);
  
  const baseUrl = 'https://www.google.com/maps/dir/';
  
  // Build the URL with coordinates or place names
  let url = baseUrl;
  
  // Add origin
  if (origin.location) {
    url += `${origin.location.lat},${origin.location.lng}/`;
  } else {
    url += `${encodeURIComponent(origin.name)}/`;
  }
  
  // Add waypoints
  waypoints.forEach(stop => {
    if (stop.location) {
      url += `${stop.location.lat},${stop.location.lng}/`;
    } else {
      url += `${encodeURIComponent(stop.name)}/`;
    }
  });
  
  // Add destination
  if (destination.location) {
    url += `${destination.location.lat},${destination.location.lng}`;
  } else {
    url += encodeURIComponent(destination.name);
  }
  
  return url;
};
