// controllers/tripController.js
// Handles the logic for the /trip endpoint. It orchestrates calls to various services.

import { getPlaces } from '../services/googleMapsService.js';
import { buildGraphAndFindJourney } from '../services/graphSercice.js';

export const tripExperience = async (req, res) => {
    try {
    console.log('Received request for trip experience:', req.body);
    const { location, preferences, duration, budget } = req.body;

    // --- Input Validation ---
    if (!location || !preferences || !duration || !budget) {
      return res.status(400).json({ message: 'Missing required input parameters.' });
    }
    if (Object.keys(preferences).length === 0) {
      return res.status(400).json({ message: 'At least one preference must be selected.'});
    }

    // --- Step 1: Fetch POIs (Nodes) ---
    // Get a list of potential places (Points of Interest) based on user preferences.
    const places = await getPlaces(location, preferences);
    if (places.length < 2) {
      return res.status(404).json({ message: 'Not enough interesting places found nearby. Try a different location or more interests.' });
    }
    
    // --- Step 2: Build Graph & Find Optimal Journey ---
    // This is the core logic where the graph is constructed and Dijkstra's is run.
    const journey = await buildGraphAndFindJourney(places, preferences, duration, budget);
    
    if (!journey || journey.length === 0) {
      return res.status(404).json({ message: 'Could not create a suitable journey with the given constraints.' });
    }

    // --- Step 3: Return the Result ---
    res.status(200).json(journey);

  } catch (error) {
    console.error('Error in tripExperience:', error);
    res.status(500).json({ message: error.message || 'An internal server error occurred.' });
  }
};
