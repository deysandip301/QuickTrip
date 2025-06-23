import React from 'react';
import JourneyList from './JourneyList';
import MapDisplay from './MapDisplay';
import { formatTime, calculateTotalTravelTime, formatDistance, calculateTotalDistance, generateGoogleMapsRoute } from '../utils/timeUtils';
import { enrichJourneyPlaces } from '../utils/placeUtils';
import './JourneyResultPage.css';

const JourneyResultPage = ({ journey, onBack, onSave, center, user, savedJourneySummary }) => {
  // Enrich journey with enhanced place data for better display
  const enrichedJourney = enrichJourneyPlaces(journey);

  const handleSaveJourney = async () => {
    // Calculate totals for the summary
    const totalTravelTimeMinutes = calculateTotalTravelTime(enrichedJourney);
    const totalDistanceKm = calculateTotalDistance(enrichedJourney);
    
    const journeyData = {
      journey: enrichedJourney, // Save the enriched journey data
      timestamp: new Date().toISOString(),
      center,
      // Add calculated summary data
      summary: {
        totalStops: enrichedJourney.filter(item => !item.isTravelLeg).length,
        totalTravelTimeMinutes,
        totalDistanceKm,
        formattedTravelTime: formatTime(totalTravelTimeMinutes),
        formattedDistance: formatDistance(totalDistanceKm)
      }
    };
    
    // Call the onSave callback (which handles auth check in App.jsx)
    if (onSave) {
      onSave(journeyData);
    }
  };
  // Ensure journey is an array and add defensive programming
  if (!Array.isArray(journey)) {
    return (
      <div className="journey-result-error">
        <h2>Error: Invalid Journey Data</h2>
        <p>The journey data is not in the expected format.</p>
        <button onClick={onBack}>Back to Home</button>
      </div>
    );
  }
  
  // Calculate journey statistics
  const totalStops = enrichedJourney.filter(item => !item.isTravelLeg).length;
  
  // Use saved summary data if available, otherwise calculate from journey
  let totalTravelTimeMinutes, formattedTravelTime, totalDistanceKm, formattedDistance;
  
  if (savedJourneySummary) {
    // Use saved summary data for better accuracy
    totalTravelTimeMinutes = savedJourneySummary.totalTravelTimeMinutes || 0;
    formattedTravelTime = savedJourneySummary.formattedTravelTime || formatTime(totalTravelTimeMinutes);
    totalDistanceKm = savedJourneySummary.totalDistanceKm || 0;
    formattedDistance = savedJourneySummary.formattedDistance || formatDistance(totalDistanceKm);
  } else {
    // Calculate from journey data (for new journeys)
    totalTravelTimeMinutes = calculateTotalTravelTime(enrichedJourney);
    formattedTravelTime = formatTime(totalTravelTimeMinutes);
    totalDistanceKm = calculateTotalDistance(enrichedJourney);
    formattedDistance = formatDistance(totalDistanceKm);
  }
  
  // Generate Google Maps route link
  const googleMapsUrl = generateGoogleMapsRoute(enrichedJourney);

  const estimatedCost = enrichedJourney
    .filter(item => !item.isTravelLeg)
    .reduce((total, stop) => total + (stop.estimatedCost || 20), 0);
  return (
    <div className="journey-result-container">
      {/* Header */}
      <div className="journey-result-header">
        <button
          onClick={onBack}
          className="journey-result-back-btn"
        >
          <svg className="journey-result-back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Home</span>
        </button>
        
        <div className="journey-result-title-section">
          <div className="journey-result-title-content">
            <div className="journey-result-title-icon">
              <span>🎉</span>
            </div>
            <div>
              <h1 className="journey-result-title">Your Perfect Journey</h1>
              <p className="journey-result-subtitle">Ready to explore? Here's your personalized itinerary!</p>
            </div>
          </div>
            {/* Save Journey Button - Always visible */}
          <button
            onClick={handleSaveJourney}
            className="journey-result-save-btn"
          >
            <svg className="journey-result-save-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>{user ? 'Save Journey' : 'Login to Save'}</span>
          </button>
        </div>
      </div>      {/* Journey Statistics */}
      <div className="journey-result-stats">
        <div className="journey-result-stat-card">
          <div className="journey-result-stat-content">
            <div className="journey-result-stat-icon stops">
              <span>📍</span>
            </div>
            <div>
              <p className="journey-result-stat-number">{totalStops}</p>
              <p className="journey-result-stat-label">Amazing Stops</p>
            </div>
          </div>
        </div>
        
        <div className="journey-result-stat-card">
          <div className="journey-result-stat-content">
            <div className="journey-result-stat-icon time">
              <span>⏱️</span>
            </div>            <div>
              <p className="journey-result-stat-number">{formattedTravelTime}</p>
              <p className="journey-result-stat-label">Travel Time</p>
            </div>
          </div>
        </div>
        
        <div className="journey-result-stat-card">
          <div className="journey-result-stat-content">
            <div className="journey-result-stat-icon cost">
              <span>💰</span>
            </div>
            <div>
              <p className="journey-result-stat-number">₹{estimatedCost}</p>
              <p className="journey-result-stat-label">Estimated Cost</p>
            </div>
          </div>
        </div>
      </div>      {/* Main Content - Single Column Layout */}
      <div className="journey-result-main">
        {/* Journey List - Takes more space */}
        <div className="journey-result-section itinerary-section">
          <div className="journey-result-section-header itinerary">
            <h2 className="journey-result-section-title">Your Itinerary</h2>
            <p className="journey-result-section-subtitle">Follow this route for the perfect day out!</p>
          </div>
          <div className="journey-result-section-content">
            <JourneyList journey={enrichedJourney} />
          </div>
        </div>        {/* Map Display - Enhanced with Journey Stats */}
        <div className="journey-result-section map-section">
          <div className="journey-result-section-header map">
            <h2 className="journey-result-section-title">Route Overview</h2>
            <p className="journey-result-section-subtitle">Visual overview of your journey path with key stats</p>
          </div>
          <div className="journey-result-section-content">
            {/* Journey Stats Row */}
            <div className="map-journey-stats">
              <div className="map-stat-item">
                <div className="map-stat-icon time">
                  <span>🕒</span>
                </div>
                <div className="map-stat-info">
                  <span className="map-stat-label">Total Time</span>
                  <span className="map-stat-value">{formattedTravelTime}</span>
                </div>
              </div>
              
              <div className="map-stat-item">
                <div className="map-stat-icon distance">
                  <span>📏</span>
                </div>
                <div className="map-stat-info">
                  <span className="map-stat-label">Total Distance</span>
                  <span className="map-stat-value">{formattedDistance}</span>
                </div>
              </div>
              
              <div className="map-stat-item">
                <div className="map-stat-icon stops">
                  <span>📍</span>
                </div>
                <div className="map-stat-info">
                  <span className="map-stat-label">Stops</span>
                  <span className="map-stat-value">{totalStops}</span>
                </div>
              </div>
              
              {googleMapsUrl && (
                <div className="map-stat-item maps-link">
                  <a 
                    href={googleMapsUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="google-maps-btn"
                  >
                    <div className="map-stat-icon maps">
                      <span>🗺️</span>
                    </div>
                    <div className="map-stat-info">
                      <span className="map-stat-label">Open in</span>
                      <span className="map-stat-value">Google Maps</span>
                    </div>
                  </a>
                </div>
              )}
            </div>
            
            {/* Map Display */}
            <div className="journey-result-map">
              <MapDisplay journey={enrichedJourney} center={center} />
            </div>
          </div>
        </div>
      </div>{/* Action Buttons */}
      <div className="journey-result-actions">
        <button
          onClick={onBack}
          className="journey-result-action-btn secondary"
        >
          Plan Another Journey
        </button>
        
        <button
          onClick={() => window.print()}
          className="journey-result-action-btn primary"
        >
          <svg className="journey-result-action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span>Print Itinerary</span>
        </button>
        
        <button
          onClick={() => {
            const text = journey
              .filter(item => !item.isTravelLeg)
              .map((stop, index) => `${index + 1}. ${stop.name} - ${stop.vicinity || 'Amazing place to visit!'}`)
              .join('\n');
            
            navigator.clipboard.writeText(`My QuickTrip Journey:\n\n${text}\n\nPlanned with QuickTrip - Your smart travel companion!`);
            alert('Journey copied to clipboard!');
          }}
          className="journey-result-action-btn tertiary"
        >
          <svg className="journey-result-action-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy to Share</span>
        </button>
      </div>      {/* Journey Tips */}
      <div className="journey-result-tips">
        <h3 className="journey-result-tips-title">
          <span>💡</span>
          <span>Pro Tips for Your Journey</span>
        </h3>
        <div className="journey-result-tips-grid">
          <div className="journey-result-tip">
            <span className="journey-result-tip-bullet blue">•</span>
            <span>Check opening hours before visiting each location</span>
          </div>
          <div className="journey-result-tip">
            <span className="journey-result-tip-bullet green">•</span>
            <span>Keep some extra time buffer for spontaneous discoveries</span>
          </div>
          <div className="journey-result-tip">
            <span className="journey-result-tip-bullet purple">•</span>
            <span>Use navigation apps for real-time traffic updates</span>
          </div>
          <div className="journey-result-tip">            <span className="journey-result-tip-bullet orange">•</span>
            <span>Take photos and share your experience with others!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JourneyResultPage;
