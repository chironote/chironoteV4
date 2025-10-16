import React, { useState, useEffect } from 'react';
import './LandingNavbar.css';
import textLogo from '../../assets/textlogo.svg';
import textLogoClr from '../../assets/textlogo-clr.svg';

export default function LandingNavbar({ onNavClick, handleButtonClick }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  // Close mobile menu when clicking outside
  const handleOutsideClick = (e) => {
    if (mobileMenuOpen && !e.target.closest('.landing-navbar__mobile-nav') && !e.target.closest('.landing-navbar__mobile-menu-button')) {
      setMobileMenuOpen(false);
    }
  };

  // Add event listener for outside clicks
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.addEventListener('click', handleOutsideClick);
      return () => {
        document.removeEventListener('click', handleOutsideClick);
      };
    }
  }, [mobileMenuOpen]);

  const handleNavItemClick = (sectionId) => {
    if (onNavClick) {
      onNavClick(sectionId);
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="landing-navbar__header">
      <div className="landing-navbar__header-content">
        {/* Text logo on the left - colored for desktop, white for mobile */}
        <a href="/">
          <img
            src={textLogoClr}
            alt="ChiroNote"
            className="landing-navbar__textlogo-left landing-navbar__textlogo-desktop"
          />
          <img
            src={textLogo}
            alt="ChiroNote"
            className="landing-navbar__textlogo-left landing-navbar__textlogo-mobile"
          />
        </a>
        
        {/* Hamburger menu for mobile */}
        <div className="landing-navbar__mobile-menu-button" onClick={toggleMobileMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>
        
        {/* Desktop navigation and Sign In button container */}
        <div className="landing-navbar__nav-container">
          {/* Desktop navigation */}
          <div className="landing-navbar__nav">
            {!onNavClick && (
              <a 
                href="/"
                className="landing-navbar__nav-item"
                style={{ textDecoration: 'none' }}
              >
                Home
              </a>
            )}
            <a 
              href="/blog"
              className="landing-navbar__nav-item"
              style={{ textDecoration: 'none' }}
            >
              Blog
            </a>
            {onNavClick && (
              <>
                <button 
                  className="landing-navbar__nav-item"
                  onClick={() => handleNavItemClick('how-it-works')}
                >
                  Video
                </button>
                <button 
                  className="landing-navbar__nav-item"
                  onClick={() => handleNavItemClick('faq')}
                >
                  FAQ
                </button>
                <button 
                  className="landing-navbar__nav-item"
                  onClick={() => handleNavItemClick('prices')}
                >
                  Pricing
                </button>
              </>
            )}
          </div>
          
          {/* Launch app button */}
          <a 
            href="/app" 
            className="landing-navbar__get-started-button"
            onClick={() => handleButtonClick && handleButtonClick('Click_Landing_Header_SignIn')}
          >
            Sign In
          </a>
        </div>
        
        {/* Mobile navigation dropdown */}
        <div className={`landing-navbar__mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="landing-navbar__mobile-nav-items">
            {!onNavClick && (
              <a href="/" className="landing-navbar__mobile-nav-item" style={{ textDecoration: 'none', color: 'inherit' }}>Home</a>
            )}
            <a href="/blog" className="landing-navbar__mobile-nav-item" style={{ textDecoration: 'none', color: 'inherit' }}>Blog</a>
            {onNavClick && (
              <>
                <div className="landing-navbar__mobile-nav-item" onClick={() => handleNavItemClick('testimonials')}>Testimonials</div>
                <div className="landing-navbar__mobile-nav-item" onClick={() => handleNavItemClick('how-it-works')}>How we create chiropractic SOAP notes</div>
                <div className="landing-navbar__mobile-nav-item" onClick={() => handleNavItemClick('prices')}>Pricing</div>
                <div className="landing-navbar__mobile-nav-item" onClick={() => handleNavItemClick('faq')}>FAQ</div>
              </>
            )}
            <a 
              href="/app" 
              className="landing-navbar__mobile-nav-button"
              onClick={() => handleButtonClick && handleButtonClick('Click_Landing_MobileNav_SignIn')}
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
