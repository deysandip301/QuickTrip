import React, { useState } from 'react';
import { tripJourney } from '../../services/apiService';
import { MapPointSelectorModal } from '../map';
import { PREFERENCE_OPTIONS, DEFAULT_PREFERENCES, API_CONFIG } from '../../constants';

const Controls = ({ 
  setJourney, 
  setLoading, 
  setError, 
  setCenter, 
  setStartPoint,
  setEndPoint,
  startPoint,
  endPoint
}) => {
  const [location, setLocation] = useState('Bangalore, India');
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [duration, setDuration] = useState(API_CONFIG.DEFAULT_DURATION);
  const [budget, setBudget] = useState(API_CONFIG.DEFAULT_BUDGET);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [journeyMode, setJourneyMode] = useState('currentLocation');
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
  };  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setJourney([]);
    
    try {
      let requestData = { 
        location, 
        preferences, 
        duration, 
        budget
      };

      if (journeyMode === 'currentLocation') {
        // Use current location as start point
        if (navigator.geolocation) {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          requestData.startPoint = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
        }
      } else if (journeyMode === 'customRoute') {
        // Validate that both points are selected
        if (!startPoint || !endPoint) {
          setError('Please select both start and end points for custom route.');
          setLoading(false);
          return;
        }
        requestData.startPoint = startPoint;
        requestData.endPoint = endPoint;
      }
      
      const data = await tripJourney(requestData);
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
      console.error('Journey planning error:', err);
      
      // Enhanced error handling based on error type
      let userFriendlyMessage = err.message;
      if (err.response && err.response.data && err.response.data.error) {
          userFriendlyMessage = err.response.data.error;
      }
      setError(`Failed to plan journey: ${userFriendlyMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <form onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Plan Your Trip</h2>
          
          <div className="space-y-6">
            {/* Location Input */}
            <div>
              <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-1">Starting City or Area</label>
              <div className="flex rounded-md shadow-sm">
                <input
                  type="text"
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="flex-1 block w-full min-w-0 rounded-none rounded-l-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm px-3 py-2"
                  placeholder='e.g., Bangalore, India'
                />
                <button 
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                  className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50"
                >
                  {gettingLocation ? (
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>            {/* Journey Mode Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                🗺️ How would you like to plan your journey?
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors duration-200">
                  <input
                    type="radio"
                    name="journeyMode"
                    value="currentLocation"
                    checked={journeyMode === 'currentLocation'}
                    onChange={(e) => setJourneyMode(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-lg">📍</span>
                  <span className="ml-2 text-sm font-medium text-gray-700 flex-grow">
                    Start from my current location
                  </span>
                </label>
                
                <label className="flex items-center p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors duration-200">
                  <input
                    type="radio"
                    name="journeyMode"
                    value="customRoute"
                    checked={journeyMode === 'customRoute'}
                    onChange={(e) => setJourneyMode(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-lg">🎯</span>
                  <span className="ml-2 text-sm font-medium text-gray-700 flex-grow">
                    Select custom start and end points
                  </span>
                </label>
              </div>
              
              {journeyMode === 'customRoute' && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {(startPoint && endPoint) ? 'Update Points' : 'Select Start & End Points'}
                  </button>
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    {startPoint && <p>📍 Start: {startPoint.lat.toFixed(4)}, {startPoint.lng.toFixed(4)}</p>}
                    {endPoint && <p>🏁 End: {endPoint.lat.toFixed(4)}, {endPoint.lng.toFixed(4)}</p>}
                    {journeyMode === 'customRoute' && (!startPoint || !endPoint) && (
                      <p className="text-orange-600">Please select both start and end points</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ✨ What interests you?
              </label>
              <div className="space-y-2">
                {PREFERENCE_OPTIONS.map(option => (
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
              </label>              <input
                type="range"
                min="60"
                max="720" // Increased to 12 hours
                step="30"
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>1h</span>
                <span>6h</span>
                <span>12h</span>
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💰 Budget (₹{budget})
              </label>              <input
                type="range"
                min="100"
                max="2000" // Increased budget range
                step="50"
                value={budget}
                onChange={e => setBudget(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>₹100</span>
                <span>₹1000</span>
                <span>₹2000</span>
              </div>
            </div>        {/* Submit Button */}
        <button
          type="submit"
          disabled={journeyMode === 'customRoute' && (!startPoint || !endPoint)}
          className={`w-full font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 transform focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            journeyMode === 'customRoute' && (!startPoint || !endPoint)
              ? 'bg-gray-300 cursor-not-allowed text-gray-500'
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white hover:scale-105'
          }`}
        >
          {journeyMode === 'customRoute' && (!startPoint || !endPoint) 
            ? '📍 Select Start & End Points First' 
            : '🚀 Create My Journey'
          }
        </button>
          </div>
        </form>
      </div>
      <MapPointSelectorModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        setStartPoint={setStartPoint}
        setEndPoint={setEndPoint}
        setCenter={setCenter}
      />
    </>
  );
};

export default Controls;
