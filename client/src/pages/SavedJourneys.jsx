import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { getSavedJourneys, deleteJourney } from '../services/firebase';
import { formatTime, formatDistance, calculateTotalTravelTime, calculateTotalDistance } from '../utils/timeUtils';
import './SavedJourneys.css';

const SavedJourneys = () => {
    const { user, navigateBack, navigateToResult, navigateToHome } = useAppContext();

    const [savedJourneys, setSavedJourneys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [deleteSuccess, setDeleteSuccess] = useState(false);useEffect(() => {
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

    // Handle ESC key to close modal
    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === 'Escape' && deleteConfirm && !deleting) {
                setDeleteConfirm(null);
            }
        };

        if (deleteConfirm) {
            document.addEventListener('keydown', handleEscKey);
            // Prevent scrolling when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset';
        };
    }, [deleteConfirm, deleting]);

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
            navigateToResult({
                journey: journeyData,
                summary: savedJourney.summary,
                timestamp: savedJourney.timestamp || savedJourney.createdAt,
                center: savedJourney.center,
                isSavedJourney: true
            });
        } else {
            console.warn('Invalid journey data structure:', savedJourney);
        }
    };    const handleDeleteJourney = async (journeyToDelete) => {
        if (!journeyToDelete) return;
        
        setDeleting(true);
        try {
            // Get the journey ID - handle different data structures
            // Priority: use Firebase document ID if available, otherwise fallback to timestamp for older entries
            const journeyId = journeyToDelete.id || journeyToDelete.timestamp || journeyToDelete.createdAt;
            
            if (!journeyId) {
                throw new Error('No valid journey identifier found');
            }
            
            await deleteJourney(journeyId, user);
            
            // Remove from local state - try to match by ID, timestamp, or createdAt
            setSavedJourneys(prev => {
                const filteredJourneys = prev.filter(journey => {
                    const journeyIdentifier = journey.id || journey.timestamp || journey.createdAt;
                    return journeyIdentifier !== journeyId;
                });
                return filteredJourneys;
            });
              setDeleteConfirm(null);
            
            // Clear any existing error and show success message
            setError('');
            setDeleteSuccess(true);
            
            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                setDeleteSuccess(false);
            }, 3000);
            
        } catch (error) {
            console.error('Error deleting journey:', error);
            setError('Failed to delete journey. Please try again.');
        } finally {
            setDeleting(false);
        }
    };if (loading) {
        return (
            <div className="saved-journeys-container">
                <div className="saved-journeys-header">
                    <button
                        onClick={navigateToHome}
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
                        onClick={navigateToHome}
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
                    onClick={navigateToHome}
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
                        onClick={navigateToHome}
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
                                key={savedJourney.id || savedJourney.timestamp || savedJourney.createdAt}
                                onClick={() => handleJourneyClick(savedJourney)}
                                className="saved-journey-card"
                            ><div className="saved-journey-header">
                                    <div className="saved-journey-info">
                                        <span className="saved-journey-map-icon">🗺️</span>
                                        <span className="saved-journey-stops">{stops.length} Stops</span>
                                    </div>
                                    <div className="saved-journey-header-actions">
                                        <span className="saved-journey-date">
                                            {savedJourney.createdAt?.toDate?.()?.toLocaleDateString() || 
                                             (savedJourney.createdAt ? new Date(savedJourney.createdAt).toLocaleDateString() : 'Recent')}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setDeleteConfirm(savedJourney);
                                            }}
                                            className="saved-journey-delete-btn"
                                            title="Delete journey"
                                        >
                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
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
                    })}                </div>
            )}            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div 
                    className="saved-journey-modal-overlay"
                    onClick={(e) => {
                        // Close modal when clicking on overlay (not on modal content)
                        if (e.target === e.currentTarget && !deleting) {
                            setDeleteConfirm(null);
                        }
                    }}
                >
                    <div className="saved-journey-modal">
                        <div className="saved-journey-modal-header">
                            <div className="saved-journey-modal-icon-container">
                                <span className="saved-journey-modal-icon">🗑️</span>
                            </div>
                            <div>
                                <h3 className="saved-journey-modal-title">Delete Journey</h3>
                            </div>
                        </div>
                        <div className="saved-journey-modal-content">
                            <p className="saved-journey-modal-message">
                                Are you sure you want to delete this journey? This action cannot be undone.
                            </p>
                            <div className="saved-journey-modal-journey-info">
                                <div className="saved-journey-modal-info-item">
                                    <span>🗺️</span>
                                    <span>{(deleteConfirm.journey?.journey || deleteConfirm.journey)?.filter(item => !item.isTravelLeg).length || 0} stops</span>
                                </div>
                                <div className="saved-journey-modal-info-item">
                                    <span>📅</span>
                                    <span>{deleteConfirm.createdAt?.toDate?.()?.toLocaleDateString() || 
                                         (deleteConfirm.createdAt ? new Date(deleteConfirm.createdAt).toLocaleDateString() : 'Recent')}</span>
                                </div>
                            </div>
                        </div>
                        <div className="saved-journey-modal-actions">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="saved-journey-modal-btn saved-journey-modal-btn-cancel"
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDeleteJourney(deleteConfirm)}
                                className="saved-journey-modal-btn saved-journey-modal-btn-delete"
                                disabled={deleting}
                            >
                                {deleting ? (
                                    <span className="saved-journey-modal-btn-loading">
                                        <svg className="saved-journey-modal-spinner" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Deleting...
                                    </span>
                                ) : (
                                    'Delete Journey'
                                )}
                            </button>
                        </div>                    </div>
                </div>
            )}
            
            {/* Success Toast Notification */}
            {deleteSuccess && (
                <div className="saved-journey-success-toast">
                    <div className="saved-journey-success-content">
                        <div className="saved-journey-success-icon">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div className="saved-journey-success-message">
                            <p className="saved-journey-success-title">Journey Deleted</p>
                            <p className="saved-journey-success-subtitle">The journey has been successfully removed</p>
                        </div>
                        <button
                            onClick={() => setDeleteSuccess(false)}
                            className="saved-journey-success-close"
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SavedJourneys;
