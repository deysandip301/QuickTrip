import React, { useState } from 'react';
import { generateMapsFallbackLinks } from '../services/apiService';
import { formatTravelTime, parseDuration, formatDistance, parseDistance } from '../utils/timeUtils';
import PlaceCard from './PlaceCard';
import './JourneyList.css';
import './JourneyResultPage.css';

const JourneyList = ({ journey, loading, error }) => {
  const [expandedPlaces, setExpandedPlaces] = useState(new Set());

  const togglePlaceExpansion = (placeId) => {
    setExpandedPlaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(placeId)) {
        newSet.delete(placeId);
      } else {
        newSet.add(placeId);
      }
      return newSet;
    });
  };  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">
          <p className="loading-title">Planning your journey...</p>
          <p className="loading-subtitle">Finding the best places for you</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="error-container">
        <div className="error-header">
          <div className="error-icon">
            <svg className="error-icon-svg" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="error-content">
            <h3>Oops! Something went wrong</h3>
            <p>{error}</p>
          </div>
        </div>
        
        {/* Show helpful links if it's an API error */}
        {(error.includes('API') || error.includes('🔑') || error.includes('🚫')) && (
          <div className="error-links">
            <p>Helpful resources:</p>
            <div className="error-links-list">
              <a 
                href="https://console.cloud.google.com/apis/library" 
                target="_blank" 
                rel="noopener noreferrer"
                className="error-link"
              >
                → Google Cloud Console - Enable APIs
              </a>
              <a 
                href="https://developers.google.com/maps/documentation/javascript/get-api-key" 
                target="_blank" 
                rel="noopener noreferrer"
                className="error-link"
              >
                → API Key Setup Guide
              </a>
            </div>
          </div>
        )}
      </div>
    );
  }
  if (journey.length === 0) {
    return (
      <div className="empty-journey-container">
        <div className="empty-journey-icon">
          <svg className="empty-journey-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="empty-journey-title">Ready to explore?</h3>
        <p className="empty-journey-subtitle">Fill out your preferences above and create your personalized journey!</p>
      </div>
    );
  }
  const stops = journey.filter(item => !item.isTravelLeg);
  const totalDuration = journey
    .filter(item => item.isTravelLeg)
    .reduce((sum, item) => sum + parseDuration(item.duration), 0);
  
  const formattedTotalDuration = formatTravelTime(totalDuration);
  // Generate Google Maps links
  const mapLinks = generateMapsFallbackLinks(journey);

  return (
    <div className="journey-list">
      <div className="journey-header">
        <div className="journey-header-top">
          <h2 className="journey-title">Your Journey</h2>
          {mapLinks && mapLinks.type === 'route' && (
            <a
              href={mapLinks.routeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="journey-route-btn"
              title={mapLinks.title}
            >
              🗺️ View Route
            </a>
          )}
        </div>
        <div className="journey-stats">
          <div className="journey-stat">
            <span className="journey-stat-icon">📍</span>
            <span className="journey-stat-text">{stops.length} stops</span>
          </div>          <div className="journey-stat">
            <span className="journey-stat-icon">🚗</span>
            <span className="journey-stat-text">{formattedTotalDuration || 'Calculating...'}</span>
          </div>
        </div>
      </div>      <div className="journey-items">
        {journey.map((item, index) => (
          <div key={index} className="journey-item">
            {item.isTravelLeg ? (
              <div className="journey-travel-leg">
                <div className="journey-travel-icon">
                  <svg className="journey-travel-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>                <div className="journey-travel-content">
                  <p className="journey-travel-text">
                    🚗 {formatTravelTime(item.duration)} • {formatDistance(parseDistance(item.distance))}
                  </p>
                </div>
              </div>            ) : (              <PlaceCard 
                place={item}
                isExpanded={expandedPlaces.has(item.placeId)}
                onToggleExpand={togglePlaceExpansion}
                showPhotos={true}
              />
            )}
          </div>
        ))}
      </div>{/* Quick Actions Footer */}
      {mapLinks && (
        <div className="journey-footer">
          <div className="journey-footer-title">External Links</div>
          <div className="journey-footer-actions">
            {mapLinks.type === 'route' && (
              <a
                href={mapLinks.routeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="journey-footer-btn route"
              >
                🗺️ Full Route
              </a>
            )}
            <button
              onClick={() => {
                if (navigator.share && mapLinks.routeUrl) {
                  navigator.share({
                    title: 'My QuickTrip Journey',
                    text: `Check out my ${stops.length}-stop journey!`,
                    url: mapLinks.routeUrl
                  });
                } else if (mapLinks.routeUrl) {
                  navigator.clipboard.writeText(mapLinks.routeUrl);
                  alert('Journey link copied to clipboard!');
                }
              }}
              className="journey-footer-btn share"
            >
              📱 Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JourneyList;
