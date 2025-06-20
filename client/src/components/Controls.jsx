import React, { useState } from 'react';
import { tripJourney } from '../services/apiService';

const Controls = ({ setJourney, setLoading, setError, setCenter }) => {
  const [location, setLocation] = useState('Bangalore, India');
  const [preferences, setPreferences] = useState({
    cafe: true, park: true, museum: false, art_gallery: false, tourist_attraction: true
  });
  const [duration, setDuration] = useState(240);
  const [budget, setBudget] = useState(100);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handlePreferenceChange = (e) => {
    setPreferences({ ...preferences, [e.target.name]: e.target.checked });
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setCenter({ lat: latitude, lng: longitude });
          
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
              const address = data.results[0].formatted_address;
              setLocation(address);
            } else {
              setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }
          } catch (error) {
            console.error('Reverse geocoding failed:', error);
            setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
          
          setGettingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Could not get your location. Please enter manually.');
          setGettingLocation(false);
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
      setGettingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setJourney([]);

    try {
      const data = await tripJourney({ location, preferences, duration, budget });
      if (data && data.length > 0) {
        const firstStop = data.find(item => !item.isTravelLeg);
        if (firstStop) {
          setCenter(firstStop.location);
        }
        setJourney(data);
      } else {
        setError('No suitable journey found. Please try adjusting your criteria.');
      }
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const preferenceOptions = [
    { key: 'cafe', label: 'Cafés & Restaurants', icon: '☕', color: 'bg-amber-100 text-amber-800' },
    { key: 'park', label: 'Parks & Nature', icon: '🌳', color: 'bg-green-100 text-green-800' },
    { key: 'museum', label: 'Museums', icon: '🏛️', color: 'bg-purple-100 text-purple-800' },
    { key: 'art_gallery', label: 'Art Galleries', icon: '🎨', color: 'bg-pink-100 text-pink-800' },
    { key: 'tourist_attraction', label: 'Tourist Attractions', icon: '🏰', color: 'bg-blue-100 text-blue-800' }
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Plan Your Journey</h2>
        <p className="text-gray-600 text-sm">Discover amazing places tailored to your preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="flex-grow flex flex-col space-y-6">
        {/* Location Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📍 Starting Location
          </label>
          <div className="space-y-3">
            <div className="relative">
              <input 
                type="text" 
                value={location} 
                onChange={e => setLocation(e.target.value)}
                className="w-full pl-4 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter city or address..."
                required 
              />
            </div>
            
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={gettingLocation}
              className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 px-4 rounded-lg border border-blue-200 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {gettingLocation ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                  <span>Getting location...</span>
                </>
              ) : (
                <>
                  <span>📍</span>
                  <span>Use Current Location</span>
                </>
              )}
            </button>
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            💡 Tip: Click "Use Current Location" for instant location detection, or type any city name above
          </div>
        </div>

        {/* Preferences */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            ✨ What interests you?
          </label>
          <div className="space-y-2">
            {preferenceOptions.map(option => (
              <label key={option.key} className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors duration-200 journey-card">
                <input
                  type="checkbox"
                  name={option.key}
                  checked={preferences[option.key]}
                  onChange={handlePreferenceChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-lg">{option.icon}</span>
                <span className="ml-2 text-sm font-medium text-gray-700 flex-grow">{option.label}</span>
                {preferences[option.key] && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${option.color}`}>
                    Selected
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ⏰ Duration ({Math.floor(duration / 60)}h {duration % 60}m)
          </label>
          <input
            type="range"
            min="60"
            max="480"
            step="30"
            value={duration}
            onChange={e => setDuration(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1h</span>
            <span>4h</span>
            <span>8h</span>
          </div>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            💰 Budget (₹{budget})
          </label>
          <input
            type="range"
            min="50"
            max="500"
            step="25"
            value={budget}
            onChange={e => setBudget(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>₹50</span>
            <span>₹250</span>
            <span>₹500</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          🚀 Create My Journey
        </button>
      </form>
    </div>
  );
};

export default Controls;
