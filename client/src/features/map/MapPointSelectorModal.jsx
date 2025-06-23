import React from 'react';
import MapPointSelector from './MapPointSelector';
import './MapPointSelectorModal.css';

const MapPointSelectorModal = ({ isOpen, onClose, setStartPoint, setEndPoint, setCenter, activePointSelector }) => {
    if (!isOpen) return null;

    return (
        <div className="map-modal-overlay">
            <div className="map-modal-container">                {/* Header */}
                <div className="map-modal-header">                    <div className="map-modal-header-content">
                        <h2 className="map-modal-title">
                            <span className="map-modal-icon">🗺️</span>
                            Select {activePointSelector === 'start' ? 'Starting' : 'Ending'} Point
                        </h2>
                        <p className="map-modal-subtitle">Choose your {activePointSelector === 'start' ? 'start' : 'end'} point on the map</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="map-modal-close-btn"
                    >
                        <svg className="map-modal-close-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>                {/* Map Content */}
                <div className="map-modal-content">
                    <MapPointSelector 
                        onStartPointChange={setStartPoint}
                        onEndPointChange={setEndPoint}
                        setCenter={setCenter}
                        activePointSelector={activePointSelector}
                    />
                </div>
                
                {/* Footer */}
                <div className="map-modal-footer">                    <div className="map-modal-footer-content">
                        <div className="map-modal-tips">
                            <p className="map-modal-tips-title">
                                <span className="map-modal-tips-icon">💡</span>
                                Quick Tips:
                            </p>                            <ul className="map-modal-tips-list">
                                <li className="map-modal-tips-item">
                                    <span className="map-modal-tips-bullet"></span>
                                    Click "My Location" to set your current position
                                </li>
                                <li className="map-modal-tips-item">
                                    <span className="map-modal-tips-bullet"></span>
                                    Click anywhere on the map to set your point
                                </li>
                                <li className="map-modal-tips-item">
                                    <span className="map-modal-tips-bullet"></span>
                                    Click "Done" when you're satisfied with your selection
                                </li>
                            </ul>
                        </div>
                        <div className="map-modal-actions">
                            <button 
                                onClick={onClose}
                                className="map-modal-btn map-modal-btn-cancel"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={onClose}
                                className="map-modal-btn map-modal-btn-done"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MapPointSelectorModal;
