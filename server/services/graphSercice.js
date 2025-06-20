// services/graphService.js
// The core of the application. Builds the graph and uses Dijkstra's algorithm.

import { getDistanceMatrix } from './googleMapsService.js';
import TinyQueue from 'tinyqueue';

/**
 * The main orchestrator function for this service.
 */
export const buildGraphAndFindJourney = async (places, preferences, maxDuration, maxBudget) => {
  // Step 1: Get travel times between all places. This forms our graph's edges.
  const distanceMatrix = await getDistanceMatrix(places);
  if (!distanceMatrix) return [];

  const placeMap = new Map(places.map((p, i) => [p.placeId, { ...p, index: i }]));

  // Step 2: Run Dijkstra's from a starting node to find the 'cheapest' path to all other nodes.
  // We'll pick the highest-rated place as a potential starting point.
  const startNodeIndex = findBestStartNode(places);
    const { distances, previous } = dijkstra(startNodeIndex, places, distanceMatrix, preferences);
    
    console.log('Dijkstra Results:', { distances, previous });
  // Step 3: Reconstruct paths from Dijkstra's results and find the best one that fits user constraints.
    const optimalJourney = findOptimalJourney(places, placeMap, distances, previous, startNodeIndex, maxDuration, maxBudget, distanceMatrix);

    console.log('Optimal Journey:', optimalJourney);
    return optimalJourney;
};

/**
 * Finds the best starting node, typically the one with the highest rating.
 */
const findBestStartNode = (places) => {
  return places.reduce((bestIndex, place, currentIndex, arr) => {
    return (place.rating > arr[bestIndex].rating) ? currentIndex : bestIndex;
  }, 0);
};

/**
 * Implementation of Dijkstra's algorithm to find the shortest path from a start node.
 * @returns {Object} An object containing distances and previous nodes for path reconstruction.
 */
const dijkstra = (startIndex, places, distanceMatrix, preferences) => {
  const n = places.length;
  const distances = Array(n).fill(Infinity);
  const previous = Array(n).fill(null);
  distances[startIndex] = 0;

  const pq = new TinyQueue([{ node: startIndex, priority: 0 }], (a, b) => a.priority - b.priority);

  while (pq.length > 0) {
    const { node: u, priority: u_dist } = pq.pop();

    if (u_dist > distances[u]) continue;

    for (let v = 0; v < n; v++) {
      if (u === v) continue;

      const edgeData = distanceMatrix.rows[u].elements[v];
      if (edgeData.status !== 'OK') continue;
      
      const travelTime = edgeData.duration.value / 60; // in minutes
      const destinationPlace = places[v];
      
      // The "cost" function: a blend of time and preference mismatch.
      const isPreferred = Object.keys(preferences).some(p => preferences[p] && destinationPlace.types.includes(p));
      const preferencePenalty = isPreferred ? 0 : 50; // Heavy penalty for non-preferred types
      const ratingPenalty = (5 - destinationPlace.rating) * 10; // Penalize lower-rated places

      const weight = travelTime + preferencePenalty + ratingPenalty;
      const newDist = distances[u] + weight;

      if (newDist < distances[v]) {
        distances[v] = newDist;
        previous[v] = u;
        pq.push({ node: v, priority: newDist });
      }
    }
  }
  return { distances, previous };
};

/**
 * Reconstructs the path and finds the best journey that fits time and budget constraints.
 */
const findOptimalJourney = (places, placeMap, distances, previous, startIndex, maxDuration, maxBudget, distanceMatrix) => {
    console.log(`Finding optimal journey with startIndex: ${startIndex}, maxDuration: ${maxDuration}, maxBudget: ${maxBudget}`);
    console.log(`Total places: ${places.length}`);
    
    let bestJourney = [];
    let bestJourneyScore = -1;

    // Iterate through all possible end-points
    for (let i = 0; i < places.length; i++) {
        const path = [];
        let currentTotalTime = 0;
        let currentTotalCost = 0;
        
        // Reconstruct path from end-point 'i' back to the start
        let currentNodeIndex = i;
        while (currentNodeIndex !== null && currentNodeIndex !== undefined) {
            path.unshift(places[currentNodeIndex]);
            currentNodeIndex = previous[currentNodeIndex];
        }

        // Skip if path doesn't start from our start node
        if (path.length === 0) {
            console.log(`Skipping endpoint ${i}: empty path`);
            continue;
        }

        // Find the actual index of the first place in our places array
        const firstPlaceIndex = places.findIndex(p => p.placeId === path[0].placeId);
        if (firstPlaceIndex !== startIndex) {
            console.log(`Skipping endpoint ${i}: path doesn't start from startIndex ${startIndex}, starts from ${firstPlaceIndex}`);
            continue;
        }

        console.log(`Evaluating path to endpoint ${i}:`, path.map(p => p.name));

        // Calculate total time and cost for this path
        for (let j = 0; j < path.length; j++) {
            const stop = path[j];
            currentTotalTime += stop.estimatedVisitDuration || 60; // Default 60 minutes if not specified
            currentTotalCost += stop.estimatedCost || 20; // Default cost if not specified

            if (j > 0) {
                const prevStopIndex = places.findIndex(p => p.placeId === path[j-1].placeId);
                const currentStopIndex = places.findIndex(p => p.placeId === stop.placeId);
                
                if (distanceMatrix.rows[prevStopIndex] && distanceMatrix.rows[prevStopIndex].elements[currentStopIndex]) {
                    const leg = distanceMatrix.rows[prevStopIndex].elements[currentStopIndex];
                    const travelTimeMinutes = leg.duration.value / 60;
                    currentTotalTime += travelTimeMinutes;
                    console.log(`  Travel from ${path[j-1].name} to ${stop.name}: ${travelTimeMinutes.toFixed(1)} mins`);
                }
            }
        }
        
        console.log(`  Path total time: ${currentTotalTime.toFixed(1)} mins, cost: ${currentTotalCost}`);
        
        // Check if this path fits within the user's constraints
        if (currentTotalTime <= maxDuration && currentTotalCost <= maxBudget) {
            console.log(`  ✅ Path fits constraints! Length: ${path.length}`);
            // "Score" this valid journey. A longer journey is generally better.
            if (path.length > bestJourneyScore) {
                bestJourneyScore = path.length;
                bestJourney = path;
                console.log(`  ✅ New best journey with ${path.length} places`);
            }
        } else {
            console.log(`  ❌ Path exceeds constraints (time: ${currentTotalTime > maxDuration ? 'over' : 'ok'}, budget: ${currentTotalCost > maxBudget ? 'over' : 'ok'})`);
        }
    }
    
    console.log(`Best journey found:`, bestJourney.map(p => p.name));
    
    // Add travel details to the final journey for frontend display
    return addTravelDetailsToJourney(bestJourney, distanceMatrix);
};


/**
 * Enriches the final journey with step-by-step travel details.
 */
function addTravelDetailsToJourney(journey, distanceMatrix) {
    if (journey.length < 2) return journey;
    
    // First, we need to get access to the original places array to find indices
    const enrichedJourney = [];
    for(let i = 0; i < journey.length; i++) {
        enrichedJourney.push({ ...journey[i] });
        if(i < journey.length - 1) {
            // For now, just add basic travel info - we'll enhance this later
            enrichedJourney.push({
                isTravelLeg: true,
                duration: '15 mins', // Placeholder - we'll calculate this properly
                distance: '5 km'     // Placeholder - we'll calculate this properly
            });
        }
    }
    return enrichedJourney;
}

