import React, { useState, useEffect, useRef } from 'react';
import './ConversionLandingPage.css';
import LandingNavbar from '../LandingNavbar/LandingNavbar';
import { trackLandingPageButtonClick } from '../../utils/analytics';

// Only import critical above-the-fold assets
import stars from '../../assets/stars.svg';

// Import below-the-fold assets (webpack processes them, but they load lazily via loading="lazy")
import tutorialVideo from '../../assets/Tutorial.mp4';
import whiteboardThumbnail from '../../assets/whiteboardThumbnail.jpeg';

// Data constants

const WORKFLOW_TIPS = [
  {
    id: 1,
    title: "Start Strong",
    text: "Speak the patient's name and subjective complaints before starting treatment.",
    detail: "Saying 'John Doe is here for lower back pain' primes the AI to expect specific clinical context, ensuring 99% accuracy on the first try.",
    tag: "PRO TIP"
  },
  {
    id: 2,
    title: "Focus on Care",
    text: "Place your phone on the desk and forget about it while you treat.",
    detail: "Our microphone technology filters background noise so you can move freely around the table. Just treat naturally—we'll catch every word.",
    tag: "HANDS FREE"
  },
  {
    id: 3,
    title: "Finish Fast",
    text: "Monologue your objective findings and plan as the patient gets up.",
    detail: "Take 15 seconds to rattle off 'positive Kemp's right, adjustment to L4-L5, ice at home.' By the time they reach the front desk, your note is done.",
    tag: "SPEED CHARTING"
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
  const [activeTip, setActiveTip] = useState(1); // Default to middle tip or first tip
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
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
              Stop Taking Notes Home. Finish Charting Before Your Patients Leave.
              </div>
              <div className="landing-page__subtitle">
              Simple, reliable software that writes your SOAP notes for you. No complex setup, no typing—just speak naturally and get back to adjusting.
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

      {/* Video Demo Section */}
      <div id="how-it-works" className="landing-page__video-section">
        <div className="landing-page__video-container">
          <div className="landing-page__video-content">
            <div className="landing-page__feature-tag">How do Clinical AI scribes work?</div>
          </div>
          
          <div className="landing-page__video-wrapper">
            {/* TODO: Add video event listeners for engagement tracking */}
            {/* Video engagement is a strong conversion indicator */}
            <video 
              ref={videoRef}
              className="landing-page__video-player"
              controls
              preload="none"
              playsInline
              poster={whiteboardThumbnail}
              loading="lazy"
              onWaiting={() => setIsVideoLoading(true)}
              onCanPlay={() => setIsVideoLoading(false)}
              onLoadedData={() => setIsVideoLoading(false)}
              onPlay={() => setIsVideoPlaying(true)}
              onPlaying={() => { setIsVideoPlaying(true); setIsVideoLoading(false); }}
              onPause={() => { setIsVideoPlaying(false); setIsVideoLoading(false); }}
              onEnded={() => { setIsVideoPlaying(false); setIsVideoLoading(false); }}
            >
              <source src={tutorialVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            
            {/* Video overlay for enhanced UX */}
            <div 
              className={`landing-page__video-overlay ${isVideoLoading ? 'loading' : ''} ${isVideoPlaying ? 'hidden' : ''}`}
              onClick={() => {
                if (videoRef.current && !isVideoPlaying) {
                  setIsVideoLoading(true);
                  videoRef.current.play();
                }
              }}
            >
              <div className={`landing-page__video-play-button ${isVideoLoading ? 'loading' : ''}`}>
                {isVideoLoading ? (
                  <div className="landing-page__video-spinner"></div>
                ) : (
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <circle cx="40" cy="40" r="40" fill="rgba(7, 87, 21, 0.9)" />
                    <path d="M32 25L55 40L32 55V25Z" fill="white" />
                  </svg>
                )}
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
          </div>
        </div>
      </div>

      {/* Interactive Workflow Section (Replaces Comparison) */}
      <div id="how-it-works-tips" className="landing-page__tips-section">
        <div className="landing-page__feature-tag">Master the Workflow</div>
        <div className="landing-page__feature-title">
          A Workflow That Gives You Your Evenings Back
        </div>
        <div className="landing-page__subtitle" style={{maxWidth: '700px'}}>
          You don't need to change how you treat. Just small adjustments to let the software handle the paperwork.
        </div>
        
        <div className="landing-page__tips-container">
          {WORKFLOW_TIPS.map((tip, index) => (
            <div 
              key={tip.id}
              className={`landing-page__tip-card ${activeTip === tip.id ? 'active' : ''}`}
              onClick={() => setActiveTip(tip.id)}
            >
              <div className="landing-page__tip-number">{tip.id}</div>
              <div className="landing-page__tip-content">
                <span className="landing-page__tip-pro-label">{tip.tag}</span>
                <div className="landing-page__tip-title">{tip.title}</div>
                <div className="landing-page__tip-text">{tip.text}</div>
                <div className="landing-page__tip-detail">
                  {tip.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Pricing Section */}
      <div className="landing-page__features">
        <div id="prices" className="landing-page__feature landing-page__pricing-section">
          <div className="landing-page__feature-content">
            <div className="landing-page__feature-tag">Pricing</div>
            <div className="landing-page__feature-title">
              Honest Pricing. No Hidden Fees. No Long-Term Contracts.
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
          <button 
            className="landing-page__pricing-button"
            onClick={() => {
              handleButtonClick('Click_Landing_Pricing_BookDemo');
              handleNavClick('scheduler');
            }}
          >
            Book Demo
          </button>
        </div>
      </div>

      {/* Scheduler Section */}
      <div id="scheduler" className="landing-page__scheduler-section">
        <div className="landing-page__feature-tag">Schedule a Friendly Walkthrough</div>
        
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
