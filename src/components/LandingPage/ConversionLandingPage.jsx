import React, { useState, useEffect, useRef } from 'react';
import './LandingPage.css';
import LandingNavbar from '../LandingNavbar/LandingNavbar';
import { trackLandingPageButtonClick } from '../../utils/analytics';

// Only import critical above-the-fold assets
import stars from '../../assets/stars.svg';

// Import below-the-fold assets (webpack processes them, but they load lazily via loading="lazy")
import mattImg from '../../assets/Matt.png';
import samImg from '../../assets/Sam.png';
import jessImg from '../../assets/Jess.png';
import tutorialVideo from '../../assets/Tutorial.mp4';
import whiteboardThumbnail from '../../assets/whiteboardThumbnail.jpeg';

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
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const videoRef = useRef(null);
  
  // Defer Hotjar script - load after page is interactive
  useEffect(() => {
    const loadHotjar = () => {
      setTimeout(() => {
        const script = document.createElement('script');
        script.src = 'https://t.contentsquare.net/uxa/205ff61755493.js';
        script.async = true;
        document.head.appendChild(script);
      }, 4000); // Load 4 seconds after page load
    };
    
    window.addEventListener('load', loadHotjar);
    return () => window.removeEventListener('load', loadHotjar);
  }, []);
  
  // Meta Pixel tracking handled in index.html - no need for duplicate tracking here
  
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
      // TODO: Track section navigation for engagement metrics
      // Potential tracking: trackEvent('LandingPage', `View_Landing_${sectionId}`)
      // This helps identify which sections drive the most engagement
      
      // Scroll offset adjusted for proper positioning
      const scrollOffset = sectionId === 'scheduler' ? 50 : -20;
      const offsetTop = element.getBoundingClientRect().top + window.pageYOffset + scrollOffset;
      window.scrollTo({ top: offsetTop, behavior: 'smooth' });
    }
  };
  
  const toggleFaqItem = (index) => {
    // TODO: Track FAQ engagement to understand user concerns
    // Potential tracking: trackEvent('LandingPage', 'Expand_FAQ_Item', FAQ_ITEMS[index].question)
    // This helps identify which questions are most important to prospects
    
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


  return (
    <div className="landing-page">
      {/* Header Section */}
      <LandingNavbar onNavClick={handleNavClick} handleButtonClick={handleButtonClick} videoLabel="See It Now" />

      {/* Main Section with Hero Background */}
      <div className="landing-page__hero-section">
        <div className="landing-page__hero-background"></div>
        <div className="landing-page__hero-container">
          <div className="landing-page__main">
            <div className="landing-page__main-content">
              <div className="landing-page__title">
              Built by chiropractors who got tired of charting
              </div>
              <div className="landing-page__subtitle">
              We're not a tech company trying to understand your practice. We live it. That's why our notes actually sound like yours.
              </div>
            </div>
            <div className="landing-page__action">
              <div className="landing-page__action-buttons">
                <button 
                  className="landing-page__demo-button"
                  onClick={() => {
                    handleButtonClick('Click_Landing_Hero_BookDemo');
                    handleNavClick('scheduler');
                  }}
                >
                  <span className="landing-page__demo-button-main">Book my Tour</span>
                  <span className="landing-page__demo-button-sub">15 Minutes - no sales pitch!</span>
                </button>
                <a 
                  href="/app?initialState=signUp" 
                  className="landing-page__try-free-button"
                  onClick={() => handleButtonClick('Click_Landing_Hero_TryFree')}
                >
                  Try Now for Free
                </a>
              </div>
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
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="landing-page__testimonial-user">
                  <div className="landing-page__testimonial-name">{testimonial.name}</div>
                  <div className="landing-page__testimonial-stars">
                    <img
                      src={stars}
                      alt="5 Stars"
                      className="landing-page__stars-icon"
                      loading="lazy"
                      decoding="async"
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
            <div className="landing-page__feature-tag">See it at Work</div>
          </div>
          
          <div className="landing-page__video-wrapper">
            {/* TODO: Add video event listeners for engagement tracking */}
            {/* onPlay={() => trackEvent('LandingPage', 'Play_Demo_Video')} */}
            {/* onPause={() => trackEvent('LandingPage', 'Pause_Demo_Video')} */}
            {/* onEnded={() => trackEvent('LandingPage', 'Complete_Demo_Video')} */}
            {/* Video engagement is a strong conversion indicator */}
            <video 
              ref={videoRef}
              className="landing-page__video-player"
              controls
              preload="none"
              playsInline
              poster={whiteboardThumbnail}
              loading="lazy"
              onLoadStart={() => setIsVideoLoading(true)}
              onCanPlay={() => setIsVideoLoading(false)}
              onLoadedData={() => setIsVideoLoading(false)}
            >
              <source src={tutorialVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            {/* Video overlay for enhanced UX */}
            <div 
              className="landing-page__video-overlay"
              onClick={() => {
                if (videoRef.current) {
                  setIsVideoLoading(true);
                  videoRef.current.play();
                }
              }}
            >
              {!isVideoLoading ? (
                <div className="landing-page__video-play-button">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <circle cx="40" cy="40" r="40" fill="rgba(7, 87, 21, 0.9)" />
                    <path d="M32 25L55 40L32 55V25Z" fill="white" />
                  </svg>
                </div>
              ) : (
                <div className="landing-page__video-loading">
                  <div className="landing-page__video-spinner"></div>
                </div>
              )}
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
              Do you want to just try it for yourself? No credit card required and you get an hour on us so that you KNOW this works for your clinic.
            </p>
          </div>
        </div>
      </div>

      {/* Comparison Section */}
      <div id="features" className="landing-page__features">
        <div id="comparison" className="landing-page__comparison-section">
          <div className="landing-page__feature-tag">Why Chiropractors Choose ChiroNote</div>
          
          <div className="landing-page__comparison-table-container">
            <table className="landing-page__comparison-table">
              <thead>
                <tr>
                  <th></th>
                  <th className="landing-page__comparison-chironote">ChiroNote</th>
                  <th className="landing-page__comparison-others">Other AI Scribes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="landing-page__comparison-category">Built by chiropractors</td>
                  <td className="landing-page__comparison-check">✓</td>
                  <td className="landing-page__comparison-cross">✗</td>
                </tr>
                <tr>
                  <td className="landing-page__comparison-category">Chiropractic-specific terminology</td>
                  <td className="landing-page__comparison-check">✓</td>
                  <td className="landing-page__comparison-cross">✗</td>
                </tr>
                <tr>
                  <td className="landing-page__comparison-category">Transparent pricing</td>
                  <td className="landing-page__comparison-check">✓</td>
                  <td className="landing-page__comparison-cross">Contact sales</td>
                </tr>
                <tr>
                  <td className="landing-page__comparison-category">Affordable starter plan</td>
                  <td className="landing-page__comparison-check">$19/mo</td>
                  <td className="landing-page__comparison-cross">$85+/mo</td>
                </tr>
                <tr>
                  <td className="landing-page__comparison-category">Learning curve</td>
                  <td className="landing-page__comparison-check">2 clicks + copy</td>
                  <td className="landing-page__comparison-cross">Training required</td>
                </tr>
                <tr>
                  <td className="landing-page__comparison-category">Works with your EHR</td>
                  <td className="landing-page__comparison-check">Any system</td>
                  <td className="landing-page__comparison-cross">Limited integrations</td>
                </tr>
                <tr>
                  <td className="landing-page__comparison-category">Setup time</td>
                  <td className="landing-page__comparison-check">Instant</td>
                  <td className="landing-page__comparison-cross">IT approval needed</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="landing-page__comparison-note">
            <strong>Why copy-paste beats "integration":</strong> No IT approval, no EHR compatibility issues, no waiting. Works with every system from day one.
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

      {/* Scheduler Section */}
      <div id="scheduler" className="landing-page__scheduler-section">
        <div className="landing-page__feature-tag">Book a Consult</div>
        
        {/* Scheduler info tags */}
        <div className="landing-page__scheduler-info">
          <span className="landing-page__scheduler-info-tag">15 minutes</span>
          <span className="landing-page__scheduler-info-tag">Clinic-friendly hours</span>
          <span className="landing-page__scheduler-info-tag">Zero-pressure Q&A</span>
        </div>
        
        <div className="landing-page__scheduler-container">
          <div className="landing-page__scheduler-widget">
            <iframe
              src="https://scheduler.zoom.us/nikita-predtechensky/chironote-demo?embed=true"
              title="Schedule a Demo with ChiroNote"
            />
          </div>
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
