// utils/urlState.js
/**
 * Utilities for persisting state in URL parameters and session storage
 */

// Compress journey data for URL storage
export const compressJourneyData = (journeyData) => {
  try {
    const compressed = {
      j: journeyData.journey?.map(item => ({
        n: item.name,
        l: item.location,
        t: item.types,
        r: item.rating,
        p: item.placeId,
        // Only include photos/reviews reference for size optimization
        ph: item.photos?.length || 0,
        rv: item.reviews?.length || 0
      })),
      c: journeyData.center,
      s: journeyData.summary
    };
    return btoa(JSON.stringify(compressed));
  } catch (error) {
    console.warn('Failed to compress journey data:', error);
    return null;
  }
};

// Decompress journey data from URL
export const decompressJourneyData = (compressedData) => {
  try {
    const compressed = JSON.parse(atob(compressedData));
    return {
      journey: compressed.j?.map(item => ({
        name: item.n,
        location: item.l,
        types: item.t,
        rating: item.r,
        placeId: item.p,
        // Note: photos/reviews would need to be fetched again
        photos: [],
        reviews: []
      })) || [],
      center: compressed.c,
      summary: compressed.s
    };
  } catch (error) {
    console.warn('Failed to decompress journey data:', error);
    return null;
  }
};

// Store journey data with both URL and session storage
export const storeJourneyInUrl = (journeyData, navigate, currentPath) => {
  const compressed = compressJourneyData(journeyData);
  if (compressed && compressed.length < 2000) { // URL length limit
    const searchParams = new URLSearchParams();
    searchParams.set('journey', compressed);
    navigate(`${currentPath}?${searchParams.toString()}`, { replace: true });
  }
  
  // Always store in session storage as backup
  sessionStorage.setItem('quicktrip_current_journey_full', JSON.stringify(journeyData));
};

// Load journey data from URL or session storage
export const loadJourneyFromUrl = (searchParams) => {
  const compressed = searchParams.get('journey');
  if (compressed) {
    const decompressed = decompressJourneyData(compressed);
    if (decompressed) {
      return decompressed;
    }
  }
  
  // Fallback to session storage
  try {
    const stored = sessionStorage.getItem('quicktrip_current_journey_full');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.warn('Failed to load journey from storage:', error);
    return null;
  }
};
