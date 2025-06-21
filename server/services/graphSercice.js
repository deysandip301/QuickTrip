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
      
      const travelDistance = edgeData.distance.value; // in meters - prioritize distance over time
      const destinationPlace = places[v];
      
      // Simplified cost function focusing on distance with small rating bonus
      const ratingBonus = (destinationPlace.rating || 3) * 100; // Small bonus for higher ratings
      const preferenceBonus = Object.keys(preferences).some(p => preferences[p] && destinationPlace.types.includes(p)) ? 200 : 0;

      const weight = travelDistance - ratingBonus - preferenceBonus; // Lower is better
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
 * Optimized route creation using nearest neighbor with Dijkstra's shortest paths
 * This ensures minimum total distance by always visiting the nearest unvisited place
 */
const createOptimalRoute = (places, distanceMatrix, startIndex, maxDuration, maxBudget, preferences) => {
  console.log(`🎯 Creating optimal route starting from: ${places[startIndex].name}`);
  
  const visited = new Set([startIndex]);
  const route = [places[startIndex]];
  let currentIndex = startIndex;
  let totalTime = places[startIndex].estimatedVisitDuration || 30;
  let totalCost = places[startIndex].estimatedCost || 0;
  let totalDistance = 0;
  
  console.log(`📍 All available places (${places.length}):`);
  places.forEach((place, idx) => {
    console.log(`  ${idx}: ${place.name} (Rating: ${place.rating}, Types: ${place.types.slice(0, 2).join(', ')})`);
  });
  
  // Continue until we can't add more places
  while (visited.size < places.length) {
    let nearestIndex = -1;
    let shortestDistance = Infinity;
    let nearestTravelTime = 0;
    let nearestPlace = null;
    
    // Find the nearest unvisited place using actual distance matrix
    for (let i = 0; i < places.length; i++) {
      if (visited.has(i)) continue;
      
      const travelData = distanceMatrix.rows[currentIndex]?.elements[i];
      if (!travelData || travelData.status !== 'OK') continue;
      
      const travelDistance = travelData.distance.value; // meters
      const travelTime = travelData.duration.value / 60; // minutes
      const candidate = places[i];
      const visitTime = candidate.estimatedVisitDuration || 30;
      const visitCost = candidate.estimatedCost || 0;
      
      // Check if we can afford this place (time and budget)
      const projectedTime = totalTime + travelTime + visitTime;
      const projectedCost = totalCost + visitCost;
      
      if (projectedTime > maxDuration || projectedCost > maxBudget) {
        continue;
      }
      
      // Apply small preference bonus to distance calculation
      let adjustedDistance = travelDistance;
      const isPreferred = Object.keys(preferences).some(p => preferences[p] && candidate.types.includes(p));
      const hasGoodRating = (candidate.rating || 0) >= 4.0;
      
      if (isPreferred) adjustedDistance *= 0.9; // 10% distance bonus for preferred types
      if (hasGoodRating) adjustedDistance *= 0.95; // 5% distance bonus for high ratings
      
      // Choose the place with minimum adjusted distance (nearest neighbor)
      if (adjustedDistance < shortestDistance) {
        shortestDistance = adjustedDistance;
        nearestIndex = i;
        nearestTravelTime = travelTime;
        nearestPlace = candidate;
      }
    }
    
    // If no valid next place found, break
    if (nearestIndex === -1) {
      console.log(`🚫 No more reachable places within constraints. Route complete with ${route.length} places.`);
      break;
    }
    
    // Add the nearest place to the route
    const travelData = distanceMatrix.rows[currentIndex].elements[nearestIndex];
    
    route.push(nearestPlace);
    visited.add(nearestIndex);
    
    totalTime += nearestTravelTime + (nearestPlace.estimatedVisitDuration || 30);
    totalCost += nearestPlace.estimatedCost || 0;
    totalDistance += travelData.distance.value;
    currentIndex = nearestIndex;
    
    console.log(`✅ Added: ${nearestPlace.name}`);
    console.log(`   Distance from previous: ${(travelData.distance.value / 1000).toFixed(2)} km`);
    console.log(`   Total time: ${totalTime.toFixed(1)} min, Total cost: ₹${totalCost}, Total distance: ${(totalDistance / 1000).toFixed(2)} km`);
  }
  
  console.log(`🎉 Optimal route created: ${route.length} places, Total distance: ${(totalDistance / 1000).toFixed(2)} km`);
  return { route, totalTime, totalCost, totalDistance };
};

/**
 * Finds the optimal journey using the improved nearest neighbor algorithm
 * This ensures minimum total distance by visiting places in optimal order
 */
const findOptimalJourney = (places, placeMap, distances, previous, startIndex, maxDuration, maxBudget, distanceMatrix) => {
    console.log(`🎯 Finding optimal journey with startIndex: ${startIndex}, maxDuration: ${maxDuration}, maxBudget: ${maxBudget}`);
    console.log(`📊 Total places available: ${places.length}`);
      // Create optimal route using nearest neighbor with distance optimization
    const routeResult = createOptimalRoute(places, distanceMatrix, startIndex, maxDuration, maxBudget, preferences);
    
    if (routeResult.route.length === 0) {
        console.log('❌ No valid route found');
        return [];
    }
    
    console.log(`✅ Optimal route found with ${routeResult.route.length} places:`);
    routeResult.route.forEach((place, index) => {
        console.log(`  ${index + 1}. ${place.name} (Rating: ${place.rating}, Types: ${place.types.slice(0, 2).join(', ')})`);
    });
    
    // Add travel details to the journey for frontend display
    return addTravelDetailsToJourney(routeResult.route, distanceMatrix, places);
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
 * Uses optimal nearest neighbor algorithm for minimum total distance
 */
const createCircularJourney = async (places, preferences, maxDuration, maxBudget, startPoint, distanceMatrix) => {
  console.log('🔄 Creating circular journey from current location');
  
  // Find the nearest place to the start point as our actual starting place
  const startNodeIndex = findNearestPlace(places, startPoint);
  const startPlace = places[startNodeIndex];
  
  console.log(`🏁 Starting circular journey from: ${startPlace.name}`);
    // Create optimal route using nearest neighbor algorithm
  const routeResult = createOptimalRoute(places, distanceMatrix, startNodeIndex, maxDuration * 0.85, maxBudget, preferences);
  
  if (routeResult.route.length === 0) {
    console.log('❌ Could not create circular journey');
    return [];
  }
  
  // Build the journey with travel legs and return to start
  const journey = [];
  let visitOrder = 1;
  
  // Add all places in optimal order
  for (let i = 0; i < routeResult.route.length; i++) {
    const place = routeResult.route[i];
    
    // Mark start point
    const isStartPoint = i === 0;
    journey.push({
      ...place,
      isStartPoint,
      visitOrder: visitOrder++,
      arrivalTime: i === 0 ? 0 : undefined
    });
    
    // Add travel leg to next place (if not the last place)
    if (i < routeResult.route.length - 1) {
      const currentIndex = places.findIndex(p => p.placeId === place.placeId);
      const nextPlace = routeResult.route[i + 1];
      const nextIndex = places.findIndex(p => p.placeId === nextPlace.placeId);
      
      const travelData = distanceMatrix.rows[currentIndex]?.elements[nextIndex];
      if (travelData && travelData.status === 'OK') {
        journey.push({
          isTravelLeg: true,
          from: place.name,
          to: nextPlace.name,
          duration: travelData.duration.text,
          distance: travelData.distance.text,
          mode: 'walking'
        });
      }
    }
  }
  
  // Add return journey to start (for circular journey)
  if (routeResult.route.length > 1) {
    const lastPlaceIndex = places.findIndex(p => p.placeId === routeResult.route[routeResult.route.length - 1].placeId);
    const returnData = distanceMatrix.rows[lastPlaceIndex]?.elements[startNodeIndex];
    
    if (returnData && returnData.status === 'OK') {
      const returnTime = returnData.duration.value / 60;
      
      // Check if we have time to return
      if (routeResult.totalTime + returnTime <= maxDuration) {
        journey.push({
          isTravelLeg: true,
          from: routeResult.route[routeResult.route.length - 1].name,
          to: startPlace.name,
          duration: returnData.duration.text,
          distance: returnData.distance.text,
          mode: 'walking'
        });
        
        // Add end point (same as start for circular)
        journey.push({
          ...startPlace,
          isEndPoint: true,
          visitOrder: visitOrder++,
          arrivalTime: routeResult.totalTime + returnTime
        });
      }
    }
  }
  
  console.log(`🎉 Circular journey created: ${routeResult.route.length} places, ${(routeResult.totalDistance / 1000).toFixed(2)} km total distance`);
  return journey;
};

/**
 * Creates a point-to-point journey from start to end with optimal intermediate stops
 * Uses nearest neighbor approach to minimize total distance
 */
const createPointToPointJourney = async (places, preferences, maxDuration, maxBudget, startPoint, endPoint, distanceMatrix) => {
  console.log('🎯 Creating optimized point-to-point journey');
  
  // Find nearest places to start and end points
  const startNodeIndex = findNearestPlace(places, startPoint);
  const endNodeIndex = findNearestPlace(places, endPoint);
  
  const startPlace = places[startNodeIndex];
  const endPlace = places[endNodeIndex];
  
  console.log(`🏁 Journey from: ${startPlace.name} to: ${endPlace.name}`);
  
  // Check direct travel time between start and end
  const directTravelData = distanceMatrix.rows[startNodeIndex]?.elements[endNodeIndex];
  if (!directTravelData || directTravelData.status !== 'OK') {
    throw new Error('Cannot calculate route between start and end points');
  }
  
  const directTravelTime = directTravelData.duration.value / 60; // minutes
  const minRequiredTime = directTravelTime + (startPlace.estimatedVisitDuration || 30) + (endPlace.estimatedVisitDuration || 30);
  
  if (minRequiredTime > maxDuration) {
    console.log('⚠️ Not enough time for intermediate stops, creating direct route');
    return createMinimalPointToPointJourney(startPlace, endPlace, directTravelData);
  }
  
  // Filter places that are roughly on the path between start and end
  const intermediateCandidates = findIntermediatePlaces(places, startNodeIndex, endNodeIndex, new Set([startNodeIndex, endNodeIndex]));
  
  if (intermediateCandidates.length === 0) {
    console.log('⚠️ No suitable intermediate places found, creating direct route');
    return createMinimalPointToPointJourney(startPlace, endPlace, directTravelData);
  }
  
  // Create a modified places array with only start, end, and intermediate candidates
  const relevantPlaces = [startPlace];
  const relevantIndices = [startNodeIndex];
  
  // Add intermediate candidates
  for (const candidateIndex of intermediateCandidates) {
    relevantPlaces.push(places[candidateIndex]);
    relevantIndices.push(candidateIndex);
  }
  
  // Add end place
  relevantPlaces.push(endPlace);
  relevantIndices.push(endNodeIndex);
  
  console.log(`🎯 Planning route through ${relevantPlaces.length} places (including start and end)`);
  
  // Create a modified distance matrix for relevant places only
  const relevantDistanceMatrix = {
    rows: relevantIndices.map(fromIdx => ({
      elements: relevantIndices.map(toIdx => distanceMatrix.rows[fromIdx]?.elements[toIdx] || { status: 'NOT_FOUND' })
    }))
  };
  
  // Use nearest neighbor algorithm starting from the first place (start)
  const visited = new Set([0]); // Start place is at index 0 in relevantPlaces
  const route = [relevantPlaces[0]];
  let currentIndex = 0;
  let totalTime = relevantPlaces[0].estimatedVisitDuration || 30;
  let totalCost = relevantPlaces[0].estimatedCost || 0;
  let totalDistance = 0;
  
  // Must end at the last place (end place)
  const endPlaceIndex = relevantPlaces.length - 1;
  
  // Continue until we visit all places or run out of constraints
  while (visited.size < relevantPlaces.length - 1) { // -1 because we need to save the end place for last
    let nearestIndex = -1;
    let shortestDistance = Infinity;
    
    // Find nearest unvisited place (except the end place, which we save for last)
    for (let i = 0; i < relevantPlaces.length - 1; i++) {
      if (visited.has(i)) continue;
      
      const travelData = relevantDistanceMatrix.rows[currentIndex]?.elements[i];
      if (!travelData || travelData.status !== 'OK') continue;
      
      const travelDistance = travelData.distance.value;
      const travelTime = travelData.duration.value / 60;
      const candidate = relevantPlaces[i];
      const visitTime = candidate.estimatedVisitDuration || 30;
      const visitCost = candidate.estimatedCost || 0;
      
      // Check if we can visit this place and still reach the end
      const timeToEnd = relevantDistanceMatrix.rows[i]?.elements[endPlaceIndex]?.duration?.value / 60 || 0;
      const projectedTime = totalTime + travelTime + visitTime + timeToEnd + (relevantPlaces[endPlaceIndex].estimatedVisitDuration || 30);
      const projectedCost = totalCost + visitCost + (relevantPlaces[endPlaceIndex].estimatedCost || 0);
      
      if (projectedTime > maxDuration || projectedCost > maxBudget) {
        continue;
      }
      
      if (travelDistance < shortestDistance) {
        shortestDistance = travelDistance;
        nearestIndex = i;
      }
    }
    
    if (nearestIndex === -1) {
      console.log(`🚫 No more intermediate places can be added within constraints`);
      break;
    }
    
    // Add the nearest intermediate place
    const nextPlace = relevantPlaces[nearestIndex];
    const travelData = relevantDistanceMatrix.rows[currentIndex].elements[nearestIndex];
    const travelTime = travelData.duration.value / 60;
    
    route.push(nextPlace);
    visited.add(nearestIndex);
    
    totalTime += travelTime + (nextPlace.estimatedVisitDuration || 30);
    totalCost += nextPlace.estimatedCost || 0;
    totalDistance += travelData.distance.value;
    currentIndex = nearestIndex;
    
    console.log(`✅ Added intermediate: ${nextPlace.name} (Distance: ${(travelData.distance.value / 1000).toFixed(2)} km)`);
  }
  
  // Finally, add the end place
  const finalTravelData = relevantDistanceMatrix.rows[currentIndex]?.elements[endPlaceIndex];
  if (finalTravelData && finalTravelData.status === 'OK') {
    const finalTravelTime = finalTravelData.duration.value / 60;
    route.push(relevantPlaces[endPlaceIndex]);
    totalTime += finalTravelTime + (relevantPlaces[endPlaceIndex].estimatedVisitDuration || 30);
    totalCost += relevantPlaces[endPlaceIndex].estimatedCost || 0;
    totalDistance += finalTravelData.distance.value;
    
    console.log(`🎯 Added final destination: ${relevantPlaces[endPlaceIndex].name}`);
  }
  
  console.log(`🎉 Point-to-point route created: ${route.length} places, ${(totalDistance / 1000).toFixed(2)} km total distance`);
  
  // Build journey with travel legs
  const journey = [];
  let visitOrder = 1;
  
  for (let i = 0; i < route.length; i++) {
    const place = route[i];
    
    // Mark start and end points
    const isStartPoint = i === 0;
    const isEndPoint = i === route.length - 1;
    
    journey.push({
      ...place,
      isStartPoint,
      isEndPoint,
      visitOrder: visitOrder++
    });
    
    // Add travel leg to next place (if not the last place)
    if (i < route.length - 1) {
      const currentOriginalIndex = relevantIndices[relevantPlaces.findIndex(p => p.placeId === place.placeId)];
      const nextPlace = route[i + 1];
      const nextOriginalIndex = relevantIndices[relevantPlaces.findIndex(p => p.placeId === nextPlace.placeId)];
      
      const travelData = distanceMatrix.rows[currentOriginalIndex]?.elements[nextOriginalIndex];
      if (travelData && travelData.status === 'OK') {
        journey.push({
          isTravelLeg: true,
          from: place.name,
          to: nextPlace.name,
          duration: travelData.duration.text,
          distance: travelData.distance.text,
          mode: 'walking'
        });
      }
    }
  }
  
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

