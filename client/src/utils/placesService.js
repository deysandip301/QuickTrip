// utils/placesService.js
// Google Places API utility functions using the Maps JavaScript API

/**
 * Search for places using Google Places Autocomplete Service
 * @param {string} query - Search query
 * @param {Object} location - Current location for bias
 * @returns {Promise<Array>} - Array of place predictions
 */
export const searchPlaces = async (query, location = null) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  return new Promise((resolve) => {
    // Check if Google Maps API is loaded
    if (!window.google?.maps?.places?.AutocompleteService) {
      console.warn('Google Maps Places API not loaded');
      resolve([]);
      return;
    }

    const service = new window.google.maps.places.AutocompleteService();
    
    const request = {
      input: query,
      types: ['establishment', 'geocode'],
    };

    // Add location bias if available
    if (location && location.lat && location.lng) {
      request.location = new window.google.maps.LatLng(location.lat, location.lng);
      request.radius = 50000; // 50km radius
    }

    service.getPlacePredictions(request, (predictions, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
        const results = predictions.map(prediction => ({
          id: prediction.place_id,
          description: prediction.description,
          mainText: prediction.structured_formatting?.main_text || prediction.description,
          secondaryText: prediction.structured_formatting?.secondary_text || '',
          types: prediction.types || []
        }));
        resolve(results);
      } else {
        if (status !== window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          console.warn('Places search failed:', status);
        }
        resolve([]);
      }
    });
  });
};

/**
 * Get place details using place ID
 * @param {string} placeId - Google Place ID
 * @returns {Promise<Object>} - Place details with coordinates
 */
export const getPlaceDetails = async (placeId) => {
  return new Promise((resolve, reject) => {
    // Check if Google Maps API is loaded
    if (!window.google?.maps?.places) {
      reject(new Error('Google Maps Places API not loaded'));
      return;
    }

    // Create a map element (required for PlacesService but can be hidden)
    const map = new window.google.maps.Map(document.createElement('div'));
    const service = new window.google.maps.places.PlacesService(map);

    const request = {
      placeId: placeId,
      fields: ['place_id', 'name', 'formatted_address', 'geometry', 'types']
    };

    service.getDetails(request, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
        const result = {
          id: place.place_id,
          name: place.name,
          address: place.formatted_address,
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          },
          types: place.types || []
        };
        resolve(result);
      } else {
        reject(new Error(`Place details not found: ${status}`));
      }
    });
  });
};

/**
 * Search for nearby places of specific types
 * @param {Object} location - Center location {lat, lng}
 * @param {number} radius - Search radius in meters
 * @param {Array} types - Array of place types
 * @returns {Promise<Array>} - Array of nearby places
 */
export const searchNearbyPlaces = async (location, radius = 5000, types = []) => {
  return new Promise((resolve) => {
    // Check if Google Maps API is loaded
    if (!window.google?.maps?.places) {
      console.warn('Google Maps Places API not loaded');
      resolve([]);
      return;
    }

    // Create a map element (required for PlacesService but can be hidden)
    const map = new window.google.maps.Map(document.createElement('div'));
    const service = new window.google.maps.places.PlacesService(map);

    const request = {
      location: new window.google.maps.LatLng(location.lat, location.lng),
      radius: radius,
      types: types.length > 0 ? types : undefined
    };

    service.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        const places = results.map(place => ({
          id: place.place_id,
          name: place.name,
          address: place.vicinity,
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          },
          rating: place.rating,
          types: place.types || [],
          priceLevel: place.price_level
        }));
        resolve(places);
      } else {
        console.warn('Nearby search failed:', status);
        resolve([]);
      }
    });
  });
};

/**
 * Debounce function for search input
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};
