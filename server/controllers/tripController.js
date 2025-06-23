// controllers/tripController.js
// Handles the logic for the /trip endpoint. It orchestrates calls to various services.

import { getPlaces, getPlaceDetails } from '../services/googleMapsService.js';
import { buildGraphAndFindJourney } from '../services/graphService.js';

export const tripExperience = async (req, res) => {
    try {
    console.log('Received request for trip experience:', req.body);
    const { location, preferences, duration, budget, startPoint, endPoint } = req.body;

    // --- Input Validation ---
    if (!location || !preferences || !duration || !budget) {
      return res.status(400).json({ message: 'Missing required input parameters.' });
    }
    if (Object.keys(preferences).length === 0) {
      return res.status(400).json({ message: 'At least one preference must be selected.'});
    }

    // --- Determine Journey Mode ---
    let journeyMode;
    if (startPoint && endPoint) {
      journeyMode = 'customRoute';
      console.log('🗺️ Custom Route Mode: Journey from start point to end point');
    } else if (startPoint && !endPoint) {
      journeyMode = 'currentLocation';
      console.log('📍 Current Location Mode: Circular journey from current location');
    } else {
      return res.status(400).json({ message: 'Start point is required. For custom routes, both start and end points are required.' });
    }    // --- Step 1: Fetch POIs (Nodes) ---
    // Get a list of potential places (Points of Interest) based on user preferences.
    // For current location mode, we fetch places around the start point
    // For custom route mode, we fetch places in the area between start and end points
    const places = await getPlaces(location, preferences, startPoint, endPoint, journeyMode);
    console.log(`Found ${places.length} places matching criteria`);
    
    if (places.length === 0) {
      return res.status(404).json({ message: 'No places found matching your criteria. Try expanding your search area or selecting different interests.' });
    }
    
    // For development, allow even single places to help debug
    if (places.length < 2) {
      console.log('Warning: Only found 1 place, but proceeding to help with debugging');
    }
    
    // --- Step 2: Build Graph & Find Optimal Journey ---
    // This is the core logic where the graph is constructed and algorithm is run.
    const journey = await buildGraphAndFindJourney(places, preferences, duration, budget, startPoint, endPoint, journeyMode);
    
    if (!journey || journey.length === 0) {
      return res.status(404).json({ message: 'Could not create a suitable journey with the given constraints.' });
    }    // --- Step 3: Enhance Journey with Rich Place Details ---
    // Fetch detailed information for each place in the journey
    const enhancedJourney = await Promise.all(journey.map(async (item) => {
      if (!item.isTravelLeg && item.placeId) {
        try {
          const placeDetails = await getPlaceDetails(item.placeId);
          if (placeDetails) {
            return {
              ...item,
              photos: placeDetails.photos || [],
              reviews: placeDetails.reviews || [],
              description: placeDetails.editorial_summary || generatePlaceDescription(item),
              formatted_address: placeDetails.formatted_address || item.vicinity,
              website: placeDetails.website || null,
              phone: placeDetails.phone || null,
              opening_hours: placeDetails.opening_hours || null
            };
          }
        } catch (error) {
          console.warn(`Could not fetch details for place ${item.name}:`, error.message);
        }
      }
      return item;
    }));

    // --- Step 4: Return the Enhanced Result ---
    const actualPlaces = enhancedJourney.filter(item => !item.isTravelLeg);
    console.log(`✅ Generated ${journeyMode} journey with ${actualPlaces.length} stops and enhanced details`);
    res.status(200).json(enhancedJourney);

  } catch (error) {
    console.error('Error in tripExperience:', error);
    res.status(500).json({ message: error.message || 'An internal server error occurred.' });
  }
};

/**
 * Generates a friendly description for a place based on its types and rating
 * @param {Object} place - Place object with types, rating, and name
 * @returns {string} Generated description
 */
const generatePlaceDescription = (place) => {
  const { types, rating, name, user_ratings_total } = place;
  
  // Map place types to friendly descriptions
  const typeDescriptions = {
    'tourist_attraction': 'A popular destination',
    'museum': 'An educational and cultural experience',
    'art_gallery': 'A place to appreciate art and creativity',
    'park': 'A beautiful green space for relaxation',
    'zoo': 'A family-friendly wildlife experience',
    'amusement_park': 'An exciting place for fun and entertainment',
    'aquarium': 'A fascinating underwater world experience',
    'stadium': 'A venue for sports and entertainment',
    'church': 'A place of worship and historical significance',
    'hindu_temple': 'A sacred place of Hindu worship',
    'mosque': 'A place of Islamic worship and community',
    'synagogue': 'A place of Jewish worship and culture',
    'historical_landmark': 'A site of historical importance',
    'natural_feature': 'A beautiful natural attraction',
    'restaurant': 'A great place to enjoy delicious food',
    'cafe': 'A cozy spot for coffee and light meals',
    'shopping_mall': 'A convenient shopping destination',
    'market': 'A vibrant local market experience',
    'library': 'A peaceful place for learning and reading',
    'cultural_center': 'A hub for arts and cultural activities'
  };

  // Find the most relevant type
  const relevantType = types.find(type => typeDescriptions[type]) || types[0];
  const baseDescription = typeDescriptions[relevantType] || 'An interesting place to visit';
  
  // Add rating context
  let ratingText = '';
  if (rating >= 4.5) {
    ratingText = ' with exceptional reviews';
  } else if (rating >= 4.0) {
    ratingText = ' that visitors love';
  } else if (rating >= 3.5) {
    ratingText = ' with good visitor feedback';
  }

  // Add review count context
  let reviewText = '';
  if (user_ratings_total > 100) {
    reviewText = ` from hundreds of visitors`;
  } else if (user_ratings_total > 20) {
    reviewText = ` from many visitors`;
  }

  return `${baseDescription}${ratingText}${reviewText}. Perfect for your journey!`;
};
