import React, { useState } from 'react';
import './PlaceCard.css';

const PlaceCard = ({ place, isExpanded = false, onToggleExpand, showPhotos = true }) => {
  const [imageError, setImageError] = useState({});
  const [mainImageError, setMainImageError] = useState(false);

  const handleImageError = (photoIndex) => {
    setImageError(prev => ({ ...prev, [photoIndex]: true }));
  };

  const getPlaceIcon = (types) => {
    const iconMap = {
      'tourist_attraction': '🎭',
      'museum': '🏛️',
      'art_gallery': '🎨',
      'park': '🌳',
      'zoo': '🦁',
      'amusement_park': '🎢',
      'aquarium': '🐠',
      'stadium': '🏟️',
      'church': '⛪',
      'hindu_temple': '🕉️',
      'mosque': '🕌',
      'synagogue': '✡️',
      'historical_landmark': '🏛️',
      'natural_feature': '🏔️',
      'restaurant': '🍽️',
      'cafe': '☕',
      'shopping_mall': '🛍️',
      'market': '🏪',
      'library': '📚',
      'cultural_center': '🎪'
    };

    for (const type of types) {
      if (iconMap[type]) return iconMap[type];
    }
    return '📍';
  };

  const getPriceLevelText = (priceLevel) => {
    const levels = {
      1: '$',
      2: '$$',
      3: '$$$',
      4: '$$$$'
    };
    return levels[priceLevel] || 'Price not available';
  };
  const formatOpeningHours = (openingHours) => {
    if (!openingHours || !openingHours.open_now) return null;
    return openingHours.open_now ? 'Open now' : 'Closed';
  };


  return (
    <div className={`place-card ${isExpanded ? 'place-card--expanded' : ''}`}>
      {/* Header */}
      <div className="place-card__header">
        <div className="place-card__icon">
          {getPlaceIcon(place.types || [])}
        </div>
        <div className="place-card__title-section">
          <h3 className="place-card__name">{place.name}</h3>
          <div className="place-card__meta">
            <div className="place-card__rating">
              <span className="place-card__stars">⭐</span>
              <span className="place-card__rating-value">{place.rating?.toFixed(1) || 'N/A'}</span>
              {place.user_ratings_total && (
                <span className="place-card__review-count">({place.user_ratings_total})</span>
              )}
            </div>
            {place.price_level && (
              <div className="place-card__price">
                {getPriceLevelText(place.price_level)}
              </div>
            )}
          </div>
        </div>
        {onToggleExpand && (
          <button 
            className="place-card__expand-btn"
            onClick={() => onToggleExpand(place.placeId)}
            aria-label={isExpanded ? 'Show less' : 'Show more'}
          >
            <svg 
              className={`place-card__expand-icon ${isExpanded ? 'place-card__expand-icon--rotated' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}      </div>      {/* Featured Photo Section - Only show if photos are available */}
      {showPhotos && place.photos && place.photos.length > 0 && (
        <div className="place-card__featured-photo">
          {!mainImageError ? (
            <div 
              className="place-card__featured-photo-container"
              onClick={onToggleExpand ? () => onToggleExpand(place.placeId) : undefined}
              role={onToggleExpand ? "button" : undefined}
              tabIndex={onToggleExpand ? 0 : undefined}
              aria-label={onToggleExpand ? `View more photos of ${place.name}` : undefined}
              style={{ cursor: onToggleExpand ? 'pointer' : 'default' }}
            >              <img
                src={place.photos[0].url}
                alt={`${place.name} - Main photo`}
                className="place-card__featured-photo-img"
                onError={() => {
                  setMainImageError(true);
                }}
                loading="lazy"
              />
              <div className="place-card__featured-photo-overlay">
                <div className="place-card__photo-badge">
                  <span className="place-card__photo-badge-icon">📸</span>
                  <span>{place.photos.length} photo{place.photos.length > 1 ? 's' : ''}</span>
                </div>
                <div className="place-card__featured-photo-actions">
                  {place.photos[0].width > 800 && (
                    <div className="place-card__photo-quality">
                      HD
                    </div>
                  )}
                  {onToggleExpand && place.photos.length > 1 && (
                    <div className="place-card__view-more-photos">
                      <span>👆 Tap to view all {place.photos.length} photos</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (            <div className="place-card__featured-photo-placeholder">
              <span className="place-card__featured-photo-placeholder-icon">
                {getPlaceIcon(place.types || [])}
              </span>
              <span className="place-card__featured-photo-placeholder-text">
                Photo unavailable
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick Info */}
      <div className="place-card__quick-info">
        <div className="place-card__duration">
          <span className="place-card__duration-icon">⏱️</span>
          <span>{place.estimatedVisitDuration || 30} minutes</span>
        </div>
        <div className="place-card__cost">
          <span className="place-card__cost-icon">💰</span>
          <span>₹{place.estimatedCost || 0}</span>
        </div>
        {place.opening_hours && (
          <div className="place-card__hours">
            <span className="place-card__hours-icon">🕒</span>
            <span className={`place-card__hours-status ${place.opening_hours.open_now ? 'open' : 'closed'}`}>
              {formatOpeningHours(place.opening_hours)}
            </span>
          </div>
        )}
      </div>

      {/* Address */}
      {(place.formatted_address || place.vicinity) && (
        <div className="place-card__address">
          <span className="place-card__address-icon">📍</span>
          <span>{place.formatted_address || place.vicinity}</span>
        </div>
      )}

      {/* Description */}
      {place.description && (
        <div className="place-card__description">
          {place.description}
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="place-card__expanded-content">          {/* Photos */}
          {place.photos && place.photos.length > 0 && (            <div className="place-card__photos">
              <div className="place-card__section-header">
                <h4 className="place-card__section-title">Photos</h4>
                <span className="place-card__photo-count">
                  {place.photos.length} photo{place.photos.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="place-card__photo-grid">
                {place.photos.slice(0, 6).map((photo, index) => (
                  <div key={index} className="place-card__photo-wrapper">
                    {!imageError[index] ? (
                      <div className="place-card__photo-container">                        <img
                          src={photo.url}
                          alt={`${place.name} - Photo ${index + 1}`}
                          className="place-card__photo"
                          onError={() => handleImageError(index)}
                          loading="lazy"
                        />
                        {/* Photo quality indicator */}
                        {photo.width && photo.height && (
                          <div className="place-card__photo-info">
                            <span className="place-card__photo-resolution">
                              {photo.width > 800 ? 'HD' : photo.width > 400 ? 'HQ' : 'SD'}
                            </span>
                          </div>
                        )}                        {/* Main photo indicator */}
                        {index === 0 && (
                          <div className="place-card__main-photo-badge">
                            Featured
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="place-card__photo-placeholder">
                        <span className="place-card__photo-placeholder-icon">🖼️</span>
                        <span className="place-card__photo-placeholder-text">Photo unavailable</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>              {place.photos.length > 6 && (
                <div className="place-card__photo-more">
                  <span className="place-card__photo-more-text">
                    +{place.photos.length - 6} more photo{place.photos.length - 6 > 1 ? 's' : ''}
                  </span>
                </div>
              )}
              {/* Photo attribution notice */}
              <div className="place-card__photo-attribution-notice">
                <span>📷 Photos from various sources</span>
              </div>
            </div>
          )}

          {/* Reviews */}
          {place.reviews && place.reviews.length > 0 && (
            <div className="place-card__reviews">
              <h4 className="place-card__section-title">Recent Reviews</h4>
              <div className="place-card__reviews-list">
                {place.reviews.slice(0, 2).map((review, index) => (
                  <div key={index} className="place-card__review">
                    <div className="place-card__review-header">
                      <span className="place-card__review-author">{review.author_name}</span>
                      <div className="place-card__review-rating">
                        {'⭐'.repeat(review.rating)}
                      </div>
                    </div>
                    <p className="place-card__review-text">
                      {review.text.length > 150 
                        ? `${review.text.substring(0, 150)}...` 
                        : review.text
                      }
                    </p>
                    <span className="place-card__review-time">
                      {review.relative_time_description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="place-card__additional-info">
            {place.website && (
              <a 
                href={place.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="place-card__link"
              >
                <span className="place-card__link-icon">🌐</span>
                <span>Visit Website</span>
              </a>
            )}
            {place.phone && (
              <a 
                href={`tel:${place.phone}`}
                className="place-card__link"
              >
                <span className="place-card__link-icon">📞</span>
                <span>{place.phone}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaceCard;
