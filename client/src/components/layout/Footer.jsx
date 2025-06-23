import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-container">
        {/* Main Footer Content */}
        <div className="footer-main">
          {/* Brand Section */}
          <div className="footer-brand">
            <div className="footer-logo">
              <span className="footer-logo-icon">🗺️</span>
              <span className="footer-logo-text">QuickTrip</span>
            </div>            <p className="footer-brand-text">
              Your travel companion for discovering amazing places and creating unforgettable journeys.
            </p>
            <div className="footer-social">
              <a href="#" className="footer-social-link" aria-label="Facebook">
                <svg className="footer-social-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className="footer-social-link" aria-label="Twitter">
                <svg className="footer-social-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a href="#" className="footer-social-link" aria-label="Instagram">
                <svg className="footer-social-icon" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.014 5.367 18.647.001 12.017.001zM8.449 20.25c-2.128 0-3.86-1.729-3.86-3.856s1.732-3.857 3.86-3.857 3.857 1.73 3.857 3.857-1.729 3.856-3.857 3.856zm7.718 0c-2.128 0-3.857-1.729-3.857-3.856s1.729-3.857 3.857-3.857 3.856 1.73 3.856 3.857-1.728 3.856-3.856 3.856z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h3 className="footer-section-title">Quick Links</h3>
            <ul className="footer-links">
              <li><a href="#" className="footer-link">Home</a></li>
              <li><a href="#" className="footer-link">Plan Journey</a></li>
              <li><a href="#" className="footer-link">Saved Trips</a></li>
              <li><a href="#" className="footer-link">Explore</a></li>
            </ul>
          </div>

          {/* Features */}
          <div className="footer-section">
            <h3 className="footer-section-title">Features</h3>            <ul className="footer-links">
              <li><a href="#" className="footer-link">Smart Route Planning</a></li>
              <li><a href="#" className="footer-link">Real-time Navigation</a></li>
              <li><a href="#" className="footer-link">Local Recommendations</a></li>
              <li><a href="#" className="footer-link">Trip Sharing</a></li>
            </ul>
          </div>

          {/* Support */}
          <div className="footer-section">
            <h3 className="footer-section-title">Support</h3>
            <ul className="footer-links">
              <li><a href="#" className="footer-link">Help Center</a></li>
              <li><a href="#" className="footer-link">Contact Us</a></li>
              <li><a href="#" className="footer-link">Privacy Policy</a></li>
              <li><a href="#" className="footer-link">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p className="footer-copyright">
              © {currentYear} QuickTrip. All rights reserved. Made with ❤️ for travelers.
            </p>            <div className="footer-badges">
              <span className="footer-badge">
                <span className="footer-badge-icon">⚡</span>
                Fast
              </span>
              <span className="footer-badge">
                <span className="footer-badge-icon">🔒</span>
                Secure
              </span>
              <span className="footer-badge">
                <span className="footer-badge-icon">📱</span>
                Mobile-First
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
