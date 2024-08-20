import React, { useState, useEffect, useRef } from 'react';
import tempLogo from '../../assets/temp-logo.png';
import { NAV_LINKS } from '../../constants/constants';
import { signOut } from 'aws-amplify/auth';
import "./Header.css"

function Header({ setCurrentPage, currentPage }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Ref to detect clicks outside the mobile menu
  const menuRef = useRef(null);

  // Updated handleLogout function using v6 format
  const handleLogout = async () => {
    try {
      await signOut();
      console.log('User signed out successfully');
      // You might want to redirect the user or update the app state here
      // For example: setCurrentPage('login');
    } catch (error) {
      console.log('error signing out: ', error);
    }
  };

  // Toggle the visibility of the mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev);
  };

  // Close the mobile menu when clicking outside of it
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
      {/* Logo and Home navigation for desktop */}
      <div className="logo-container" onClick={() => setCurrentPage('main')} style={{ cursor: 'pointer' }}>
        <img src={tempLogo} alt="ChiroNote Logo" className="logo" />
        <h1 className="logo-text">ChiroNote</h1>
      </div>

      {/* Desktop navigation menu */}
      <nav className="navbar desktop-nav">
        <ul className="nav-list">
          {NAV_LINKS.map(link => {
            // Skip rendering Home link when on the main page
            if (link.page && link.page === 'main' && currentPage === 'main') {
              return null;
            }

            // Render navigation links
            return link.page ? (
              <li key={link.page} className="nav-item">
                <a href="#" onClick={() => setCurrentPage(link.page)} className="nav-link">
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

      {/* Mobile navigation menu */}
      <div className="navbar mobile-nav" ref={menuRef}>
        <button onClick={toggleMenu} className="menu-button">
          <span className="material-symbols-rounded">menu</span>
        </button>
        <ul className={`dropdown-menu ${isMenuOpen ? 'open' : ''}`}>
          {NAV_LINKS.map(link => {
            // Skip rendering Home link when on the main page
            if (link.page && link.page === 'main' && currentPage === 'main') {
              return null;
            }

            // Render navigation links
            return link.page ? (
              <li key={link.page} className="nav-item">
                <a href="#" onClick={() => { setIsMenuOpen(false); setCurrentPage(link.page) }} className="nav-link">
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

export default Header;