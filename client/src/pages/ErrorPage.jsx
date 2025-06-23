import React from 'react';
import { useRouteError, useNavigate } from 'react-router-dom';
import './ErrorPage.css';

const ErrorPage = () => {
  const error = useRouteError();
  const navigate = useNavigate();

  console.error('Route error:', error);

  return (
    <div className="error-page">
      <div className="error-page-content">
        <div className="error-page-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>
        
        <h1 className="error-page-title">Oops! Page Not Found</h1>
        
        <p className="error-page-message">
          {error?.status === 404 
            ? "The page you're looking for doesn't exist." 
            : "Something went wrong while loading this page."
          }
        </p>
        
        {error?.statusText && (
          <p className="error-page-details">
            Error: {error.statusText}
          </p>
        )}
        
        <div className="error-page-actions">
          <button 
            onClick={() => navigate('/')}
            className="error-page-btn error-page-btn-primary"
          >
            Go to Home
          </button>
          
          <button 
            onClick={() => navigate(-1)}
            className="error-page-btn error-page-btn-secondary"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
