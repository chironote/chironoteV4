import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './Navbar.css';
import logo from '../../assets/logo.svg';
import textlogo from '../../assets/textlogo.svg';
import menu from '../../assets/menu.svg';

export default function Navbar({ username, onSignOut }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isOnDashboard = location.pathname === '/app';

  const links = [
    ...(isOnDashboard ? [] : [{ name: 'Home', path: '/app', icon: 'home' }]),
    { name: 'Account', path: '/app/account', icon: 'person' },
    { name: 'Feedback', path: '/app/feedback', icon: 'feedback' }
  ];

  const handleLogout = (e) => {
    e.preventDefault();
    onSignOut();
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src={logo} alt="Logo" className="navbar-logo" />
        <img src={textlogo} alt="Text Logo" className="navbar-text-logo" />
      </div>

      {/* Desktop Navigation */}
      <div className="navbar-nav desktop-nav">
        <ul className="nav-list">
          {links.map((link) => (
            <li key={link.path} className="nav-item">
              <Link to={link.path} className="nav-link">
                <span className="material-symbols-rounded">{link.icon}</span>
                {link.name}
              </Link>
            </li>
          ))}
          <li key="logout" className="nav-item">
            <a href="#" onClick={handleLogout} className="nav-link logout-link">
              <span className="material-symbols-rounded">logout</span>
              Logout
            </a>
          </li>
        </ul>
      </div>

      {/* Mobile Navigation */}
      <div className="mobile-nav">
        <button className="menu-button" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          <img src={menu} alt="Menu" />
        </button>
        {isMenuOpen && (
          <div className="mobile-menu">
            <ul className="nav-list">
              {links.map((link) => (
                <li key={link.name} className="nav-item">
                  <Link 
                    to={link.path} 
                    className="nav-link"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <span className="material-symbols-rounded">{link.icon}</span>
                    {link.name}
                  </Link>
                </li>
              ))}
              <li key="logout" className="nav-item">
                <a href="#" onClick={handleLogout} className="nav-link logout-link">
                  <span className="material-symbols-rounded">logout</span>
                  Logout
                </a>
              </li>
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
}
