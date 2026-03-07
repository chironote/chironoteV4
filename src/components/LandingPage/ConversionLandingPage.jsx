import React, { useRef, useState, useEffect, useCallback } from 'react';
import './ConversionLandingPage.css';
import textLogoBlk from '../../assets/textlogo-blk.svg';
import heroImage from '../../assets/HeroImage.png';
import mattAvatar from '../../assets/Matt.png';
import jessAvatar from '../../assets/Jess.png';
import samAvatar from '../../assets/Sam.png';
import whiteboardThumbnail from '../../assets/VideoThumbnail.png';
import whiteboardVideo from '../../assets/WhiteboardAnimation.mp4';
import mockupLaptop from '../../assets/mockup-laptop-final.png';

const faqData = [
  {
    question: 'How does ChiroNote work?',
    answer: "ChiroNote is a web-based tool you can access from any device with a browser - including your EHR computer where you do notes. It records patient conversations through your device's microphone, then uses advanced AI to quickly generate structured chiropractic SOAP notes that you can review, edit, and copy into your EHR system.",
  },
  {
    question: "What if I don't want to use my phone for recording?",
    answer: "You can use any recording device with a microphone! Many practitioners prefer using a dedicated recording device or their computer's built-in microphone, especially when seeing patients in the same room where they do their charting. This setup allows for quick, seamless recording and immediate note generation without switching between devices.",
  },
  {
    question: 'Can I use ChiroNote on my work computer?',
    answer: "Absolutely! ChiroNote is designed to work perfectly on your work computer and integrates seamlessly with your existing workflow. Patient notes are handled according to strict HIPAA compliance standards with enterprise-grade encryption, while your personal data remains completely separate and secure. This makes it ideal for use in professional healthcare environments.",
  },
  {
    question: 'Is ChiroNote HIPAA compliant?',
    answer: 'Yes, ChiroNote is fully HIPAA compliant. We use enterprise-grade encryption for all patient data, maintain strict access controls, and regularly conduct security audits to ensure all protected health information remains secure and private.',
  },
  {
    question: "Can I edit the chiropractic SOAP notes after they're created?",
    answer: 'Absolutely! While ChiroNote generates highly accurate chiropractic SOAP notes, you always have full control to review and edit any part of the note before finalizing it. Our Smart Editor feature lets you make changes by simply typing what you want fixed - like asking "make this section more concise" or "add more detail about the patient\'s shoulder pain" - and the system intelligently updates your note. The free plan allows up to 15 note edits per month, while Standard and Professional plans offer unlimited edits.',
  },
  {
    question: 'How do I integrate ChiroNote with my current EHR system?',
    answer: "ChiroNote works with any EHR system through a simple copy-paste process. Once your chiropractic SOAP note is finalized, it appears on the ChiroNote website across all your devices, so open up a browser on the computer that contains your EHR and just copy the note into your existing EHR's note section. No complex integration, installation or technical setup is required.",
  },
  {
    question: 'What if my dictation hours run out?',
    answer: 'If you reach your monthly dictation limit, you can easily upgrade to a higher plan at any time. The Standard plan includes 15 hours per month, while the Professional plan offers unlimited dictation hours, perfect for busy practices.',
  },
  {
    question: 'Can I try ChiroNote before purchasing?',
    answer: 'Yes! Our free plan allows you to use ChiroNote with 1 hour of dictation time per month and up to 15 note edits. This gives you a great opportunity to experience the benefits of ChiroNote before committing to a paid plan.',
  },
  {
    question: 'Is using AI for medical note generation legally acceptable?',
    answer: 'Yes. AI-assisted medical documentation is becoming standard practice in the healthcare field. Insurance companies typically welcome more accurate and detailed clinical notes, even when they contain more technical language. As with any documentation tool, the provider remains responsible for reviewing and approving all notes for accuracy before finalizing them.',
  },
];

export default function Landing17() {
  const videoRef = useRef(null);
  const carouselRef = useRef(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const handleScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.firstElementChild?.offsetWidth || 1;
    setActiveSlide(Math.round(scrollLeft / cardWidth));
  }, []);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  function scrollToSlide(index) {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.offsetWidth || 1;
    el.scrollTo({ left: index * cardWidth, behavior: 'smooth' });
  }

  function playVideo() {
    const video = videoRef.current;
    if (!video) return;
    video.controls = true;
    video.play();
    setVideoPlaying(true);

    const onPause = () => {
      if (!video.ended) setVideoPlaying(false);
    };
    const onEnded = () => {
      setVideoPlaying(false);
      video.controls = false;
    };
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
  }

  function toggleFaq(index) {
    setActiveFaq(activeFaq === index ? null : index);
  }

  function handleImageError(e) {
    e.target.style.display = 'none';
    e.target.parentElement.innerHTML = '<div class="fi-placeholder">ChiroNote in action</div>';
  }

  return (
    <>
      <nav>
        <div className="logo">
          <img src={textLogoBlk} alt="ChiroNote" />
        </div>
        <div className="nav-links">
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#prices">Pricing</a>
          <a href="#faq">FAQ</a>
          <a href="/blog" className="blog-link">Blog</a>
          <a href="#" className="login-btn">Log In</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-text-side">
          <div className="hero-text-inner">
            <h1>
              <strong>You became a chiropractor to help people — </strong>
              <span className="highlight">not to write about it.</span>
            </h1>
            <p>ChiroNote quietly turns your visit into a complete, compliant note — right from the same browser as your EHR.</p>
            <a href="#" className="cta-btn">
              Try Now for Free
              <span className="cta-sub">No Credit Card Required</span>
            </a>
          </div>
        </div>
        <div className="hero-photo-side">
          <img src={heroImage} alt="Chiropractor treating patient" className="hero-img" />
          <div className="diag-float diag-badge">
            <div className="db-num">45%</div>
            <div className="db-label">less time on charting</div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="trust-bar">
        <div className="trust-inner">
          <span className="trust-tag">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            HIPAA-compliant
          </span>
          <span className="trust-sep">&middot;</span>
          <span className="trust-tag">Intuitive design</span>
          <span className="trust-sep">&middot;</span>
          <span className="trust-tag">Works alongside most EHRs</span>
        </div>
      </div>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div className="section-header">
          <div className="section-tag">Testimonials</div>
          <h2 className="section-title">Trusted by chiropractors everywhere</h2>
        </div>
        <div className="test-grid" ref={carouselRef}>
          <div className="test-card">
            <div className="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p>"I highly recommend this app for high volume practices"</p>
            <div className="author">
              <div className="avatar"><img src={mattAvatar} alt="Dr. Matt Fryauf" /></div>
              <span><strong>Dr. Matt Fryauf</strong></span>
            </div>
          </div>
          <div className="test-card">
            <div className="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p>"Enables me to concentrate my time on patient care instead of paperwork"</p>
            <div className="author">
              <div className="avatar"><img src={jessAvatar} alt="Dr. Jessica Yeung" /></div>
              <span><strong>Dr. Jessica Yeung</strong></span>
            </div>
          </div>
          <div className="test-card">
            <div className="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
            <p>"Its speed and accuracy make it an invaluable tool"</p>
            <div className="author">
              <div className="avatar"><img src={samAvatar} alt="Sam Battochio" /></div>
              <span><strong>Sam Battochio</strong></span>
            </div>
          </div>
        </div>
        <div className="carousel-dots">
          {[0, 1, 2].map((i) => (
            <button key={i} className={`carousel-dot${activeSlide === i ? ' active' : ''}`} onClick={() => scrollToSlide(i)} aria-label={`Slide ${i + 1}`} />
          ))}
        </div>
      </section>

      {/* VIDEO / HOW IT WORKS */}
      <section id="how-it-works" className="video-section">
        <div className="video-inner">
          <div className="section-tag">How It Works</div>
          <h2 className="section-title">How do Clinical AI scribes work?</h2>
          <div className="video-frame">
            <video ref={videoRef} id="demoVideo" preload="metadata" playsInline poster={whiteboardThumbnail}>
              <source src={whiteboardVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div
              className={`video-overlay${videoPlaying ? ' hidden' : ''}`}
              id="videoOverlay"
              onClick={playVideo}
            >
              <div className="play-circle"></div>
            </div>
          </div>
          <div className="video-cta">
            <a href="#" className="cta-btn">Try Now for Free</a>
          </div>
        </div>
      </section>

      {/* FEATURES / SECURE CHARTING */}
      <section id="features" className="features">
        <div className="section-header">
          <div className="section-tag">How ChiroNote Works</div>
          <h2 className="section-title">Secure, quick and simple. Just like a tool should be.</h2>
        </div>
        <div className="feature-content">
          <div className="feature-image">
            <img
              src={mockupLaptop}
              alt="Quick demo creating chiropractic SOAP notes"
              onError={handleImageError}
            />
          </div>
          <div className="feature-steps">
            <div className="feature-step">
              <div className="step-num">1</div>
              <div className="step-text">
                <h3>Hit record then have your appointment as usual.</h3>
                <p>ChiroNote listens through your device's microphone while you focus entirely on your patient.</p>
              </div>
            </div>
            <div className="feature-step">
              <div className="step-num">2</div>
              <div className="step-text">
                <h3>Once done, hit stop and see the note in your Clipboard.</h3>
                <p>Advanced AI generates a structured chiropractic SOAP note you can review and edit.</p>
              </div>
            </div>
            <div className="feature-step">
              <div className="step-num">3</div>
              <div className="step-text">
                <h3>Transfer to an EHR of your choice.</h3>
                <p>Works with any EHR system through a simple copy-paste process. No complex integration required.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="prices" className="pricing">
        <div className="pricing-inner">
          <div className="section-header">
            <div className="section-tag">Pricing</div>
            <h2 className="section-title">Simple, transparent pricing for practices of all sizes</h2>
          </div>
          <div className="price-grid">
            <div className="p-card">
              <div className="plan-name">Free</div>
              <div className="plan-desc">Essential Care</div>
              <div className="price">No Charge</div>
              <div className="per">&nbsp;</div>
              <div className="divider"></div>
              <ul>
                <li>1 hour/month dictation</li>
                <li>Up to 15 note edits</li>
                <li>Unlimited devices</li>
              </ul>
              <a href="#" className="p-btn">Get Started</a>
            </div>
            <div className="p-card pop">
              <div className="plan-name">Standard</div>
              <div className="plan-desc">Enhanced Practice</div>
              <div className="price">
                $19<span style={{ fontSize: '1rem', fontWeight: 400, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>/mo</span>
              </div>
              <div className="per">&nbsp;</div>
              <div className="divider"></div>
              <ul>
                <li>15 hours/month dictation</li>
                <li>Unlimited note edits</li>
                <li>Unlimited devices</li>
              </ul>
              <a href="#" className="p-btn">Get Started</a>
            </div>
            <div className="p-card">
              <div className="plan-name">Professional</div>
              <div className="plan-desc">Complete Automation</div>
              <div className="price">
                $75<span style={{ fontSize: '1rem', fontWeight: 400, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>/mo</span>
              </div>
              <div className="per">&nbsp;</div>
              <div className="divider"></div>
              <ul>
                <li>Unlimited dictation</li>
                <li>Unlimited note edits</li>
                <li>Unlimited devices</li>
              </ul>
              <a href="#" className="p-btn">Get Started</a>
            </div>
          </div>
          <div className="pricing-demo">
            <a href="#">Schedule Personal Walkthrough</a>
            <p className="pricing-demo-text">Charting and how it combines with various software can feel confusing at times. We are more than happy to answer your questions and help you understand our software.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="faq">
        <div className="section-header">
          <div className="section-tag">FAQ</div>
          <h2 className="section-title">Frequently Asked Questions</h2>
        </div>
        <div className="faq-list">
          {faqData.map((item, index) => (
            <div key={index} className={`faq-item${activeFaq === index ? ' active' : ''}`}>
              <div className="faq-question" onClick={() => toggleFaq(index)}>
                {item.question}
                <span className="faq-icon">
                  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </div>
              <div className="faq-answer">
                <p>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer>
        <p>&copy; 2026 ChiroNote. All rights reserved.</p>
      </footer>
    </>
  );
}
