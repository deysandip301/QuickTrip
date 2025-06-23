import React from 'react';
import { useAppContext } from '../context/AppContext';

const HomePage = () => {
  const { navigateToPlanning } = useAppContext();

  return (
    <div className="home-page">
      <div className="home-container">
        {/* Hero Section */}
        <div className="hero-section">
          <div className="hero-icon">
            <span className="hero-emoji">🗺️</span>
          </div>
          <h1 className="hero-title">
            Welcome to QuickTrip
          </h1>
          <p className="hero-description">
            Discover amazing places and create unforgettable journeys with our smart trip planner. 
            Let us help you explore your city like never before!
          </p>
        </div>

        {/* Mode Selection Cards */}
        <div className="mode-grid">
          {/* Current Location Mode */}
          <div 
            onClick={() => navigateToPlanning('currentLocation')}
            className="mode-card"
          >
            <div className="mode-content">
              <div className="mode-icon current-location">
                <span className="mode-emoji">📍</span>
              </div>
              <h3 className="mode-title">Explore Around Me</h3>
              <p className="mode-description">
                Start from your current location and discover nearby attractions, cafes, and hidden gems. 
                Perfect for spontaneous adventures!
              </p>
              <div className="mode-features">
                <div className="feature-item">
                  <span className="feature-icon">🎯</span>
                  <span className="feature-text">Auto-detect location</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">⚡</span>
                  <span className="feature-text">Quick recommendations</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🔄</span>
                  <span className="feature-text">Smart routing</span>
                </div>
              </div>
              <div className="mode-cta">
                <span className="cta-text">Start Exploring</span>
                <span className="cta-arrow">→</span>
              </div>
            </div>
          </div>

          {/* Custom Route Mode */}
          <div 
            onClick={() => navigateToPlanning('customRoute')}
            className="mode-card"
          >
            <div className="mode-content">
              <div className="mode-icon custom-route">
                <span className="mode-emoji">🗺️</span>
              </div>
              <h3 className="mode-title">Plan Custom Route</h3>
              <p className="mode-description">
                Choose your own start and end points to create a personalized journey. 
                Perfect for planned trips and specific destinations!
              </p>
              <div className="mode-features">
                <div className="feature-item">
                  <span className="feature-icon">📍</span>
                  <span className="feature-text">Choose start & end</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🎨</span>
                  <span className="feature-text">Customize preferences</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📱</span>
                  <span className="feature-text">Interactive map</span>
                </div>
              </div>
              <div className="mode-cta">
                <span className="cta-text">Plan Route</span>
                <span className="cta-arrow">→</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="features-section">
          <h2 className="features-title">Why Choose QuickTrip?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-large">⚡</div>
              <h4 className="feature-title">Smart Planning</h4>
              <p className="feature-desc">Intelligent recommendations based on your preferences</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">🌟</div>
              <h4 className="feature-title">Curated Places</h4>
              <p className="feature-desc">Only the best-rated and most popular destinations</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">💾</div>
              <h4 className="feature-title">Save & Share</h4>
              <p className="feature-desc">Keep your favorite journeys and share with friends</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;