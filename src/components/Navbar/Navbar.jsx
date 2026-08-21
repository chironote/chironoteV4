import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import './Navbar.css';
import logo from '../../assets/logo.svg';
import textlogo from '../../assets/textlogo.svg';
import menu from '../../assets/menu.svg';

export default function Navbar({ username, onSignOut }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);

  const isOnDashboard = location.pathname === '/app';

  const links = [
    ...(isOnDashboard ? [] : [{ name: 'Home', path: '/app', icon: 'home' }]),
    { name: 'Account', path: '/app/account', icon: 'person' },
    { name: 'Feedback', path: '/app/feedback', icon: 'feedback' }
  ];

  const handleLogout = () => {
    onSignOut();
  };

  const toggleMenu = (e) => {
    e.stopPropagation();
    setIsMenuOpen(prevState => !prevState);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on the menu button
      if (menuButtonRef.current && menuButtonRef.current.contains(event.target)) {
        return;
      }
      
      // Close if clicking outside the menu
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src={logo} alt="" className="navbar-logo" aria-hidden="true" />
        <Link to="/app" className="navbar-brand-link" aria-label="ChiroNote dashboard">
          <img src={textlogo} alt="ChiroNote" className="navbar-text-logo" />
        </Link>
      </div>

      {/* Desktop Navigation */}
      <div className="navbar-nav desktop-nav">
        <ul className="nav-list">
          {links.map((link) => (
            <li key={link.path} className="nav-item">
              <Link to={link.path} className="nav-link" aria-current={location.pathname === link.path ? 'page' : undefined}>
                <span className="material-symbols-rounded">{link.icon}</span>
                {link.name}
              </Link>
            </li>
          ))}
          <li key="logout" className="nav-item">
            <button type="button" onClick={handleLogout} className="nav-link logout-link">
              <span className="material-symbols-rounded">logout</span>
              Logout
            </button>
          </li>
        </ul>
      </div>

      {/* Mobile Navigation */}
      <div className="mobile-nav">
        <button 
          className="menu-button" 
          onClick={toggleMenu}
          ref={menuButtonRef}
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMenuOpen}
          aria-controls="authenticated-mobile-menu"
        >
          <img src={menu} alt="Menu" />
        </button>
        {isMenuOpen && (
          <div className="mobile-menu" ref={menuRef} id="authenticated-mobile-menu">
            <ul className="nav-list">
              {links.map((link) => (
                <li key={link.name} className="nav-item">
                  <Link 
                    to={link.path} 
                    className="nav-link"
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={location.pathname === link.path ? 'page' : undefined}
                  >
                    <span className="material-symbols-rounded">{link.icon}</span>
                    {link.name}
                  </Link>
                </li>
              ))}
              <li key="logout" className="nav-item">
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    handleLogout();
                  }} 
                  className="nav-link logout-link"
                >
                  <span className="material-symbols-rounded">logout</span>
                  Logout
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
