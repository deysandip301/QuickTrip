import React, { useState, useEffect } from 'react';
import { getSavedJourneys } from '../services/firebase';
import { formatTime, formatDistance, calculateTotalTravelTime, calculateTotalDistance } from '../utils/timeUtils';
import './SavedJourneys.css';

const SavedJourneys = ({ user, onBack, onJourneySelect }) => {
    const [savedJourneys, setSavedJourneys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSavedJourneys = async () => {
            try {
                let journeys = [];
                
                if (user && user.uid) {
                    // Try to fetch from Firebase
                    try {
                        journeys = await getSavedJourneys(user);                    } catch {
                        console.warn('Firebase fetch failed, checking local storage...');
                        // Fallback to local storage if Firebase fails
                        journeys = getLocalJourneys(user);
                    }
                } else {
                    // For non-logged-in users, only use local storage
                    journeys = getLocalJourneys();
                }
                
                setSavedJourneys(journeys);
            } catch (err) {
                setError('Failed to load saved journeys');
                console.error('Error fetching journeys:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSavedJourneys();
    }, [user]);

    const getLocalJourneys = (currentUser = null) => {
        try {
            const localJourneys = JSON.parse(localStorage.getItem('quicktrip_journeys') || '[]');
            // Filter by user if provided, otherwise return all
            if (currentUser && currentUser.uid) {
                return localJourneys.filter(journey => journey.userId === currentUser.uid);
            }
            return localJourneys;
        } catch (error) {
            console.error('Error reading local journeys:', error);
            return [];
        }
    };    const handleJourneyClick = (savedJourney) => {
        // Handle different data structures from Firebase vs local storage
        const journeyData = savedJourney.journey?.journey || savedJourney.journey;
        
        if (Array.isArray(journeyData)) {
            // Pass the complete saved journey object so the result page can access summary data
            onJourneySelect({
                journey: journeyData,
                summary: savedJourney.summary,
                timestamp: savedJourney.timestamp || savedJourney.createdAt,
                center: savedJourney.center,
                isSavedJourney: true
            });
        } else {
            console.warn('Invalid journey data structure:', savedJourney);
        }
    };if (loading) {
        return (
            <div className="saved-journeys-container">
                <div className="saved-journeys-header">
                    <button
                        onClick={onBack}
                        className="saved-journeys-back-btn"
                    >
                        <svg className="saved-journeys-back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back to Home</span>
                    </button>
                    
                    <div className="saved-journeys-title-section">
                        <div className="saved-journeys-icon-container">
                            <span className="saved-journeys-icon">💾</span>
                        </div>
                        <div>
                            <h1 className="saved-journeys-title">Saved Journeys</h1>
                            <p className="saved-journeys-subtitle">Your collection of amazing travel experiences</p>
                        </div>
                    </div>
                </div>

                <div className="saved-journeys-loading">
                    <div className="saved-journeys-loading-spinner"></div>
                    <p className="saved-journeys-loading-text">Loading your saved journeys...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="saved-journeys-container">
                <div className="saved-journeys-header">
                    <button
                        onClick={onBack}
                        className="saved-journeys-back-btn"
                    >
                        <svg className="saved-journeys-back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Back to Home</span>
                    </button>
                    
                    <div className="saved-journeys-title-section">
                        <div className="saved-journeys-icon-container saved-journeys-icon-error">
                            <span className="saved-journeys-icon">❌</span>
                        </div>
                        <div>
                            <h1 className="saved-journeys-title">Error Loading Journeys</h1>
                            <p className="saved-journeys-subtitle">We couldn't load your saved journeys</p>
                        </div>
                    </div>
                </div>

                <div className="saved-journeys-error">
                    <p className="saved-journeys-error-message">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="saved-journeys-retry-btn"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }    return (
        <div className="saved-journeys-container">
            <div className="saved-journeys-header">
                <button
                    onClick={onBack}
                    className="saved-journeys-back-btn"
                >
                    <svg className="saved-journeys-back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Back to Home</span>
                </button>
                
                <div className="saved-journeys-title-section">
                    <div className="saved-journeys-icon-container">
                        <span className="saved-journeys-icon">💾</span>
                    </div>
                    <div>
                        <h1 className="saved-journeys-title">Saved Journeys</h1>
                        <p className="saved-journeys-subtitle">Your collection of amazing travel experiences</p>
                    </div>
                </div>
            </div>

            {savedJourneys.length === 0 ? (
                <div className="saved-journeys-empty">
                    <div className="saved-journeys-empty-icon-container">
                        <span className="saved-journeys-empty-icon">🗺️</span>
                    </div>
                    <h3 className="saved-journeys-empty-title">No Saved Journeys Yet</h3>
                    <p className="saved-journeys-empty-description">
                        Start exploring and save your favorite journeys to access them anytime. 
                        Your adventure collection will appear here!
                    </p>
                    <button
                        onClick={onBack}
                        className="saved-journeys-empty-btn"
                    >
                        Plan Your First Journey
                    </button>
                </div>
            ) : (                <div className="saved-journeys-grid">
                    {savedJourneys.map((savedJourney) => {
                        // Handle different data structures from Firebase vs local storage
                        const journeyData = savedJourney.journey?.journey || savedJourney.journey;
                        const stops = Array.isArray(journeyData) ? 
                                     journeyData.filter(item => !item.isTravelLeg) : [];
                        
                        // Skip invalid journeys
                        if (!Array.isArray(journeyData) || stops.length === 0) {
                            return null;
                        }
                          const firstStop = stops[0];
                        const lastStop = stops[stops.length - 1];
                        
                        // Calculate or get travel time and distance
                        let travelTime = 'N/A';
                        let distance = 'N/A';
                        
                        if (savedJourney.summary) {
                            // Use saved summary data if available
                            travelTime = savedJourney.summary.formattedTravelTime || formatTime(savedJourney.summary.totalTravelTimeMinutes);
                            distance = savedJourney.summary.formattedDistance || formatDistance(savedJourney.summary.totalDistanceKm);
                        } else if (Array.isArray(journeyData)) {
                            // Calculate from journey data if summary not available
                            const totalTravelTimeMinutes = calculateTotalTravelTime(journeyData);
                            const totalDistanceKm = calculateTotalDistance(journeyData);
                            travelTime = formatTime(totalTravelTimeMinutes);
                            distance = formatDistance(totalDistanceKm);
                        }
                        
                        return (
                            <div
                                key={savedJourney.id}
                                onClick={() => handleJourneyClick(savedJourney)}
                                className="saved-journey-card"
                            >
                                <div className="saved-journey-header">
                                    <div className="saved-journey-info">
                                        <span className="saved-journey-map-icon">🗺️</span>
                                        <span className="saved-journey-stops">{stops.length} Stops</span>
                                    </div>
                                    <span className="saved-journey-date">
                                        {savedJourney.createdAt?.toDate?.()?.toLocaleDateString() || 
                                         (savedJourney.createdAt ? new Date(savedJourney.createdAt).toLocaleDateString() : 'Recent')}
                                    </span>
                                </div>

                                <div className="saved-journey-content">
                                    <div className="saved-journey-route-section">
                                        <h3 className="saved-journey-route-title">Journey Route</h3>
                                        {firstStop && lastStop && (
                                            <div className="saved-journey-route">
                                                <span className="saved-journey-start-icon">🚀</span>
                                                <span className="saved-journey-start-name">{firstStop.name}</span>
                                                <span className="saved-journey-arrow">→</span>
                                                <span className="saved-journey-end-icon">🏁</span>
                                                <span className="saved-journey-end-name">{lastStop.name}</span>
                                            </div>
                                        )}                                    </div>

                                    <div className="saved-journey-stats-section">
                                        <div className="saved-journey-stats">
                                            <div className="saved-journey-stat">
                                                <span className="saved-journey-stat-icon">⏱️</span>
                                                <span className="saved-journey-stat-value">{travelTime}</span>
                                            </div>
                                            <div className="saved-journey-stat">
                                                <span className="saved-journey-stat-icon">📏</span>
                                                <span className="saved-journey-stat-value">{distance}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="saved-journey-highlights-section">
                                        <h4 className="saved-journey-highlights-title">Highlights</h4>
                                        <div className="saved-journey-highlights">
                                            {stops.slice(0, 3).map((stop, index) => (
                                                <div key={index} className="saved-journey-highlight">
                                                    <span className="saved-journey-highlight-dot"></span>
                                                    <span className="saved-journey-highlight-name">{stop.name}</span>
                                                </div>
                                            ))}
                                            {stops.length > 3 && (
                                                <div className="saved-journey-highlight saved-journey-highlight-more">
                                                    <span className="saved-journey-highlight-dot saved-journey-highlight-dot-more"></span>
                                                    <span>+{stops.length - 3} more places</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="saved-journey-footer">
                                        <div className="saved-journey-saved-text">
                                            Saved {savedJourney.createdAt?.toDate?.()?.toLocaleDateString() || 
                                                  (savedJourney.createdAt ? new Date(savedJourney.createdAt).toLocaleDateString() : 'recently')}
                                        </div>
                                        <div className="saved-journey-view-btn">
                                            <span>View Journey</span>
                                            <svg className="saved-journey-view-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SavedJourneys;