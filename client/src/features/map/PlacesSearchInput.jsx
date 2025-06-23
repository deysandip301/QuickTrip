import React, { useState, useEffect, useRef } from 'react';
import { searchPlaces, getPlaceDetails, debounce } from '../../utils/placesService';

const PlacesSearchInput = ({ 
  placeholder = "Search for a place...", 
  onPlaceSelect, 
  currentLocation = null,
  value = "",
  className = ""
}) => {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Debounced search function
  const debouncedSearch = debounce(async (searchQuery) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    try {
      const results = await searchPlaces(searchQuery, currentLocation, apiKey);
      setSuggestions(results);
    } catch (error) {
      console.error('Search error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  // Handle input change
  const handleInputChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setSelectedIndex(-1);
    
    if (newQuery.trim().length >= 2) {
      setIsLoading(true);
      setShowSuggestions(true);
      debouncedSearch(newQuery);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsLoading(false);
    }
  };

  // Handle place selection
  const handlePlaceSelect = async (place) => {
    try {
      setQuery(place.description);
      setShowSuggestions(false);
      setSuggestions([]);
      setIsLoading(true);

      // Get detailed place information
      const placeDetails = await getPlaceDetails(place.id, apiKey);
      onPlaceSelect(placeDetails);
    } catch (error) {
      console.error('Error getting place details:', error);
      // Fallback: use basic place info
      onPlaceSelect({
        id: place.id,
        name: place.mainText,
        address: place.description,
        location: null // Will need to be geocoded
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handlePlaceSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target) &&
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`places-search-container ${className}`}>
      <div className="places-search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          className="places-search-input"
          autoComplete="off"
        />
          {isLoading && (
          <div className="places-search-loading">
            <div className="places-search-spinner"></div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="places-search-suggestions">
          {suggestions.map((place, index) => (
            <div
              key={place.id}
              className={`places-search-suggestion ${
                index === selectedIndex ? 'selected' : ''
              }`}
              onClick={() => handlePlaceSelect(place)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="places-search-suggestion-main">
                <span className="places-search-suggestion-icon">📍</span>
                <div className="places-search-suggestion-text">
                  <div className="places-search-suggestion-primary">
                    {place.mainText}
                  </div>
                  {place.secondaryText && (
                    <div className="places-search-suggestion-secondary">
                      {place.secondaryText}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions && suggestions.length === 0 && !isLoading && query.length >= 2 && (
        <div className="places-search-no-results">
          <div className="places-search-no-results-text">
            No places found for "{query}"
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacesSearchInput;
