import React, { useState } from 'react';
import './LandingPage.css';
import logo from '../../assets/logo.svg';
import textLogo from '../../assets/textlogo.svg';
import footermockup from '../../assets/Footermockup.svg';
import stars from '../../assets/stars.svg';
import feature1 from '../../assets/Feature1.svg';
import feature2 from '../../assets/Feature2.svg';
import feature3 from '../../assets/Feature3.svg';
import avatar from '../../assets/conversation.svg';
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
            Launch App
          </a>
          
          {/* Mobile navigation dropdown */}
          <div className={`landing-page__mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
            <div className="landing-page__mobile-nav-items">
              <div className="landing-page__mobile-nav-item" onClick={() => handleNavClick('testimonials')}>Testimonials</div>
              <div className="landing-page__mobile-nav-item" onClick={() => handleNavClick('features')}>Features</div>
              <div className="landing-page__mobile-nav-item" onClick={() => handleNavClick('note-creation')}>Note Creation</div>
              <div className="landing-page__mobile-nav-item" onClick={() => handleNavClick('security')}>Security</div>
              <div className="landing-page__mobile-nav-item" onClick={() => handleNavClick('ai-tech')}>New AI Tech</div>
              <a 
                href="/app" 
                className="landing-page__mobile-nav-button"
                onClick={() => handleButtonClick('Mobile_Nav_Launch_App')}
              >
                Launch App
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
              With our medical-grade chiropractic software. A note editor that turns your patient conversations into insurance-grade notes
            </div>
          </div>
          <div className="landing-page__action">
            <a 
              href="/app" 
              className="landing-page__action-button"
              onClick={() => handleButtonClick('Hero_Start_Charting')}
            >
              Start charting now for free
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
              Speed up your notes and never stay late charting without sacrificing quality
            </div>
            <div className="landing-page__feature-description">
            Complete your clinical documentation in half the time while maintaining comprehensive, high-quality notes. Our intuitive platform helps you capture patient encounters efficiently and accurately, letting you focus more on patient care and less on paperwork.
            </div>
          </div>
        </div>

        {/* Feature 2 (Security) */}
        <div id="security" className="landing-page__feature">
          <div className="landing-page__feature-content">
            <div className="landing-page__feature-tag">Security</div>
            <div className="landing-page__feature-title">
              HIPAA Compliant handling of phi and medical grade security
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

        {/* Feature 3 - AI Tech */}
        <div id="ai-tech" className="landing-page__feature">
          <img
            src={feature3}
            alt="Feature Image 3"
            className="landing-page__feature-image"
          />
          <div className="landing-page__feature-content">
            <div className="landing-page__feature-tag">New AI tech</div>
            <div className="landing-page__feature-title">
              Touch-up and even edit your notes faster by leveraging AI technology
            </div>
            <div className="landing-page__feature-description">
            Harness the power of advanced AI to streamline your documentation workflow. Our smart assistant helps auto-complete routine sections, suggests relevant medical terminology, and helps structure your notes - all while keeping you in full control of the final content.
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="landing-page__cta">
        <div className="landing-page__cta-content">
          <div className="landing-page__cta-tag">Try it now</div>
          <div className="landing-page__cta-title">
            Transform your medical documentation today
          </div>
          <div className="landing-page__cta-input">
            First 45 minutes free. Get started with just an email
          </div>
          <a 
            href="/app" 
            className="landing-page__cta-button"
            onClick={() => handleButtonClick('Footer_Get_Started')}
          >
            Get started
          </a>
        </div>
        <img
          src={footermockup}
          alt="CTA Image"
          className="landing-page__cta-image"
        />
        <div className="landing-page__cta-circle"></div>
      </div>

      {/* Footer Divider */}
      <div className="landing-page__footer-divider"></div>
    </div>
  );
}
