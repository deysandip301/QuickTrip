// controllers/tripController.js
// Handles the logic for the /trip endpoint. It orchestrates calls to various services.

import { getPlaces } from '../services/googleMapsService.js';
import { buildGraphAndFindJourney } from '../services/graphSercice.js';

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
    }

    // --- Step 3: Return the Result ---
    console.log(`✅ Generated ${journeyMode} journey with ${journey.length} stops`);
    res.status(200).json(journey);

  } catch (error) {
    console.error('Error in tripExperience:', error);
    res.status(500).json({ message: error.message || 'An internal server error occurred.' });
  }
};
