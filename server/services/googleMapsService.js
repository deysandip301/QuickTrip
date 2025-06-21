// services/googleMapsService.js
// A dedicated module for all interactions with Google Maps APIs.
//
// This file contains all Google Maps API integrations, including:
// - Place search, filtering, and processing for tourism
// - Distance matrix and route calculations
// - Place details and text search
// - API key validation and error handling
// - Enhanced filtering to avoid business/corporate/irrelevant places
// - Utility functions for geocoding, reverse geocoding, and Haversine distance
// - All sensitive API keys must be stored in environment variables and never committed to version control
// - If you see this file or any secrets on GitHub, rotate your keys immediately and remove the secrets from history
//
// For more details, see README.md and API_SETUP_GUIDE.md

import { Client } from '@googlemaps/google-maps-services-js';
import { createMockDistanceMatrix } from './distanceCalculator.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const client = new Client({});
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;



// Validate API key on startup
if (!API_KEY || API_KEY === 'YOUR_ACTUAL_API_KEY_HERE') {
  console.error('❌ Google Maps API key is missing or not configured properly!');
  console.error('Please set a valid GOOGLE_MAPS_API_KEY in your .env file');
  console.error('Visit https://console.cloud.google.com/ to get your API key');
}

// Price level mapping ($, $$, $$$) to a numeric value for budget calculations
const PRICE_LEVEL_MAP = { 1: 15, 2: 40, 3: 75, 4: 125 };

/**
 * Filters and processes raw places from Google Places API
 * @param {Array} rawPlaces - Raw places from Google Places API
 * @returns {Array} Filtered and processed places
 */
<<<<<<< HEAD
const filterAndProcessPlaces = (rawPlaces) => {
  // Define what types of places we DON'T want (irrelevant for tourism)
=======
const filterAndProcessPlaces = (rawPlaces) => {  // Define what types of places we DON'T want (irrelevant for tourism)
>>>>>>> 48711cfa995a1a068f438d267d39ad4117d39716
  const excludedTypes = [
    'lodging', 'hotel', 'real_estate_agency', 'insurance_agency', 
    'finance', 'bank', 'atm', 'gas_station', 'car_rental',
    'hospital', 'pharmacy', 'doctor', 'dentist', 'veterinary_care',
    'school', 'university', 'accounting', 'lawyer', 'local_government_office',
    'post_office', 'funeral_home', 'cemetery', 'storage',
    'car_dealer', 'car_repair', 'car_wash', 'parking',
    'beauty_salon', 'hair_care', 'spa', 'gym', 'physiotherapist',
    // Additional business/corporate exclusions
    'office', 'corporate_office', 'business_center', 'coworking_space',
    'conference_center', 'meeting_room', 'professional_services',
    'industrial', 'warehouse', 'manufacturing', 'construction_company'
  ];
  
  // Define what types of places we DO want (relevant for tourism)
  const preferredTypes = [
    'tourist_attraction', 'museum', 'art_gallery', 'park', 'zoo',
    'amusement_park', 'aquarium', 'stadium', 'church', 'hindu_temple',
    'mosque', 'synagogue', 'place_of_worship', 'historical_landmark',
    'point_of_interest', 'natural_feature',
    'cafe', 'restaurant', 'food', 'meal_takeaway', 'meal_delivery',
    'shopping_mall', 'store', 'market', 'library', 'cultural_center'
  ];
  // Enhanced keywords to exclude business/corporate places
  const excludedNameKeywords = [
    'society', 'pvt', 'private limited', 'technologies', 'solutions',
    'services', 'international', 'ltd', 'limited', 'corp', 'inc',
    'apartment', 'residency', 'complex', 'tower', 'heights',
    'hospital', 'clinic', 'medical', 'dental', 'pharmacy',
    'hotel', 'resort', 'guest house', 'lodge', 'inn',
    // Additional corporate/business keywords
    'office', 'headquarters', 'building', 'plaza', 'corporate',
    'business', 'enterprise', 'company', 'firm', 'agency',
    'consultancy', 'consulting', 'industries', 'industrial',
    'manufacturing', 'factory', 'warehouse', 'distribution',
    'center', 'centre', 'hub', 'facility', 'campus',
    // Bangalore-specific business exclusions
    'tech park', 'software', 'IT park', 'cyber', 'electronic city',
    'whitefield', 'manyata', 'embassy', 'prestige', 'brigade',
    'rga', 'sobha', 'salarpuria', 'godrej', 'tata'
  ];// Stricter rating criteria for better place quality
  const MIN_RATING = 4.0; // Increased from 3.8 for higher quality
  const MIN_RATING_COUNT = 15; // Increased from 5 for more credibility
  const PREFERRED_RATING = 4.3; // Increased from 4.2 for premium places
  const PREFERRED_RATING_COUNT = 50; // Increased from 20 for well-established places

  const uniquePlaces = new Map();
  let filteredOutCount = 0;

<<<<<<< HEAD
=======


>>>>>>> 48711cfa995a1a068f438d267d39ad4117d39716
  rawPlaces.forEach(place => {
    if (!uniquePlaces.has(place.place_id) && place.business_status === 'OPERATIONAL') {
      // Check if this place has any excluded types (but ignore 'establishment' and 'point_of_interest')
      const significantExcludedTypes = place.types.filter(type => 
        excludedTypes.includes(type) && type !== 'establishment' && type !== 'point_of_interest'
      );
      const hasExcludedType = significantExcludedTypes.length > 0;
<<<<<<< HEAD
      // Check if this place has any preferred types
      const hasPreferredType = place.types.some(type => preferredTypes.includes(type));
      // Stricter rating criteria for higher quality places
      const rating = place.rating || 0;
      const reviewCount = place.user_ratings_total || 0;
      const hasAcceptableQuality = 
        (rating >= PREFERRED_RATING && reviewCount >= PREFERRED_RATING_COUNT) ||
        (rating >= MIN_RATING && reviewCount >= MIN_RATING_COUNT) ||
        (place.types.includes('tourist_attraction') && rating >= 4.0 && reviewCount >= 10) ||
        (place.types.includes('park') && rating >= 4.0 && reviewCount >= 8) ||
        (place.types.includes('museum') && rating >= 4.2 && reviewCount >= 15) ||
        ((place.types.includes('cafe') || place.types.includes('restaurant')) && rating >= 4.2 && reviewCount >= 25);
      if (hasPreferredType && !hasExcludedType && hasAcceptableQuality) {
        const name = place.name.toLowerCase();
        const hasExcludedKeyword = excludedNameKeywords.some(keyword => name.includes(keyword.toLowerCase()));
=======
      
      // Check if this place has any preferred types
      const hasPreferredType = place.types.some(type => preferredTypes.includes(type));

      // Stricter rating criteria for higher quality places
      const rating = place.rating || 0;
      const reviewCount = place.user_ratings_total || 0;
        // More selective quality criteria - prioritize well-rated places
      const hasAcceptableQuality = 
        (rating >= PREFERRED_RATING && reviewCount >= PREFERRED_RATING_COUNT) || // High quality with many reviews
        (rating >= MIN_RATING && reviewCount >= MIN_RATING_COUNT) || // Good rating with decent reviews
        (place.types.includes('tourist_attraction') && rating >= 4.0 && reviewCount >= 10) || // Tourist attractions with good rating
        (place.types.includes('park') && rating >= 4.0 && reviewCount >= 8) || // Parks with good rating
        (place.types.includes('museum') && rating >= 4.2 && reviewCount >= 15) || // Museums with high rating
        ((place.types.includes('cafe') || place.types.includes('restaurant')) && rating >= 4.2 && reviewCount >= 25); // Food places with high standards
        // Only include places that meet all criteria
      if (hasPreferredType && !hasExcludedType && hasAcceptableQuality) {
        // Additional filtering for specific cases
        const name = place.name.toLowerCase();
        
        // Enhanced keyword filtering to exclude business/residential places
        const hasExcludedKeyword = excludedNameKeywords.some(keyword => 
          name.includes(keyword.toLowerCase())
        );
          // Additional pattern matching for corporate names
>>>>>>> 48711cfa995a1a068f438d267d39ad4117d39716
        const corporatePatterns = [
          /\b(pvt|ltd|inc|corp|llc|llp)\b/i,
          /\b(technologies|solutions|services|consulting|consultancy)\b/i,
          /\b(office|headquarters|building|plaza|tower|complex)\b/i,
          /\b(industries|industrial|manufacturing|enterprise)\b/i,
          /\b(company|firm|agency|corporation|business)\b/i,
<<<<<<< HEAD
=======
          // Bangalore-specific patterns
>>>>>>> 48711cfa995a1a068f438d267d39ad4117d39716
          /\b(tech\s*park|software|cyber|electronic\s*city)\b/i,
          /\b(manyata|whitefield|embassy|prestige|brigade)\b/i,
          /\b(infotech|info\s*tech|IT\s*park|business\s*park)\b/i
        ];
<<<<<<< HEAD
        const matchesCorporatePattern = corporatePatterns.some(pattern => pattern.test(name));
        if (hasExcludedKeyword || matchesCorporatePattern) {
=======
        
        const matchesCorporatePattern = corporatePatterns.some(pattern => pattern.test(name));
        
        if (hasExcludedKeyword || matchesCorporatePattern) {

>>>>>>> 48711cfa995a1a068f438d267d39ad4117d39716
          filteredOutCount++;
          return;
        }
        // Additional check: if place has very few reviews but claims to be a tourist attraction, be suspicious
        if (place.types.includes('tourist_attraction') && 
            place.user_ratings_total < 20 && 
            !place.types.includes('natural_feature') &&
            !place.types.includes('historical_landmark')) {

          filteredOutCount++;
          return;
        }
        
        // Additional check: exclude places with suspiciously few reviews for their rating        if (rating > 4.5 && reviewCount < 10) {
          filteredOutCount++;
          return;
        }

        // Additional check: exclude places that might be residential or commercial buildings
        if (place.types.includes('establishment') &&
            place.types.length === 2 &&
            place.types.includes('point_of_interest') &&
            reviewCount < 15) {
          filteredOutCount++;
          return;
        }
          // Additional check: if place has very few reviews but claims to be a tourist attraction, be suspicious
        if (place.types.includes('tourist_attraction') && 
            place.user_ratings_total < 20 && 
            !place.types.includes('natural_feature') &&
            !place.types.includes('historical_landmark')) {

          filteredOutCount++;
          return;
        }
        
        // Additional check: exclude places with suspiciously few reviews for their rating        if (rating > 4.5 && reviewCount < 10) {
          filteredOutCount++;
          return;
        }
        
        // Additional check: exclude places that might be residential or commercial buildings        if (place.types.includes('establishment') && 
            place.types.length === 2 && 
            place.types.includes('point_of_interest') &&
            reviewCount < 15) {
          filteredOutCount++;
          return;
        }
        
        // Calculate estimated cost based on place type and price level
        let estimatedCost = PRICE_LEVEL_MAP[place.price_level] || 20;
        
        // Adjust cost based on place type
        if (place.types.includes('museum') || place.types.includes('tourist_attraction')) {
          estimatedCost = Math.max(estimatedCost, 50); // Museums typically have entry fees
        } else if (place.types.includes('park') || place.types.includes('place_of_worship')) {
          estimatedCost = 10; // Parks and temples are usually free or low cost
        }

        // Calculate estimated visit duration based on place type (reduced times for more stops)
        let estimatedVisitDuration = 30; // Reduced default from 45 to 30 minutes
        if (place.types.includes('museum') || place.types.includes('tourist_attraction')) {
          estimatedVisitDuration = 60; // Reduced from 90 to 60 minutes for museums and major attractions
        } else if (place.types.includes('park')) {
          estimatedVisitDuration = 45; // Reduced from 60 to 45 minutes for parks
        } else if (place.types.includes('cafe') || place.types.includes('restaurant')) {
          estimatedVisitDuration = 25; // Reduced from 30 to 25 minutes for food places
        } else if (place.types.includes('place_of_worship')) {
          estimatedVisitDuration = 15; // Reduced from 20 to 15 minutes for temples/churches
        }
        
        uniquePlaces.set(place.place_id, {
          placeId: place.place_id,
          name: place.name,
          location: place.geometry.location,
          rating: place.rating || 3.5,
          user_ratings_total: place.user_ratings_total || 0,
          types: place.types,
          estimatedCost: estimatedCost,
          estimatedVisitDuration: estimatedVisitDuration,
          vicinity: place.vicinity || place.formatted_address || '',
        });
        
        console.log(`✅ ACCEPTED: ${place.name} (Rating: ${place.rating}, Reviews: ${place.user_ratings_total}, Types: ${place.types.slice(0, 3).join(', ')})`);
      } else {
        // Log why this place was filtered out
        if (!hasPreferredType) {
          console.log(`❌ Filtered out (no preferred type): ${place.name} - Types: ${place.types.join(', ')}`);
        } else if (hasExcludedType) {
<<<<<<< HEAD
          console.log(`❌ Filtered out (excluded type): ${place.name} - Types: ${significantExcludedTypes.join(', ')} in ${place.types.join(', ')}`);        } else if (!hasAcceptableQuality) {
=======
          console.log(`❌ Filtered out (excluded type): ${place.name} - Types: ${significantExcludedTypes.join(', ')} in ${place.types.join(', ')}`);
        } else if (!hasAcceptableQuality) {
>>>>>>> 48711cfa995a1a068f438d267d39ad4117d39716
          console.log(`❌ Filtered out (quality criteria): ${place.name} - Rating: ${place.rating || 'N/A'}, Reviews: ${place.user_ratings_total || 0}`);
        }
        filteredOutCount++;
      }
    } else if (uniquePlaces.has(place.place_id)) {
      console.log(`⚠️ Duplicate place skipped: ${place.name}`);
    } else if (place.business_status !== 'OPERATIONAL') {
      console.log(`⚠️ Non-operational place skipped: ${place.name} (Status: ${place.business_status})`);
<<<<<<< HEAD
    }
  });
=======
    }  });
>>>>>>> 48711cfa995a1a068f438d267d39ad4117d39716

  const finalPlaces = Array.from(uniquePlaces.values());
  console.log(`After filtering: ${finalPlaces.length} relevant places (filtered out: ${filteredOutCount})`);
  
  // Log some examples of the places found
  if (finalPlaces.length > 0) {
    console.log('Sample places found:');
    finalPlaces.slice(0, 3).forEach(place => {
      console.log(`  - ${place.name} (Rating: ${place.rating}, Reviews: ${place.user_ratings_total}, Types: ${place.types.join(', ')})`);
    });
  } else {
    console.log('⚠️ No places found after filtering. This might indicate:');
    console.log('   - Search radius too small');
    console.log('   - Filtering criteria too strict');
    console.log('   - No places of selected types in the area');
    console.log('   - Google Places API issues');
  }
  
  return finalPlaces;
};

/**
 * Fetches a list of places based on a location and user preferences.
 * @param {string} location - Coordinates string "lat,lng" or an address.
 * @param {object} preferences - An object with place types as keys (e.g., { cafe: true }).
 * @param {object} startPoint - The start point coordinates { lat, lng }.
 * @param {object} endPoint - The end point coordinates { lat, lng } (optional).
 * @param {string} journeyMode - Either 'currentLocation' or 'customRoute'.
 * @returns {Promise<Array>} A list of place objects including start/end points.
 */
export const getPlaces = async (location, preferences, startPoint = null, endPoint = null, journeyMode = 'currentLocation') => {
  try {
    console.log('🔍 Starting place search with parameters:');
    console.log(`  Location: ${location}`);
    console.log(`  Journey Mode: ${journeyMode}`);
    console.log(`  Start Point: ${startPoint ? `${startPoint.lat}, ${startPoint.lng}` : 'Not provided'}`);
    console.log(`  End Point: ${endPoint ? `${endPoint.lat}, ${endPoint.lng}` : 'Not provided'}`);
    console.log(`  Preferences: ${Object.keys(preferences).filter(key => preferences[key]).join(', ')}`);

    let center;
    let searchRadius = 10000; // Default 10km radius
    let startPlaceDetails = null;
    let endPlaceDetails = null;
    
    // Always parse coordinates from location if it's in "lat,lng" format
    const coordinateMatch = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordinateMatch) {
      const lat = parseFloat(coordinateMatch[1]);
      const lng = parseFloat(coordinateMatch[2]);
      center = { lat, lng };
      console.log(`📍 Using coordinates from location parameter: ${lat}, ${lng}`);
      
      // Fetch start point details using reverse geocoding
      try {
        console.log('🔎 Fetching start point details via reverse geocoding...');
        const startGeocode = await client.reverseGeocode({
          params: { latlng: center, key: API_KEY }
        });
        
        if (startGeocode.data.results.length > 0) {
          const result = startGeocode.data.results[0];
          startPlaceDetails = {
            placeId: result.place_id,
            name: result.formatted_address.split(',')[0] || 'Start Location',
            location: center,
            rating: 5.0, // Default high rating for start point
            user_ratings_total: 1,
            types: ['start_point', 'establishment'],
            estimatedCost: 0,
            estimatedVisitDuration: 5,
            vicinity: result.formatted_address,
            isStartPoint: true
          };
          console.log(`✅ Start point details: ${startPlaceDetails.name}`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch start point details:', error.message);
      }
    } else if (journeyMode === 'currentLocation' && startPoint) {
      // For current location mode, search around the start point
      center = startPoint;
      searchRadius = 25000; // 25km radius for circular journeys
      console.log(`🌍 Searching for places around current location: ${startPoint.lat}, ${startPoint.lng}`);
    } else if (journeyMode === 'customRoute' && startPoint && endPoint) {
      // For custom route mode, search in the area between start and end points
      center = {
        lat: (startPoint.lat + endPoint.lat) / 2,
        lng: (startPoint.lng + endPoint.lng) / 2
      };
      
      // Calculate distance between start and end points to determine search radius
      const distance = calculateHaversineDistance(startPoint.lat, startPoint.lng, endPoint.lat, endPoint.lng);
      searchRadius = Math.max(distance * 1000 * 0.7, 15000); // 70% of distance or minimum 15km
      searchRadius = Math.min(searchRadius, 50000); // Maximum 50km
      
      console.log(`🗺️ Searching for places between start and end points. Center: ${center.lat}, ${center.lng}, Radius: ${searchRadius}m`);
      
      // Fetch end point details using reverse geocoding
      if (endPoint) {
        try {
          console.log('🔎 Fetching end point details via reverse geocoding...');
          const endGeocode = await client.reverseGeocode({
            params: { latlng: endPoint, key: API_KEY }
          });
          
          if (endGeocode.data.results.length > 0) {
            const result = endGeocode.data.results[0];
            endPlaceDetails = {
              placeId: result.place_id,
              name: result.formatted_address.split(',')[0] || 'End Location',
              location: endPoint,
              rating: 5.0, // Default high rating for end point
              user_ratings_total: 1,
              types: ['end_point', 'establishment'],
              estimatedCost: 0,
              estimatedVisitDuration: 5,
              vicinity: result.formatted_address,
              isEndPoint: true
            };
            console.log(`✅ End point details: ${endPlaceDetails.name}`);
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch end point details:', error.message);
        }
      }
    } else {
      // Fallback to geocoding the location string
      const geocodeResponse = await client.geocode({
        params: { address: location, key: API_KEY },
      });
      
      if (geocodeResponse.data.results.length === 0) {
        throw new Error('Location not found');
      }
      
      center = geocodeResponse.data.results[0].geometry.location;
      console.log(`📍 Using geocoded location: ${center.lat}, ${center.lng}`);
    }

    // 2. Fetch places for each selected preference type
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
            radius: searchRadius,
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

    const placeResults = await Promise.all(placePromises);
    
    // Check individual API responses
    placeResults.forEach((result, index) => {
      const type = selectedTypes[index];
      console.log(`${type}: Found ${result.data.results.length} places, Status: ${result.data.status}`);
    });

    const allRawPlaces = placeResults.flatMap(res => res.data.results);
    
    console.log(`🔍 Found ${allRawPlaces.length} raw places from Google Places API`);
    console.log(`Selected preference types: ${selectedTypes.join(', ')}`);
    console.log(`Search center: ${center.lat}, ${center.lng}, radius: ${searchRadius}m`);
    
    // Log all raw places found
    if (allRawPlaces.length > 0) {
      console.log('📋 All raw places found:');
      allRawPlaces.forEach((place, index) => {
        console.log(`  ${index + 1}. ${place.name} (Rating: ${place.rating || 'N/A'}, Reviews: ${place.user_ratings_total || 0}, Types: ${place.types.slice(0, 3).join(', ')})`);
      });
    }

    // Apply filtering and processing
    const processedPlaces = filterAndProcessPlaces(allRawPlaces);
    
    // Combine start/end points with processed places
    const allPlaces = [];
    
    if (startPlaceDetails) {
      allPlaces.push(startPlaceDetails);
      console.log(`✅ Added start point: ${startPlaceDetails.name}`);
    }
    
    allPlaces.push(...processedPlaces);
    
    if (endPlaceDetails) {
      allPlaces.push(endPlaceDetails);
      console.log(`✅ Added end point: ${endPlaceDetails.name}`);
    }
    
    console.log(`📍 Final result: ${allPlaces.length} total places (including start/end points)`);
    console.log('🏁 Final places list:');
    allPlaces.forEach((place, index) => {
      const marker = place.isStartPoint ? '🏁' : place.isEndPoint ? '🎯' : '📍';
      console.log(`  ${marker} ${index + 1}. ${place.name} (Rating: ${place.rating}, Types: ${place.types.slice(0, 2).join(', ')})`);
    });
    
    return allPlaces;
  } catch (error) {
    console.error('Error in getPlaces:', error);
    console.error('Error details:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Calculates the Haversine distance between two points on Earth.
 * @param {number} lat1 - Latitude of the first point.
 * @param {number} lon1 - Longitude of the first point.
 * @param {number} lat2 - Latitude of the second point.
 * @param {number} lon2 - Longitude of the second point.
 * @returns {number} Distance in kilometers.
 */
export const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
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
    const MAX_PLACES = 15; // Increased from 8 to allow more places in journey
    
    let limitedPlaces = places;
    if (places.length > MAX_PLACES) {
      console.log(`Limiting places from ${places.length} to ${MAX_PLACES} for API efficiency`);
      // Sort by rating and take the top places, but ensure variety
      const sortedByRating = places.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      
      // Take top places but ensure we have variety of types
      const selectedPlaces = [];
      const typeCount = {};
      
      for (const place of sortedByRating) {
        if (selectedPlaces.length >= MAX_PLACES) break;
        
        const mainType = place.types.find(type => 
          ['museum', 'park', 'tourist_attraction', 'cafe', 'restaurant', 'place_of_worship'].includes(type)
        ) || place.types[0];
        
        // Limit each type to avoid monotonous journeys
        if (!typeCount[mainType] || typeCount[mainType] < 4) {
          selectedPlaces.push(place);
          typeCount[mainType] = (typeCount[mainType] || 0) + 1;
        }
      }
      
      limitedPlaces = selectedPlaces;
      console.log(`Selected ${limitedPlaces.length} places with variety:`, typeCount);
    }
    
    const locations = limitedPlaces.map(place => place.location);
    
    const result = await client.distancematrix({
      params: {
        origins: locations,
        destinations: locations,
        mode: 'walking', // Changed from 'driving' to 'walking' for tourism
        units: 'metric',
        key: API_KEY,
      },
    });
    
    if (result.data.status === 'OK') {
      console.log(`✅ Distance matrix retrieved successfully for ${locations.length} locations`);
      return {
        ...result.data,
        limitedPlaces: limitedPlaces // Include the limited places for reference
      };
    } else {
      console.error('Distance matrix API error:', result.data.status);
      throw new Error(`Distance matrix API error: ${result.data.status}`);
    }
  } catch (error) {
    console.error('Error in getDistanceMatrix:', error);
    console.error('Error details:', error.response?.data || error.message);
    
    // Fallback to mock data in case of API failure
    console.log('⚠️ Falling back to mock distance matrix');
    return createMockDistanceMatrix(places);
  }
};

/**
 * Searches for places by text query.
 * @param {string} query - The search query.
 * @param {object} location - The location to search around.
 * @param {number} radius - The search radius in meters.
 * @returns {Promise<Array>} A list of places matching the query.
 */
export const searchPlacesByText = async (query, location, radius = 5000) => {
  try {
    const result = await client.textSearch({
      params: {
        query: query,
        location: location,
        radius: radius,
        key: API_KEY,
      },
    });
    
    if (result.data.status === 'OK') {
      return result.data.results;
    } else {
      console.error('Text search API error:', result.data.status);
      return [];
    }
  } catch (error) {
    console.error('Error in searchPlacesByText:', error);
    return [];
  }
};

/**
 * Gets detailed information about a specific place.
 * @param {string} placeId - The Google Places ID.
 * @returns {Promise<Object>} Detailed place information.
 */
export const getPlaceDetails = async (placeId) => {
  try {
    const result = await client.placeDetails({
      params: {
        place_id: placeId,
        fields: ['name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 'types', 'price_level', 'opening_hours', 'photos'],
        key: API_KEY,
      },
    });
    
    if (result.data.status === 'OK') {
      return result.data.result;
    } else {
      console.error('Place details API error:', result.data.status);
      return null;
    }
  } catch (error) {
    console.error('Error in getPlaceDetails:', error);
    return null;
  }
};

/**
 * Tests the Google Maps API connectivity and configuration.
 * @returns {Promise<boolean>} True if API is working, false otherwise.
 */
export const testGoogleMapsAPI = async () => {
  try {
    console.log('🔄 Testing Google Maps API connectivity...');
    
    // Test with a simple geocoding request
    const result = await client.geocode({
      params: {
        address: 'Bangalore, India',
        key: API_KEY,
      },
    });
    
    if (result.data.status === 'OK' && result.data.results.length > 0) {
      console.log('✅ Google Maps API is working correctly');
      console.log(`   Found location: ${result.data.results[0].formatted_address}`);
      return true;
    } else {
      console.error('❌ Google Maps API test failed:', result.data.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Google Maps API test error:', error.message);
    console.error('   Please check your API key and network connection');
    return false;
  }
};
