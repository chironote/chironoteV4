import React, { useState, useEffect, useRef } from 'react';
import './LandingPage.css';
import LandingNavbar from '../LandingNavbar/LandingNavbar';
import logo from '../../assets/logo.svg';
import stars from '../../assets/stars.svg';
import feature1 from '../../assets/Feature1.svg';
import feature2 from '../../assets/Feature2.svg';
import mattImg from '../../assets/Matt.png';
import samImg from '../../assets/Sam.png';
import jessImg from '../../assets/Jess.png';
import mockupLaptop from '../../assets/mockup-laptop-final.png';
import mockupMobile from '../../assets/mockup-mobile-final.png';
import heroSvg from '../../assets/Hero.svg';
import whiteboardAnimation from '../../assets/WhiteboardAnimation.mp4';
import whiteboardThumbnail from '../../assets/whiteboardThumbnail.jpeg';
import hipaaLogo from '../../assets/hipaa.svg';
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
    answer: 'ChiroNote is a web-based tool you can access from any device with a browser - including your EHR computer where you do notes. It records patient conversations through your device\'s microphone, then uses advanced AI to quickly generate structured chiropractic SOAP notes that you can review, edit, and copy into your EHR system.'
  },
  {
    question: 'What if I don\'t want to use my phone for recording?',
    answer: 'You can use any recording device with a microphone! Many practitioners prefer using a dedicated recording device or their computer\'s built-in microphone, especially when seeing patients in the same room where they do their charting. This setup allows for quick, seamless recording and immediate note generation without switching between devices.'
  },
  {
    question: 'Can I use ChiroNote on my work computer?',
    answer: 'Absolutely! ChiroNote is designed to work perfectly on your work computer and integrates seamlessly with your existing workflow. Patient notes are handled according to strict HIPAA compliance standards with enterprise-grade encryption, while your personal data remains completely separate and secure. This makes it ideal for use in professional healthcare environments.'
  },
  {
    question: 'Is ChiroNote HIPAA compliant?',
    answer: 'Yes, ChiroNote is fully HIPAA compliant. We use enterprise-grade encryption for all patient data, maintain strict access controls, and regularly conduct security audits to ensure all protected health information remains secure and private.'
  },
  {
    question: 'Can I edit the chiropractic SOAP notes after they\'re created?',
    answer: 'Absolutely! While ChiroNote generates highly accurate chiropractic SOAP notes, you always have full control to review and edit any part of the note before finalizing it. Our Smart Editor feature lets you make changes by simply typing what you want fixed - like asking "make this section more concise" or "add more detail about the patient\'s shoulder pain" - and the system intelligently updates your note. The free plan allows up to 15 note edits per month, while Standard and Professional plans offer unlimited edits.'
  },
  {
    question: 'How do I integrate ChiroNote with my current EHR system?',
    answer: 'ChiroNote works with any EHR system through a simple copy-paste process. Once your chiropractic SOAP note is finalized, it appears on the ChiroNote website across all your devices, so open up a browser on the computer that contains your EHR and just copy the note into your existing EHR\'s note section. No complex integration, installation or technical setup is required.'
  },
  {
    question: 'What if my dictation hours run out?',
    answer: 'If you reach your monthly dictation limit, you can easily upgrade to a higher plan at any time. The Standard plan includes 15 hours per month, while the Professional plan offers unlimited dictation hours, perfect for busy practices.'
  },
  {
    question: 'Can I try ChiroNote before purchasing?',
    answer: 'Yes! Our free plan allows you to use ChiroNote with 1 hour of dictation time per month and up to 15 note edits. This gives you a great opportunity to experience the benefits of ChiroNote before committing to a paid plan.'
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
  const [activeFaqItem, setActiveFaqItem] = useState(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [email, setEmail] = useState('');
  const videoRef = useRef(null);
  
  // Load Hotjar script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://t.contentsquare.net/uxa/205ff61755493.js';
    script.async = true;
    document.head.appendChild(script);
    
    return () => {
      // Cleanup: remove script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);
  
  // Track Meta Pixel page view when component mounts
  useEffect(() => {
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'PageView');
      // Also track a custom landing page view event
      window.fbq('track', 'ViewContent', {
        content_name: 'Landing Page',
        content_category: 'Marketing Page'
      });
    }
  }, []);
  
  const handleButtonClick = (actionName) => {
    trackLandingPageButtonClick(actionName); // Google Analytics tracking

    // Meta Pixel Tracking
    if (typeof window.fbq === 'function') {
      if (actionName === 'Click_Landing_Hero_SignUp' || actionName === 'Click_Landing_Pricing_SignUp' || actionName === 'Click_Landing_Video_SignUp') {
        window.fbq('track', 'StartTrial');
      } else if (actionName === 'Click_Landing_Hero_BookDemo') {
        window.fbq('track', 'Contact');
      }
    }
  };

  const handleNavClick = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      // Scroll offset adjusted for proper positioning
      const scrollOffset = sectionId === 'scheduler' ? 50 : -20;
      const offsetTop = element.getBoundingClientRect().top + window.pageYOffset + scrollOffset;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
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

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (email) {
      handleButtonClick('Click_Awareness_Hero_EmailSignUp');
      window.location.href = `/app?initialState=signUp&prefillEmail=${encodeURIComponent(email)}`;
    }
  };


  return (
    <div className="landing-page">
      {/* Header Section */}
      <LandingNavbar onNavClick={handleNavClick} handleButtonClick={handleButtonClick} />

      {/* Main Section with Hero Background */}
      <div className="landing-page__hero-section">
        <div className="landing-page__hero-background"></div>
        <div className="landing-page__hero-container">
          <div className="landing-page__main">
            <div className="landing-page__main-content">
              <div className="landing-page__title">
              Chiropractic SOAP notes in 60 seconds
              </div>
              <div className="landing-page__subtitle">
              Watch our HIPAA-compliant, browser-based tool create chiropractic SOAP notes while you talk. Works with any EHR.
              </div>
            </div>
            <div className="landing-page__action">
              <a 
                href="/app?initialState=signUp" 
                className="landing-page__demo-button"
                onClick={() => handleButtonClick('Click_Consideration_Hero_StartTrial')}
              >
                <span className="landing-page__demo-button-main">Try Now for Free</span>
                <span className="landing-page__demo-button-sub">No Credit Card Required</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div id="testimonials" className="landing-page__testimonials">
        {/* Trust tags above testimonials */}
        <div className="landing-page__trust-tags">
          <span className="landing-page__trust-tag">Trusted by busy chiropractic clinics</span>
          <span className="landing-page__trust-separator">·</span>
          <span className="landing-page__trust-tag">HIPAA-compliant</span>
          <span className="landing-page__trust-separator">·</span>
          <span className="landing-page__trust-tag">Quick setup</span>
          <span className="landing-page__trust-separator">·</span>
          <span className="landing-page__trust-tag">No install</span>
        </div>
        
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
      <div id="how-it-works" className="landing-page__video-section">
        <div className="landing-page__video-container">
          <div className="landing-page__video-content">
            <div className="landing-page__feature-tag">How we create chiropractic SOAP notes</div>
          </div>
          
          <div className="landing-page__video-wrapper">
            <video 
              ref={videoRef}
              className="landing-page__video-player"
              controls
              preload="metadata"
              playsInline
              poster={whiteboardThumbnail}
            >
              <source src={whiteboardAnimation} type="video/mp4" />
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
              onClick={() => handleButtonClick('Click_Consideration_Video_StartTrial')}
            >
              Try Now for Free
            </a>
            <p className="landing-page__video-cta-text">
              See how easy it is? Start creating your own chiropractic SOAP notes in under 60 seconds. No credit card required - get 1 hour free to test it in your clinic.
            </p>
          </div>
        </div>
      </div>

      {/* Feature Sections */}
      <div id="features" className="landing-page__features">
        {/* Secure Charting Section */}
        <div id="note-creation" className="landing-page__secure-charting-section">
          <div className="landing-page__feature-tag">Secure Charting</div>
          
          <div className="landing-page__secure-charting-content">
            <img
              src={mockupLaptop}
              alt="Quick demo creating chiropractic SOAP notes"
              className="landing-page__secure-charting-image"
            />
            <div className="landing-page__secure-charting-text">
              <div className="landing-page__feature-title">
                On our HIPAA compliant, medical grade platform
              </div>
              <div className="landing-page__feature-description">
                ChiroNote automatically converts your patient conversations into detailed notes by recording and summarizing your clinical encounters.
              </div>
              <img
                src={hipaaLogo}
                alt="HIPAA Compliant"
                className="landing-page__hipaa-logo"
              />
            </div>
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
