import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';
import './MapDisplay.css';

const MapDisplay = ({ journey, center }) => {
  const map = useMap();
  const polylineRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [mapError, setMapError] = useState(false);  const [apiError, setApiError] = useState(null);
  const [usingFallbackRoute, setUsingFallbackRoute] = useState(false);

  // Enhanced error handling for API issues
  const handleApiError = useCallback((error, context) => {
    console.error(`API Error in ${context}:`, error);
    
    let errorMessage = 'Google Maps API issue detected';
    let solutions = [];
    
    if (error.includes('REQUEST_DENIED') || error.includes('DIRECTIONS_ROUTE')) {
      errorMessage = 'Directions API not authorized';
      solutions = [
        'Enable Directions API in Google Cloud Console',
        'Check API key permissions',
        'Verify API key restrictions'
      ];      setApiError({ type: 'DIRECTIONS_API', message: errorMessage, solutions });
    } else if (error.includes('OVER_QUERY_LIMIT')) {
      errorMessage = 'API quota exceeded';
      solutions = [
        'Wait for quota reset',
        'Upgrade your Google Cloud billing plan',
        'Check API usage in console'
      ];
      setApiError({ type: 'QUOTA', message: errorMessage, solutions });
    } else {
      setApiError({ type: 'GENERAL', message: errorMessage, solutions: ['Check your internet connection', 'Try refreshing the page'] });
    }  }, []);

  // Enhanced drawSimplePolyline with better error handling and visual feedback
  const drawSimplePolyline = useCallback((stops) => {
    if (!map) return;
    
    try {
      const bounds = new window.google.maps.LatLngBounds();
      const pathCoordinates = stops.map(stop => {
        bounds.extend(stop.location);
        return stop.location;
      });

      map.fitBounds(bounds, 50);

      // Clear previous polyline
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }

      // Draw enhanced polyline as fallback when Directions API fails
      polylineRef.current = new window.google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#4F46E5',
        strokeOpacity: 0.9,
        strokeWeight: 5,
        icons: [{
          icon: {
            path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 4,
            strokeColor: '#4F46E5',
            fillColor: '#4F46E5',
            fillOpacity: 1
          },
          offset: '50%',
          repeat: '120px'
        }]
      });

      polylineRef.current.setMap(map);
    } catch (error) {
      console.error('Polyline error:', error);
      setMapError(true);
    }
  }, [map]);

  useEffect(() => {
    // Handle map initialization errors
    const handleMapError = (event) => {
      // Check if the error is related to Google Maps
      if (event.message && (
        event.message.includes('Google Maps') || 
        event.message.includes('ApiTargetBlockedMapError') ||
        event.message.includes('Map ID')
      )) {
        console.warn('Google Maps API error detected:', event.message);
        setMapError(true);
      }
    };    // Listen for error events
    window.addEventListener('error', handleMapError);
    
    return () => {
      window.removeEventListener('error', handleMapError);
    };
  }, []);

  useEffect(() => {
    if (!map || journey.length === 0 || mapError) return;

    try {
      // Initialize Google Maps services
      if (!directionsServiceRef.current && window.google && window.google.maps) {
        directionsServiceRef.current = new window.google.maps.DirectionsService();        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true, // We'll use custom markers
          polylineOptions: {
            strokeColor: '#4F46E5',
            strokeWeight: 4,
            strokeOpacity: 0.8,
            icons: [{
              icon: {
                path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 3,
                strokeColor: '#4F46E5'
              },
              offset: '50%',
              repeat: '150px'
            }]
          }
        });
        directionsRendererRef.current.setMap(map);
      }

      // Clear previous routes
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
      
      const stops = journey.filter(item => !item.isTravelLeg);
      if (stops.length === 0) return;

      if (stops.length >= 2 && directionsServiceRef.current) {
        // Create route with waypoints
        const origin = stops[0].location;
        const destination = stops[stops.length - 1].location;
        const waypoints = stops.slice(1, -1).map(stop => ({
          location: stop.location,
          stopover: true
        }));

        // Split waypoints into chunks if too many (Google limit is 25)
        const maxWaypoints = 23; // Leave some buffer
        const waypointChunks = [];
        for (let i = 0; i < waypoints.length; i += maxWaypoints) {
          waypointChunks.push(waypoints.slice(i, i + maxWaypoints));
        }        if (waypointChunks.length <= 1) {
          // Single request
          const request = {
            origin: origin,
            destination: destination,
            waypoints: waypoints,
            travelMode: window.google.maps.TravelMode.WALKING, // Changed to WALKING for tourism
            optimizeWaypoints: false // Keep our algorithm's order
          };
          
          directionsServiceRef.current.route(request, (result, status) => {
            if (status === 'OK') {
              directionsRendererRef.current.setDirections(result);
              setUsingFallbackRoute(false);
              setApiError(null);
            } else {
              console.warn('Directions request failed:', status);
              handleApiError(status, 'Directions Service');
              // Always fallback to simple polyline when directions fail
              setUsingFallbackRoute(true);
              drawSimplePolyline(stops);
            }
          });
        } else {
          // Multiple requests needed - fall back to simple polyline for now
          setUsingFallbackRoute(true);
          drawSimplePolyline(stops);
        }
      } else if (stops.length === 1) {
        // Single stop, just center the map
        try {
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(stops[0].location);
          map.fitBounds(bounds);
          map.setZoom(15);
        } catch (error) {
          console.error('Single stop error:', error);
        }      } else {
        // Multiple stops but no directions service, use simple polyline
        setUsingFallbackRoute(true);
        drawSimplePolyline(stops);
      }
    } catch (error) {
      console.error('Map error:', error);
      setMapError(true);
    }
  }, [map, journey, mapError, drawSimplePolyline, handleApiError]);

  const stops = journey.filter(item => !item.isTravelLeg);

  const getMarkerColor = (index, types) => {
    if (index === 0) return '#10B981'; // Start - Green
    if (index === stops.length - 1) return '#EF4444'; // End - Red
    
    // Color based on place type
    if (types.includes('cafe') || types.includes('restaurant')) return '#F59E0B'; // Amber
    if (types.includes('park')) return '#22C55E'; // Green
    if (types.includes('museum')) return '#8B5CF6'; // Purple
    if (types.includes('tourist_attraction')) return '#3B82F6'; // Blue
    
    return '#6B7280'; // Default gray
  };

  const getMarkerLabel = (index, types) => {
    if (index === 0) return '🚀'; // Start
    if (index === stops.length - 1) return '🏁'; // End
    
    // Icon based on place type
    if (types.includes('cafe') || types.includes('restaurant')) return '☕';
    if (types.includes('park')) return '🌳';
    if (types.includes('museum')) return '🏛️';
    if (types.includes('tourist_attraction')) return '🏰';
    
    return `${index + 1}`;
  };  // Generate Google Maps links for fallback
  const generateGoogleMapsUrl = useCallback((stops) => {
    if (stops.length === 0) return null;
    
    if (stops.length === 1) {
      const stop = stops[0];
      return `https://www.google.com/maps/search/?api=1&query=${stop.location.lat},${stop.location.lng}`;
    }
    
    const origin = stops[0];
    const destination = stops[stops.length - 1];
    const waypoints = stops.slice(1, -1);
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin.location.lat},${origin.location.lng}&destination=${destination.location.lat},${destination.location.lng}`;
    
    if (waypoints.length > 0) {
      const waypointStr = waypoints.map(stop => `${stop.location.lat},${stop.location.lng}`).join('|');
      url += `&waypoints=${waypointStr}`;
    }
    
    url += '&travelmode=driving';
    return url;
  }, []);

  // Generate individual location links
  const generateLocationLinks = useCallback((stops) => {
    return stops.map(stop => ({
      ...stop,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${stop.location.lat},${stop.location.lng}&query_place_id=${stop.placeId || ''}`    }));
  }, []);

  // Show enhanced error state with alternatives
  if (mapError || (apiError && !usingFallbackRoute)) {
    const stops = journey.filter(item => !item.isTravelLeg);
    const googleMapsUrl = generateGoogleMapsUrl(stops);
    const locationLinks = generateLocationLinks(stops);

    return (
      <div className="relative h-full w-full bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center p-8 max-w-2xl mx-4">
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Journey Continues!</h2>
          <p className="text-gray-600 mb-6">
            {apiError ? 
              `${apiError.message} - but don't worry, we've got alternatives!` : 
              "The interactive map is temporarily unavailable, but your journey is ready to explore!"
            }
          </p>

          {/* Primary Action - Open in Google Maps */}
          {googleMapsUrl && stops.length > 1 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-800">Complete Route Ready</h3>
                  <p className="text-sm text-gray-600">Open your full journey in Google Maps</p>
                </div>
              </div>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105"
              >
                🗺️ Open Full Route in Google Maps
              </a>
              <p className="text-xs text-gray-500 mt-2">
                Includes all {stops.length} stops with turn-by-turn directions
              </p>
            </div>
          )}

          {/* Individual Location Cards */}
          {stops.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2 text-sm">📍</span>
                Your Stops ({stops.length})
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {locationLinks.map((stop, index) => (
                  <div key={stop.placeId || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                          {index === 0 ? '🚀' : index === stops.length - 1 ? '🏁' : index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-800 text-sm">{stop.name}</p>
                          <p className="text-xs text-gray-500">{stop.vicinity}</p>
                        </div>
                      </div>
                    </div>
                    <a
                      href={stop.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600 transition-colors"
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Help Section */}
          {apiError && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-amber-800 mb-2 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                For Developers
              </h4>
              <div className="text-sm text-amber-700 space-y-1">
                {apiError.solutions.map((solution, index) => (
                  <div key={index} className="flex items-start">
                    <span className="text-amber-600 mr-2">•</span>
                    <span>{solution}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-amber-200">
                <p className="text-xs text-amber-600">
                  💡 <strong>Quick Fix:</strong> Enable "Directions API" in{' '}
                  <a 
                    href="https://console.cloud.google.com/apis/library/directions-backend.googleapis.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-800"
                  >
                    Google Cloud Console
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => {                setMapError(false);
                setApiError(null);
                window.location.reload();
              }}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              🔄 Try Map Again
            </button>
            <a 
              href="https://react.dev/link/react-devtools" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              🛠️ Get React DevTools
            </a>
          </div>

          {/* Journey Summary */}
          {stops.length > 0 && (
            <div className="mt-6 p-4 bg-white/60 backdrop-blur-sm rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stops.length}</div>
                  <div className="text-xs text-gray-600">Stops</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.ceil(stops.reduce((sum, stop) => sum + (stop.estimatedVisitDuration || 45), 0) / 60)}h
                  </div>
                  <div className="text-xs text-gray-600">Duration</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    ${stops.reduce((sum, stop) => sum + (stop.estimatedCost || 20), 0)}
                  </div>
                  <div className="text-xs text-gray-600">Est. Cost</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }  // Calculate smart center: use provided center, or first journey location, or default
  const getMapCenter = () => {
    if (center) return center;
    
    if (journey && journey.length > 0) {
      const firstLocation = journey.find(item => !item.isTravelLeg && item.location);
      if (firstLocation) return firstLocation.location;
    }
    
    return { lat: 12.9716, lng: 77.5946 }; // Default to Bangalore
  };

  return (
    <Map
      zoom={13}
      center={getMapCenter()}
      mapId="quicktrip-map"
      className="w-full h-full"
      style={{ 
        width: '100%', 
        height: '100%', 
        minHeight: '320px',
        position: 'relative'
      }}
      options={{
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true,
        gestureHandling: 'greedy',
        keyboardShortcuts: true,
        disableDoubleClickZoom: false
      }}
      onError={(error) => {
        console.error('Map error:', error);
        setMapError(true);
      }}
      onLoad={(map) => {
        console.log('Map loaded successfully!', map);
      }}
    >      {stops.map((stop, index) => (
        <AdvancedMarker
          key={`${stop.placeId || 'stop'}-${index}`}
          position={stop.location}
          title={stop.name}
        >
          <Pin
            background={getMarkerColor(index, stop.types || [])}
            borderColor="#fff"
            glyphColor="#fff"
            scale={1.2}
          >
            <div className="text-xs font-bold">
              {getMarkerLabel(index, stop.types || [])}
            </div>
          </Pin>
        </AdvancedMarker>
      ))}
    </Map>
  );
};

export default MapDisplay;
