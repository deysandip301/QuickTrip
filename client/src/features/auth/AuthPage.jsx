import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { signUp, signIn, onAuthChange } from '../../services/firebase';

const AuthPage = () => {
    const { handleAuthSuccess, navigateToHome } = useAppContext();
    const location = useLocation();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');    // Listen for authentication success
    useEffect(() => {
        const unsubscribe = onAuthChange((user) => {
            if (user && handleAuthSuccess) {
                handleAuthSuccess();
            }
        });

        return () => unsubscribe();
    }, [handleAuthSuccess]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                await signUp(email, password);
            }
            // The useEffect above will handle the success callback
        } catch (err) {
            setError(err.message);
        }
    };    return (
        <div className="auth-page">
            <div className="auth-container">                {/* Back button */}
                <button onClick={navigateToHome} className="auth-back-button">
                    <svg className="auth-back-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>
                
                <h2 className="auth-title">{isLogin ? 'Login to Save Journey' : 'Sign Up to Save Journey'}</h2>
                <p className="auth-subtitle">Create an account to save and access your journeys anytime</p>
                  <form onSubmit={handleSubmit} className="auth-form" autoComplete="on">                    <div className="auth-field">
                        <label className="auth-label" htmlFor="email">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="auth-input"
                            required
                            autoComplete="email"
                            name="email"
                            id="email"
                        />
                    </div>
                    <div className="auth-field">
                        <label className="auth-label" htmlFor="password">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="auth-input"
                            required
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            name="password"
                            id="password"
                        />
                    </div>
                    {error && <p className="auth-error">{error}</p>}
                    <button type="submit" className="auth-submit">
                        {isLogin ? 'Login & Save Journey' : 'Sign Up & Save Journey'}
                    </button>
                </form>
                <div className="auth-links">                    <button onClick={() => setIsLogin(!isLogin)} className="auth-toggle">
                        {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
                    </button>
                    <button onClick={navigateToHome} className="auth-guest">
                        Continue Without Saving
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
