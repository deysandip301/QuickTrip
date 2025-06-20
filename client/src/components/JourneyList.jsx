import React from 'react';

const JourneyList = ({ journey, loading, error }) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-40 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        <div className="text-center">
          <p className="text-gray-600 font-medium">Planning your journey...</p>
          <p className="text-sm text-gray-500">Finding the best places for you</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <div className="text-red-500">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-red-800 font-semibold">Oops! Something went wrong</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (journey.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Ready to explore?</h3>
        <p className="text-gray-600 text-sm">Fill out your preferences above and create your personalized journey!</p>
      </div>
    );
  }

  const stops = journey.filter(item => !item.isTravelLeg);
  const totalDuration = journey
    .filter(item => item.isTravelLeg)
    .reduce((sum, item) => sum + (parseFloat(item.duration) || 0), 0);

  const getPlaceIcon = (types) => {
    if (types.includes('cafe') || types.includes('restaurant')) return '☕';
    if (types.includes('park')) return '🌳';
    if (types.includes('museum')) return '🏛️';
    if (types.includes('art_gallery')) return '🎨';
    if (types.includes('tourist_attraction')) return '🏰';
    return '📍';
  };

  const getPlaceColor = (index, types) => {
    if (index === 0) return 'bg-green-100 text-green-800 border-green-200';
    if (index === stops.length - 1) return 'bg-red-100 text-red-800 border-red-200';
    
    if (types.includes('cafe') || types.includes('restaurant')) return 'bg-amber-100 text-amber-800 border-amber-200';
    if (types.includes('park')) return 'bg-green-100 text-green-800 border-green-200';
    if (types.includes('museum')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (types.includes('art_gallery')) return 'bg-pink-100 text-pink-800 border-pink-200';
    if (types.includes('tourist_attraction')) return 'bg-blue-100 text-blue-800 border-blue-200';
    
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Your Journey</h2>
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <span>📍</span>
            <span>{stops.length} stops</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>🚗</span>
            <span>{totalDuration ? `${Math.round(totalDuration)}min travel` : 'Calculating...'}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {journey.map((item, index) => (
          <div key={index}>
            {item.isTravelLeg ? (
              <div className="flex items-center space-x-3 py-2">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="flex-grow">
                  <p className="text-sm text-gray-600">
                    🚗 {item.duration} • {item.distance}
                  </p>
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-lg border ${getPlaceColor(stops.indexOf(item), item.types || [])} transition-all duration-200 hover:shadow-md`}>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 text-2xl">
                    {getPlaceIcon(item.types || [])}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {item.name}
                      {stops.indexOf(item) === 0 && <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">Start</span>}
                      {stops.indexOf(item) === stops.length - 1 && <span className="ml-2 text-xs bg-red-500 text-white px-2 py-1 rounded-full">End</span>}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      {item.rating && (
                        <div className="flex items-center space-x-1">
                          <span>⭐</span>
                          <span>{item.rating}</span>
                        </div>
                      )}
                      {item.estimatedVisitDuration && (
                        <div className="flex items-center space-x-1">
                          <span>⏰</span>
                          <span>{item.estimatedVisitDuration}min</span>
                        </div>
                      )}
                    </div>
                    {item.vicinity && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{item.vicinity}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default JourneyList;
