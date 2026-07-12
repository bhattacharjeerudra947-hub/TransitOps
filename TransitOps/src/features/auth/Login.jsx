import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Truck, ShieldAlert, Zap, BarChart3, ShieldCheck } from 'lucide-react';
import truckImage from '../../assets/truckimage.jpg';

const DEMO_ACCOUNTS = [
  { role: 'Fleet Manager', email: 'manager@transitops.com', password: 'password123' },
  { role: 'Driver', email: 'dispatcher@transitops.com', password: 'password123' },
  { role: 'Safety Officer', email: 'safety@transitops.com', password: 'password123' },
  { role: 'Financial Analyst', email: 'analyst@transitops.com', password: 'password123' }
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Where to navigate after successful login
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
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
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                className="input-field"
                placeholder="e.g. manager@transitops.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: '32px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '24px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
              Quick Demo Login Profiles
            </p>
            <div className="role-switcher-grid">
              {DEMO_ACCOUNTS.map((acc) => {
                const isActive = email === acc.email;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    className={`role-switcher-btn ${isActive ? 'active' : ''}`}
                    onClick={() => handleQuickSelect(acc)}
                  >
                    <div style={{ fontWeight: 600 }}>{acc.role}</div>
                    <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>{acc.email}</div>
                  </button>
                );
              })}
            </div>
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
    </div>
  );
}
