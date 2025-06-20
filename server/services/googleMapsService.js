// services/googleMapsService.js
// A dedicated module for all interactions with Google Maps APIs.

import { Client } from '@googlemaps/google-maps-services-js';
import { createMockDistanceMatrix } from './distanceCalculator.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = new Client({});
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

console.log('Google Maps API Key:', API_KEY);

// Validate API key on startup
if (!API_KEY || API_KEY === 'YOUR_ACTUAL_API_KEY_HERE') {
  console.error('❌ Google Maps API key is missing or not configured properly!');
  console.error('Please set a valid GOOGLE_MAPS_API_KEY in your .env file');
  console.error('Visit https://console.cloud.google.com/ to get your API key');
}

// Price level mapping ($, $$, $$$) to a numeric value for budget calculations
const PRICE_LEVEL_MAP = { 1: 15, 2: 40, 3: 75, 4: 125 };

/**
 * Fetches a list of places based on a location and user preferences.
 * @param {string} location - The starting address or city.
 * @param {object} preferences - An object with place types as keys (e.g., { cafe: true }).
 * @returns {Promise<Array>} A list of place objects.
 */
export const getPlaces = async (location, preferences) => {
  try {
    // 1. Geocode the location string to get latitude and longitude
    const geocodeResponse = await client.geocode({
      params: { address: location, key: API_KEY },
    });
    
    if (geocodeResponse.data.results.length === 0) {
      throw new Error('Location not found');
    }
    
    const center = geocodeResponse.data.results[0].geometry.location;  // 2. Fetch places for each selected preference type
  const selectedTypes = Object.keys(preferences).filter(key => preferences[key]);
  
  // Map preference types to Google Places API types
  const typeMapping = {
    'cafe': 'cafe',
    'park': 'park',
    'museum': 'museum',
    'art_gallery': 'art_gallery',
    'tourist_attraction': 'tourist_attraction'
  };
  
  const placePromises = selectedTypes.map(async (type) => {
    const googleType = typeMapping[type] || type;
    
    try {
      const result = await client.placesNearby({
        params: {
          location: center,
          radius: 5000, // Search within a 5km radius
          type: googleType,
          key: API_KEY,
        },
      });
      return result;
    } catch (error) {
      console.error(`Error fetching ${type}:`, error.response?.data?.error_message || error.message);
      throw error;
    }
  });

  const placeResults = await Promise.all(placePromises);  const allPlaces = placeResults.flatMap(res => res.data.results);
  
  console.log(`Found ${allPlaces.length} raw places from Google Places API`);
  
  // 3. De-duplicate places and format them for our graph
  const uniquePlaces = new Map();
  let filteredOutCount = 0;
  
  // Define what types of places we DON'T want (irrelevant for tourism)
  const excludedTypes = [
    'lodging', 'hotel', 'real_estate_agency', 'insurance_agency', 
    'finance', 'bank', 'atm', 'gas_station', 'car_rental',
    'hospital', 'pharmacy', 'doctor', 'dentist', 'veterinary_care',
    'school', 'university', 'accounting', 'lawyer', 'local_government_office',
    'post_office', 'funeral_home', 'cemetery', 'storage',
    'car_dealer', 'car_repair', 'car_wash', 'parking',
    'beauty_salon', 'hair_care', 'spa', 'gym', 'physiotherapist'
  ];
  
  // Define what types of places we DO want (relevant for tourism)
  const preferredTypes = [
    'tourist_attraction', 'museum', 'art_gallery', 'park', 'zoo',
    'amusement_park', 'aquarium', 'stadium', 'church', 'hindu_temple',
    'mosque', 'synagogue', 'place_of_worship', 'historical_landmark',
    'point_of_interest', 'natural_feature', 'establishment',
    'cafe', 'restaurant', 'food', 'meal_takeaway', 'meal_delivery'
  ];
  
  allPlaces.forEach(place => {
    if (!uniquePlaces.has(place.place_id) && place.business_status === 'OPERATIONAL') {
      // Check if this place has any excluded types
      const hasExcludedType = place.types.some(type => excludedTypes.includes(type));
      
      // Check if this place has any preferred types
      const hasPreferredType = place.types.some(type => preferredTypes.includes(type));
        // Only include places that have preferred types and don't have excluded types
      if (hasPreferredType && !hasExcludedType) {
        // Additional filtering for specific cases
        const name = place.name.toLowerCase();
          // Skip obvious business/hotel names
        if (name.includes('hotel') || name.includes('resort') || 
            name.includes('pvt') || name.includes('private limited') ||
            name.includes('technologies') || name.includes('solutions') ||
            name.includes('services') || name.includes('international') && !name.includes('airport')) {
          console.log(`Filtered out business: ${place.name}`);
          filteredOutCount++;
          return; // Skip this place
        }
        
        // Calculate estimated cost based on place type and price level
        let estimatedCost = PRICE_LEVEL_MAP[place.price_level] || 20;
        
        // Adjust cost based on place type
        if (place.types.includes('museum') || place.types.includes('tourist_attraction')) {
          estimatedCost = Math.max(estimatedCost, 50); // Museums typically have entry fees
        } else if (place.types.includes('park') || place.types.includes('place_of_worship')) {
          estimatedCost = 10; // Parks and temples are usually free or low cost
        }
        
        // Calculate estimated visit duration based on place type
        let estimatedVisitDuration = 60; // Default 1 hour
        if (place.types.includes('museum') || place.types.includes('tourist_attraction')) {
          estimatedVisitDuration = 120; // 2 hours for museums and major attractions
        } else if (place.types.includes('park')) {
          estimatedVisitDuration = 90; // 1.5 hours for parks
        } else if (place.types.includes('cafe') || place.types.includes('restaurant')) {
          estimatedVisitDuration = 45; // 45 minutes for food places
        } else if (place.types.includes('place_of_worship')) {
          estimatedVisitDuration = 30; // 30 minutes for temples/churches
        }
        
        uniquePlaces.set(place.place_id, {
          placeId: place.place_id,
          name: place.name,
          location: place.geometry.location,
          rating: place.rating || 3.5,
          types: place.types,
          estimatedCost: estimatedCost,          estimatedVisitDuration: estimatedVisitDuration,
        });
      } else {
        // Log why this place was filtered out
        if (!hasPreferredType) {
          console.log(`Filtered out (no preferred type): ${place.name} - Types: ${place.types.join(', ')}`);
        } else if (hasExcludedType) {
          console.log(`Filtered out (excluded type): ${place.name} - Types: ${place.types.join(', ')}`);
        }
        filteredOutCount++;
      }
    }
  });

  const finalPlaces = Array.from(uniquePlaces.values());
  console.log(`After filtering: ${finalPlaces.length} relevant places (filtered out: ${filteredOutCount})`);
  
  return finalPlaces;
  } catch (error) {
    console.error('Error in getPlaces:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Fetches the travel distance and duration matrix between all places.
 * @param {Array} places - A list of place objects.
 * @returns {Promise<Object>} The distance matrix from the Google Directions API.
 */
export const getDistanceMatrix = async (places) => {
  try {
    if (places.length < 2) return null;
    
    console.log(`Getting distance matrix for ${places.length} places`);
    
    // Start with a very conservative approach to avoid API limits
    const MAX_PLACES = 8; // Start with 8x8 = 64 elements (well under 625 limit)
    
    let limitedPlaces = places;
    if (places.length > MAX_PLACES) {
      console.log(`Limiting places from ${places.length} to ${MAX_PLACES} for API efficiency`);
      // Sort by rating and take the top places
      limitedPlaces = places
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, MAX_PLACES);
    }
    
    console.log(`Using ${limitedPlaces.length} places for distance matrix API call`);
    
    // Validate that all places have required location data
    const validPlaces = limitedPlaces.filter(p => 
      p.location && 
      typeof p.location.lat === 'number' && 
      typeof p.location.lng === 'number'
    );
    
    if (validPlaces.length < 2) {
      console.log('Not enough valid places for distance matrix');
      return createMockDistanceMatrix(places);
    }
    
    console.log(`Attempting Google Distance Matrix API with ${validPlaces.length} places`);
    
    // Use coordinates for more reliable API calls
    const origins = validPlaces.map(p => `${p.location.lat},${p.location.lng}`);
    
    const response = await client.distancematrix({
      params: {
        origins,
        destinations: origins,
        mode: 'driving',
        key: API_KEY,
        units: 'metric'
      },
    });
    
    console.log('✅ Distance Matrix API call successful');
    console.log('Response status:', response.data.status);
    
    // Handle different API response statuses
    if (response.data.status === 'MAX_ELEMENTS_EXCEEDED') {
      console.warn('⚠️ MAX_ELEMENTS_EXCEEDED - trying with fewer places');
      if (validPlaces.length > 3) {
        // Retry with even fewer places
        const fewerPlaces = validPlaces.slice(0, 3);
        console.log(`Retrying with ${fewerPlaces.length} places`);
        return await getDistanceMatrixSmall(fewerPlaces, places);
      } else {
        console.log('Already at minimum places, using mock matrix');
        return createMockDistanceMatrix(places);
      }
    }
    
    if (response.data.status === 'REQUEST_DENIED') {
      console.error('❌ REQUEST_DENIED - Check API key and billing');
      return createMockDistanceMatrix(places);
    }
    
    if (response.data.status !== 'OK') {
      console.warn(`⚠️ API returned status: ${response.data.status}, using mock matrix`);
      return createMockDistanceMatrix(places);
    }
    
    if (!response.data.rows || response.data.rows.length === 0) {
      console.warn('⚠️ No rows in API response, using mock matrix');
      return createMockDistanceMatrix(places);
    }
    
    console.log(`✅ Got real distance data for ${response.data.rows.length} places`);
    
    // If we limited the places, create a hybrid matrix
    if (places.length > MAX_PLACES) {
      return createHybridDistanceMatrix(places, validPlaces, response.data);
    }
    
    return response.data;
  } catch (error) {
    console.error('❌ Distance Matrix API failed, using fallback calculation');
    console.error('Error details:', error.response?.data || error.message);
    
    // Fallback to Haversine formula calculation
    const mockMatrix = createMockDistanceMatrix(places);
    console.log('Using mock distance matrix with', places.length, 'places');
    return mockMatrix;
  }
};

/**
 * Helper function to get distance matrix with a small number of places
 */
const getDistanceMatrixSmall = async (validPlaces, allPlaces) => {
  try {
    const origins = validPlaces.map(p => `${p.location.lat},${p.location.lng}`);
    
    const response = await client.distancematrix({
      params: {
        origins,
        destinations: origins,
        mode: 'driving',
        key: API_KEY,
        units: 'metric'
      },
    });
    
    if (response.data.status === 'OK') {
      console.log(`✅ Small distance matrix successful with ${validPlaces.length} places`);
      return createHybridDistanceMatrix(allPlaces, validPlaces, response.data);
    } else {
      console.warn('Small distance matrix also failed, using mock matrix');
      return createMockDistanceMatrix(allPlaces);
    }
  } catch (error) {
    console.error('Small distance matrix request failed');
    return createMockDistanceMatrix(allPlaces);
  }
};

/**
 * Creates a hybrid distance matrix that combines real API data with mock data
 * @param {Array} allPlaces - All places from the original request
 * @param {Array} limitedPlaces - The subset of places that got real API data
 * @param {Object} realMatrix - The real distance matrix from Google API
 * @returns {Object} Combined distance matrix
 */
const createHybridDistanceMatrix = (allPlaces, limitedPlaces, realMatrix) => {
  console.log('Creating hybrid matrix for', allPlaces.length, 'total places and', limitedPlaces.length, 'limited places');
  console.log('Real matrix status:', realMatrix?.status);
  console.log('Real matrix rows:', realMatrix?.rows?.length);
  
  // Validate real matrix structure
  if (!realMatrix || !realMatrix.rows || realMatrix.rows.length === 0) {
    console.warn('Invalid real matrix, falling back to full mock matrix');
    return createMockDistanceMatrix(allPlaces);
  }
  
  // Create a mapping of place IDs to their indices in the limited set
  const limitedPlaceMap = new Map();
  limitedPlaces.forEach((place, index) => {
    limitedPlaceMap.set(place.placeId, index);
  });
  
  // Create the full matrix
  const rows = allPlaces.map((originPlace, originIndex) => {
    const elements = allPlaces.map((destPlace, destIndex) => {
      const originInLimited = limitedPlaceMap.has(originPlace.placeId);
      const destInLimited = limitedPlaceMap.has(destPlace.placeId);
        // If both places are in the limited set, use real API data
      if (originInLimited && destInLimited) {
        const realOriginIndex = limitedPlaceMap.get(originPlace.placeId);
        const realDestIndex = limitedPlaceMap.get(destPlace.placeId);
        
        // Validate that the indices exist in the real matrix
        if (realMatrix.rows[realOriginIndex] && realMatrix.rows[realOriginIndex].elements[realDestIndex]) {
          return realMatrix.rows[realOriginIndex].elements[realDestIndex];
        } else {
          console.warn(`Missing data in real matrix for indices ${realOriginIndex}, ${realDestIndex}`);
          // Fall through to calculated data
        }
      }
      
      // Otherwise, calculate using Haversine formula
      const distance = calculateDistance(originPlace.location, destPlace.location);
      const duration = estimateTravelTime(distance);
      
      return {
        distance: { text: `${distance.toFixed(1)} km`, value: Math.round(distance * 1000) },
        duration: { text: `${duration} mins`, value: duration * 60 },
        status: 'OK'
      };
    });
    
    return { elements };
  });
  
  return {
    destination_addresses: allPlaces.map(p => p.name),
    origin_addresses: allPlaces.map(p => p.name),
    rows,
    status: 'OK'
  };
};

// Helper functions for distance calculation (same as in distanceCalculator.js)
const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLon = toRadians(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

const estimateTravelTime = (distanceKm) => {
  const avgSpeedKmh = 30; // Average city driving speed
  return Math.round((distanceKm / avgSpeedKmh) * 60); // Convert to minutes
};

/**
 * Test function to verify Google Maps API connectivity and diagnose issues
 */
export const testGoogleMapsAPI = async () => {
  try {
    console.log('🔍 Testing Google Maps API connectivity...');
    console.log(`Using API Key: ${API_KEY?.substring(0, 10)}...`);
    
    // Test 1: Simple geocoding (usually has higher quotas)
    console.log('Test 1: Geocoding API...');
    try {
      const geocodeResponse = await client.geocode({
        params: { address: 'Bangalore, India', key: API_KEY },
      });
      console.log('✅ Geocoding API: OK');
    } catch (geocodeError) {
      console.log('❌ Geocoding API failed:', geocodeError.response?.data || geocodeError.message);
    }
    
    // Test 2: Very small distance matrix (2x2)
    console.log('Test 2: Small Distance Matrix (2x2)...');
    const testOrigins = ['12.9716,77.5946', '12.9762,77.6033']; // Bangalore coordinates
    
    const response = await client.distancematrix({
      params: {
        origins: testOrigins,
        destinations: testOrigins,
        mode: 'driving',
        key: API_KEY,
        units: 'metric'
      },
    });
    
    console.log('✅ Distance Matrix API test successful');
    console.log('Response status:', response.data.status);
    console.log('Elements count:', testOrigins.length * testOrigins.length);
    
    if (response.data.status === 'REQUEST_DENIED') {
      console.log('❌ REQUEST_DENIED - Possible issues:');
      console.log('   1. API key is invalid');
      console.log('   2. Distance Matrix API is not enabled');
      console.log('   3. Billing account is not set up');
      console.log('   4. API key restrictions are too strict');
    }
    
    if (response.data.status === 'OVER_DAILY_LIMIT') {
      console.log('❌ OVER_DAILY_LIMIT - You have exceeded your daily quota');
    }
    
    if (response.data.status === 'OVER_QUERY_LIMIT') {
      console.log('❌ OVER_QUERY_LIMIT - You have exceeded your rate limit');
    }
    
    return response.data.status === 'OK';
  } catch (error) {
    console.log('❌ Google Maps API test failed');
    console.log('Test error:', error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      console.log('💡 HTTP 403 suggests:');
      console.log('   1. API key issues (invalid, expired, or restricted)');
      console.log('   2. Billing not enabled');
      console.log('   3. API not enabled in Google Cloud Console');
    }
    
    return false;
  }
};
