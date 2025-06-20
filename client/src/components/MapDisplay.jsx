import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Map, AdvancedMarker, Pin, useMap } from '@vis.gl/react-google-maps';

const MapDisplay = ({ journey, center }) => {
  const map = useMap();
  const polylineRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [mapError, setMapError] = useState(false);

  // Define drawSimplePolyline first before using it in useEffect
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

      // Draw simple polyline as fallback
      polylineRef.current = new window.google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#4F46E5',
        strokeOpacity: 0.8,
        strokeWeight: 4,
      });

      polylineRef.current.setMap(map);
    } catch (error) {
      console.error('Polyline error:', error);
      setMapError(true);
    }
  }, [map]);

  useEffect(() => {
    // Handle map initialization errors
    const handleMapError = () => {
      setMapError(true);
    };

    window.addEventListener('error', handleMapError);
    return () => window.removeEventListener('error', handleMapError);
  }, []);
  useEffect(() => {
    if (!map || journey.length === 0 || mapError) return;

    try {
      // Initialize Google Maps services
      if (!directionsServiceRef.current && window.google && window.google.maps) {
        directionsServiceRef.current = new window.google.maps.DirectionsService();
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true, // We'll use custom markers
          polylineOptions: {
            strokeColor: '#4F46E5',
            strokeWeight: 4,
            strokeOpacity: 0.8,
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

        const request = {
          origin: origin,
          destination: destination,
          waypoints: waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false // Keep our algorithm's order
        };

        directionsServiceRef.current.route(request, (result, status) => {
          if (status === 'OK') {
            directionsRendererRef.current.setDirections(result);
          } else {
            console.warn('Directions request failed:', status);
            // Fallback to simple polyline
            drawSimplePolyline(stops);
          }
        });
      } else if (stops.length === 1) {
        // Single stop, just center the map
        try {
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(stops[0].location);
          map.fitBounds(bounds);
          map.setZoom(15);
        } catch (error) {
          console.error('Single stop error:', error);
        }
      } else {
        // Multiple stops but no directions service, use simple polyline
        drawSimplePolyline(stops);
      }
    } catch (error) {
      console.error('Map error:', error);
      setMapError(true);
    }
  }, [map, journey, mapError, drawSimplePolyline]);

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
  };

  // Show error state
  if (mapError) {
    return (
      <div className="relative h-full w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Map Unavailable</h3>
          <p className="text-gray-600 text-sm mb-4">
            Unable to load the map. This might be due to API key restrictions or network issues.
          </p>
          <div className="text-xs text-gray-500">
            <p>Your journey is still available in the sidebar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Map
        zoom={13}
        center={center}
        mapId="DEMO_MAP_ID"
        className="w-full h-full"
        options={{
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        }}
        onError={() => setMapError(true)}
      >
        {stops.map((stop, index) => (
          <AdvancedMarker
            key={stop.placeId || index}
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

      {/* Map overlay with journey info */}
      {stops.length > 0 && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"></div>
            <h3 className="font-semibold text-gray-800">Your Journey</h3>
          </div>
          <div className="text-sm text-gray-600">
            <div className="flex justify-between">
              <span>📍 Stops:</span>
              <span className="font-medium">{stops.length}</span>
            </div>
            <div className="flex justify-between">
              <span>⏰ Duration:</span>
              <span className="font-medium">
                {journey.length > 0 && journey.find(item => item.isTravelLeg) ? 
                  `~${Math.ceil(stops.length * 1.5)}h` : 'Calculating...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {stops.length === 0 && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Ready to Explore</h3>
            <p className="text-gray-600">Plan your journey to see it on the map</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDisplay;
