import React, { useState } from 'react';
import './LandingPage.css';
import logo from '../../assets/logo.svg';
import textLogo from '../../assets/textlogo.svg';
import textLogoClr from '../../assets/textlogo-clr.svg';
import stars from '../../assets/stars.svg';
import feature1 from '../../assets/Feature1.svg';
import feature2 from '../../assets/Feature2.svg';
import mattImg from '../../assets/Matt.png';
import samImg from '../../assets/Sam.png';
import jessImg from '../../assets/Jess.png';
import chromeLogoImg from '../../assets/chrome-logo.png';
import firefoxLogoImg from '../../assets/firefox-logo.png';
import safariLogoImg from '../../assets/safari-logo.png';
import micImg from '../../assets/landingpage-mic.png';
import ehrImg from '../../assets/landingpage-ehr.png';
import mockupLaptop from '../../assets/mockup-laptop-final.png';
import mockupMobile from '../../assets/mockup-mobile-final.png';
import heroSvg from '../../assets/Hero.svg';
import { trackLandingPageButtonClick } from '../../utils/analytics';



export default function LandingPage(props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaqItem, setActiveFaqItem] = useState(null);
  
  const handleButtonClick = (actionName) => {
    trackLandingPageButtonClick(actionName); // Google Analytics tracking

    // Meta Pixel Tracking
    if (typeof window.fbq === 'function') {
      if (actionName === 'Click_Landing_Hero_SignUp' || actionName === 'Click_Landing_Pricing_SignUp') {
        window.fbq('track', 'StartTrial');
      } else if (actionName === 'Click_Landing_Hero_BookDemo') {
        window.fbq('track', 'StartTrial');
      }
    }
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
  
  const toggleFaqItem = (index) => {
    setActiveFaqItem(activeFaqItem === index ? null : index);
  };

  const plansData = [
    {
      name: 'Free',
      description: 'Essential Care',
      price: 'No Charge',
      features: [
        '1 hour/month dictation',
        'Up to 15 note edits',
        'Basic EHR Integration',
      ],
      highlight: false,
    },
    {
      name: 'Standard',
      description: 'Enhanced Practice',
      price: '$19/mo',
      features: [
        '15 hours/month dictation',
        'Unlimited note edits',
        'Full EHR Integration',
        'Priority Support'
      ],
      highlight: true,
    },
    {
      name: 'Professional',
      description: 'Complete Automation',
      price: '$75/mo',
      features: [
        'Unlimited dictation',
        'Unlimited note edits',
        'Advanced EHR Workflow Automation',
        'Dedicated Account Manager'
      ],
      highlight: false,
    },
  ];

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
            onClick={() => handleButtonClick('Click_Landing_Header_SignIn')}
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
              <div className="landing-page__mobile-nav-item" onClick={() => handleNavClick('faq')}>FAQ</div>
              <a 
                href="/app" 
                className="landing-page__mobile-nav-button"
                onClick={() => handleButtonClick('Click_Landing_MobileNav_SignIn')}
              >
                Sign In
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="landing-page__hero-container">
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
            <div className="landing-page__action-buttons">
              <a 
                href="/app?initialState=signUp" 
                className="landing-page__action-button landing-page__signup-button"
                onClick={() => handleButtonClick('Click_Landing_Hero_SignUp')}
              >
                Sign Up
              </a>
              <a 
                href="https://scheduler.zoom.us/nikita-predtechensky/chironote-demo" 
                className="landing-page__action-button landing-page__signup-button"
                onClick={() => handleButtonClick('Click_Landing_Hero_BookDemo')}
              >
                Book Demo
              </a>
            </div>
            <div className="landing-page__no-payment-text">No payment required</div>
          </div>
        </div>
        <img src={heroSvg} alt="" className="landing-page__hero-svg" />
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

      {/* What You Need Section */}
      <div id="what-you-need" className="landing-page__what-you-need">
        <div className="landing-page__feature-tag">What You Need</div>
        
        <div className="landing-page__requirements">
          {/* Requirement 1 - Recording Device */}
          <div className="landing-page__requirement-item">
            <div className="landing-page__requirement-icon">
              <img src={micImg} alt="Recording Device" />
            </div>
            <h3>Recording Device</h3>
            <p>Any smartphone or device with a microphone will work perfectly</p>
          </div>
          
          {/* Requirement 2 - Modern Browser */}
          <div className="landing-page__requirement-item">
            <div className="landing-page__requirement-icon browser-icons-card">
              <img src={chromeLogoImg} alt="Chrome" className="browser-icon chrome" />
              <img src={firefoxLogoImg} alt="Firefox" className="browser-icon firefox" />
              <img src={safariLogoImg} alt="Safari" className="browser-icon safari" />
            </div>
            <h3>Modern Browser</h3>
            <p>Works with all major browsers including Chrome, Firefox, Safari and even Edge</p>
          </div>
          
          {/* Requirement 3 - Your Own EHR */}
          <div className="landing-page__requirement-item">
            <div className="landing-page__requirement-icon">
              <img src={ehrImg} alt="Your Own EHR" />
            </div>
            <h3>Your Own EHR</h3>
            <p>Exports to any electronic health record system with a simple copy-paste</p>
          </div>
        </div>
      </div>

      {/* Feature Sections */}
      <div id="features" className="landing-page__features">
        {/* Feature 1 - Faster Charting */}
        <div id="note-creation" className="landing-page__feature">
          <img
            src={feature1}
            alt="Feature Image 1"
            className="landing-page__feature-image"
          />
          <div className="landing-page__feature-content">
            <div className="landing-page__feature-tag">Faster Charting</div>
            <div className="landing-page__feature-title">
              Chart Patient Visits in Seconds, Not Hours
            </div>
            <div className="landing-page__feature-description">
              ChiroNote automatically converts your patient conversations into detailed notes while you treat, eliminating after-hours documentation.
            </div>
          </div>
        </div>

        {/* Feature 2 (Security) */}
        <div id="security" className="landing-page__feature">
          <div className="landing-page__feature-content">
            <div className="landing-page__feature-tag">Security</div>
            <div className="landing-page__feature-title">
              Enterprise-Grade Security for Patient Data
            </div>
            <div className="landing-page__feature-description">
            We protect your patients' data with HIPAA-compliant encryption and regular security audits to maintain the highest standards of medical privacy.
            </div>
          </div>
          <img
            src={feature2}
            alt="Feature Image 2"
            className="landing-page__feature-image"
          />
        </div>
      </div>

      {/* Device Mockups Showcase */}
      <div className="landing-page__mockup-showcase">
        <div className="landing-page__mockup-container">
          <div className="landing-page__mockup-laptop">
            <img
              src={mockupLaptop}
              alt="ChiroNote on laptop"
              className="landing-page__mockup-laptop-img"
            />
          </div>
          <div className="landing-page__mockup-mobile">
            <img
              src={mockupMobile}
              alt="ChiroNote on mobile"
              className="landing-page__mockup-mobile-img"
            />
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="landing-page__features">
        <div id="prices" className="landing-page__feature landing-page__pricing-section">
          <div className="landing-page__feature-content">
            <div className="landing-page__feature-tag">Pricing</div>
            <div className="landing-page__feature-title">
              Simple, transparent pricing for practices of all sizes
            </div>
          </div>
          
          {/* Pricing Cards */}
          <div className="landing-page__pricing-cards-container">
            {plansData.map((plan, index) => (
              <div key={index} className={`landing-page__pricing-card ${plan.highlight ? 'highlight' : ''}`}>
                <div className="landing-page__pricing-card-header">
                  <h3 className="landing-page__pricing-card-name">{plan.name}</h3>
                  <p className="landing-page__pricing-card-description">{plan.description}</p>
                </div>
                <div className="landing-page__pricing-card-price">{plan.price}</div>
                <ul className="landing-page__pricing-card-features">
                  {plan.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <a 
            href="/app?initialState=signUp" 
            className="landing-page__pricing-button"
            onClick={() => handleButtonClick('Click_Landing_Pricing_SignUp')}
          >
            Sign Up & Get Started
          </a>
        </div>
      </div>

      {/* FAQ Section */}
      <div id="faq" className="landing-page__faq">
        <div className="landing-page__faq-container">
          <div className="landing-page__feature-tag">FAQ</div>
          <div className="landing-page__feature-title">
            Frequently Asked Questions
          </div>
          
          <div className="landing-page__faq-list" itemScope itemType="https://schema.org/FAQPage">
            {/* FAQ Item 1 */}
            <div className={`landing-page__faq-item ${activeFaqItem === 0 ? 'active' : ''}`} itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
              <div className="landing-page__faq-question" itemProp="name" onClick={() => toggleFaqItem(0)}>
                How does ChiroNote work?
              </div>
              <div className="landing-page__faq-answer" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer" style={{display: activeFaqItem === 0 ? 'block' : 'none'}}>
                <div itemProp="text">
                  ChiroNote captures your patient conversations through your device's microphone and uses advanced AI to generate comprehensive clinical notes. After recording, our system processes the conversation and creates a structured note that you can edit if needed before exporting to your EHR system.
                </div>
              </div>
            </div>
            
            {/* FAQ Item 2 */}
            <div className={`landing-page__faq-item ${activeFaqItem === 1 ? 'active' : ''}`} itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
              <div className="landing-page__faq-question" itemProp="name" onClick={() => toggleFaqItem(1)}>
                Is ChiroNote HIPAA compliant?
              </div>
              <div className="landing-page__faq-answer" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer" style={{display: activeFaqItem === 1 ? 'block' : 'none'}}>
                <div itemProp="text">
                  Yes, ChiroNote is fully HIPAA compliant. We use enterprise-grade encryption for all patient data, maintain strict access controls, and regularly conduct security audits to ensure all protected health information remains secure and private.
                </div>
              </div>
            </div>
            
            {/* FAQ Item 3 */}
            <div className={`landing-page__faq-item ${activeFaqItem === 2 ? 'active' : ''}`} itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
              <div className="landing-page__faq-question" itemProp="name" onClick={() => toggleFaqItem(2)}>
                Can I edit the notes after they're created?
              </div>
              <div className="landing-page__faq-answer" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer" style={{display: activeFaqItem === 2 ? 'block' : 'none'}}>
                <div itemProp="text">
                  Absolutely! While ChiroNote generates highly accurate notes, you always have full control to review and edit any part of the note before finalizing it. The Free plan allows up to 15 note edits per month, while Standard and Professional plans offer unlimited edits.
                </div>
              </div>
            </div>
            
            {/* FAQ Item 4 */}
            <div className={`landing-page__faq-item ${activeFaqItem === 3 ? 'active' : ''}`} itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
              <div className="landing-page__faq-question" itemProp="name" onClick={() => toggleFaqItem(3)}>
                How do I integrate ChiroNote with my current EHR system?
              </div>
              <div className="landing-page__faq-answer" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer" style={{display: activeFaqItem === 3 ? 'block' : 'none'}}>
                <div itemProp="text">
                  ChiroNote works with any EHR system through a simple copy-paste process. Once your note is finalized, you can copy the content and paste it directly into your existing EHR's note section. No complex integration or technical setup is required.
                </div>
              </div>
            </div>
            
            {/* FAQ Item 5 */}
            <div className={`landing-page__faq-item ${activeFaqItem === 4 ? 'active' : ''}`} itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
              <div className="landing-page__faq-question" itemProp="name" onClick={() => toggleFaqItem(4)}>
                What if my dictation hours run out?
              </div>
              <div className="landing-page__faq-answer" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer" style={{display: activeFaqItem === 4 ? 'block' : 'none'}}>
                <div itemProp="text">
                  If you reach your monthly dictation limit, you can easily upgrade to a higher plan at any time. The Standard plan includes 15 hours per month, while the Professional plan offers unlimited dictation hours, perfect for busy practices.
                </div>
              </div>
            </div>
            
            {/* FAQ Item 6 */}
            <div className={`landing-page__faq-item ${activeFaqItem === 5 ? 'active' : ''}`} itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
              <div className="landing-page__faq-question" itemProp="name" onClick={() => toggleFaqItem(5)}>
                Can I try ChiroNote before purchasing?
              </div>
              <div className="landing-page__faq-answer" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer" style={{display: activeFaqItem === 5 ? 'block' : 'none'}}>
                <div itemProp="text">
                  Yes! Our Free plan allows you to use ChiroNote with 1 hour of dictation time per month and up to 15 note edits. This gives you a great opportunity to experience the benefits of ChiroNote before committing to a paid plan.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Divider */}
      <div className="landing-page__footer-divider"></div>
    </div>
  );
}
