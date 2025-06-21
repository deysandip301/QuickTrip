// services/graphService.js
// The core of the application. Builds the graph and uses Dijkstra's algorithm.

import { getDistanceMatrix } from './googleMapsService.js';
import TinyQueue from 'tinyqueue';

/**
 * The main orchestrator function for this service.
 */
export const buildGraphAndFindJourney = async (places, preferences, maxDuration, maxBudget, startPoint, endPoint, journeyMode = 'currentLocation') => {
  console.log(`🚀 Building journey in ${journeyMode} mode`);
  
  // Step 1: Get travel times between all places. This forms our graph's edges.
  const distanceMatrix = await getDistanceMatrix(places);
  if (!distanceMatrix) return [];

  const placeMap = new Map(places.map((p, i) => [p.placeId, { ...p, index: i }]));

  // Step 2: Handle different journey modes
  let journey = [];
  
  if (journeyMode === 'currentLocation') {
    // Current Location Mode: Circular journey starting and ending at current location
    console.log('📍 Creating circular journey from current location');
    journey = await createCircularJourney(places, preferences, maxDuration, maxBudget, startPoint, distanceMatrix);
  } else if (journeyMode === 'customRoute') {
    // Custom Route Mode: Journey from start point to end point
    console.log('🗺️ Creating point-to-point journey');
    journey = await createPointToPointJourney(places, preferences, maxDuration, maxBudget, startPoint, endPoint, distanceMatrix);
  }

  console.log(`✅ Generated journey with ${journey.length} stops`);
  return journey;
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
 * Enhanced to create longer, more diverse journeys.
 */
const findOptimalJourney = (places, placeMap, distances, previous, startIndex, maxDuration, maxBudget, distanceMatrix) => {
    console.log(`Finding optimal journey with startIndex: ${startIndex}, maxDuration: ${maxDuration}, maxBudget: ${maxBudget}`);
    console.log(`Total places: ${places.length}`);
    
    let bestJourney = [];
    let bestJourneyScore = -1;

    // Try to create a comprehensive journey by following the shortest path tree
    // but also considering multiple branches for variety
    const createGreedyJourney = () => {
        const visited = new Set();
        const journey = [places[startIndex]];
        visited.add(startIndex);
        
        let currentIndex = startIndex;
        let totalTime = places[startIndex].estimatedVisitDuration || 30; // Reduced halt time from 45 to 30 minutes
        let totalCost = places[startIndex].estimatedCost || 20;
        
        console.log(`Starting greedy journey from: ${places[startIndex].name}`);
        
        while (journey.length < Math.min(places.length, 12)) { // Increased to allow up to 12 places for longer journeys
            let bestNext = -1;
            let bestScore = Infinity;
            
            // Find the best unvisited place to go next
            for (let i = 0; i < places.length; i++) {
                if (visited.has(i)) continue;
                
                const candidate = places[i];
                const travelData = distanceMatrix.rows[currentIndex]?.elements[i];
                
                if (!travelData || travelData.status !== 'OK') continue;
                
                const travelTime = travelData.duration.value / 60; // minutes
                const visitTime = candidate.estimatedVisitDuration || 15; // Reduced halt time
                const visitCost = candidate.estimatedCost || 20;
                
                const projectedTime = totalTime + travelTime + visitTime;
                const projectedCost = totalCost + visitCost;
                
                // Check if we can afford this place
                if (projectedTime > maxDuration || projectedCost > maxBudget) {
                    continue;
                }
                
                // Score based on distance, rating, and variety
                const distanceScore = distances[i] || Infinity;
                const ratingBonus = (candidate.rating || 3) * 10;
                const varietyBonus = getVarietyBonus(candidate, journey);
                
                const score = distanceScore - ratingBonus - varietyBonus;
                
                if (score < bestScore) {
                    bestScore = score;
                    bestNext = i;
                }
            }
            
            if (bestNext === -1) {
                console.log(`No more reachable places. Journey has ${journey.length} stops.`);
                break;
            }
            
            // Add the best next place
            const nextPlace = places[bestNext];
            const travelData = distanceMatrix.rows[currentIndex].elements[bestNext];
            const travelTime = travelData.duration.value / 60;
            
            journey.push(nextPlace);
            visited.add(bestNext);
            
            totalTime += travelTime + (nextPlace.estimatedVisitDuration || 15); // Reduced halt time
            totalCost += nextPlace.estimatedCost || 20;
            currentIndex = bestNext;
            
            console.log(`Added: ${nextPlace.name} (Total time: ${totalTime.toFixed(1)}min, cost: ${totalCost})`);
        }
        
        return { journey, totalTime, totalCost };
    };
    
    // Helper function to give bonus for place type variety
    const getVarietyBonus = (candidate, currentJourney) => {
        const journeyTypes = new Set();
        currentJourney.forEach(place => {
            place.types.forEach(type => journeyTypes.add(type));
        });
        
        const newTypes = candidate.types.filter(type => !journeyTypes.has(type));
        return newTypes.length * 20; // Bonus for adding new types
    };
    
    // Create the greedy journey
    const greedyResult = createGreedyJourney();
    
    if (greedyResult.journey.length > 1) {
        console.log(`✅ Greedy journey created with ${greedyResult.journey.length} places`);
        bestJourney = greedyResult.journey;
        bestJourneyScore = greedyResult.journey.length;
    }
    
    // Also try some traditional Dijkstra paths as alternatives
    for (let i = 0; i < Math.min(places.length, 5); i++) {
        if (i === startIndex) continue;
        
        const path = [];
        let currentNodeIndex = i;
        while (currentNodeIndex !== null && currentNodeIndex !== undefined) {
            path.unshift(places[currentNodeIndex]);
            currentNodeIndex = previous[currentNodeIndex];
        }

        if (path.length === 0 || path[0].placeId !== places[startIndex].placeId) {
            continue;
        }

        let currentTotalTime = 0;
        let currentTotalCost = 0;

        for (let j = 0; j < path.length; j++) {
            const stop = path[j];
            currentTotalTime += stop.estimatedVisitDuration || 15; // Reduced halt time
            currentTotalCost += stop.estimatedCost || 20;

            if (j > 0) {
                const prevStopIndex = places.findIndex(p => p.placeId === path[j-1].placeId);
                const currentStopIndex = places.findIndex(p => p.placeId === stop.placeId);
                
                if (distanceMatrix.rows[prevStopIndex] && distanceMatrix.rows[prevStopIndex].elements[currentStopIndex]) {
                    const leg = distanceMatrix.rows[prevStopIndex].elements[currentStopIndex];
                    const travelTimeMinutes = leg.duration.value / 60;
                    currentTotalTime += travelTimeMinutes;
                }
            }
        }
        
        if (currentTotalTime <= maxDuration && currentTotalCost <= maxBudget) {
            if (path.length > bestJourneyScore) {
                bestJourneyScore = path.length;
                bestJourney = path;
                console.log(`✅ Found better Dijkstra path with ${path.length} places`);
            }
        }
    }
    
    console.log(`Best journey found:`, bestJourney.map(p => p.name));
    
    // Add travel details to the final journey for frontend display
    return addTravelDetailsToJourney(bestJourney, distanceMatrix, places);
};


/**
 * Enriches the final journey with step-by-step travel details.
 */
function addTravelDetailsToJourney(journey, distanceMatrix, places) {
    if (journey.length < 2) return journey;
    
    const enrichedJourney = [];
    
    for(let i = 0; i < journey.length; i++) {
        enrichedJourney.push({ ...journey[i] });
        
        if(i < journey.length - 1) {
            // Find indices of current and next places
            const currentIndex = places.findIndex(p => p.placeId === journey[i].placeId);
            const nextIndex = places.findIndex(p => p.placeId === journey[i + 1].placeId);
            
            let duration = '15 mins';
            let distance = '5 km';
              // Get real travel data if available
            if (currentIndex !== -1 && nextIndex !== -1 && 
                distanceMatrix.rows[currentIndex] && 
                distanceMatrix.rows[currentIndex].elements[nextIndex] &&
                distanceMatrix.rows[currentIndex].elements[nextIndex].status === 'OK') {
                
                const element = distanceMatrix.rows[currentIndex].elements[nextIndex];
                duration = String(element.duration.text || '15 min'); // Ensure it's a string
                distance = String(element.distance.text || '5 km'); // Ensure it's a string
            }
            
            enrichedJourney.push({
                isTravelLeg: true,
                duration,
                distance,
                from: journey[i].name,
                to: journey[i + 1].name
            });
        }
    }
    
    return enrichedJourney;
}

/**
 * Find the nearest place to a given coordinate
 */
const findNearestPlace = (places, targetPoint) => {
  let nearestIndex = 0;
  let minDistance = Infinity;

  places.forEach((place, index) => {
    const distance = calculateHaversineDistance(
      targetPoint.lat, targetPoint.lng,
      place.location.lat, place.location.lng
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
};

/**
 * Find the best end node for a journey (typically farthest high-rated place from start)
 */
const findBestEndNode = (places, startIndex) => {
  let bestEndIndex = startIndex;
  let bestScore = -1;

  places.forEach((place, index) => {
    if (index === startIndex) return;
    
    // Calculate distance from start
    const distance = calculateHaversineDistance(
      places[startIndex].location.lat, places[startIndex].location.lng,
      place.location.lat, place.location.lng
    );
    
    // Score based on rating and distance (want good places that are reasonably far)
    const score = place.rating * Math.min(distance / 1000, 5); // Max 5km bonus
    
    if (score > bestScore) {
      bestScore = score;
      bestEndIndex = index;
    }
  });

  return bestEndIndex;
};

/**
 * Calculate Haversine distance between two points in meters
 */
const calculateHaversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
           Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};


/**
 * Helper functions for distance matrix operations
 */
const getDistanceFromMatrix = (distanceMatrix, fromIndex, toIndex) => {
    try {
        const element = distanceMatrix.rows[fromIndex].elements[toIndex];
        if (element.status === 'OK') {
            return element.distance.value; // in meters
        }
        return null;
    } catch (error) {
        return null;
    }
};

const getTravelTimeFromMatrix = (distanceMatrix, fromIndex, toIndex) => {
    try {
        const element = distanceMatrix.rows[fromIndex].elements[toIndex];
        if (element.status === 'OK') {
            return element.duration.value / 60; // in minutes
        }
        return 0;
    } catch (error) {
        return 0;
    }
};

const getDistanceDisplayFromMatrix = (distanceMatrix, fromIndex, toIndex) => {
    try {
        const element = distanceMatrix.rows[fromIndex].elements[toIndex];
        if (element.status === 'OK') {
            return element.distance.text;
        }
        return 'Unknown distance';
    } catch (error) {
        return 'Unknown distance';
    }
};

/**
 * Find optimal journey with specific start and end points using route optimization
 */
const findOptimalJourneyWithRoute = (places, placeMap, startIndex, endIndex, maxDuration, maxBudget, distanceMatrix, preferences) => {
    console.log(`Creating route from ${places[startIndex].name} to ${places[endIndex].name} using Dijkstra.`);

    // 1. Run Dijkstra from start node to find the "cheapest" path backbone
    const { previous } = dijkstra(startIndex, places, distanceMatrix, preferences);

    // 2. Reconstruct the base path from start to end
    let journey = [];
    let currentNode = endIndex;

    // Handle cases where the end is not reachable from the start
    if (previous[currentNode] === null && currentNode !== startIndex) {
        console.warn(`End node ${places[endIndex].name} is not reachable from start node ${places[startIndex].name}. Creating a direct journey.`);
        const directJourney = [places[startIndex]];
        if (startIndex !== endIndex) {
            directJourney.push(places[endIndex]);
        }
        return addTravelDetailsToJourney(directJourney, distanceMatrix, places);
    }

    let pathSet = new Set();
    while (currentNode !== null) {
        if (pathSet.has(currentNode)) {
            console.error("Cycle detected in path reconstruction. Aborting.");
            const directJourney = [places[startIndex]];
            if (startIndex !== endIndex) {
                directJourney.push(places[endIndex]);
            }
            return addTravelDetailsToJourney(directJourney, distanceMatrix, places);
        }
        pathSet.add(currentNode);
        journey.unshift(places[currentNode]);
        if (currentNode === startIndex) break;
        currentNode = previous[currentNode];
    }

    if (journey.length === 0 || journey[0].placeId !== places[startIndex].placeId) {
        console.error("Could not reconstruct a valid path from start to end. Creating a direct journey.");
        const directJourney = [places[startIndex]];
        if (startIndex !== endIndex) {
            directJourney.push(places[endIndex]);
        }
        return addTravelDetailsToJourney(directJourney, distanceMatrix, places);
    }

    // Helper to calculate journey metrics
    const calculateJourneyMetrics = (path) => {
        let totalTime = 0;
        let totalBudget = 0;
        for (let i = 0; i < path.length; i++) {
            const place = path[i];
            totalTime += place.estimatedVisitDuration || 15;
            totalBudget += place.estimatedCost || 20;

            if (i > 0) {
                const fromIndex = places.findIndex(p => p.placeId === path[i - 1].placeId);
                const toIndex = places.findIndex(p => p.placeId === path[i].placeId);
                totalTime += getTravelTimeFromMatrix(distanceMatrix, fromIndex, toIndex) || 0;
            }
        }
        return { totalTime, totalBudget };
    };

    // 3. Greedily insert other places into the path if they fit the budget and duration
    const candidatePlaces = places.filter(p => !journey.some(jp => jp.placeId === p.placeId));
    
    let wasInsertionMade = true;
    while (wasInsertionMade) {
        wasInsertionMade = false;
        let bestInsertion = null; // { place, insertionIndex, score }

        for (const candidate of candidatePlaces) {
            const candidateIndex = places.findIndex(p => p.placeId === candidate.placeId);

            for (let i = 0; i < journey.length - 1; i++) {
                const fromNode = journey[i];
                const toNode = journey[i + 1];
                const fromIndex = places.findIndex(p => p.placeId === fromNode.placeId);
                const toIndex = places.findIndex(p => p.placeId === toNode.placeId);

                const originalTravelTime = getTravelTimeFromMatrix(distanceMatrix, fromIndex, toIndex);
                const detourTravelTime1 = getTravelTimeFromMatrix(distanceMatrix, fromIndex, candidateIndex);
                const detourTravelTime2 = getTravelTimeFromMatrix(distanceMatrix, candidateIndex, toIndex);

                if (originalTravelTime === null || detourTravelTime1 === null || detourTravelTime2 === null) continue;

                const potentialJourney = [...journey.slice(0, i + 1), candidate, ...journey.slice(i + 1)];
                const { totalTime, totalBudget } = calculateJourneyMetrics(potentialJourney);

                if (totalTime <= maxDuration && totalBudget <= maxBudget) {
                    const extraTime = (detourTravelTime1 + detourTravelTime2) - originalTravelTime;
                    const score = (candidate.rating || 3.5) / (extraTime + 1); // Higher rating and lower detour time is better

                    if (!bestInsertion || score > bestInsertion.score) {
                        bestInsertion = {
                            place: candidate,
                            insertionIndex: i + 1,
                            score,
                        };
                    }
                }
            }
        }

        if (bestInsertion) {
            journey.splice(bestInsertion.insertionIndex, 0, bestInsertion.place);
            const indexToRemove = candidatePlaces.findIndex(p => p.placeId === bestInsertion.place.placeId);
            if (indexToRemove > -1) {
                candidatePlaces.splice(indexToRemove, 1);
            }
            wasInsertionMade = true;
            console.log(`Inserted ${bestInsertion.place.name} into the journey.`);
        }
    }

    console.log(`Final journey has ${journey.length} stops.`);
    const finalJourneyWithDetails = addTravelDetailsToJourney(journey, distanceMatrix, places);
    
    const { totalTime, totalBudget } = calculateJourneyMetrics(journey);
    console.log(`Final journey: ${journey.length} stops, ${totalTime.toFixed(0)}min, $${totalBudget}`);
    
    return finalJourneyWithDetails;
};


/**
 * Creates a circular journey starting and ending at the current location
 * Optimized for exploring places around a central point
 */
const createCircularJourney = async (places, preferences, maxDuration, maxBudget, startPoint, distanceMatrix) => {
  console.log('🔄 Creating circular journey from current location');
  
  // Find the nearest place to the start point as our actual starting place
  const startNodeIndex = findNearestPlace(places, startPoint);
  const startPlace = places[startNodeIndex];
  
  console.log(`Starting from: ${startPlace.name}`);
  
  // Create a greedy journey that explores nearby places and returns to start
  const visited = new Set([startNodeIndex]);
  const journey = [{
    ...startPlace,
    isStartPoint: true,
    visitOrder: 1
  }];
  
  let currentIndex = startNodeIndex;
  let totalTime = startPlace.estimatedVisitDuration || 30;
  let totalCost = startPlace.estimatedCost || 20;
  let visitOrder = 2;
  
  // Continue adding places until we run out of time or budget
  while (visited.size < Math.min(places.length, 10)) { // Max 10 places for a good circular journey
    let bestNext = -1;
    let bestScore = Infinity;
    
    // Find the best unvisited place
    for (let i = 0; i < places.length; i++) {
      if (visited.has(i)) continue;
      
      const candidate = places[i];
      const travelData = distanceMatrix.rows[currentIndex]?.elements[i];
      const returnData = distanceMatrix.rows[i]?.elements[startNodeIndex]; // Travel back to start
      
      if (!travelData || travelData.status !== 'OK' || !returnData || returnData.status !== 'OK') continue;
      
      const travelTime = travelData.duration.value / 60; // minutes
      const returnTime = returnData.duration.value / 60; // minutes to get back to start
      const visitTime = candidate.estimatedVisitDuration || 30;
      const visitCost = candidate.estimatedCost || 20;
      
      // Check if we can visit this place and still return to start
      const projectedTime = totalTime + travelTime + visitTime + returnTime;
      const projectedCost = totalCost + visitCost;
      
      if (projectedTime > maxDuration || projectedCost > maxBudget) {
        continue;
      }
      
      // Score based on rating, distance, and preference match
      const distanceScore = travelTime; // Prefer closer places
      const ratingBonus = (candidate.rating || 3) * 20;
      const preferenceBonus = getPreferenceScore(candidate, preferences) * 30;
      
      const score = distanceScore - ratingBonus - preferenceBonus;
      
      if (score < bestScore) {
        bestScore = score;
        bestNext = i;
      }
    }
    
    if (bestNext === -1) {
      console.log(`No more reachable places for circular journey. Current stops: ${journey.length}`);
      break;
    }
    
    // Add the next place
    const nextPlace = places[bestNext];
    const travelData = distanceMatrix.rows[currentIndex].elements[bestNext];
    const travelTime = travelData.duration.value / 60;
      // Add travel leg
    journey.push({
      isTravelLeg: true,
      from: places[currentIndex].name,
      to: nextPlace.name,
      duration: travelData.duration.text || `${Math.round(travelTime)} min`,
      distance: travelData.distance.text,
      mode: 'driving'
    });
    
    // Add the place
    journey.push({
      ...nextPlace,
      visitOrder: visitOrder++,
      arrivalTime: totalTime + travelTime
    });
    
    visited.add(bestNext);
    totalTime += travelTime + (nextPlace.estimatedVisitDuration || 30);
    totalCost += nextPlace.estimatedCost || 20;
    currentIndex = bestNext;
    
    console.log(`Added: ${nextPlace.name} (Total time: ${totalTime.toFixed(1)}min, cost: ₹${totalCost})`);
  }
  
  // Add return journey to start
  if (currentIndex !== startNodeIndex) {
    const returnData = distanceMatrix.rows[currentIndex].elements[startNodeIndex];
    if (returnData && returnData.status === 'OK') {
      const returnTime = returnData.duration.value / 60;
        journey.push({
        isTravelLeg: true,
        from: places[currentIndex].name,
        to: startPlace.name,
        duration: returnData.duration.text || `${Math.round(returnTime)} min`,
        distance: returnData.distance.text,
        mode: 'driving'
      });
      
      // Add end point (same as start)
      journey.push({
        ...startPlace,
        isEndPoint: true,
        visitOrder: visitOrder++,
        arrivalTime: totalTime + returnTime
      });
      
      totalTime += returnTime;
    }
  }
  
  console.log(`🔄 Circular journey completed: ${visited.size} places, ${totalTime.toFixed(1)} minutes, ₹${totalCost}`);
  return journey;
};

/**
 * Creates a point-to-point journey from start to end with interesting places in between
 */
const createPointToPointJourney = async (places, preferences, maxDuration, maxBudget, startPoint, endPoint, distanceMatrix) => {
  console.log('🎯 Creating point-to-point journey');
  
  // Find nearest places to start and end points
  const startNodeIndex = findNearestPlace(places, startPoint);
  const endNodeIndex = findNearestPlace(places, endPoint);
  
  const startPlace = places[startNodeIndex];
  const endPlace = places[endNodeIndex];
  
  console.log(`Journey from: ${startPlace.name} to: ${endPlace.name}`);
  
  // Check direct travel time between start and end
  const directTravelData = distanceMatrix.rows[startNodeIndex]?.elements[endNodeIndex];
  if (!directTravelData || directTravelData.status !== 'OK') {
    throw new Error('Cannot calculate route between start and end points');
  }
  
  const directTravelTime = directTravelData.duration.value / 60; // minutes
  const minRequiredTime = directTravelTime + (startPlace.estimatedVisitDuration || 30) + (endPlace.estimatedVisitDuration || 30);
  
  if (minRequiredTime > maxDuration) {
    console.log('⚠️ Not enough time for direct journey, creating minimal route');
    return createMinimalPointToPointJourney(startPlace, endPlace, directTravelData);
  }
  
  // Create journey with intermediate stops
  const visited = new Set([startNodeIndex, endNodeIndex]);
  const journey = [{
    ...startPlace,
    isStartPoint: true,
    visitOrder: 1
  }];
  
  let currentIndex = startNodeIndex;
  let totalTime = startPlace.estimatedVisitDuration || 30;
  let totalCost = startPlace.estimatedCost || 20;
  let visitOrder = 2;
  
  // Find intermediate places that are roughly on the path from start to end
  const intermediatePlaces = findIntermediatePlaces(places, startNodeIndex, endNodeIndex, visited);
  
  // Add intermediate places
  for (const placeIndex of intermediatePlaces) {
    const candidate = places[placeIndex];
    const travelToCandidate = distanceMatrix.rows[currentIndex]?.elements[placeIndex];
    const candidateToEnd = distanceMatrix.rows[placeIndex]?.elements[endNodeIndex];
    
    if (!travelToCandidate || travelToCandidate.status !== 'OK' || 
        !candidateToEnd || candidateToEnd.status !== 'OK') continue;
    
    const travelTime = travelToCandidate.duration.value / 60;
    const remainingTimeToEnd = candidateToEnd.duration.value / 60;
    const visitTime = candidate.estimatedVisitDuration || 30;
    const visitCost = candidate.estimatedCost || 20;
    const endVisitTime = endPlace.estimatedVisitDuration || 30;
    
    // Check if we can visit this place and still reach the end
    const projectedTime = totalTime + travelTime + visitTime + remainingTimeToEnd + endVisitTime;
    const projectedCost = totalCost + visitCost + (endPlace.estimatedCost || 20);
    
    if (projectedTime > maxDuration || projectedCost > maxBudget) {
      console.log(`Skipping ${candidate.name} - would exceed constraints`);
      continue;
    }
      // Add travel leg
    journey.push({
      isTravelLeg: true,
      from: places[currentIndex].name,
      to: candidate.name,
      duration: travelToCandidate.duration.text || `${Math.round(travelTime)} min`,
      distance: travelToCandidate.distance.text,
      mode: 'driving'
    });
    
    // Add the place
    journey.push({
      ...candidate,
      visitOrder: visitOrder++,
      arrivalTime: totalTime + travelTime
    });
    
    visited.add(placeIndex);
    totalTime += travelTime + visitTime;
    totalCost += visitCost;
    currentIndex = placeIndex;
    
    console.log(`Added intermediate: ${candidate.name} (Total time: ${totalTime.toFixed(1)}min, cost: ₹${totalCost})`);
  }
  
  // Add final travel to end point
  const finalTravelData = distanceMatrix.rows[currentIndex].elements[endNodeIndex];
  if (finalTravelData && finalTravelData.status === 'OK') {
    const finalTravelTime = finalTravelData.duration.value / 60;
      journey.push({
      isTravelLeg: true,
      from: places[currentIndex].name,
      to: endPlace.name,
      duration: finalTravelData.duration.text || `${Math.round(finalTravelTime)} min`,
      distance: finalTravelData.distance.text,
      mode: 'driving'
    });
    
    totalTime += finalTravelTime;
  }
  
  // Add end point
  journey.push({
    ...endPlace,
    isEndPoint: true,
    visitOrder: visitOrder++,
    arrivalTime: totalTime
  });
  
  totalTime += endPlace.estimatedVisitDuration || 30;
  totalCost += endPlace.estimatedCost || 20;
  
  console.log(`🎯 Point-to-point journey completed: ${visited.size} places, ${totalTime.toFixed(1)} minutes, ₹${totalCost}`);
  return journey;
};

/**
 * Creates a minimal journey with just start and end points
 */
const createMinimalPointToPointJourney = (startPlace, endPlace, travelData) => {
  const travelTime = travelData.duration.value / 60;
  
  return [
    {
      ...startPlace,
      isStartPoint: true,
      visitOrder: 1
    },    {
      isTravelLeg: true,
      from: startPlace.name,
      to: endPlace.name,
      duration: travelData.duration.text || `${Math.round(travelTime)} min`,
      distance: travelData.distance.text,
      mode: 'driving'
    },
    {
      ...endPlace,
      isEndPoint: true,
      visitOrder: 2,
      arrivalTime: travelTime
    }
  ];
};

/**
 * Find places that are roughly between start and end points
 */
const findIntermediatePlaces = (places, startIndex, endIndex, visited) => {
  const startPlace = places[startIndex];
  const endPlace = places[endIndex];
  
  const candidates = [];
  
  for (let i = 0; i < places.length; i++) {
    if (visited.has(i)) continue;
    
    const place = places[i];
    
    // Calculate if this place is roughly on the path between start and end
    const distToStart = calculateHaversineDistance(
      startPlace.location.lat, startPlace.location.lng,
      place.location.lat, place.location.lng
    );
    
    const distToEnd = calculateHaversineDistance(
      place.location.lat, place.location.lng,
      endPlace.location.lat, endPlace.location.lng
    );
    
    const directDist = calculateHaversineDistance(
      startPlace.location.lat, startPlace.location.lng,
      endPlace.location.lat, endPlace.location.lng
    );
    
    // Place is "on the way" if the sum of distances to start and end is not much more than direct distance
    const pathDeviation = (distToStart + distToEnd) / directDist;
    
    if (pathDeviation < 1.5) { // Allow 50% deviation from direct path
      candidates.push({
        index: i,
        place: place,
        deviation: pathDeviation,
        rating: place.rating || 3
      });
    }
  }
  
  // Sort by rating and path deviation
  candidates.sort((a, b) => {
    const scoreA = a.rating * 2 - a.deviation;
    const scoreB = b.rating * 2 - b.deviation;
    return scoreB - scoreA;
  });
  
  // Return top candidates (max 5 intermediate places)
  return candidates.slice(0, 5).map(c => c.index);
};

/**
 * Calculate preference score for a place
 */
const getPreferenceScore = (place, preferences) => {
  let score = 0;
  const selectedPreferences = Object.keys(preferences).filter(key => preferences[key]);
  
  for (const prefType of selectedPreferences) {
    if (place.types.includes(prefType)) {
      score += 1;
    }
  }
  
  return score;
};

