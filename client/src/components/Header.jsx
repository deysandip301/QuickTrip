import React, { useState } from 'react';
import { handleSignOut } from '../services/firebase';

const Header = ({ user, currentPage, setCurrentPage, onNavigateHome, onNavigateSaved }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await handleSignOut();
      setIsUserMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'home':
        return 'Discover Amazing Places';
      case 'planning':
        return 'Plan Your Perfect Journey';
      case 'result':
        return 'Your Personalized Itinerary';      case 'saved':
        return 'Your Saved Adventures';
      default:
        return 'Smart Travel Companion';
    }
  };

  const handleHomeClick = () => {
    if (onNavigateHome) {
      onNavigateHome();
    } else {
      setCurrentPage('home');
    }
    setIsMenuOpen(false);
  };

  const handleSavedClick = () => {
    if (onNavigateSaved) {
      onNavigateSaved();
    } else {
      setCurrentPage('saved');
    }
    setIsMenuOpen(false);
  };

  const getUserInitials = () => {
    if (user?.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  return (
    <header className="app-header">
      <div className="header-container">
        {/* Logo and Brand */}
        <div className="header-brand" onClick={handleHomeClick}>
          <div className="header-logo">
            <span className="header-logo-icon">🗺️</span>
            <div className="header-logo-glow"></div>
          </div>
          <div className="header-brand-content">
            <h1 className="header-title">QuickTrip</h1>
            <p className="header-subtitle">{getPageTitle()}</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="header-nav">
          <button
            onClick={handleHomeClick}
            className={`header-nav-item ${currentPage === 'home' ? 'active' : ''}`}
          >
            <span className="header-nav-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </span>
            <span className="header-nav-text">Home</span>
          </button>
          
          <button
            onClick={handleSavedClick}
            className={`header-nav-item ${currentPage === 'saved' ? 'active' : ''}`}
          >
            <span className="header-nav-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </span>
            <span className="header-nav-text">Saved</span>
          </button>
        </nav>

        {/* User Menu */}
        <div className="header-user">
          <div className="header-user-info" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
            <div className="header-user-avatar">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="header-avatar-image" />
              ) : (
                <span className="header-avatar-initials">
                  {getUserInitials()}
                </span>
              )}
              <div className="header-avatar-status"></div>
            </div>
            <div className="header-user-details">
              <span className="header-user-name">
                {user?.displayName || 'Traveler'}
              </span>
              <span className="header-user-email">
                {user?.email}
              </span>
            </div>
            <svg className={`header-dropdown-icon ${isUserMenuOpen ? 'open' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <div className="header-user-menu">
              <div className="header-menu-item" onClick={() => setIsUserMenuOpen(false)}>
                <svg className="header-menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile</span>
              </div>
              <div className="header-menu-item" onClick={() => setIsUserMenuOpen(false)}>
                <svg className="header-menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </div>
              <div className="header-menu-divider"></div>
              <div className="header-menu-item logout" onClick={handleLogout}>
                <svg className="header-menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign Out</span>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="header-mobile-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <span className={`header-hamburger ${isMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="header-mobile-menu">
          <div className="header-mobile-nav">
            <button
              onClick={handleHomeClick}
              className={`header-mobile-item ${currentPage === 'home' ? 'active' : ''}`}
            >
              <span className="header-mobile-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </span>
              <span>Home</span>
            </button>
            
            <button
              onClick={handleSavedClick}
              className={`header-mobile-item ${currentPage === 'saved' ? 'active' : ''}`}
            >
              <span className="header-mobile-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </span>
              <span>Saved Journeys</span>
            </button>
            
            <div className="header-mobile-divider"></div>
            
            <button
              onClick={handleLogout}
              className="header-mobile-item logout"
            >
              <span className="header-mobile-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
