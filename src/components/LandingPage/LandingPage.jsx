import React, { useState, useEffect, useRef } from 'react';
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
import landingVideo from '../../assets/LandingVideo.mp4';
import { trackLandingPageButtonClick } from '../../utils/analytics';

// Data constants
const TESTIMONIALS = [
  {
    name: 'Dr. Matt Fryauf',
    avatar: mattImg,
    text: 'I highly recommend this app for high volume practices'
  },
  {
    name: 'Dr. Jessica Yeung',
    avatar: jessImg,
    text: 'Enables me to concentrate my time on patient care instead of paperwork'
  },
  {
    name: 'Sam Battochio',
    avatar: samImg,
    text: 'Its speed and accuracy make it an invaluable tool'
  }
];

const FAQ_ITEMS = [
  {
    question: 'How does ChiroNote work?',
    answer: 'ChiroNote is a web-based tool you can access from any device with a browser - including your EHR computer where you do notes. It records patient conversations through your device\'s microphone, then uses advanced AI to generate structured clinical notes that you can review, edit, and copy into your EHR system.'
  },
  {
    question: 'Is ChiroNote HIPAA compliant?',
    answer: 'Yes, ChiroNote is fully HIPAA compliant. We use enterprise-grade encryption for all patient data, maintain strict access controls, and regularly conduct security audits to ensure all protected health information remains secure and private.'
  },
  {
    question: 'Can I edit the notes after they\'re created?',
    answer: 'Absolutely! While ChiroNote generates highly accurate notes, you always have full control to review and edit any part of the note before finalizing it. Our Smart Editor feature lets you make changes by simply typing what you want fixed - like asking "make this section more concise" or "add more detail about the patient\'s shoulder pain" - and the system intelligently updates your note. The Free plan allows up to 15 note edits per month, while Standard and Professional plans offer unlimited edits.'
  },
  {
    question: 'How do I integrate ChiroNote with my current EHR system?',
    answer: 'ChiroNote works with any EHR system through a simple copy-paste process. Once your note is finalized, it appears on the ChiroNote website across all your devices, so open up a browser on the computer that contains your EHR and just copy the note into your existing EHR\'s note section. No complex integration, installation or technical setup is required.'
  },
  {
    question: 'What if my dictation hours run out?',
    answer: 'If you reach your monthly dictation limit, you can easily upgrade to a higher plan at any time. The Standard plan includes 15 hours per month, while the Professional plan offers unlimited dictation hours, perfect for busy practices.'
  },
  {
    question: 'Can I try ChiroNote before purchasing?',
    answer: 'Yes! Our Free plan allows you to use ChiroNote with 1 hour of dictation time per month and up to 15 note edits. This gives you a great opportunity to experience the benefits of ChiroNote before committing to a paid plan.'
  },
  {
    question: 'Is using AI for medical note generation legally acceptable?',
    answer: 'Yes. AI-assisted medical documentation is becoming standard practice in the healthcare field. Insurance companies typically welcome more accurate and detailed clinical notes, even when they contain more technical language. As with any documentation tool, the provider remains responsible for reviewing and approving all notes for accuracy before finalizing them.'
  }
];

const PLANS_DATA = [
  {
    name: 'Free',
    description: 'Essential Care',
    price: 'No Charge',
    features: [
      '1 hour/month dictation',
      'Up to 15 note edits',
      'Unlimited devices',
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
      'Unlimited devices'
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
      'Unlimited devices'
    ],
    highlight: false,
  },
];

export default function LandingPage(props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaqItem, setActiveFaqItem] = useState(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const videoRef = useRef(null);
  
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
  
  // Close mobile menu when clicking outside
  const handleOutsideClick = (e) => {
    if (mobileMenuOpen && !e.target.closest('.landing-page__mobile-nav') && !e.target.closest('.landing-page__mobile-menu-button')) {
      setMobileMenuOpen(false);
    }
  };

  const handleNavClick = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.getBoundingClientRect().top + window.pageYOffset + 80;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };
  
  const toggleFaqItem = (index) => {
    setActiveFaqItem(activeFaqItem === index ? null : index);
  };
  
  const handleTestimonialChange = (index) => {
    setActiveTestimonial(index);
  };
  
  const handleNextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
  };
  
  const handlePrevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };



  // Add event listener for outside clicks when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.addEventListener('click', handleOutsideClick);
      return () => {
        document.removeEventListener('click', handleOutsideClick);
      };
    }
  }, [mobileMenuOpen]);

  // Video auto-play functionality with intersection observer
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Video is in view - auto play
            video.play().catch((error) => {
              // Auto-play was prevented (browser policy)
              console.log('Auto-play prevented:', error);
            });
          } else {
            // Video is out of view - pause
            video.pause();
          }
        });
      },
      {
        threshold: 0.5, // Trigger when 50% of video is visible
        rootMargin: '0px 0px -100px 0px' // Start playing a bit before fully in view
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="landing-page">
      {/* Header Section */}
      <div className="landing-page__header">
        <div className="landing-page__header-content">
          {/* Text logo on the left - colored for desktop, white for mobile */}
          <img
            src={textLogoClr}
            alt="ChiroNote"
            className="landing-page__textlogo-left landing-page__textlogo-desktop"
          />
          <img
            src={textLogo}
            alt="ChiroNote"
            className="landing-page__textlogo-left landing-page__textlogo-mobile"
          />
          
          {/* Hamburger menu for mobile */}
          <div className="landing-page__mobile-menu-button" onClick={toggleMobileMenu}>
            <span></span>
            <span></span>
            <span></span>
          </div>
          
          {/* Desktop navigation and Sign In button container */}
          <div className="landing-page__nav-container">
            {/* Desktop navigation */}
            <div className="landing-page__nav">
              <button 
                className="landing-page__nav-item"
                onClick={() => handleNavClick('faq')}
              >
                FAQ
              </button>
              <button 
                className="landing-page__nav-item"
                onClick={() => handleNavClick('prices')}
              >
                Pricing
              </button>
            </div>
            
            {/* Launch app button */}
            <a 
              href="/app" 
              className="landing-page__get-started-button"
              onClick={() => handleButtonClick('Click_Landing_Header_SignIn')}
            >
              Sign In
            </a>
          </div>
          
          {/* Mobile navigation dropdown */}
          <div className={`landing-page__mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
            <div className="landing-page__mobile-nav-items">
              <div className="landing-page__mobile-nav-item" onClick={() => handleNavClick('testimonials')}>Testimonials</div>
              <div className="landing-page__mobile-nav-item" onClick={() => handleNavClick('what-you-need')}>How It Works</div>
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

      {/* Main Section with Hero Background */}
      <div className="landing-page__hero-section">
        <div className="landing-page__hero-background"></div>
        <div className="landing-page__hero-container">
          <div className="landing-page__main">
            <div className="landing-page__main-content">
              <div className="landing-page__title">
                Reduce charting time to mere seconds
              </div>
              <div className="landing-page__subtitle">
                With our Web-based Tool for automating SOAP notes
              </div>
            </div>
            <div className="landing-page__action">
              <button 
                className="landing-page__demo-button"
                onClick={() => {
                  handleButtonClick('Click_Landing_Hero_BookDemo');
                  handleNavClick('scheduler');
                }}
              >
                <span className="landing-page__demo-button-main">See ChiroNote in Action</span>
                <span className="landing-page__demo-button-sub">Book Your Consult Today</span>
              </button>
              <div className="landing-page__demo-info">
                <span className="landing-page__demo-duration">Zero-Pressure Q&A</span>
                <span className="landing-page__demo-separator">•</span>
                <span className="landing-page__demo-instant">Clinic Friendly Hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div id="testimonials" className="landing-page__testimonials">
        {/* Regular testimonial cards for desktop/tablet */}
        <div className="landing-page__testimonial-cards">
          {TESTIMONIALS.map((testimonial, index) => (
            <div key={index} className="landing-page__testimonial-card">
              <div className="landing-page__testimonial-header">
                <div className="landing-page__testimonial-avatar-container">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="landing-page__testimonial-avatar"
                  />
                </div>
                <div className="landing-page__testimonial-user">
                  <div className="landing-page__testimonial-name">{testimonial.name}</div>
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
                {testimonial.text}
              </div>
            </div>
          ))}
        </div>
        
        {/* Mobile carousel version */}
        <div className="landing-page__testimonial-cards-container">
          <div 
            className="landing-page__testimonial-cards"
            style={{ transform: `translateX(-${activeTestimonial * 33.333}%)` }}
          >
            {TESTIMONIALS.map((testimonial, index) => (
              <div 
                key={index} 
                className="landing-page__testimonial-card" 
                style={{ opacity: activeTestimonial === index ? 1 : 0 }}
              >
                <div className="landing-page__testimonial-header">
                  <div className="landing-page__testimonial-avatar-container">
                    <img
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      className="landing-page__testimonial-avatar"
                    />
                  </div>
                  <div className="landing-page__testimonial-user">
                    <div className="landing-page__testimonial-name">{testimonial.name}</div>
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
                  {testimonial.text}
                </div>
              </div>
            ))}
          </div>
          
          {/* Carousel Navigation Arrows - Only visible on mobile */}
          <div className="testimonial-carousel-arrow testimonial-carousel-prev" onClick={handlePrevTestimonial}>
            ‹
          </div>
          <div className="testimonial-carousel-arrow testimonial-carousel-next" onClick={handleNextTestimonial}>
            ›
          </div>
        </div>
        
        {/* Carousel Dots Navigation - Only visible on mobile */}
        <div className="testimonial-carousel-nav">
          {Array.from({ length: TESTIMONIALS.length }).map((_, index) => (
            <div 
              key={index}
              className={`testimonial-carousel-dot ${activeTestimonial === index ? 'active' : ''}`}
              onClick={() => handleTestimonialChange(index)}
            />
          ))}
        </div>
      </div>



      {/* Video Demo Section */}
      <div className="landing-page__video-section">
        <div className="landing-page__video-container">
          <div className="landing-page__video-content">
          </div>
          
          <div className="landing-page__video-wrapper">
            <video 
              ref={videoRef}
              className="landing-page__video-player"
              controls
              preload="metadata"
              muted
              playsInline
              poster=""
              onClick={(e) => {
                if (e.target.paused) {
                  e.target.play();
                } else {
                  e.target.pause();
                }
              }}
            >
              <source src={landingVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            {/* Video overlay for enhanced UX */}
            <div className="landing-page__video-overlay">
              <div className="landing-page__video-play-button">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <circle cx="40" cy="40" r="40" fill="rgba(7, 87, 21, 0.9)" />
                  <path d="M32 25L55 40L32 55V25Z" fill="white" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="landing-page__video-cta">
            <a 
              href="/app?initialState=signUp" 
              className="landing-page__video-cta-button"
              onClick={() => handleButtonClick('Click_Landing_Video_SignUp')}
            >
              Try Now for Free
            </a>
            <p className="landing-page__video-cta-text">
              Ready to just try it for yourself - go ahead. Just create a password to keep everything secure.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Sections */}
      <div id="features" className="landing-page__features">
        {/* Feature 1 - Faster Charting */}
        <div id="note-creation" className="landing-page__feature">
          <img
            src={mockupLaptop}
            alt="ChiroNote on laptop"
            className="landing-page__feature-image"
          />
          <div className="landing-page__feature-content">
            <div className="landing-page__feature-tag">Secure Charting</div>
            <div className="landing-page__feature-title">
              On our HIPAA compliant, medical grade platform
            </div>
            <div className="landing-page__feature-description">
              ChiroNote automatically converts your patient conversations into detailed notes by recording and summarizing your clinical encounters.
            </div>
          </div>
        </div>


      </div>

      {/* What You Need Section */}
      <div id="what-you-need" className="landing-page__what-you-need">
        <div className="landing-page__feature-tag">You Have What You Need</div>
        
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
            <p>Works with all major browsers including Chrome, Firefox, Safari and Microsoft Edge</p>
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

      {/* Scheduler Section */}
      <div id="scheduler" className="landing-page__scheduler-section">
        <div className="landing-page__feature-tag">Book a Consult</div>
        
        <div className="landing-page__scheduler-container">
          <div className="landing-page__scheduler-widget">
            <iframe
              src="https://scheduler.zoom.us/nikita-predtechensky/chironote-demo?embed=true"
              title="Schedule a Demo with ChiroNote"
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
            {PLANS_DATA.map((plan, index) => (
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
            Try Now for Free
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
            {FAQ_ITEMS.map((faq, index) => (
              <div 
                key={index}
                className={`landing-page__faq-item ${activeFaqItem === index ? 'active' : ''}`} 
                itemScope 
                itemProp="mainEntity" 
                itemType="https://schema.org/Question"
              >
                <div 
                  className="landing-page__faq-question" 
                  itemProp="name" 
                  onClick={() => toggleFaqItem(index)}
                >
                  {faq.question}
                </div>
                <div 
                  className="landing-page__faq-answer" 
                  itemScope 
                  itemProp="acceptedAnswer" 
                  itemType="https://schema.org/Answer" 
                  style={{display: activeFaqItem === index ? 'block' : 'none'}}
                >
                  <div itemProp="text">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Footer Divider */}
      <div className="landing-page__footer-divider"></div>
    </div>
  );
}
