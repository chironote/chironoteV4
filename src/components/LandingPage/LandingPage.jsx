import React, { useState } from 'react';
import './LandingPage.css';
import logo from '../../assets/logo.svg';
import textLogo from '../../assets/textlogo.svg';
import textLogoClr from '../../assets/textlogo-clr.svg';
import footermockup from '../../assets/Footermockup.svg';
import stars from '../../assets/stars.svg';
import feature1 from '../../assets/Feature1.svg';
import feature2 from '../../assets/Feature2.svg';
import feature3 from '../../assets/Feature3.svg';
import mattImg from '../../assets/Matt.png';
import samImg from '../../assets/Sam.png';
import jessImg from '../../assets/Jess.png';
import { trackLandingPageButtonClick } from '../../utils/analytics';

export default function LandingPage(props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleButtonClick = (buttonName) => {
    trackLandingPageButtonClick(buttonName);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleNavClick = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="landing-page">
      {/* Header Section */}
      <div className="landing-page__header">
        <div className="landing-page__header-content">
          {/* Logo - show text logo on mobile, regular logo otherwise */}
          <img
            src={logo}
            alt="ChiroNote Logo"
            className="landing-page__logo landing-page__desktop-logo"
          />
          <img
            src={textLogo}
            alt="ChiroNote"
            className="landing-page__logo landing-page__mobile-logo"
          />
          
          {/* Colored text logo centered for desktop only */}
          <img
            src={textLogoClr}
            alt="ChiroNote"
            className="landing-page__textlogo-clr"
          />
          
          {/* Hamburger menu for mobile */}
          <div className="landing-page__mobile-menu-button" onClick={toggleMobileMenu}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          
          {/* Desktop navigation */}
          <div className="landing-page__nav">
          </div>
          
          {/* Launch app button */}
          <a 
            href="/app" 
            className="landing-page__get-started-button"
            onClick={() => handleButtonClick('Header_Launch_App')}
          >
            Sign In
          </a>
          
          {/* Mobile navigation dropdown */}
          <div className={`landing-page__mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
            <div className="landing-page__mobile-nav-items">
              <div className="landing-page__mobile-nav-item" onClick={() => handleNavClick('testimonials')}>Testimonials</div>
              <div className="landing-page__mobile-nav-item" onClick={() => handleNavClick('note-creation')}>Note Creation</div>
              <div className="landing-page__mobile-nav-item" onClick={() => handleNavClick('security')}>Security</div>
              <div className="landing-page__mobile-nav-item" onClick={() => handleNavClick('prices')}>Pricing</div>
              <a 
                href="/app" 
                className="landing-page__mobile-nav-button"
                onClick={() => handleButtonClick('Mobile_Nav_Launch_App')}
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="landing-page__hero-container">
        <div className="landing-page__hero-background"></div>
        <div className="landing-page__main">
          <div className="landing-page__main-content">
            <div className="landing-page__title">
              Reduce charting time to mere seconds
            </div>
            <div className="landing-page__subtitle">
              Turn your patient conversations into insurance-grade notes with a single click
            </div>
          </div>
          <div className="landing-page__action">
            <a 
              href="/app" 
              className="landing-page__action-button"
              onClick={() => handleButtonClick('Hero_Start_Charting')}
            >
              Click to Start
            </a>
            <div className="landing-page__no-payment-text">No payment required</div>
          </div>
        </div>
        <div className="landing-page__hero-reflection"></div>
      </div>

      {/* Testimonials Section */}
      <div id="testimonials" className="landing-page__testimonials">
        <div className="landing-page__testimonial-cards">
          {/* Testimonial Card 1 */}
          <div className="landing-page__testimonial-card">
            <div className="landing-page__testimonial-header">
              <div className="landing-page__testimonial-avatar-container">
                <img
                  src={mattImg}
                  alt="Dr. Matt Fryauf"
                  className="landing-page__testimonial-avatar"
                />
              </div>
              <div className="landing-page__testimonial-user">
                <div className="landing-page__testimonial-name">Dr. Matt Fryauf</div>
                <div className="landing-page__testimonial-stars">
                  <img
                    src={stars}
                    alt="5 Stars"
                    className="landing-page__stars-icon"
                  />
                </div>
              </div>
            </div>
            <div className="landing-page__testimonial-text">
              I highly recommend this app for high volume practices            </div>
          </div>
          {/* Testimonial Card 2 */}
          <div className="landing-page__testimonial-card">
            <div className="landing-page__testimonial-header">
              <div className="landing-page__testimonial-avatar-container">
                <img
                  src={jessImg}
                  alt="Dr. Jessica Yeung"
                  className="landing-page__testimonial-avatar"
                />
              </div>
              <div className="landing-page__testimonial-user">
                <div className="landing-page__testimonial-name">Dr. Jessica Yeung</div>
                <div className="landing-page__testimonial-stars">
                  <img
                    src={stars}
                    alt="5 Stars"
                    className="landing-page__stars-icon"
                  />
                </div>
              </div>
            </div>
            <div className="landing-page__testimonial-text">
              Enables me to concentrate my time on patient care instead of paperwork
            </div>
          </div>
          {/* Testimonial Card 3 */}
          <div className="landing-page__testimonial-card">
            <div className="landing-page__testimonial-header">
              <div className="landing-page__testimonial-avatar-container">
                <img
                  src={samImg}
                  alt="Sam Battochio"
                  className="landing-page__testimonial-avatar"
                />
              </div>
              <div className="landing-page__testimonial-user">
                <div className="landing-page__testimonial-name">Sam Battochio</div>
                <div className="landing-page__testimonial-stars">
                  <img
                    src={stars}
                    alt="5 Stars"
                    className="landing-page__stars-icon"
                  />
                </div>
              </div>
            </div>
            <div className="landing-page__testimonial-text">
            Its speed and accuracy make it an invaluable tool
            </div>
          </div>
        </div>
      </div>

      {/* Feature Sections */}
      <div id="features" className="landing-page__features">
        {/* Feature 1 - Note Creation */}
        <div id="note-creation" className="landing-page__feature">
          <img
            src={feature1}
            alt="Feature Image 1"
            className="landing-page__feature-image"
          />
          <div className="landing-page__feature-content">
            <div className="landing-page__feature-tag">Note Creation</div>
            <div className="landing-page__feature-title">
              Stop charting after hours—reclaim up to 2 extra hours every day
            </div>
            <div className="landing-page__feature-description">
              Late‑night documentation steals time from family dinners, workouts, and that long‑overdue Netflix queue. ChiroNote writes your notes while you treat by understanding the conversation that drives the appointment.
            </div>
          </div>
        </div>

        {/* Feature 2 (Security) */}
        <div id="security" className="landing-page__feature">
          <div className="landing-page__feature-content">
            <div className="landing-page__feature-tag">Security</div>
            <div className="landing-page__feature-title">
              HIPAA Compliant handling of PHI and medical grade security
            </div>
            <div className="landing-page__feature-description">
            Your patients' data security is our top priority. We maintain the highest standards of HIPAA compliance and use enterprise-grade encryption to protect all protected health information. Our platform undergoes regular security audits to ensure your practice stays protected.
            </div>
          </div>
          <img
            src={feature2}
            alt="Feature Image 2"
            className="landing-page__feature-image"
          />
        </div>

        {/* Pricing Section */}
        <div id="prices" className="landing-page__feature landing-page__pricing-section">
          <div className="landing-page__feature-content">
            <div className="landing-page__feature-tag">Pricing</div>
            <div className="landing-page__feature-title">
              Simple, transparent pricing for practices of all sizes
            </div>
            <div className="landing-page__feature-description">
              Choose the plan that fits your practice needs. All plans include our core features with no hidden fees or long-term contracts. Upgrade or downgrade anytime as your practice grows.
            </div>
          </div>
          
          {/* Pricing Table */}
          <div className="landing-page__pricing-table-container">
            <div className="landing-pricing-table">
              <table className="landing-highlight-plan-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>
                      <div className="plan-name">Free</div>
                      <div className="plan-desc">Essential Care</div>
                    </th>
                    <th>
                      <div className="plan-name">Standard</div>
                      <div className="plan-desc">Enhanced Practice</div>
                    </th>
                    <th>
                      <div className="plan-name">Professional</div>
                      <div className="plan-desc">Complete Automation</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="row-label">Price</td>
                    <td data-category="Price">No Charge</td>
                    <td data-category="Price">$19/mo</td>
                    <td data-category="Price">$75/mo</td>
                  </tr>
                  <tr>
                    <td className="row-label">Dictation Hours</td>
                    <td data-category="Dictation Hours">1 hour/month</td>
                    <td data-category="Dictation Hours">15 hours/month</td>
                    <td data-category="Dictation Hours">Unlimited</td>
                  </tr>
                  <tr>
                    <td className="row-label">Note Edits</td>
                    <td data-category="Note Edits">Up to 15</td>
                    <td data-category="Note Edits">Unlimited</td>
                    <td data-category="Note Edits">Unlimited</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <a 
              href="/app" 
              className="landing-page__pricing-button"
              onClick={() => handleButtonClick('Pricing_Start_Free')}
            >
              Start with Free Plan
            </a>
          </div>
        </div>
      </div>

      {/* Footer Divider */}
      <div className="landing-page__footer-divider"></div>
    </div>
  );
}
