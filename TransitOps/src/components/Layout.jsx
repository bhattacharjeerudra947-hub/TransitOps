import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isUsingSupabase } from '../api/api';
import {
  LayoutDashboard,
  Truck,
  Users,
  Navigation,
  Wrench,
  DollarSign,
  BarChart3,
  LogOut,
  Menu,
  X,
  Sun,
  Moon
} from 'lucide-react';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['Fleet Manager', 'Driver', 'Safety Officer', 'Financial Analyst'] },
    { path: '/vehicles', label: 'Vehicle Registry', icon: Truck, roles: ['Fleet Manager'] },
    { path: '/drivers', label: 'Driver Management', icon: Users, roles: ['Safety Officer', 'Fleet Manager'] },
    { path: '/trips', label: 'Trip Management', icon: Navigation, roles: ['Driver', 'Fleet Manager'] },
    { path: '/maintenance', label: 'Maintenance Logs', icon: Wrench, roles: ['Fleet Manager'] },
    { path: '/expenses', label: 'Fuel & Expense', icon: DollarSign, roles: ['Financial Analyst', 'Fleet Manager'] },
    { path: '/reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['Financial Analyst', 'Fleet Manager'] }
  ];

  // Filter items based on user role
  const visibleNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${mobileMenuOpen ? 'active' : ''}`}>
        <div className="sidebar-logo">
          <Truck className="h-6 w-6 text-cyan-400" />
          <h2>TransitOps</h2>
          <button className="md:hidden ml-auto text-slate-400 hover:text-white" onClick={toggleMobileMenu}>
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <ul className="sidebar-menu">
            {visibleNavItems.map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button className="logout-btn w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="header">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-slate-200" onClick={toggleMobileMenu}>
              <Menu className="h-6 w-6" />
            </button>
            <div className="header-title-section" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1>TransitOps</h1>
              <span className="database-status" style={{
                fontSize: '0.75rem',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: isUsingSupabase() ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: isUsingSupabase() ? '#10b981' : '#f59e0b',
                border: isUsingSupabase() ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                marginTop: '2px'
              }}>
                <span className="status-dot" style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isUsingSupabase() ? '#10b981' : '#f59e0b',
                  boxShadow: isUsingSupabase() ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
                  display: 'inline-block'
                }}></span>
                {isUsingSupabase() ? 'Supabase Connected' : 'Offline Demo Mode'}
              </span>
            </div>
          </div>

          <div className="header-user-section">
            <button 
              type="button"
              onClick={toggleTheme} 
              className="theme-toggle-btn"
              title={theme === 'dark' ? 'Switch to Normal Mode' : 'Switch to Dark Mode'}
              style={{ marginRight: '8px' }}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <span className="role-badge">{user?.role}</span>
          </div>
        </header>

        <div className="content-body">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
