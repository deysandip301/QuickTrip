// Application constants

// Storage keys for session/local storage
export const STORAGE_KEYS = {
  JOURNEY: 'quicktrip_journey',
  CENTER: 'quicktrip_center',
  SUMMARY: 'quicktrip_summary',
  USER_PREFERENCES: 'quicktrip_preferences'
};

// Default preferences for trip planning
export const DEFAULT_PREFERENCES = {
  cafe: true,
  park: true,
  museum: false,
  art_gallery: false,
  tourist_attraction: true,
  restaurant: true,
  shopping_mall: false,
  amusement_park: false
};

// Default location (Bangalore, India)
export const DEFAULT_LOCATION = {
  lat: 12.9716,
  lng: 77.5946
};

// API configuration
export const API_CONFIG = {
  TIMEOUT: 8000,
  MAX_AGE: 600000,
  DEFAULT_DURATION: 360, // 6 hours
  DEFAULT_BUDGET: 200
};

// Preference options for UI
export const PREFERENCE_OPTIONS = [
  { key: 'cafe', label: 'Cafes & Coffee', icon: '☕' },
  { key: 'park', label: 'Parks & Nature', icon: '🌳' },
  { key: 'museum', label: 'Museums', icon: '🏛️' },
  { key: 'art_gallery', label: 'Art Galleries', icon: '🎨' },
  { key: 'tourist_attraction', label: 'Tourist Spots', icon: '🗽' },
  { key: 'restaurant', label: 'Restaurants', icon: '🍽️' },
  { key: 'shopping_mall', label: 'Shopping', icon: '🛍️' },
  { key: 'amusement_park', label: 'Entertainment', icon: '🎢' }
];
