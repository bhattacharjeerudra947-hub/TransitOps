import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Truck, ShieldAlert, Zap, BarChart3, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import truckImage from '../../assets/truckimage.jpg';


export default function Login() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Fleet Manager');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Animation states: 'idle' | 'driving-in' | 'success-exit' | 'crashing' | 'crash-effect' | 'resetting'
  const [animState, setAnimState] = useState('idle');

  // Where to navigate after successful login
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setAnimState('driving-in');

    // Concurrently trigger verification and driving animation minimum window
    const authPromise = isSignUp ? signup(name, email, password, role) : login(email, password);
    const minDelayPromise = new Promise(resolve => setTimeout(resolve, 900));

    try {
      const [authResult] = await Promise.all([
        authPromise.then((res) => ({ success: true, data: res })).catch(err => ({ success: false, error: err })),
        minDelayPromise
      ]);

      if (authResult.success) {
        setAnimState('success-exit');
        await new Promise(resolve => setTimeout(resolve, 900)); // wait for exit drive offscreen
        navigate(from, { replace: true });
      } else {
        setAnimState('crashing');
        await new Promise(resolve => setTimeout(resolve, 500)); // wait for red truck collision
        setAnimState('crash-effect');
        await new Promise(resolve => setTimeout(resolve, 1000)); // crash rumble, smoke, sparks
        setAnimState('resetting');
        await new Promise(resolve => setTimeout(resolve, 300)); // fade overlay
        setAnimState('idle');
        setError(authResult.error.message || 'Authentication failed. Please try again.');
        setLoading(false);
      }
    } catch (err) {
      setAnimState('idle');
      setError('An unexpected error occurred.');
      setLoading(false);
    }
  };


  return (
    <div className="login-container">
      <div className="login-form-side">
        <div className="login-card">
          <div className="login-logo">
            <div className="login-logo-icon">
              <Truck className="h-10 w-10" />
            </div>
            <h1>TransitOps</h1>
            <p>Smart Transport Operations Platform</p>
          </div>

          {error && (
            <div className="login-error-alert">
              <ShieldAlert className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {isSignUp && (
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  className="input-field"
                  placeholder="e.g. Frank Miller"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                className="input-field"
                placeholder="e.g : abc@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className="input-field"
                  style={{ paddingRight: '44px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                    opacity: 0.7,
                    transition: 'opacity 0.2s',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="form-group">
                <label htmlFor="role">Platform Role</label>
                <select
                  id="role"
                  className="input-field"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Fleet Manager">Fleet Manager</option>
                  <option value="Driver">Driver</option>
                  <option value="Safety Officer">Safety Officer</option>
                  <option value="Financial Analyst">Financial Analyst</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
              style={{ marginTop: '16px' }}
            >
              {loading ? (isSignUp ? 'Creating Account...' : 'Signing In...') : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.875rem' }}>
            <span style={{ color: '#475569', fontWeight: 500 }}>
              {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#1e8614',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '0 4px',
                textDecoration: 'underline'
              }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        </div>
      </div>
      <div className="login-image-side" style={{ backgroundImage: `url(${truckImage})` }}>
        <div className="login-image-content">
          <div className="login-badge">
            <span>Enterprise Logistics</span>
          </div>
          <h2>Connect. Coordinate. Control.</h2>
          <p>
            The next-generation smart transportation platform designed to streamline dispatching,
            reduce operating costs, and empower fleet managers and drivers alike.
          </p>

          <div className="login-features-list">
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h4>Smart Route Dispatch</h4>
                <p>Intelligent routing with automated driver assignment and live status updates.</p>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h4>Operational Analytics</h4>
                <p>Monitor trip metrics, fuel costs, and driver performance in real-time dashboards.</p>
              </div>
            </div>
            <div className="login-feature-item">
              <div className="login-feature-icon">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4>Safety & Compliance</h4>
                <p>Keep track of vehicle maintenance schedules, safety inspections, and incident logs.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`login-anim-overlay ${animState} ${animState === 'crash-effect' ? 'shake-active' : ''}`}>
        <div className="login-anim-track">
          <div className="login-anim-road"></div>

          {/* Cyan Truck (Left to Right) */}
          <div className="anim-truck-container left-truck">
            <div className="truck-body">
              <Truck className="h-16 w-16 text-cyan-400" />
            </div>
          </div>

          {/* Red Truck (Right to Left - enters on crash/collision) */}
          {(animState === 'crashing' || animState === 'crash-effect') && (
            <div className="anim-truck-container right-truck">
              <div className="truck-body">
                <Truck className="h-16 w-16 text-red-500" style={{ transform: 'scaleX(-1)' }} />
              </div>
            </div>
          )}

          {/* Particle Collision effects */}
          {animState === 'crash-effect' && (
            <div className="crash-explosion">
              <div className="spark spark-1" style={{ '--angle': '45deg' }}></div>
              <div className="spark spark-2" style={{ '--angle': '-45deg' }}></div>
              <div className="spark spark-3" style={{ '--angle': '135deg' }}></div>
              <div className="spark spark-4" style={{ '--angle': '-135deg' }}></div>
              <div className="smoke smoke-1"></div>
              <div className="smoke smoke-2"></div>
              <div className="smoke smoke-3"></div>
            </div>
          )}
        </div>

        <div className="login-anim-status">
          {animState === 'driving-in' && <p className="text-cyan-400">Securing vehicle dispatch logs...</p>}
          {animState === 'success-exit' && <p className="text-emerald-400">Credentials approved. Dispatching fleet...</p>}
          {animState === 'crashing' && <p className="text-amber-400">Verifying credentials...</p>}
          {animState === 'crash-effect' && <p className="text-red-500 font-bold">Access Denied! Collision detected.</p>}
        </div>
      </div>
    </div>
  );
}
