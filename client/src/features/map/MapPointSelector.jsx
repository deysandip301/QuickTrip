import React, { useState, useCallback } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import PlacesSearchInput from './PlacesSearchInput';
import './MapPointSelector.css';

const MapPointSelector = ({ onStartPointChange, onEndPointChange, setCenter: setAppCenter, activePointSelector }) => {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const map = useMap();

  const handleMapClick = useCallback((event) => {
    if (!event.detail || !event.detail.latLng) return;
    const point = { lat: event.detail.latLng.lat, lng: event.detail.latLng.lng };

    setSelectedPoint(point);
    
    // Call the appropriate callback based on which point selector is active
    if (activePointSelector === 'start') {
      onStartPointChange(point);
    } else if (activePointSelector === 'end') {
      onEndPointChange(point);
    }

    if (map) {
      map.setCenter(point);
    }
    setAppCenter(point);
  }, [map, onStartPointChange, onEndPointChange, setAppCenter, activePointSelector]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const newCenter = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        if (map) {
          map.setCenter(newCenter);
          map.setZoom(15);
        }
        setAppCenter(newCenter);
        
        setSelectedPoint(newCenter);
        
        // Set the point based on active selector
        if (activePointSelector === 'start') {
          onStartPointChange(newCenter);
        } else if (activePointSelector === 'end') {
          onEndPointChange(newCenter);
        }
      }, (error) => {
        console.error("Error getting current location: ", error);
        alert("Could not get your location. Please select points manually.");
      }, {
        timeout: 10000,
        enableHighAccuracy: true,
        maximumAge: 300000
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const resetPoint = () => {
    setSelectedPoint(null);
    // Reset the point based on active selector
    if (activePointSelector === 'start') {
      onStartPointChange(null);
    } else if (activePointSelector === 'end') {
      onEndPointChange(null);
    }
  };

  const getPointTypeText = () => {
    return activePointSelector === 'start' ? 'starting' : 'ending';
  };

  const getPointMarkerText = () => {
    return activePointSelector === 'start' ? 'A' : 'B';
  };

  return (
    <div className="map-point-selector-container">
      {/* Header */}
      <div className="map-point-selector-header">
        <div className="map-point-selector-title-section">
          <h2 className="map-point-selector-title">
            <span className="map-point-selector-icon">📍</span>
            Select Your {activePointSelector === 'start' ? 'Starting' : 'Ending'} Point
          </h2>
          <p className="map-point-selector-subtitle">
            Click on the map to set your {getPointTypeText()} point
          </p>
        </div>

        {/* Quick Actions */}
        <div className="map-point-selector-actions">
          <button
            onClick={getCurrentLocation}
            className="map-point-selector-action-btn location"
          >
            <svg className="map-point-selector-action-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span>My Location</span>
          </button>
          
          <button
            onClick={resetPoint}
            className="map-point-selector-action-btn reset"
          >
            <svg className="map-point-selector-action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Reset</span>
          </button>        </div>        {/* Places Search */}
        <div className="map-point-selector-search">
          <div className="map-point-selector-search-header">
            <svg className="map-point-selector-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="map-point-selector-search-title">Search Location</span>
          </div>
          <PlacesSearchInput
            placeholder={`Search for ${getPointTypeText()} location...`}
            onPlaceSelect={(place) => {
              if (place.location) {
                const point = place.location;
                setSelectedPoint(point);
                
                // Call the appropriate callback based on which point selector is active
                if (activePointSelector === 'start') {
                  onStartPointChange(point);
                } else if (activePointSelector === 'end') {
                  onEndPointChange(point);
                }

                // Center map on selected place
                if (map) {
                  map.setCenter(point);
                  map.setZoom(15);
                }
                setAppCenter(point);
              }
            }}
            className="map-point-selector-places-input"
          />
        </div>

        {/* Status Display */}
        <div className="map-point-selector-status">
          <div className="map-point-selector-status-content">
            <div className="map-point-selector-current-mode">
              <div className={`map-point-selector-status-indicator ${activePointSelector}`}></div>
              <span className="map-point-selector-status-text">
                Setting {activePointSelector === 'start' ? 'Start' : 'End'} Point
              </span>
            </div>
            {selectedPoint && (
              <div className="map-point-selector-selected-point">
                <span className="map-point-selector-selected-text">
                  Point selected: {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="map-point-selector-map-container">
        <Map
          defaultCenter={{ lat: 12.9716, lng: 77.5946 }}
          defaultZoom={12}
          mapId={import.meta.env.VITE_GOOGLE_MAPS_ID || 'DEMO_MAP_ID'}
          onClick={handleMapClick}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={false}
          scaleControl={true}
          streetViewControl={false}
          rotateControl={false}
          fullscreenControl={true}
          className="map-point-selector-map"
        >          {selectedPoint && (
            <AdvancedMarker 
              position={selectedPoint} 
              title={`${activePointSelector === 'start' ? 'Start' : 'End'} Point`}
            >
              <div className={`map-point-selector-marker ${activePointSelector}`}>
                <div className="map-point-selector-marker-icon">
                  <span className="map-point-selector-marker-text">{getPointMarkerText()}</span>
                </div>
                <div className="map-point-selector-marker-point"></div>
              </div>
            </AdvancedMarker>
          )}
        </Map>
        
        {/* Floating Instructions */}
        <div className="map-point-selector-instructions">
          <div className="map-point-selector-instructions-content">
            <p className="map-point-selector-instructions-text">
              <span className={activePointSelector}>
                <span className={`map-point-selector-instructions-dot ${activePointSelector}`}></span>
                Click map to set {activePointSelector === 'start' ? 'Start' : 'End'} Point ({getPointMarkerText()})
              </span>
            </p>
            <div className="map-point-selector-instructions-hints">
              <span className="map-point-selector-instructions-hint">
                <svg className="map-point-selector-instructions-hint-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Location
              </span>
              <span className="map-point-selector-instructions-hint">
                <svg className="map-point-selector-instructions-hint-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Click
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapPointSelector;
