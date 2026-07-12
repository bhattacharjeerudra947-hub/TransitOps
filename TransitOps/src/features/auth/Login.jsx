import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Truck, ShieldAlert } from 'lucide-react';

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
      <div className="login-card card">
        <div className="login-logo">
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 mb-2">
            <Truck className="h-10 w-10 animate-pulse" />
          </div>
          <h1>TransitOps</h1>
          <p>Smart Transport Operations Platform</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
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
            className="btn btn-primary w-full mt-2"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-800 pt-6">
          <p className="text-xs text-slate-400 font-semibold text-center uppercase tracking-wider mb-3">
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
                  <div className="font-semibold">{acc.role}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{acc.email}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
