// utils/placeUtils.js
/**
 * Utility functions for place data handling and photo management
 */

/**
 * Ensures place object has photo URLs for display
 * @param {Object} place - Place object
 * @returns {Object} Place object with photo URLs
 */
export const ensurePlacePhotos = (place) => {
  if (!place) return place;
  
  // If photos exist but don't have URLs, generate them
  if (place.photos && place.photos.length > 0) {
    const photosWithUrls = place.photos.map(photo => {
      if (photo.url) {
        return photo; // Already has URL
      }
        // Generate URL from photo_reference if available
      if (photo.photo_reference) {
        // Note: In production, the API key should be handled server-side
        // This is a fallback for client-side photo display
        return {
          ...photo,
          url: photo.photo_reference // Store reference, URL generation handled by server
        };
      }
      
      return photo;
    });
    
    return {
      ...place,
      photos: photosWithUrls
    };
  }
  
  return place;
};

/**
 * Generates a fallback description for places without descriptions
 * @param {Object} place - Place object
 * @returns {string} Generated description
 */
export const generateFallbackDescription = (place) => {
  if (place.description) return place.description;
  
  const { types, rating } = place;
  
  // Simple description generation for backward compatibility
  if (types.includes('restaurant') || types.includes('cafe')) {
    return `A ${rating >= 4.0 ? 'highly-rated' : 'popular'} dining spot perfect for your journey.`;
  }
  
  if (types.includes('tourist_attraction') || types.includes('museum')) {
    return `An interesting ${types.includes('museum') ? 'museum' : 'attraction'} worth visiting during your trip.`;
  }
  
  if (types.includes('park') || types.includes('natural_feature')) {
    return `A beautiful natural space perfect for relaxation and sightseeing.`;
  }
  
  return `A ${rating >= 4.0 ? 'well-rated' : 'noteworthy'} place to visit on your journey.`;
};

/**
 * Enriches journey data with enhanced place information
 * @param {Array} journey - Journey array
 * @returns {Array} Enhanced journey array
 */
export const enrichJourneyPlaces = (journey) => {
  if (!Array.isArray(journey)) return journey;
  
  return journey.map(item => {
    if (item.isTravelLeg) return item;
    
    return {
      ...item,
      ...ensurePlacePhotos(item),
      description: item.description || generateFallbackDescription(item)
    };
  });
};

/**
 * Validates if a place has sufficient data for rich display
 * @param {Object} place - Place object
 * @returns {boolean} True if place has good data
 */
export const isRichPlace = (place) => {
  return !!(
    place &&
    place.name &&
    place.rating &&
    (place.photos?.length > 0 || place.description || place.reviews?.length > 0)
  );
};

export default {
  ensurePlacePhotos,
  generateFallbackDescription,
  enrichJourneyPlaces,
  isRichPlace
};
