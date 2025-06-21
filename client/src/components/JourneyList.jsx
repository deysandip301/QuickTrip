import React from 'react';
import { generateMapsFallbackLinks } from '../services/apiService';
import { formatTravelTime, parseDuration } from '../utils/timeUtils';
import './JourneyList.css';
import './JourneyResultPage.css';

const JourneyList = ({ journey, loading, error }) => {  if (loading) {
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

  const getPlaceIcon = (types) => {
    if (types.includes('cafe') || types.includes('restaurant')) return '☕';
    if (types.includes('park')) return '🌳';
    if (types.includes('museum')) return '🏛️';
    if (types.includes('art_gallery')) return '🎨';
    if (types.includes('tourist_attraction')) return '🏰';
    return '📍';
  };
  const getPlaceColor = (index, types) => {
    if (index === 0) return 'journey-place-start';
    if (index === stops.length - 1) return 'journey-place-end';
    
    if (types.includes('cafe') || types.includes('restaurant')) return 'journey-place-restaurant';
    if (types.includes('park')) return 'journey-place-park';
    if (types.includes('museum')) return 'journey-place-museum';
    if (types.includes('art_gallery')) return 'journey-place-gallery';
    if (types.includes('tourist_attraction')) return 'journey-place-attraction';
    
    return 'journey-place-default';
  };
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
                    🚗 {formatTravelTime(item.duration)} • {item.distance}
                  </p>
                </div>
              </div>
            ) : (              <div className={`journey-place ${getPlaceColor(stops.indexOf(item), item.types || [])}`}>
                <div className="journey-place-content">
                  <div className="journey-place-icon">
                    {getPlaceIcon(item.types || [])}
                  </div>
                  <div className="journey-place-details">
                    <div className="journey-place-header">
                      <h3 className="journey-place-name">
                        {item.name}
                        {stops.indexOf(item) === 0 && <span className="journey-place-badge start">Start</span>}
                        {stops.indexOf(item) === stops.length - 1 && <span className="journey-place-badge end">End</span>}
                      </h3>
                      {mapLinks && mapLinks.locationLinks && (
                        <a
                          href={mapLinks.locationLinks[stops.indexOf(item)]?.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="journey-place-map-btn"
                          title="View on Google Maps"
                        >
                          📍
                        </a>
                      )}
                    </div>
                    <div className="journey-place-meta">
                      {item.rating && (
                        <div className="journey-place-rating">
                          <span className="journey-place-rating-icon">⭐</span>
                          <span className="journey-place-rating-value">{item.rating}</span>
                        </div>
                      )}
                      {item.estimatedVisitDuration && (
                        <div className="journey-place-duration">
                          <span className="journey-place-duration-icon">⏰</span>
                          <span className="journey-place-duration-value">{item.estimatedVisitDuration}min</span>
                        </div>
                      )}
                    </div>                    {item.vicinity && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${item.location.lat},${item.location.lng}${item.placeId ? `&query_place_id=${item.placeId}` : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="journey-place-vicinity-link"
                        title="Click to view exact location on Google Maps"
                      >
                        <p className="journey-place-vicinity">{item.vicinity}</p>
                      </a>
                    )}
                    
                    {/* Enhanced Location Information */}
                    {item.location && (
                      <div className="journey-location-info">
                        <span className="journey-location-label">📍 Location:</span>
                        <span className="journey-location-coords">
                          {item.location.lat.toFixed(6)}, {item.location.lng.toFixed(6)}
                        </span>                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${item.location.lat},${item.location.lng}${item.placeId ? `&query_place_id=${item.placeId}` : ''}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="journey-location-link"
                        >
                          View on Maps
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>      {/* Quick Actions Footer */}
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
