import React, { useState } from 'react';
import { signUp, signIn } from '../services/firebase';
// CSS imported in App.jsx

const AuthPage = ({ onGuestLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (isLogin) {
                await signIn(email, password);
            } else {
                await signUp(email, password);
            }
            // On successful login/signup, the onAuthStateChanged listener in App.jsx will handle the user state.
        } catch (err) {
            setError(err.message);
        }
    };    return (
        <div className="auth-page">
            <div className="auth-container">
                <h2 className="auth-title">{isLogin ? 'Login' : 'Sign Up'}</h2>
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <label className="auth-label">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="auth-input"
                            required
                        />
                    </div>
                    <div className="auth-field">
                        <label className="auth-label">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="auth-input"
                            required
                        />
                    </div>
                    {error && <p className="auth-error">{error}</p>}
                    <button type="submit" className="auth-submit">
                        {isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>
                <div className="auth-links">
                    <button onClick={() => setIsLogin(!isLogin)} className="auth-toggle">
                        {isLogin ? 'Need an account? Sign Up' : 'Have an account? Login'}
                    </button>
                    <button onClick={onGuestLogin} className="auth-guest">
                        Continue as Guest
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
