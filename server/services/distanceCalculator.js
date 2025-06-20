// services/distanceCalculator.js - Alternative distance calculation without Google API
/**
 * Calculate distance between two points using Haversine formula
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} Distance in meters
 */
export function calculateDistance(point1, point2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.lat * Math.PI) / 180;
  const φ2 = (point2.lat * Math.PI) / 180;
  const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
  const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
           Math.cos(φ1) * Math.cos(φ2) *
           Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Estimate travel time based on distance (very rough approximation)
 * @param {number} distance - Distance in meters
 * @param {string} mode - Transport mode ('driving', 'walking', etc.)
 * @returns {number} Estimated time in seconds
 */
export function estimateTravelTime(distance, mode = 'driving') {
  // Rough speed estimates
  const speeds = {
    driving: 30, // km/h average in city traffic
    walking: 5,  // km/h
    transit: 25  // km/h average with stops
  };
  
  const speedKmh = speeds[mode] || speeds.driving;
  const distanceKm = distance / 1000;
  const timeHours = distanceKm / speedKmh;
  
  return Math.round(timeHours * 3600); // Convert to seconds
}

/**
 * Create a mock distance matrix using Haversine formula
 * @param {Array} places - Array of place objects with location {lat, lng}
 * @returns {Object} Mock distance matrix in Google's format
 */
export function createMockDistanceMatrix(places) {
  const rows = places.map(origin => ({
    elements: places.map(destination => {
      const distance = calculateDistance(origin.location, destination.location);
      const duration = estimateTravelTime(distance);
      
      return {
        distance: {
          text: `${(distance / 1000).toFixed(1)} km`,
          value: Math.round(distance)
        },
        duration: {
          text: `${Math.round(duration / 60)} min`,
          value: duration
        },
        status: 'OK'
      };
    })
  }));
  
  return {
    destination_addresses: places.map(p => p.name),
    origin_addresses: places.map(p => p.name),
    rows: rows,
    status: 'OK'
  };
}
