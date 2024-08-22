import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import tempLogo from '../../assets/temp-logo.png';
import { NAV_LINKS } from '../../constants/constants';
import { signOut } from 'aws-amplify/auth';
import "./Navbar.css"

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  const handleLogout = async () => {
    try {
      await signOut();
      console.log('User signed out successfully');
      navigate('/login');
    } catch (error) {
      console.log('error signing out: ', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
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
    <header className="app-header">
      <div className="logo-container" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
        <img src={tempLogo} alt="ChiroNote Logo" className="logo" />
        <h1 className="logo-text">ChiroNote</h1>
      </div>

      <nav className="navbar desktop-nav">
        <ul className="nav-list">
          {NAV_LINKS.map(link => {
            if (link.path === '/' && location.pathname === '/') {
              return null;
            }

            return link.path ? (
              <li key={link.path} className="nav-item">
                <a href="#" onClick={() => navigate(link.path)} className="nav-link">
                  <span className="material-symbols-rounded">{link.icon}</span>
                  {link.name}
                </a>
              </li>
            ) : (
              <li key={link.name} className="nav-item">
                <a href="#" onClick={handleLogout} className="nav-link logout-link">
                  <span className="material-symbols-rounded">{link.icon}</span>
                  {link.name}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="navbar mobile-nav" ref={menuRef}>
        <button onClick={toggleMenu} className="menu-button">
          <span className="material-symbols-rounded">menu</span>
        </button>
        <ul className={`dropdown-menu ${isMenuOpen ? 'open' : ''}`}>
          {NAV_LINKS.map(link => {
            if (link.path === '/' && location.pathname === '/') {
              return null;
            }

            return link.path ? (
              <li key={link.path} className="nav-item">
                <a href="#" onClick={() => { setIsMenuOpen(false); navigate(link.path); }} className="nav-link">
                  <span className="material-symbols-rounded">{link.icon}</span>
                  {link.name}
                </a>
              </li>
            ) : (
              <li key={link.name} className="nav-item">
                <a href="#" onClick={handleLogout} className="nav-link logout-link">
                  <span className="material-symbols-rounded">{link.icon}</span>
                  {link.name}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}

export default Navbar;