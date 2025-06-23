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
const filterAndProcessPlaces = (rawPlaces) => {
  // Define what types of places we DON'T want (irrelevant for tourism)
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
  ];
  
  // Stricter rating criteria for better place quality
  const MIN_RATING = 4.0; // Increased from 3.8 for higher quality
  const MIN_RATING_COUNT = 15; // Increased from 5 for more credibility
  const PREFERRED_RATING = 4.3; // Increased from 4.2 for premium places
  const PREFERRED_RATING_COUNT = 50; // Increased from 20 for well-established places

  const uniquePlaces = new Map();
  let filteredOutCount = 0;

  rawPlaces.forEach(place => {
    if (!uniquePlaces.has(place.place_id) && place.business_status === 'OPERATIONAL') {
      // Check if this place has any excluded types (but ignore 'establishment' and 'point_of_interest')
      const significantExcludedTypes = place.types.filter(type => 
        excludedTypes.includes(type) && type !== 'establishment' && type !== 'point_of_interest'
      );
      const hasExcludedType = significantExcludedTypes.length > 0;
      
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
        const corporatePatterns = [
          /\b(pvt|ltd|inc|corp|llc|llp)\b/i,
          /\b(technologies|solutions|services|consulting|consultancy)\b/i,
          /\b(office|headquarters|building|plaza|tower|complex)\b/i,
          /\b(industries|industrial|manufacturing|enterprise)\b/i,
          /\b(company|firm|agency|corporation|business)\b/i,
          // Bangalore-specific patterns
          /\b(tech\s*park|software|cyber|electronic\s*city)\b/i,
          /\b(manyata|whitefield|embassy|prestige|brigade)\b/i,
          /\b(infotech|info\s*tech|IT\s*park|business\s*park)\b/i
        ];
        
        const matchesCorporatePattern = corporatePatterns.some(pattern => pattern.test(name));
        
        if (hasExcludedKeyword || matchesCorporatePattern) {
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
        
        // Additional check: exclude places with suspiciously few reviews for their rating
        if (rating > 4.5 && reviewCount < 10) {
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
          vicinity: place.vicinity || place.formatted_address || '',          // Enhanced place details for rich UI
          photos: place.photos ? selectBestPhotos(place.photos, 3).map(photo => ({
            photo_reference: photo.photo_reference,
            width: photo.width,
            height: photo.height,
            html_attributions: photo.html_attributions,
            // Generate photo URL with good quality for journey display
            url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${photo.photo_reference}&key=${API_KEY}`
          })) : [],
          price_level: place.price_level || null,
          opening_hours: place.opening_hours || null,
          permanently_closed: place.permanently_closed || false,
          plus_code: place.plus_code || null
        });
          // Place accepted
      } else {
        // Place filtered out for quality, type, or preference reasons
        filteredOutCount++;
      }
    }
  });
  const finalPlaces = Array.from(uniquePlaces.values());
  
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
      
      // Fetch start point details using reverse geocoding
      try {
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
        }
      } catch (error) {
        console.warn('Could not fetch start point details:', error.message);
      }
    } else if (journeyMode === 'currentLocation' && startPoint) {
      // For current location mode, search around the start point
      center = startPoint;
      searchRadius = 25000; // 25km radius for circular journeys
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
    
    console.log(`Getting distance matrix for ${places.length} places`);    // Trust that places have already been filtered by smartPlaceSelection in graphService
    // Google Distance Matrix API limits: 25 origins x 25 destinations = 625 elements max
    // But in practice, we need to stay well below this to avoid MAX_ELEMENTS_EXCEEDED
    // The graphService should ensure we never exceed 10 places (10x10 = 100 elements)
    
    if (places.length > 10) {
      console.warn(`⚠️ Warning: Received ${places.length} places, which may exceed API limits. Consider reducing in graphService.`);
    }
    
    const locations = places.map(place => place.location);
    
    const result = await client.distancematrix({
      params: {
        origins: locations,
        destinations: locations,
        mode: 'driving', // Changed to 'driving' for better travel time estimates
        units: 'metric',
        key: API_KEY,
      },
    });
    
    if (result.data.status === 'OK') {
      console.log(`✅ Distance matrix retrieved successfully for ${locations.length} locations`);
      return {
        ...result.data,
        limitedPlaces: places // Include the places for reference
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
 * Fetches detailed information for a place including photos and description
 * @param {string} placeId - Google Place ID
 * @returns {Promise<Object>} Enhanced place details
 */
export const getPlaceDetails = async (placeId) => {
  try {
    if (!API_KEY) {
      console.warn('⚠️ No API key found, returning basic details');
      return null;
    }

    console.log(`🔍 Fetching place details for: ${placeId}`);
    const result = await client.placeDetails({
      params: {
        place_id: placeId,
        fields: [
          'place_id', 'name', 'formatted_address', 'geometry',
          'rating', 'user_ratings_total', 'photos', 'types',
          'price_level', 'opening_hours', 'website', 'formatted_phone_number',
          'reviews', 'editorial_summary', 'plus_code'
        ].join(','),
        key: API_KEY,
      },
    });

    console.log(`📊 API Response status: ${result.data.status}`);
    if (result.data.status === 'OK') {
      const place = result.data.result;
      console.log(`📸 Found ${place.photos?.length || 0} photos for ${place.name}`);
      return {
        placeId: place.place_id,
        name: place.name,
        formatted_address: place.formatted_address,
        location: place.geometry?.location,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,        photos: place.photos ? selectBestPhotos(place.photos, 5).map(photo => ({
          photo_reference: photo.photo_reference,
          width: photo.width,
          height: photo.height,
          html_attributions: photo.html_attributions,
          // Generate photo URL with high quality for detailed view
          url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photo.photo_reference}&key=${API_KEY}`,
          // Also provide a smaller version for thumbnails
          thumbnailUrl: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${API_KEY}`
        })) : [],
        types: place.types,
        price_level: place.price_level,
        opening_hours: place.opening_hours,
        website: place.website,
        phone: place.formatted_phone_number,        reviews: place.reviews ? place.reviews
          .sort((a, b) => b.rating - a.rating) // Sort by rating (highest first)
          .slice(0, 3)
          .map(review => ({
            author_name: review.author_name,
            rating: review.rating,
            text: review.text,
            time: review.time,
            relative_time_description: review.relative_time_description
          })) : [],
        editorial_summary: place.editorial_summary?.overview || null,
        plus_code: place.plus_code
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
};

/**
 * Generates photo URLs for place photos
 * @param {string} photoReference - Google Photos API reference
 * @param {number} maxWidth - Maximum width of the photo
 * @returns {string} Photo URL
 */
export const getPhotoUrl = (photoReference, maxWidth = 400) => {
  if (!API_KEY || !photoReference) return null;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${API_KEY}`;
};

/**
 * Intelligently selects and sorts the best photos for a place
 * @param {Array} photos - Array of photo objects from Google Places API
 * @param {number} maxPhotos - Maximum number of photos to return
 * @returns {Array} Sorted array of best photos
 */
const selectBestPhotos = (photos, maxPhotos = 5) => {
  if (!photos || photos.length === 0) return [];
  
  // Score each photo based on various quality indicators
  const scoredPhotos = photos.map(photo => {
    let score = 0;
    
    // Higher resolution gets more points
    const totalPixels = photo.width * photo.height;
    if (totalPixels > 1000000) score += 50; // > 1MP
    else if (totalPixels > 500000) score += 30; // > 0.5MP
    else if (totalPixels > 100000) score += 10; // > 0.1MP
    
    // Prefer landscape orientation for better display (16:9, 4:3, etc.)
    const aspectRatio = photo.width / photo.height;
    if (aspectRatio >= 1.3 && aspectRatio <= 2.0) score += 20; // Good landscape ratios
    else if (aspectRatio >= 0.7 && aspectRatio <= 1.3) score += 15; // Square-ish
    else score -= 10; // Very tall or very wide
    
    // Prefer larger images (better quality potential)
    if (photo.width >= 1200 || photo.height >= 900) score += 25;
    else if (photo.width >= 800 || photo.height >= 600) score += 15;
    else if (photo.width >= 400 || photo.height >= 300) score += 5;
    
    // Bonus for photos that aren't too small
    if (photo.width >= 300 && photo.height >= 200) score += 10;
    
    // Small penalty for very small images
    if (photo.width < 200 || photo.height < 150) score -= 20;
    
    // Check attributions for quality indicators
    if (photo.html_attributions && photo.html_attributions.length > 0) {
      const attribution = photo.html_attributions[0].toLowerCase();
      // Prefer photos from the business owner or official sources
      if (attribution.includes('owner') || attribution.includes('business')) score += 15;
      // Prefer photos from users with more engagement (rough heuristic)
      if (attribution.includes('google user')) score += 5;
    }
    
    return {
      ...photo,
      qualityScore: score
    };
  });
  
  // Sort by quality score (highest first) and take the best ones
  return scoredPhotos
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, maxPhotos)
    .map(photo => {
      // Remove the quality score before returning
      const { qualityScore, ...cleanPhoto } = photo;
      return cleanPhoto;
    });
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
