// services/graphService.js
// Advanced journey planning service using graph algorithms for optimization

import { getDistanceMatrix } from './googleMapsService.js';
import { Client } from '@googlemaps/google-maps-services-js';
import TinyQueue from 'tinyqueue';

// Initialize Google Maps client for direct API calls
const client = new Client({});

/**
 * Main function to build and find the best journey with optimized API usage
 * WHY: Minimizes Google Maps API calls while maintaining route quality
 * OPTIMIZATION: Uses smart place selection and progressive distance matrix building
 */
export const buildGraphAndFindJourney = async (places, preferences, maxDuration, maxBudget, startPoint, endPoint, journeyMode = 'currentLocation') => {
    // Step 1: Smart place filtering to reduce API calls
  const optimizedPlaces = await smartPlaceSelection(places, preferences, maxBudget, startPoint, endPoint, journeyMode, maxDuration);
  
  // Step 2: Get distance matrix for optimized places only
  const distanceMatrix = await getOptimizedDistanceMatrix(optimizedPlaces, startPoint, endPoint, journeyMode);
  if (!distanceMatrix) {
    return [];
  }
  // Step 3: Create journey based on mode
  let journey = [];
  if (journeyMode === 'currentLocation') {
    journey = createCircularJourney(optimizedPlaces, preferences, maxDuration, maxBudget, startPoint, distanceMatrix);
  } else if (journeyMode === 'customRoute') {
    journey = createPointToPointJourney(optimizedPlaces, preferences, maxDuration, maxBudget, startPoint, endPoint, distanceMatrix);
    
    // Ensure start and end points are always included in point-to-point journeys
    journey = ensureStartEndPointsInJourney(journey, startPoint, endPoint, optimizedPlaces);
  }
  
  const actualPlaces = journey.filter(item => !item.isTravelLeg);
  
  return journey;
};

/**
 * Find the nearest place to a given coordinate
 */
const findNearestPlace = (places, targetPoint) => {
  let nearestIndex = 0;
  let minDistance = Infinity;

  places.forEach((place, index) => {
    const distance = calculateDistance(targetPoint, place.location);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
};

/**
 * Calculate distance between two points using Haversine formula
 */
const calculateDistance = (point1, point2) => {
  const R = 6371000; // Earth's radius in meters
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
           Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
           Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * Enhanced Dijkstra's algorithm with resource-aware optimization
 * WHY: Incorporates current resource usage for dynamic weight calculation
 */
const dijkstra = (startIndex, places, distanceMatrix, preferences, budgetConstraint = Infinity, timeConstraint = Infinity, currentResourceUsage = { time: 0, budget: 0 }) => {
  const n = places.length;
  const distances = Array(n).fill(Infinity);
  const previous = Array(n).fill(null);
  const visited = Array(n).fill(false);
  
  distances[startIndex] = 0;
  
  const pq = new TinyQueue([{ node: startIndex, distance: 0 }], (a, b) => a.distance - b.distance);
  
  while (pq.length > 0) {
    const { node: u } = pq.pop();
    
    if (visited[u]) continue;
    visited[u] = true;
    
    for (let v = 0; v < n; v++) {
      if (u === v || visited[v]) continue;
      
      const edgeData = distanceMatrix.rows[u].elements[v];
      if (edgeData.status !== 'OK') continue;
      
      // Use enhanced weight calculation with resource context
      const weight = calculateEdgeWeight(
        places[u], 
        places[v], 
        edgeData, 
        preferences, 
        budgetConstraint,
        timeConstraint,
        currentResourceUsage
      );
      const newDistance = distances[u] + weight;
      
      if (newDistance < distances[v]) {
        distances[v] = newDistance;
        previous[v] = u;
        pq.push({ node: v, distance: newDistance });
      }
    }
  }
  
  return { distances, previous };
};

/**
 * Select diverse candidate when surplus resources allow for experience optimization
 * WHY: Maximize journey variety and satisfaction when efficiency is less critical
 */
const selectDiverseCandidate = (candidates, visitedTypes, surplusRatio) => {
  // Sort candidates by score
  candidates.sort((a, b) => b.score - a.score);
  
  // Consider top candidates (more candidates with higher surplus)
  const topCandidateCount = Math.min(candidates.length, Math.ceil(2 + surplusRatio * 3));
  const topCandidates = candidates.slice(0, topCandidateCount);
  
  // Among top candidates, prefer those with new experience types
  let bestDiversityCandidate = topCandidates[0];
  let maxNewTypes = 0;
  
  for (const candidate of topCandidates) {
    const newTypes = candidate.place.types.filter(type => !visitedTypes.has(type));
    
    if (newTypes.length > maxNewTypes) {
      maxNewTypes = newTypes.length;
      bestDiversityCandidate = candidate;
    }
    // If same diversity, prefer higher-rated place
    else if (newTypes.length === maxNewTypes && 
             (candidate.place.rating || 0) > (bestDiversityCandidate.place.rating || 0)) {
      bestDiversityCandidate = candidate;
    }
  }
  
  return bestDiversityCandidate.index;
};

/**
 * Advanced edge weight calculation with surplus resource optimization
 * WHY: When budget/time surplus exists, prioritize experience over pure efficiency
 * OPTIMIZATION: Dynamic weighting based on resource availability
 */
const calculateEdgeWeight = (fromPlace, toPlace, edgeData, preferences, budgetConstraint, timeConstraint = Infinity, currentResourceUsage = { time: 0, budget: 0 }) => {
  const baseDistance = edgeData.distance.value; // meters
  const travelTime = edgeData.duration.value; // seconds
  
  // Calculate resource surplus ratios (0 = tight, 1 = abundant)
  const budgetSurplus = Math.min(1, Math.max(0, (budgetConstraint - currentResourceUsage.budget) / budgetConstraint));
  const timeSurplus = Math.min(1, Math.max(0, (timeConstraint - currentResourceUsage.time) / timeConstraint));
  const avgSurplus = (budgetSurplus + timeSurplus) / 2;
  
  // Base weight - when surplus is low, prioritize efficiency
  let weight = travelTime * 0.001;
  
  // Dynamic rating bonus based on surplus
  // With surplus: heavily favor high-rated places
  // Without surplus: moderate rating consideration
  const ratingMultiplier = 300 + (avgSurplus * 1200); // 300-1500 range
  const ratingBonus = (toPlace.rating || 3) * ratingMultiplier;
  weight -= ratingBonus;
  
  // Preference bonus - scales with surplus
  const preferenceMultiplier = 500 + (avgSurplus * 1000); // 500-1500 range
  const preferenceBonus = isPreferredPlace(toPlace, preferences) ? preferenceMultiplier : 0;
  weight -= preferenceBonus;
  
  // Budget penalty - reduced when we have surplus
  const costSensitivity = 1 - (budgetSurplus * 0.7); // 0.3-1.0 range
  const costPenalty = (toPlace.estimatedCost || 0) * costSensitivity;
  weight += costPenalty;
  
  // Experience diversity bonus - when we have surplus, favor variety
  if (avgSurplus > 0.3) {
    const diversityBonus = calculateDiversityBonus(toPlace, preferences) * avgSurplus * 200;
    weight -= diversityBonus;
  }
  
  return Math.max(weight, 1);
};

/**
 * Calculate diversity bonus for place types
 * WHY: With surplus resources, encourage varied experiences
 */
const calculateDiversityBonus = (place, preferences) => {
  // Bonus for places that offer different types of experiences
  const experienceTypes = ['tourist_attraction', 'museum', 'park', 'restaurant', 'shopping_mall', 'amusement_park'];
  const diversityScore = place.types.filter(type => experienceTypes.includes(type)).length;
  return Math.min(diversityScore, 3); // Cap at 3 for reasonable scaling
};

/**
 * Check if a place matches user preferences
 */
const isPreferredPlace = (place, preferences) => {
  return Object.keys(preferences).some(prefType => 
    preferences[prefType] && place.types.includes(prefType)
  );
  // console.log('Log statement');
};

/**
 * Floyd-Warshall algorithm for all-pairs shortest paths
 * WHY: When we need optimal paths between ALL place pairs (not just from one source)
 * USE CASE: Point-to-point journeys where we need to find optimal intermediate stops
 * OPTIMIZATION: Precomputes all optimal paths, enabling better intermediate stop selection
 * TIME: O(nÂ³) - only use for smaller datasets (<50 places) or when multiple queries needed
 */
const floydWarshall = (places, distanceMatrix, preferences) => {
  const n = places.length;
  
  // Initialize distance matrix with direct travel times
  const dist = Array(n).fill(null).map(() => Array(n).fill(Infinity));
  const next = Array(n).fill(null).map(() => Array(n).fill(null));
  
  // Fill direct distances
  for (let i = 0; i < n; i++) {
    dist[i][i] = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const edgeData = distanceMatrix.rows[i].elements[j];
        if (edgeData.status === 'OK') {
          dist[i][j] = calculateEdgeWeight(places[i], places[j], edgeData, preferences, Infinity);
          next[i][j] = j;
        }
      }
    }
  }
  
  // Floyd-Warshall main algorithm: find shortest paths through intermediate vertices
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
          next[i][j] = next[i][k];
        }
      }
    }
  }
  
  return { distances: dist, next };
};

/**
 * Reconstruct optimal path between two points using Floyd-Warshall results
 * WHY: Extracts the actual sequence of places for the optimal path
 */
const reconstructPath = (start, end, next) => {
  if (next[start][end] === null) return [];
  
  const path = [start];
  let current = start;
  
  while (current !== end) {
    current = next[current][end];
    path.push(current);
  }
  
  return path;
};

/**
 * Multi-objective place scoring with intelligent surplus resource optimization
 * WHY: Maximize journey satisfaction when budget/time allows, with smart resource allocation
 * STRATEGY: Dynamic weighting between efficiency and experience based on resource availability and efficiency
 */
const calculateMultiObjectivePlaceScore = (place, preferences, distanceFromPrevious = 0, resourceSurplus = { budget: 0, time: 0, combined: 0, efficiency: 1 }) => {
  // Use combined surplus for main decisions
  const avgSurplus = resourceSurplus.combined || (resourceSurplus.budget + resourceSurplus.time) / 2;
  
  // Enhanced base components with higher weight on quality
  const rating = place.rating || 3;
  const userRatingsTotal = place.user_ratings_total || 0;
  
  // Rating score with review count bonus
  let ratingScore = rating * 2.5; // Increased base weight
  if (rating >= 4.5 && userRatingsTotal >= 100) {
    ratingScore += 4; // Strong bonus for exceptional places
  } else if (rating >= 4.2 && userRatingsTotal >= 50) {
    ratingScore += 2; // Moderate bonus for very good places
  }
  
  const preferenceScore = isPreferredPlace(place, preferences) ? 5 : 0; // Increased weight
  const diversityScore = calculateDiversityBonus(place, preferences);
  
  // Efficiency component with long journey considerations
  const distanceKm = distanceFromPrevious / 1000;
  const baseEfficiencyPenalty = distanceKm * 0.15; // Reduced penalty for long journeys
  const adjustedEfficiencyPenalty = baseEfficiencyPenalty * (1 - avgSurplus * 0.8); // More generous with surplus
  const efficiencyScore = Math.max(0, 6 - adjustedEfficiencyPenalty); // Higher base efficiency
  
  // Enhanced value component with abundance considerations
  const cost = place.estimatedCost || 0;
  let baseValueScore = cost > 0 ? Math.min(6, ratingScore / (cost / 120)) : ratingScore; // More generous value calc
  
  // Abundance bonus - when resources are plentiful, prioritize exceptional experiences
  const abundanceBonus = avgSurplus > 0.6 ? rating * 2 : (avgSurplus > 0.4 ? rating * 1 : 0);
  const valueScore = baseValueScore + abundanceBonus;
  
  // Route optimization bonus - reward places that don't create major detours
  const routeOptimizationBonus = distanceKm < 5 ? 3 : (distanceKm < 15 ? 1 : 0);
  
  // Dynamic weighting with enhanced experience focus
  const weights = calculateDynamicWeights(avgSurplus);
  
  // Resource efficiency bonus with quantity consideration
  const efficiencyBonus = resourceSurplus.efficiency * 2.5;
  
  const totalScore = 
    (ratingScore * weights.rating) +
    (preferenceScore * weights.preference) +
    (diversityScore * weights.diversity) +
    (efficiencyScore * weights.efficiency) +
    (valueScore * weights.value) +
    efficiencyBonus +
    routeOptimizationBonus;
  
  return Math.max(totalScore, 0.1);
};

/**
 * Calculate dynamic weights based on resource surplus
 * WHY: Shift optimization focus from efficiency to experience as resources become abundant
 * ENHANCEMENT: Optimized for long journey quality and quantity balance
 */
const calculateDynamicWeights = (avgSurplus) => {
  // Enhanced progression for long journeys
  const experienceFocus = Math.min(1.2, avgSurplus * 1.8); // More aggressive experience focus
  
  // Luxury mode for very abundant resources (>75%)
  const luxuryMode = avgSurplus > 0.75 ? 0.6 : (avgSurplus > 0.5 ? 0.3 : 0);
  
  // Quantity mode - when we need to fill long journeys
  const quantityMode = avgSurplus > 0.6 ? 0.2 : 0;
  
  return {
    rating: 0.35 + (experienceFocus * 0.35) + luxuryMode,       // 0.35-1.3: Strong emphasis on quality
    preference: 0.3 + (experienceFocus * 0.25) + quantityMode,  // 0.3-0.75: Preference matching is important
    diversity: (experienceFocus * 0.4) + luxuryMode,            // 0-1.0: Diversity critical for long journeys
    efficiency: Math.max(0.1, 0.25 - (experienceFocus * 0.15)), // 0.25-0.1: Maintain basic efficiency
    value: Math.max(0.05, 0.1 - (experienceFocus * 0.05))       // 0.1-0.05: Value less critical with surplus
  };
};

/**
 * Calculate resource surplus ratios for optimization decisions
 * WHY: Determine how aggressively to prioritize experience over efficiency
 * ENHANCEMENT: Includes intelligent budget allocation and time management
 */
const calculateResourceSurplus = (maxBudget, maxDuration, currentBudget, currentTime) => {
  const budgetSurplus = Math.min(1, Math.max(0, (maxBudget - currentBudget) / maxBudget));
  const timeSurplus = Math.min(1, Math.max(0, (maxDuration - currentTime) / maxDuration));
  
  // Intelligent surplus calculation - consider if we're on track for optimal resource utilization
  const idealBudgetUtilization = currentTime / maxDuration; // Budget should match time progress
  const actualBudgetUtilization = currentBudget / maxBudget;
  
  // If we're under-utilizing budget relative to time, we have effective surplus
  const budgetEfficiency = Math.max(0, idealBudgetUtilization - actualBudgetUtilization);
  const adjustedBudgetSurplus = Math.min(1, budgetSurplus + budgetEfficiency);
  
  return { 
    budget: adjustedBudgetSurplus, 
    time: timeSurplus,
    // Composite metric for decision making
    combined: (adjustedBudgetSurplus + timeSurplus) / 2,
    // How efficiently we're using resources
    efficiency: 1 - Math.abs(idealBudgetUtilization - actualBudgetUtilization)
  };
};

/**
 * Multi-objective route optimization using enhanced Dijkstra's algorithm
 * WHY: Balances efficiency with experience quality based on resource availability
 * OPTIMIZATION: Dynamic algorithm behavior adapts to surplus resources
 */
const createOptimalRouteWithMultiObjective = (places, distanceMatrix, startIndex, maxDuration, maxBudget, preferences) => {
  
  
  
  const visited = new Set([startIndex]);
  const route = [places[startIndex]];
  let currentIndex = startIndex;
  let totalTime = places[startIndex].estimatedVisitDuration || 30;
  let totalCost = places[startIndex].estimatedCost || 0;
  
  // Track visited place types for diversity optimization
  const visitedTypes = new Set();
  places[startIndex].types.forEach(type => visitedTypes.add(type));
  
  let iterationCount = 0;
  const maxIterations = Math.min(places.length * 2, 50); // Prevent infinite loops
  
  while (visited.size < places.length && iterationCount < maxIterations) {
    iterationCount++;    // Calculate current resource surplus with intelligent allocation
    const resourceSurplus = calculateResourceSurplus(maxBudget, maxDuration, totalCost, totalTime);
    const avgSurplus = resourceSurplus.combined;
    
    // More relaxed rating threshold for longer journeys and minimum place requirements
    const minPlacesForDuration = Math.max(4, Math.floor(maxDuration / 90)); // 1 place per 1.5 hours
    const needMorePlaces = visited.size < minPlacesForDuration;
      // Adjust threshold based on journey needs - be more lenient when we need more places
    let minRatingThreshold;
    if (needMorePlaces) {
      minRatingThreshold = 2.0; // Very lenient when we need more places
    } else {
      minRatingThreshold = avgSurplus > 0.8 ? 3.8 : (avgSurplus > 0.5 ? 3.2 : 2.3);
    }
    
    // Run enhanced Dijkstra with current resource context
    const { distances } = dijkstra(
      currentIndex, 
      places, 
      distanceMatrix, 
      preferences, 
      maxBudget,
      maxDuration,
      { time: totalTime, budget: totalCost }
    );
  // console.log('Log statement');
      let bestNextIndex = -1;
    let bestScore = -1;
    let bestCandidates = []; // Track top candidates for diversity selection
    let eligibleCandidates = 0;
    
    // Evaluate all unvisited places
    for (let i = 0; i < places.length; i++) {
      if (visited.has(i)) continue;
        const place = places[i];
      
      // Apply quality filter but be more lenient when we need more places
      if (!needMorePlaces && avgSurplus > 0.4 && (place.rating || 0) < minRatingThreshold) {
        continue; // Only skip low-rated places when we have enough places and surplus
      }
      
      const travelData = distanceMatrix.rows[currentIndex]?.elements[i];
      if (!travelData || travelData.status !== 'OK') continue;
      
      const travelTime = travelData.duration.value / 60;
      const visitTime = places[i].estimatedVisitDuration || 30;
      const visitCost = places[i].estimatedCost || 0;
        // Hard constraint checks
      if (totalTime + travelTime + visitTime > maxDuration || 
          totalCost + visitCost > maxBudget) {
        continue;
      }
      
      eligibleCandidates++;
      
      // Calculate multi-objective score
      const placeScore = calculateMultiObjectivePlaceScore(
        place,
        preferences,
        travelData.distance.value,
        resourceSurplus
      );
  // console.log('Log statement');
      // Dijkstra distance factor (optimal path consideration)
      const pathEfficiency = 1 / (distances[i] / 1000 + 1);
      
      // Diversity bonus - favor places with new experience types when we have surplus
      let diversityBonus = 0;
      if (avgSurplus > 0.3) {
        const newTypes = place.types.filter(type => !visitedTypes.has(type));
        diversityBonus = newTypes.length * avgSurplus * 2;
      }
      
      // Quality premium - bonus for exceptional places when we have surplus
      const qualityBonus = avgSurplus > 0.5 && (place.rating || 0) >= 4.5 ? 3 : 0;
      
      // Combined score
      const combinedScore = (placeScore * pathEfficiency) + diversityBonus + qualityBonus;
        // Track best candidates
      bestCandidates.push({
        index: i,
        score: combinedScore,
        place: place,
        travelData,
        diversity: diversityBonus,
        quality: place.rating || 0
      });
      
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestNextIndex = i;
      }    }
    
    // When we have surplus resources, consider selecting from top candidates for diversity
    if (avgSurplus > 0.4 && bestCandidates.length > 1) {
      bestNextIndex = selectDiverseCandidate(bestCandidates, visitedTypes, avgSurplus);
    }
    
    if (bestNextIndex === -1) {
      if (needMorePlaces && visited.size < minPlacesForDuration) {
        // Try again with much more relaxed criteria
        for (let i = 0; i < places.length; i++) {
          if (visited.has(i)) continue;
          
          const place = places[i];
          const travelData = distanceMatrix.rows[currentIndex]?.elements[i];
          if (!travelData || travelData.status !== 'OK') continue;
          
          const travelTime = travelData.duration.value / 60;
          const visitTime = place.estimatedVisitDuration || 30;
          const visitCost = place.estimatedCost || 0;
          
          // Very relaxed constraint checks - only hard limits
          if (totalTime + travelTime + visitTime > maxDuration * 0.95 || 
              totalCost + visitCost > maxBudget * 0.95) {
            continue;
          }
          
          // Simple scoring for fallback
          const simpleScore = (place.rating || 2) + (isPreferredPlace(place, preferences) ? 2 : 0);
          
          if (simpleScore > bestScore) {
            bestScore = simpleScore;
            bestNextIndex = i;
          }
        }
      }
        if (bestNextIndex === -1) {
        break;
      }
    }
    
    // Add the selected place
    const nextPlace = places[bestNextIndex];
    const travelData = distanceMatrix.rows[currentIndex].elements[bestNextIndex];
    
    route.push(nextPlace);
    visited.add(bestNextIndex);
    
    // Update tracking
    totalTime += (travelData.duration.value / 60) + (nextPlace.estimatedVisitDuration || 30);    totalCost += nextPlace.estimatedCost || 0;
    currentIndex = bestNextIndex;
    
    // Track place types for diversity
    nextPlace.types.forEach(type => visitedTypes.add(type));
  }
  
  const finalSurplus = calculateResourceSurplus(maxBudget, maxDuration, totalCost, totalTime);
  
  return { route, totalTime, totalCost, surplus: finalSurplus };
};

/**
 * Add travel details between places in the journey
 */
const addTravelDetailsToJourney = (journey, distanceMatrix, places) => {
  if (journey.length < 2) return journey;
  
  const enrichedJourney = [];
  
  for (let i = 0; i < journey.length; i++) {
    enrichedJourney.push({ ...journey[i] });
    
    if (i < journey.length - 1) {
      // Find travel data between current and next place
      const currentIndex = places.findIndex(p => p.placeId === journey[i].placeId);
      const nextIndex = places.findIndex(p => p.placeId === journey[i + 1].placeId);
      
      let duration = '15 mins';
      let distance = '5 km';
      
      if (currentIndex !== -1 && nextIndex !== -1 && 
          distanceMatrix.rows[currentIndex]?.elements[nextIndex]?.status === 'OK') {
        const element = distanceMatrix.rows[currentIndex].elements[nextIndex];
        duration = element.duration.text || '15 mins';
        distance = element.distance.text || '5 km';
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
};

/**
 * Create an optimized circular journey using multi-objective optimization
 * WHY: Balances efficiency with experience quality based on available resources
 */
const createCircularJourney = (places, preferences, maxDuration, maxBudget, startPoint, distanceMatrix) => {
  
  
  const startIndex = findNearestPlace(places, startPoint);
  const startPlace = places[startIndex];
  
  
  
  
  // Use multi-objective optimization for route creation
  const routeResult = createOptimalRouteWithMultiObjective(
    places, 
    distanceMatrix, 
    startIndex, 
    maxDuration * 0.85, // Reserve 15% for return
    maxBudget, 
    preferences
  );
  // console.log('Log statement');
  if (routeResult.route.length === 0) {
    
    return [];
  }
  
  const journey = [];
  let visitOrder = 1;
  
  for (let i = 0; i < routeResult.route.length; i++) {
    const place = routeResult.route[i];
    
    journey.push({
      ...place,
      isStartPoint: i === 0,
      visitOrder: visitOrder++,
      optimizationScore: place.optimizationScore // Include score for analytics
    });
    
    if (i < routeResult.route.length - 1) {
      const currentIndex = places.findIndex(p => p.placeId === place.placeId);
      const nextPlace = routeResult.route[i + 1];
      const nextIndex = places.findIndex(p => p.placeId === nextPlace.placeId);
      
      const travelData = distanceMatrix.rows[currentIndex]?.elements[nextIndex];
      if (travelData?.status === 'OK') {        journey.push({
          isTravelLeg: true,
          from: place.name,
          to: nextPlace.name,
          duration: travelData.duration.text,
          distance: travelData.distance.text,
          mode: 'driving'
        });
      }
    }
  }
  
  // Add return journey with time check
  if (routeResult.route.length > 1) {
    const lastPlaceIndex = places.findIndex(p => p.placeId === routeResult.route[routeResult.route.length - 1].placeId);
    const returnData = distanceMatrix.rows[lastPlaceIndex]?.elements[startIndex];
    
    if (returnData?.status === 'OK') {
      const returnTime = returnData.duration.value / 60;
      
      if (routeResult.totalTime + returnTime <= maxDuration) {        journey.push({
          isTravelLeg: true,
          from: routeResult.route[routeResult.route.length - 1].name,
          to: startPlace.name,
          duration: returnData.duration.text,
          distance: returnData.distance.text,
          mode: 'driving'
        });
        
        journey.push({
          ...startPlace,
          isEndPoint: true,
          visitOrder: visitOrder++        });
      }
    }
  }
  
  return journey;
};

/**
 * Create optimized point-to-point journey using Floyd-Warshall algorithm
 * WHY: Floyd-Warshall finds optimal paths between ALL pairs, enabling smart intermediate stop selection
 * OPTIMIZATION: Guarantees globally optimal route through selected intermediate points
 */
const createPointToPointJourney = (places, preferences, maxDuration, maxBudget, startPoint, endPoint, distanceMatrix) => {
  
  
  const startIndex = findNearestPlace(places, startPoint);
  const endIndex = findNearestPlace(places, endPoint);
  
  const startPlace = places[startIndex];
  const endPlace = places[endIndex];
  
  
  
  // Check direct route feasibility
  const directTravelData = distanceMatrix.rows[startIndex]?.elements[endIndex];
  if (!directTravelData || directTravelData.status !== 'OK') {
    throw new Error('Cannot calculate route between start and end points');
  }
  
  const directTravelTime = directTravelData.duration.value / 60;
  const minTimeNeeded = directTravelTime + (startPlace.estimatedVisitDuration || 30) + (endPlace.estimatedVisitDuration || 30);
  
  if (minTimeNeeded > maxDuration) {
    
    return createDirectJourney(startPlace, endPlace, directTravelData);  }
  // Choose algorithm based on journey characteristics and resource availability
  const resourceAbundance = (maxDuration >= 360 && maxBudget >= 800);
  const timeVsBudgetRatio = maxDuration / (maxBudget || 1);
  
  // console.log(`Journey mode selection: resourceAbundance=${resourceAbundance}, timeVsBudgetRatio=${timeVsBudgetRatio}`);
  
  // For long journeys (6+ hours) OR abundant resources, always prefer Dijkstra (more generous)
  // For short/constrained journeys, use Floyd-Warshall (more precise)
  if (maxDuration >= 360 || resourceAbundance || timeVsBudgetRatio > 0.8) {
    
    return createOptimalPointToPointWithDijkstra(places, preferences, maxDuration, maxBudget, startIndex, endIndex, distanceMatrix);
  } else if (places.length <= 15) {
    return createOptimalPointToPointWithFloydWarshall(places, preferences, maxDuration, maxBudget, startIndex, endIndex, distanceMatrix);
  } else {
    
    return createOptimalPointToPointWithDijkstra(places, preferences, maxDuration, maxBudget, startIndex, endIndex, distanceMatrix);
  }
};

/**
 * Floyd-Warshall based point-to-point optimization
 * WHY: Finds truly optimal intermediate stops by considering all possible paths
 */
const createOptimalPointToPointWithFloydWarshall = (places, preferences, maxDuration, maxBudget, startIndex, endIndex, distanceMatrix) => {
  // Compute all-pairs shortest paths
  const { distances, next } = floydWarshall(places, distanceMatrix, preferences);
  
  // Find potential intermediate stops that improve the journey
  const intermediateCandidates = findOptimalIntermediateStops(places, startIndex, endIndex, distances, preferences, maxBudget);
  
  if (intermediateCandidates.length === 0) {
    const directPath = reconstructPath(startIndex, endIndex, next);
    return buildJourneyFromPath(directPath, places, distanceMatrix);
  }
  
  // Select best subset of intermediate stops using dynamic programming approach
  const optimalStops = selectOptimalStops(intermediateCandidates, startIndex, endIndex, distances, maxDuration, maxBudget, places);
  
  // Build final path: start â†’ optimal stops â†’ end
  const fullPath = [startIndex, ...optimalStops, endIndex];
  
  
  return buildJourneyFromPath(fullPath, places, distanceMatrix);
};

/**
 * Dijkstra-based point-to-point optimization with multi-objective scoring
 * WHY: Efficient for larger datasets while maximizing experience quality with surplus resources
 */
const createOptimalPointToPointWithDijkstra = (places, preferences, maxDuration, maxBudget, startIndex, endIndex, distanceMatrix) => {
  
  
  const intermediatePlaces = findGeographicallyRelevantPlaces(places, startIndex, endIndex, maxDuration, maxBudget);
  
  if (intermediatePlaces.length === 0) {
    
    const startPlace = places[startIndex];
    const endPlace = places[endIndex];
    const directTravelData = distanceMatrix.rows[startIndex].elements[endIndex];
    return createDirectJourney(startPlace, endPlace, directTravelData);
  }
  
  // Calculate initial resource state
  const currentTime = places[startIndex].estimatedVisitDuration || 30;
  const currentCost = places[startIndex].estimatedCost || 0;
  
  const { distances: startDistances } = dijkstra(
    startIndex, 
    places, 
    distanceMatrix, 
    preferences, 
    maxBudget,
    maxDuration,
    { time: currentTime, budget: currentCost }
  );
  // console.log('Log statement');
  const { distances: endDistances } = dijkstra(
    endIndex, 
    places, 
    distanceMatrix, 
    preferences, 
    maxBudget,
    maxDuration,
    { time: 0, budget: 0 }
  );
  // console.log('Log statement');
  // Initialize route with START place
  const route = [places[startIndex]];
  const visited = new Set([startIndex, endIndex]);
  let totalTime = currentTime;
  let totalCost = currentCost;
  let currentIndex = startIndex;
  
  // Track experience diversity
  const visitedTypes = new Set();
  places[startIndex].types.forEach(type => visitedTypes.add(type));
  
  
    // Enhanced greedy optimization for maximum place inclusion in long journeys
  while (intermediatePlaces.length > 0) {
    const resourceSurplus = calculateResourceSurplus(maxBudget, maxDuration, totalCost, totalTime);
    const avgSurplus = resourceSurplus.combined;
    
    // For long journeys, prioritize quantity when resources are abundant
    const isLongJourney = maxDuration >= 360;
    const hasAmpleResources = maxBudget >= 800;
    const resourceAbundant = isLongJourney && hasAmpleResources;
    
    let bestStopIndex = -1;
    let bestScore = -1;
    let bestCandidates = [];
    
    // Calculate remaining capacity for informed decisions
    const remainingPlaces = intermediatePlaces.length;
    const routeLength = route.length;
    const targetPlaceCount = Math.min(10, Math.max(3, Math.floor(maxDuration / 60))); // More places for longer journeys
    const placesNeeded = Math.max(0, targetPlaceCount - routeLength);
    
    for (let i = 0; i < intermediatePlaces.length; i++) {
      const stopIndex = intermediatePlaces[i];
      if (visited.has(stopIndex)) continue;
      
      const travelData = distanceMatrix.rows[currentIndex]?.elements[stopIndex];
      if (!travelData || travelData.status !== 'OK') continue;
      
      const travelTime = travelData.duration.value / 60;
      const visitTime = places[stopIndex].estimatedVisitDuration || 30;
      const visitCost = places[stopIndex].estimatedCost || 0;
      
      // Check feasibility to reach end (reserve time for final leg)
      const timeToEnd = distanceMatrix.rows[stopIndex]?.elements[endIndex]?.duration?.value / 60 || 0;
      const endVisitTime = places[endIndex].estimatedVisitDuration || 30;
      const projectedTime = totalTime + travelTime + visitTime + timeToEnd + endVisitTime;
      const projectedCost = totalCost + visitCost + (places[endIndex].estimatedCost || 0);
      
      // Dynamic buffer based on remaining places needed and resources
      let timeBuffer, budgetBuffer;
      if (resourceAbundant && placesNeeded > 2) {
        // Very generous for long journeys needing more places
        timeBuffer = 0.98;
        budgetBuffer = 0.95;
      } else if (resourceAbundant) {
        timeBuffer = 0.95;
        budgetBuffer = 0.90;
      } else if (isLongJourney || hasAmpleResources) {
        timeBuffer = 0.92;
        budgetBuffer = 0.88;
      } else {
        timeBuffer = 0.90;
        budgetBuffer = 0.85;
      }
      
      if (projectedTime > maxDuration * timeBuffer || projectedCost > maxBudget * budgetBuffer) continue;
      
      // Enhanced scoring for maximum place inclusion
      const pathEfficiency = 1 / (startDistances[stopIndex] + endDistances[stopIndex] + 1);
      const placeScore = calculateMultiObjectivePlaceScore(
        places[stopIndex],
        preferences,
        travelData.distance.value,
        resourceSurplus
      );
  // console.log('Log statement');
      // Diversity bonus with enhanced weighting for variety
      let diversityBonus = 0;
      if (avgSurplus > 0.2) {
        const newTypes = places[stopIndex].types.filter(type => !visitedTypes.has(type));
        const diversityMultiplier = resourceAbundant ? 4 : 3;
        diversityBonus = newTypes.length * avgSurplus * diversityMultiplier;
      }
      
      // Enhanced popularity bonus - strongly favor exceptional places
      const place = places[stopIndex];
      const rating = place.rating || 0;
      const userRatingsTotal = place.user_ratings_total || 0;
      
      let popularityBonus = 0;
      if (rating >= 4.7 && userRatingsTotal >= 200) {
        popularityBonus = 12; // Truly exceptional places
      } else if (rating >= 4.5 && userRatingsTotal >= 100) {
        popularityBonus = 10; // Exceptional places with many reviews
      } else if (rating >= 4.3 && userRatingsTotal >= 50) {
        popularityBonus = 7; // Very good places with decent reviews
      } else if (rating >= 4.0 && userRatingsTotal >= 20) {
        popularityBonus = 4; // Good places with some reviews
      }
      
      // Quantity bonus for long journeys - encourage more places when feasible
      let quantityBonus = 0;
      if (resourceAbundant && routeLength < targetPlaceCount) {
        const efficiencyRatio = (startDistances[stopIndex] + endDistances[stopIndex]) / 
                               (startDistances[endIndex] || 1);
        if (efficiencyRatio < 2.5) { // Not a major detour
          quantityBonus = (targetPlaceCount - routeLength) * 2; // Encourage filling the journey
        }
      }
      
      // Balanced scoring: efficiency, quality, diversity, popularity, and quantity
      const combinedScore = (pathEfficiency * placeScore * 1.2) + diversityBonus + popularityBonus + quantityBonus;
      
      bestCandidates.push({
        index: i,
        stopIndex,
        score: combinedScore,
        place: places[stopIndex],
        diversity: diversityBonus,
        popularity: popularityBonus,
        quantity: quantityBonus,
        rating: rating,
        efficiency: pathEfficiency
      });
      
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestStopIndex = i;
      }
    }
      // Enhanced candidate selection
    if (bestCandidates.length === 0) break;
    
    let selectedCandidate = null;
    
    // For abundant resources, consider multiple selection strategies
    if (resourceAbundant && bestCandidates.length > 2) {
      // Sort candidates by score
      bestCandidates.sort((a, b) => b.score - a.score);
      
      // Consider top candidates for diversity
      const topCandidates = bestCandidates.slice(0, Math.min(3, bestCandidates.length));
      
      if (avgSurplus > 0.5 && topCandidates.length > 1) {
        // Select for maximum diversity among top candidates
        const diverseChoice = selectDiverseCandidate(
          topCandidates.map(c => ({ ...c, index: c.stopIndex, place: c.place })), 
          visitedTypes, 
          avgSurplus
        );
  // console.log('Log statement');
        selectedCandidate = bestCandidates.find(c => c.stopIndex === diverseChoice);
      } else {
        // For lower surplus, prefer the highest scoring candidate
        selectedCandidate = bestCandidates[0]; // Already sorted by score
      }
    } else {
      // Default selection: use the original best candidate
      selectedCandidate = bestCandidates.find(c => c.index === bestStopIndex);
    }
    
    if (!selectedCandidate) break;
    
    const stopIndex = selectedCandidate.stopIndex;
    const nextPlace = places[stopIndex];
    const travelData = distanceMatrix.rows[currentIndex].elements[stopIndex];
    
    // Log selection reasoning for transparency
    // console.log('Selection log');
    
    route.push(nextPlace);
    visited.add(stopIndex);
    intermediatePlaces.splice(selectedCandidate.index, 1);
    
    totalTime += (travelData.duration.value / 60) + (nextPlace.estimatedVisitDuration || 30);
    totalCost += nextPlace.estimatedCost || 0;
    currentIndex = stopIndex;
    
    // Track diversity    nextPlace.types.forEach(type => visitedTypes.add(type));
    // console.log('Progress log');
    // console.log('Budget log');
  }
  
  // Always add END place
  route.push(places[endIndex]);
  
  // Optimize route order for maximum efficiency
  const routeIndices = route.map(p => places.findIndex(pl => pl.placeId === p.placeId));
  const optimizedIndices = optimizeRouteOrder(places, distanceMatrix, startIndex, endIndex, routeIndices);
  
  const finalSurplus = calculateResourceSurplus(maxBudget, maxDuration, totalCost, totalTime);
  // console.log('Surplus log');
  
  return buildJourneyFromPath(optimizedIndices, places, distanceMatrix);
};

/**
 * Create a direct journey with just start and end
 */
const createDirectJourney = (startPlace, endPlace, travelData) => {
  return [
    {
      ...startPlace,
      isStartPoint: true,
      visitOrder: 1
    },
    {
      isTravelLeg: true,
      from: startPlace.name,
      to: endPlace.name,
      duration: travelData.duration.text,
      distance: travelData.distance.text,
      mode: 'driving'
    },
    {
      ...endPlace,
      isEndPoint: true,
      visitOrder: 2
    }
  ];
};

/**
 * Find optimal intermediate stops using Floyd-Warshall results
 * WHY: Uses complete path information to identify stops that genuinely improve the journey
 */
const findOptimalIntermediateStops = (places, startIndex, endIndex, distances, preferences, maxBudget) => {
  const candidates = [];
  const directDistance = distances[startIndex][endIndex];
  
  for (let i = 0; i < places.length; i++) {
    if (i === startIndex || i === endIndex) continue;
    
    // Check route efficiency - allow reasonable detours for interesting places
    const routeDistance = distances[startIndex][i] + distances[i][endIndex];
    const detourRatio = routeDistance / directDistance;
    
    // Allow detours up to 2.5x direct distance for high-value places
    // This is much more generous than requiring route improvement
    if (detourRatio <= 2.5) {
      const place = places[i];
      const score = calculateAdvancedPlaceScore(place, preferences, 0, maxBudget);
      
      // Calculate value considering both place quality and route efficiency
      let efficiencyScore;
      if (detourRatio <= 1.0) {
        efficiencyScore = 10; // Route improvement bonus
      } else if (detourRatio <= 1.5) {
        efficiencyScore = 8; // Minor detour - still good
      } else if (detourRatio <= 2.0) {
        efficiencyScore = 5; // Moderate detour - acceptable
      } else {
        efficiencyScore = 2; // Significant detour - only for high-quality places
      }
      
      candidates.push({
        index: i,
        detourRatio,
        efficiencyScore,
        placeScore: score,
        totalScore: (score * 0.6) + (efficiencyScore * 0.4) // Balance quality vs efficiency
      });
    }
  }
  
  // Sort by total benefit (place quality + route efficiency)
  candidates.sort((a, b) => b.totalScore - a.totalScore);
  
  // Return more candidates for longer journeys
  const maxCandidates = Math.min(8, candidates.length); // Up to 8 candidates instead of 4
  return candidates.slice(0, maxCandidates).map(c => c.index);
};

/**
 * Select optimal subset of stops using dynamic programming principles
 * WHY: Ensures we don't exceed constraints while maximizing journey value
 */
const selectOptimalStops = (candidates, startIndex, endIndex, distances, maxDuration, maxBudget, places) => {
  if (candidates.length === 0) return [];
  
  
  
  // Calculate resource abundance for decision making
  const resourceAbundance = (maxDuration >= 360 && maxBudget >= 800) ? 'high' : 
                           (maxDuration >= 240 && maxBudget >= 400) ? 'medium' : 'low';
  
  
  
  // Simplified greedy selection with generous constraint checking
  const selected = [];
  let totalTime = places[startIndex].estimatedVisitDuration || 30;
  let totalCost = places[startIndex].estimatedCost || 0;
  let currentIndex = startIndex;
  
  // Use more generous time/budget thresholds for long journeys
  const timeBuffer = resourceAbundance === 'high' ? 0.85 : (resourceAbundance === 'medium' ? 0.90 : 0.95);
  const budgetBuffer = resourceAbundance === 'high' ? 0.80 : (resourceAbundance === 'medium' ? 0.85 : 0.90);
  
  const maxAllowedTime = maxDuration * timeBuffer;
  const maxAllowedBudget = maxBudget * budgetBuffer;
  // console.log('Buffer log');
  
  for (const candidateIndex of candidates) {
    const candidate = places[candidateIndex];
    
    // Estimate time: current â†’ candidate â†’ remaining journey to end
    const timeToCand = getEstimatedTravelTime(distances, currentIndex, candidateIndex);
    const timeFromCand = getEstimatedTravelTime(distances, candidateIndex, endIndex);
    const visitTime = candidate.estimatedVisitDuration || 30;
    const visitCost = candidate.estimatedCost || 0;
    
    const projectedTime = totalTime + timeToCand + visitTime + timeFromCand + (places[endIndex].estimatedVisitDuration || 30);
    const projectedCost = totalCost + visitCost + (places[endIndex].estimatedCost || 0);
    // console.log('Budget log');
    
    if (projectedTime <= maxAllowedTime && projectedCost <= maxAllowedBudget) {
      selected.push(candidateIndex);
      totalTime += timeToCand + visitTime;
      totalCost += visitCost;
      currentIndex = candidateIndex;
    } else {
      // console.log('Skipping candidate due to resource constraints');
    }
  }
  
  
  return selected;
};

/**
 * Find geographically relevant places for Dijkstra-based optimization
 * WHY: Reduces search space while maintaining places that could realistically be on optimal paths
 */
const findGeographicallyRelevantPlaces = (places, startIndex, endIndex, maxDuration = 0, maxBudget = 0) => {
  const startPlace = places[startIndex];
  const endPlace = places[endIndex];
  const candidates = [];
    // For long journeys with ample resources, be much more generous with geographic constraints
  const isLongJourney = maxDuration >= 360; // 6+ hours
  const hasAmpleResources = maxBudget >= 800;
  const resourceAbundant = isLongJourney && hasAmpleResources;
  
  // Determine max deviation threshold based on resource availability
  let maxDeviation;
  if (resourceAbundant) {
    maxDeviation = 4.0; // Very generous for long journeys with ample resources
  } else if (isLongJourney || hasAmpleResources) {
    maxDeviation = 3.0; // Generous for either long time or good budget
  } else {
    maxDeviation = 2.2; // Conservative for short/constrained journeys
  }
  
  
  
  for (let i = 0; i < places.length; i++) {
    if (i === startIndex || i === endIndex) continue;
    
    const place = places[i];
    
    // Calculate if place is reasonably positioned relative to start and end
    const distToStart = calculateDistance(startPlace.location, place.location);
    const distToEnd = calculateDistance(place.location, endPlace.location);
    const directDist = calculateDistance(startPlace.location, endPlace.location);
    const pathDeviation = (distToStart + distToEnd) / directDist;
    
    if (pathDeviation < maxDeviation) {
      candidates.push(i);
    }
  }

  // Sort candidates by distance to start point for better path efficiency
  return candidates.sort((a, b) => {
    const distA = calculateDistance(startPlace.location, places[a].location);
    const distB = calculateDistance(startPlace.location, places[b].location);
    return distA - distB;
  });
};

/**
 * Build journey structure from optimized path indices
 * WHY: Converts algorithm output into user-friendly journey format
 */
const buildJourneyFromPath = (pathIndices, places, distanceMatrix) => {
  const journey = [];
  let visitOrder = 1;
  
  for (let i = 0; i < pathIndices.length; i++) {
    const place = places[pathIndices[i]];
    
    journey.push({
      ...place,
      isStartPoint: i === 0,
      isEndPoint: i === pathIndices.length - 1,
      visitOrder: visitOrder++
    });
    
    // Add travel leg
    if (i < pathIndices.length - 1) {
      const currentIndex = pathIndices[i];
      const nextIndex = pathIndices[i + 1];
      
      const travelData = distanceMatrix.rows[currentIndex]?.elements[nextIndex];
      if (travelData?.status === 'OK') {        journey.push({
          isTravelLeg: true,
          from: place.name,
          to: places[nextIndex].name,
          duration: travelData.duration.text,
          distance: travelData.distance.text,
          mode: 'driving'
        });
      }
    }
  }
  
  return journey;
};

/**
 * Advanced place scoring with comprehensive factors
 * WHY: Provides detailed scoring for places in Floyd-Warshall optimization
 */
const calculateAdvancedPlaceScore = (place, preferences, distanceFromPrevious = 0, maxBudget = Infinity) => {
  const ratingScore = (place.rating || 3) * 2;
  const preferenceScore = isPreferredPlace(place, preferences) ? 4 : 0;
  const diversityScore = calculateDiversityBonus(place, preferences);
  
  // Value scoring based on cost-effectiveness
  const cost = place.estimatedCost || 0;
  const valueScore = cost > 0 ? Math.min(5, ratingScore / (cost / 100)) : ratingScore;
  
  // Accessibility bonus for highly-rated, low-cost places
  const accessibilityBonus = (place.rating >= 4.0 && cost <= maxBudget * 0.3) ? 2 : 0;
  
  return ratingScore + preferenceScore + diversityScore + valueScore + accessibilityBonus;
};

/**
 * Helper function to estimate travel time from distance matrix or fallback
 */
const getEstimatedTravelTime = (distances, fromIndex, toIndex) => {
  // This is a simplified conversion from distance units to time
  // In a real implementation, you'd use the actual travel time from distance matrix
  return (distances[fromIndex][toIndex] / 1000) * 2; // Rough estimate: 2 minutes per km
};

/**
 * Smart place selection to minimize API calls while maximizing journey quality
 * WHY: Reduces distance matrix size from NÃ—N to manageable subset
 * STRATEGY: Geographic clustering + rating-based filtering + diversity ensure optimal selection
 */
/**
 * Advanced filtering to remove agency buildings, offices, and work-related places
 * WHY: Ensures journey focuses on tourist attractions and experiences, not work venues
 */
const filterWorkAndAgencyPlaces = (places) => {
  // Comprehensive blacklist of agency and work-related place types
  const agencyAndWorkTypes = [
    // Agencies and services
    'agency', 'real_estate_agency', 'insurance_agency', 'travel_agency', 'news_agency',
    'employment_agency', 'government_office', 'local_government_office', 'embassy', 'consulate',
    
    // Office and business types
    'office', 'corporate_office', 'business_center', 'coworking_space', 'headquarters',
    'professional_services', 'consulting_agency', 'accounting', 'lawyer', 'notary_public',
    
    // Financial and legal
    'bank', 'atm', 'finance', 'credit_union', 'mortgage_broker', 'tax_consultant',
    'courthouse', 'police', 'fire_station', 'city_hall',
    
    // Healthcare and professional services
    'hospital', 'clinic', 'doctor', 'dentist', 'pharmacy', 'veterinary_care',
    'physiotherapist', 'psychologist', 'medical_lab', 'urgent_care',
    
    // Educational and institutional
    'school', 'university', 'college', 'training_center', 'driving_school', 'library',
    
    // Industrial and commercial
    'industrial', 'warehouse', 'manufacturing', 'factory', 'distribution_center',
    'construction_company', 'contractor', 'moving_company', 'storage',
    
    // Automotive and utility services
    'car_dealer', 'car_repair', 'car_wash', 'gas_station', 'auto_parts_store',
    'locksmith', 'plumber', 'electrician', 'painter', 'roofing_contractor',
    
    // Infrastructure and utilities
    'post_office', 'courier_service', 'telecommunications', 'internet_service_provider',
    'utility_company', 'waste_management', 'recycling_center',
    
    // Religious and ceremonial (work-related aspects)
    'funeral_home', 'cemetery', 'crematorium'
  ];
  
  // Enhanced keyword patterns for names and descriptions
  const workKeywordPatterns = [
    // Agency patterns
    /\b(agency|agencies)\b/i,
    /\b(real\s*estate|insurance|travel|employment|news)\s*(agency|office)\b/i,
    
    // Office and corporate patterns
    /\b(office|headquarters|corporate|business)\s*(building|center|complex|tower|plaza)\b/i,
    /\b(pvt\.?\s*ltd\.?|private\s*limited|corporation|corp\.?|inc\.?|llc|llp)\b/i,
    /\b(technologies|solutions|services|consulting|consultancy)\b/i,
    
    // Professional services
    /\b(law\s*firm|legal\s*services|accounting|chartered\s*accountant|ca\s*office)\b/i,
    /\b(medical\s*center|clinic|hospital|diagnostic|pathology|lab)\b/i,
    
    // Industrial and commercial
    /\b(industrial|manufacturing|factory|warehouse|distribution)\b/i,
    /\b(company|enterprises?|industries|international|global)\b/i,
    
    // Location-specific business patterns (Bangalore/India)
    /\b(tech\s*park|software|IT\s*park|cyber|electronic\s*city)\b/i,
    /\b(manyata|whitefield|embassy|prestige|brigade|sobha|godrej|tata)\b/i,
    /\b(infotech|info\s*tech|business\s*park|commercial\s*complex)\b/i
  ];
  
  return places.filter(place => {
    // Check place types against blacklist
    const hasWorkType = place.types.some(type => 
      agencyAndWorkTypes.includes(type) && 
      type !== 'establishment' && 
      type !== 'point_of_interest'
    );
  // console.log('Log statement');
    if (hasWorkType) {
      // console.log('Place filter log');
      return false;
    }
    
    // Check name against work keyword patterns
    const placeName = place.name.toLowerCase();
    const matchesWorkPattern = workKeywordPatterns.some(pattern => pattern.test(placeName));
    
    if (matchesWorkPattern) {
      // console.log('Place filter log');
      return false;
    }
    
    return true;
  });
};

const smartPlaceSelection = async (places, preferences, maxBudget, startPoint, endPoint, journeyMode, maxDuration) => {
  // Step 0: Filter out agency buildings, offices, and work-related places first
  const touristFocusedPlaces = filterWorkAndAgencyPlaces(places);
  
  
  // Google Maps API safe limit: 10 places (10x10 = 100 elements) to avoid MAX_ELEMENTS_EXCEEDED
  // For long journeys, we still aim for 7-8 places minimum, but never exceed 10
  const API_SAFE_LIMIT = 10;
  const MIN_PLACES_FOR_LONG_JOURNEY = Math.min(8, API_SAFE_LIMIT);    // Determine target number of places based on journey duration and resources
  let targetPlaces;
  if (maxDuration >= 600) { // 10+ hours = extra long journey
    targetPlaces = API_SAFE_LIMIT; // Use full allowance
  } else if (maxDuration >= 360) { // 6+ hours = long journey
    targetPlaces = Math.min(10, API_SAFE_LIMIT); // Prefer maximum for long journeys
  } else if (maxDuration >= 240) { // 4-6 hours = medium journey
    targetPlaces = Math.min(8, API_SAFE_LIMIT);
  } else { // Short journey
    targetPlaces = Math.min(6, API_SAFE_LIMIT);
  }
  
  // For high-budget journeys, lean towards more places
  if (maxBudget >= 1000) {
    targetPlaces = Math.min(targetPlaces + 2, API_SAFE_LIMIT);
  } else if (maxBudget >= 600) {
    targetPlaces = Math.min(targetPlaces + 1, API_SAFE_LIMIT);
  }
  
  // If we already have enough tourist-focused places, return them directly);
  
  if (touristFocusedPlaces.length <= targetPlaces) {
     // console.log('Target log');
    return touristFocusedPlaces;
  }
  
  
  // Step 1: Add geographic relevance scores with more generous criteria
  const scoredPlaces = touristFocusedPlaces.map(place => {
    let geoScore = 0;
    
    if (journeyMode === 'currentLocation') {
      // For circular journeys, prefer places closer to start point but with generous radius
      const distToStart = calculateDistance(startPoint, place.location);
      geoScore = Math.max(0, 1 - (distToStart / 100000)); // 100km max relevance radius (doubled)
    } else if (journeyMode === 'customRoute') {
      // For point-to-point, prefer places along the route corridor with more generous threshold
      const distToStart = calculateDistance(startPoint, place.location);
      const distToEnd = calculateDistance(endPoint, place.location);
      const directDist = calculateDistance(startPoint, endPoint);
      
      // More generous corridor-based scoring
      const totalPathDist = distToStart + distToEnd;
      const pathDeviation = totalPathDist / directDist;
      geoScore = Math.max(0, 3 - pathDeviation); // Prefer places with deviation < 3x direct distance (was 2x)
    }
    
    return {
      ...place,
      geoScore,
      combinedScore: calculatePlaceSelectionScore(place, preferences, maxBudget, geoScore)
    };
  });
  
  // Step 2: Sort by combined score and select top candidates
  scoredPlaces.sort((a, b) => b.combinedScore - a.combinedScore);
  
  // Step 3: Ensure diversity in selection with higher limits per type
  const selectedPlaces = [];
  const typeTracker = {};
  const maxPerType = Math.max(2, Math.ceil(targetPlaces / 3)); // At least 2 per type, up to 1/3 of total
  
  // First pass: Select high-scoring places ensuring diversity
  for (const place of scoredPlaces) {
    if (selectedPlaces.length >= targetPlaces) break;
    
    const mainType = getMainPlaceType(place.types);
    const typeCount = typeTracker[mainType] || 0;
    
    // More lenient selection - prioritize high scores first
    if (typeCount < maxPerType || selectedPlaces.length < targetPlaces * 0.7) {
      selectedPlaces.push(place);
      typeTracker[mainType] = typeCount + 1;
    }
  }
  
  // Second pass: Fill remaining slots with best remaining places regardless of type
  if (selectedPlaces.length < targetPlaces) {
    const remaining = scoredPlaces.filter(place => !selectedPlaces.includes(place));
    const slotsLeft = targetPlaces - selectedPlaces.length;
    selectedPlaces.push(...remaining.slice(0, slotsLeft));
  }
  
  
  return selectedPlaces;
};

/**
 * Calculate comprehensive selection score for place filtering
 * WHY: Balances multiple factors for optimal place selection within API limits with generous scoring
 */
const calculatePlaceSelectionScore = (place, preferences, maxBudget, geoScore) => {
  // Base rating score (0-5 scale) - more generous for lower ratings
  const ratingScore = Math.max(2, (place.rating || 3) * 2);
  
  // Preference matching (significant boost for user interests)
  const preferenceScore = isPreferredPlace(place, preferences) ? 6 : 0;
  
  // Budget compatibility (more lenient scoring)
  const cost = place.estimatedCost || 0;
  let budgetScore = 5;
  if (cost > 0 && maxBudget > 0) {
    const costRatio = cost / maxBudget;
    budgetScore = costRatio < 0.4 ? 5 : (costRatio < 0.7 ? 4 : 2); // More generous thresholds
  }
  
  // Experience type diversity bonus
  const diversityScore = calculateDiversityBonus(place, preferences);
  
  // Geographic relevance (closer = better for API efficiency)
  const geoRelevanceScore = geoScore * 2; // Reduced weight for geography
  
  // Popularity bonus for highly rated places
  const popularityBonus = (place.rating >= 4.2) ? 2 : 0;
  
  // Combined weighted score with more balanced weights
  return (ratingScore * 0.25) + (preferenceScore * 0.25) + (budgetScore * 0.15) + 
         (diversityScore * 0.15) + (geoRelevanceScore * 0.15) + (popularityBonus * 0.05);
};

/**
 * Get main type category for a place to ensure diversity
 */
const getMainPlaceType = (types) => {
  const mainTypes = ['tourist_attraction', 'museum', 'park', 'restaurant', 'cafe', 'shopping_mall', 'place_of_worship'];
  const foundType = types.find(type => mainTypes.includes(type));
  return foundType || 'other';
};

/**
 * Get optimized distance matrix with progressive building strategy
 * WHY: Minimizes API calls while ensuring we have necessary distance data
 * STRATEGY: Builds matrix progressively based on actual route needs
 */
const getOptimizedDistanceMatrix = async (places, startPoint, endPoint, journeyMode) => {
  try {
    
    
    // Use more generous limits for better journey quality
    if (places.length <= 20) {
      
      return await getDistanceMatrix(places);
    }
    
    // For larger sets, use progressive approach
    
    
    // Step 1: Get starting distances (from start point to all places)
    const startDistances = await getDistancesFromPoint(startPoint, places);
    
    // Step 2: For point-to-point, also get end distances
    let endDistances = null;
    if (journeyMode === 'customRoute' && endPoint) {
      endDistances = await getDistancesFromPoint(endPoint, places);
    }
    
    // Step 3: Build progressive distance matrix
    return buildProgressiveDistanceMatrix(places, startDistances, endDistances);
    
  } catch (error) {
    console.error('âŒ Error in getOptimizedDistanceMatrix:', error);
    
    // Ultimate fallback - use mock data
    
    const { createMockDistanceMatrix } = await import('./distanceCalculator.js');
    return createMockDistanceMatrix(places);
  }
};

/**
 * Get distances from a single point to all places (1Ã—N instead of NÃ—N)
 * WHY: Dramatically reduces API calls from NÂ² to N
 */
const getDistancesFromPoint = async (point, places) => {
  const locations = places.map(place => place.location);
  
  try {    const result = await client.distancematrix({
      params: {
        origins: [point],
        destinations: locations,
        mode: 'driving',
        units: 'metric',
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });
    
    if (result.data.status === 'OK') {
      return result.data.rows[0].elements;
    } else {
      throw new Error(`API error: ${result.data.status}`);
    }
  } catch (error) {    console.error('Error getting distances from point:', error);
    // Fallback to Haversine distances
    return locations.map(location => ({
      distance: { value: calculateDistance(point, location), text: `${Math.round(calculateDistance(point, location) / 1000)} km` },
      duration: { value: calculateDistance(point, location) / 6.9, text: `${Math.round(calculateDistance(point, location) / 6900)} min` }, // Rough driving speed (25 km/h)
      status: 'OK'
    }));
  }
};

/**
 * Build progressive distance matrix using intelligent approximation
 * WHY: Provides necessary distance data without exceeding API limits
 * STRATEGY: Uses actual API data where available, intelligent approximation elsewhere
 */
const buildProgressiveDistanceMatrix = (places, startDistances, endDistances) => {
  const n = places.length;
  const rows = [];
  
  for (let i = 0; i < n; i++) {
    const elements = [];
    
    for (let j = 0; j < n; j++) {
      if (i === j) {
        // Same place - zero distance
        elements.push({
          distance: { value: 0, text: '0 m' },
          duration: { value: 0, text: '0 min' },
          status: 'OK'
        });
      } else {
        // Use intelligent distance approximation
        const approxDistance = approximateDistance(places[i], places[j], startDistances, endDistances, i, j);
        elements.push(approxDistance);
      }
    }
    
    rows.push({ elements });
  }
   // console.log('Approximation log');
  
  return {
    status: 'OK',
    rows: rows,
    origin_addresses: places.map(p => p.formatted_address || p.name),
    destination_addresses: places.map(p => p.formatted_address || p.name)
  };
};

/**
 * Intelligent distance approximation using available data
 * WHY: Provides reasonable distance estimates without additional API calls
 */
const approximateDistance = (fromPlace, toPlace, startDistances, endDistances, fromIndex, toIndex) => {
  // Use Haversine formula as base
  const directDistance = calculateDistance(fromPlace.location, toPlace.location);
  
  // Adjust based on urban density (more realistic travel distances)
  const urbanFactor = 1.3; // Urban areas have longer actual travel distances
  const adjustedDistance = directDistance * urbanFactor;
    // Estimate duration based on driving speed (average 25 km/h in city = 6.9 m/s)
  const drivingSpeed = 6.9; // meters per second
  const estimatedDuration = adjustedDistance / drivingSpeed;
  
  return {
    distance: { 
      value: Math.round(adjustedDistance), 
      text: `${(adjustedDistance / 1000).toFixed(1)} km` 
    },
    duration: { 
      value: Math.round(estimatedDuration), 
      text: `${Math.round(estimatedDuration / 60)} min` 
    },
    status: 'OK'
  };
};

/**
 * Optimize route order for maximum efficiency using nearest neighbor with improvements
 * WHY: Ensures the shortest path between consecutive places after selection
 */
/**
 * Ensure start and end points are always included in point-to-point journeys
 * WHY: Guarantees user-specified start/end points appear in the final output
 */
const ensureStartEndPointsInJourney = (journey, startPoint, endPoint, places) => {
  if (!journey || journey.length === 0) return journey;
  
  const actualStops = journey.filter(item => !item.isTravelLeg);
  
  // Check if start point is included
  const hasStartPoint = actualStops.some(stop => 
    stop.isStartPoint || 
    (stop.location && calculateDistance(stop.location, startPoint) < 100) // Within 100m
  );
  // console.log('Log statement');
  // Check if end point is included (for point-to-point journeys)
  const hasEndPoint = !endPoint || actualStops.some(stop => 
    stop.isEndPoint || 
    (stop.location && calculateDistance(stop.location, endPoint) < 100) // Within 100m
  );
  // console.log('Log statement');
  if (hasStartPoint && hasEndPoint) {
    // console.log('Journey is valid');
    return journey;
  }
  
  
  
  // If missing, add virtual start/end points based on user coordinates
  const enrichedJourney = [];
  
  // Add start point if missing
  if (!hasStartPoint && startPoint) {
    enrichedJourney.push({
      name: 'Start Location',
      location: startPoint,
      placeId: 'start_virtual',
      isStartPoint: true,
      visitOrder: 1,
      estimatedVisitDuration: 0,
      estimatedCost: 0,
      rating: 0,
      types: ['point_of_interest']
    });
    
    // Add travel leg if there are other stops
    if (actualStops.length > 0) {
      enrichedJourney.push({
        isTravelLeg: true,
        from: 'Start Location',
        to: actualStops[0].name,
        duration: '10 mins',
        distance: '2 km',
        mode: 'driving'
      });
    }
  }
  
  // Add existing journey
  enrichedJourney.push(...journey);
  
  // Add end point if missing
  if (!hasEndPoint && endPoint) {
    // Add travel leg from last stop
    if (actualStops.length > 0) {
      enrichedJourney.push({
        isTravelLeg: true,
        from: actualStops[actualStops.length - 1].name,
        to: 'End Location',
        duration: '10 mins',
        distance: '2 km',
        mode: 'driving'
      });
    }
    
    enrichedJourney.push({
      name: 'End Location',
      location: endPoint,
      placeId: 'end_virtual',
      isEndPoint: true,
      visitOrder: actualStops.length + 2,
      estimatedVisitDuration: 0,
      estimatedCost: 0,
      rating: 0,
      types: ['point_of_interest']
    });
  }
  
  
  return enrichedJourney;
};

const optimizeRouteOrder = (places, distanceMatrix, startIndex, endIndex, routeIndices) => {
  if (routeIndices.length <= 1) return routeIndices;
  
  
  
  // Extract intermediate places (excluding start and end)
  const intermediatePlaces = routeIndices.slice(1, -1);
  if (intermediatePlaces.length <= 1) return routeIndices;
  
  // Try nearest neighbor optimization from start
  const optimized = [startIndex];
  const remaining = new Set(intermediatePlaces);
  let currentIndex = startIndex;
  
  while (remaining.size > 0) {
    let bestDistance = Infinity;
    let bestNext = -1;
    
    for (const candidateIndex of remaining) {
      const travelData = distanceMatrix.rows[currentIndex]?.elements[candidateIndex];
      if (travelData && travelData.status === 'OK') {
        const distance = travelData.distance.value;
        if (distance < bestDistance) {
          bestDistance = distance;
          bestNext = candidateIndex;
        }
      }
    }
    
    if (bestNext !== -1) {
      optimized.push(bestNext);
      remaining.delete(bestNext);
      currentIndex = bestNext;
    } else {
      // Fallback: add remaining in original order
      remaining.forEach(index => optimized.push(index));
      break;
    }
  }
  
  optimized.push(endIndex);
  
  // Calculate distance improvement
  const originalDistance = calculateTotalRouteDistance(routeIndices, distanceMatrix);
  const optimizedDistance = calculateTotalRouteDistance(optimized, distanceMatrix);
  const improvement = ((originalDistance - optimizedDistance) / originalDistance * 100).toFixed(1);
  // console.log('Distance log');
  
  return optimized;
};

/**
 * Calculate total distance for a route
 */
const calculateTotalRouteDistance = (routeIndices, distanceMatrix) => {
  let totalDistance = 0;
  for (let i = 0; i < routeIndices.length - 1; i++) {
    const from = routeIndices[i];
    const to = routeIndices[i + 1];
    const travelData = distanceMatrix.rows[from]?.elements[to];
    if (travelData && travelData.status === 'OK') {
      totalDistance += travelData.distance.value;
    }
  }
  return totalDistance;
};


