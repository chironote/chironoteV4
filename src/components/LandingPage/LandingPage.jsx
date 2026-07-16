import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import './LandingPage.css';
import {
  trackAnalyticsEvent,
  trackFaqOpen,
  trackLandingCta,
  trackLandingEngagement,
  trackLandingNavigation,
  trackLandingSectionView,
  trackVideoProgress,
} from '../../utils/analytics';
import textLogo from '../../assets/textlogo-blk.svg';
import heroImageSmall from '../../assets/hero-chiropractor-720.webp';
import heroImageLarge from '../../assets/hero-chiropractor-1200.webp';
import mattAvatar from '../../assets/matt-avatar.webp';
import jessAvatar from '../../assets/jess-avatar.webp';
import samAvatar from '../../assets/sam-avatar.webp';
import videoThumbnail from '../../assets/demo-thumbnail.webp';
import whiteboardVideo from '../../assets/WhiteboardAnimation.mp4';
import mockupLaptop from '../../assets/mockup-laptop-final.png';

const SIGN_UP_URL = '/app?initialState=signUp';
const SIGN_IN_URL = '/app';
const SCHEDULER_URL = 'https://scheduler.zoom.us/nikita-predtechensky/chironote-demo';
const TERMS_URL = 'https://public-docs-and-agreements.s3.us-east-2.amazonaws.com/TermsAndConditions.html';
const VIDEO_TITLE = 'ChiroNote clinical AI scribe overview';
const VIDEO_MILESTONES = [10, 25, 50, 75, 90];

const testimonials = [
  {
    name: 'Dr. Matt Fryauf',
    avatar: mattAvatar,
    quote: 'I highly recommend this app for high volume practices.',
  },
  {
    name: 'Dr. Jessica Yeung',
    avatar: jessAvatar,
    quote: 'Enables me to concentrate my time on patient care instead of paperwork.',
  },
  {
    name: 'Sam Battochio',
    avatar: samAvatar,
    quote: 'Its speed and accuracy make it an invaluable tool.',
  },
];

const plans = [
  {
    name: 'Free',
    description: 'Essential Care',
    price: 'No charge',
    features: ['1 hour/month dictation', 'Up to 15 note edits', 'Unlimited devices'],
  },
  {
    name: 'Standard',
    description: 'Enhanced Practice',
    price: '$19',
    cadence: '/month',
    features: ['15 hours/month dictation', 'Unlimited note edits', 'Unlimited devices'],
    highlighted: true,
  },
  {
    name: 'Professional',
    description: 'Complete Automation',
    price: '$75',
    cadence: '/month',
    features: ['Unlimited dictation', 'Unlimited note edits', 'Unlimited devices'],
  },
];

const faqItems = [
  {
    question: 'How does ChiroNote work?',
    answer: 'ChiroNote is a browser-based tool that records a patient conversation through your device microphone, creates a structured chiropractic SOAP note, and lets you review, edit, and copy the result into your EHR.',
  },
  {
    question: "What if I don't want to use my phone for recording?",
    answer: "You can use any supported device with a microphone. Many practitioners use the computer where they already complete charting, so the generated note is ready in the same workflow.",
  },
  {
    question: 'Can I use ChiroNote on my work computer?',
    answer: 'Yes. ChiroNote runs in a modern web browser and is designed to work alongside your existing EHR without an installation or complex integration.',
  },
  {
    question: 'Is ChiroNote HIPAA compliant?',
    answer: 'ChiroNote is designed for HIPAA-compliant clinical use, with encryption and access controls for protected health information. Providers remain responsible for using the product according to their privacy and security policies.',
  },
  {
    question: "Can I edit the SOAP notes after they're created?",
    answer: 'Yes. You can review and edit every note before using it. The Smart Editor can also revise a note from plain-language instructions, such as making a section more concise.',
  },
  {
    question: 'How does ChiroNote work with my current EHR?',
    answer: 'Review the generated note in ChiroNote, then copy and paste it into your EHR. No direct EHR integration is required.',
  },
  {
    question: 'What happens when my monthly time runs out?',
    answer: 'You can move to a plan with more monthly dictation at any time. Your account page shows the available subscription options.',
  },
  {
    question: 'Can I try ChiroNote before purchasing?',
    answer: 'Yes. The Free plan includes one hour of dictation and up to 15 note edits per month, with no credit card required to begin.',
  },
  {
    question: 'Can AI-generated clinical documentation be used in practice?',
    answer: 'AI can assist with clinical documentation, but the treating provider is responsible for reviewing the note for accuracy and completeness before placing it in the patient record.',
  },
];

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'ChiroNote',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web',
      description: 'A browser-based AI scribe for chiropractic SOAP notes.',
      offers: plans.map((plan) => ({
        '@type': 'Offer',
        name: plan.name,
        price: plan.name === 'Free' ? '0' : plan.price.replace('$', ''),
        priceCurrency: 'USD',
      })),
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ],
};

export default function LandingPage() {
  const videoRef = useRef(null);
  const carouselRef = useRef(null);
  const navRef = useRef(null);
  const trackedVideoMilestones = useRef(new Set());
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const sections = document.querySelectorAll('[data-analytics-section]');
    if (!('IntersectionObserver' in window)) {
      sections.forEach((section) => trackLandingSectionView(section.dataset.analyticsSection));
      return undefined;
    }

    const viewedSections = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const sectionName = entry.target.dataset.analyticsSection;
        if (entry.isIntersecting && !viewedSections.has(sectionName)) {
          viewedSections.add(sectionName);
          trackLandingSectionView(sectionName);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.35 });

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const startedAt = performance.now();
    let maxScrollDepth = 0;
    let engagementSent = false;

    const updateScrollDepth = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const currentDepth = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 100;
      maxScrollDepth = Math.max(maxScrollDepth, currentDepth);
    };

    const sendEngagement = () => {
      if (engagementSent) return;
      const engagementSeconds = (performance.now() - startedAt) / 1000;
      if (engagementSeconds < 3) return;
      engagementSent = true;
      trackLandingEngagement({ engagementSeconds, maxScrollDepth });
    };

    updateScrollDepth();
    window.addEventListener('scroll', updateScrollDepth, { passive: true });
    const engagementTimer = window.setTimeout(sendEngagement, 10000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') sendEngagement();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearTimeout(engagementTimer);
      window.removeEventListener('scroll', updateScrollDepth);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sendEngagement();
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (mobileNavOpen && navRef.current && !navRef.current.contains(event.target)) {
        setMobileNavOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setMobileNavOpen(false);
    };

    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileNavOpen]);

  const handleCarouselScroll = useCallback(() => {
    const carousel = carouselRef.current;
    if (!carousel?.firstElementChild) return;

    const cardWidth = carousel.firstElementChild.getBoundingClientRect().width;
    const gap = Number.parseFloat(getComputedStyle(carousel).columnGap) || 0;
    setActiveSlide(Math.round(carousel.scrollLeft / (cardWidth + gap)));
  }, []);

  const scrollToSlide = (index) => {
    const carousel = carouselRef.current;
    if (!carousel?.firstElementChild) return;

    const cardWidth = carousel.firstElementChild.getBoundingClientRect().width;
    const gap = Number.parseFloat(getComputedStyle(carousel).columnGap) || 0;
    carousel.scrollTo({ left: index * (cardWidth + gap), behavior: 'smooth' });
    trackAnalyticsEvent('landing_testimonial_navigation', { testimonial_index: index + 1 });
  };

  const handleNavigation = (section) => {
    setMobileNavOpen(false);
    trackLandingNavigation(section);
  };

  const handleCta = (location, label, destination = SIGN_UP_URL, plan) => {
    trackLandingCta({ location, label, destination, plan });
  };

  const playVideo = async () => {
    if (!videoRef.current) return;
    try {
      await videoRef.current.play();
    } catch (error) {
      setVideoPlaying(false);
    }
  };

  const handleVideoPlay = () => {
    setVideoPlaying(true);
    if (!trackedVideoMilestones.current.has(0)) {
      trackedVideoMilestones.current.add(0);
      trackVideoProgress(VIDEO_TITLE, 0);
    }
  };

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current;
    if (!video?.duration) return;

    const progress = (video.currentTime / video.duration) * 100;
    VIDEO_MILESTONES.forEach((milestone) => {
      if (progress >= milestone && !trackedVideoMilestones.current.has(milestone)) {
        trackedVideoMilestones.current.add(milestone);
        trackVideoProgress(VIDEO_TITLE, milestone);
      }
    });
  };

  const handleVideoEnded = () => {
    setVideoPlaying(false);
    if (!trackedVideoMilestones.current.has(100)) {
      trackedVideoMilestones.current.add(100);
      trackVideoProgress(VIDEO_TITLE, 100);
    }
  };

  const toggleFaq = (index) => {
    const opening = activeFaq !== index;
    setActiveFaq(opening ? index : null);
    if (opening) trackFaqOpen(faqItems[index].question, index);
  };

  return (
    <div className="marketing-page">
      <Helmet>
        <title>ChiroNote | AI Chiropractic SOAP Notes</title>
        <meta name="description" content="Finish chiropractic SOAP notes faster with a browser-based AI scribe. HIPAA-compliant workflow, no complex EHR integration, and a free plan." />
        <link rel="canonical" href="https://www.chironote.ai/" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.chironote.ai/" />
        <meta property="og:title" content="ChiroNote | AI Chiropractic SOAP Notes" />
        <meta property="og:description" content="Turn patient visits into structured chiropractic SOAP notes in the browser." />
        <meta property="og:image" content="https://www.chironote.ai/logo512.png" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="ChiroNote | AI Chiropractic SOAP Notes" />
        <meta name="twitter:description" content="Turn patient visits into structured chiropractic SOAP notes in the browser." />
        <meta name="twitter:image" content="https://www.chironote.ai/logo512.png" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <header className="marketing-nav" ref={navRef}>
        <a className="marketing-nav__logo" href="/" aria-label="ChiroNote home">
          <img src={textLogo} alt="ChiroNote" width="166" height="29" />
        </a>
        <button
          type="button"
          className="marketing-nav__menu-button"
          aria-label="Toggle navigation"
          aria-expanded={mobileNavOpen}
          aria-controls="marketing-navigation"
          onClick={() => {
            setMobileNavOpen((isOpen) => !isOpen);
            trackAnalyticsEvent('landing_menu_toggle', { menu_state: mobileNavOpen ? 'closed' : 'open' });
          }}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <nav id="marketing-navigation" className={`marketing-nav__links${mobileNavOpen ? ' is-open' : ''}`} aria-label="Main navigation">
          <a href="#how-it-works" onClick={() => handleNavigation('how_it_works')}>How it works</a>
          <a href="#features" onClick={() => handleNavigation('features')}>Features</a>
          <a href="#prices" onClick={() => handleNavigation('pricing')}>Pricing</a>
          <a href="#faq" onClick={() => handleNavigation('faq')}>FAQ</a>
          <a href="/blog" onClick={() => handleNavigation('blog')}>Blog</a>
          <a className="marketing-nav__login" href={SIGN_IN_URL} onClick={() => handleCta('header', 'Log in', SIGN_IN_URL)}>Log in</a>
        </nav>
      </header>

      <main>
        <section className="marketing-hero" data-analytics-section="hero">
          <div className="marketing-hero__copy">
            <p className="marketing-eyebrow">AI documentation built for chiropractors</p>
            <h1>
              You became a chiropractor to help people—{' '}
              <span>not to write about it.</span>
            </h1>
            <p className="marketing-hero__summary">ChiroNote turns your visit into a structured SOAP note in the same browser as your EHR, so you can finish charting while the day is still yours.</p>
            <div className="marketing-hero__actions">
              <a className="marketing-button marketing-button--primary" href={SIGN_UP_URL} onClick={() => handleCta('hero', 'Try now for free')}>
                <span>Try now for free</span>
                <small>No credit card required</small>
              </a>
              <a className="marketing-button marketing-button--secondary" href="#how-it-works" onClick={() => handleNavigation('how_it_works')}>See how it works</a>
            </div>
          </div>
          <div className="marketing-hero__visual">
            <picture>
              <source srcSet={`${heroImageSmall} 720w, ${heroImageLarge} 1200w`} sizes="(max-width: 760px) calc(100vw - 32px), 52vw" type="image/webp" />
              <img
                src={heroImageLarge}
                alt="Chiropractor speaking with a patient during an appointment"
                width="1200"
                height="1150"
                fetchpriority="high"
                decoding="async"
              />
            </picture>
            <div className="marketing-hero__stat" aria-label="45 percent less time on charting">
              <strong>45%</strong>
              <span>less time on charting</span>
            </div>
          </div>
        </section>

        <section className="marketing-trust" aria-label="Product assurances" data-analytics-section="trust">
          <div><span aria-hidden="true">✓</span> HIPAA-compliant workflow</div>
          <div><span aria-hidden="true">✓</span> Works alongside most EHRs</div>
          <div><span aria-hidden="true">✓</span> No complex setup</div>
        </section>

        <section className="marketing-section marketing-testimonials" data-analytics-section="testimonials">
          <div className="marketing-section__heading">
            <p className="marketing-eyebrow">Testimonials</p>
            <h2>Trusted by chiropractors in busy practices</h2>
          </div>
          <div className="marketing-testimonials__grid" ref={carouselRef} onScroll={handleCarouselScroll}>
            {testimonials.map((testimonial) => (
              <figure className="marketing-testimonial" key={testimonial.name}>
                <div className="marketing-testimonial__stars" aria-label="Five out of five stars">★★★★★</div>
                <blockquote>“{testimonial.quote}”</blockquote>
                <figcaption>
                  <img src={testimonial.avatar} alt="" width="48" height="48" loading="lazy" decoding="async" />
                  <strong>{testimonial.name}</strong>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="marketing-carousel-dots" aria-label="Choose testimonial">
            {testimonials.map((testimonial, index) => (
              <button
                type="button"
                key={testimonial.name}
                className={activeSlide === index ? 'is-active' : ''}
                onClick={() => scrollToSlide(index)}
                aria-label={`Show testimonial ${index + 1}`}
                aria-current={activeSlide === index ? 'true' : undefined}
              />
            ))}
          </div>
        </section>

        <section id="how-it-works" className="marketing-section marketing-video" data-analytics-section="video">
          <div className="marketing-section__heading">
            <p className="marketing-eyebrow">How it works</p>
            <h2>See a clinical AI scribe in action</h2>
            <p>Watch how a conversation becomes a reviewable chiropractic SOAP note.</p>
          </div>
          <div className="marketing-video__frame">
            <video
              ref={videoRef}
              controls={videoPlaying}
              preload="none"
              playsInline
              poster={videoThumbnail}
              onPlay={handleVideoPlay}
              onPause={() => setVideoPlaying(false)}
              onTimeUpdate={handleVideoTimeUpdate}
              onEnded={handleVideoEnded}
            >
              <source src={whiteboardVideo} type="video/mp4" />
              Your browser does not support embedded video.
            </video>
            {!videoPlaying && (
              <button type="button" className="marketing-video__play" onClick={playVideo} aria-label="Play ChiroNote overview video">
                <span aria-hidden="true"></span>
              </button>
            )}
          </div>
          <a className="marketing-button marketing-button--primary" href={SIGN_UP_URL} onClick={() => handleCta('video', 'Try now for free')}>Try now for free</a>
        </section>

        <section id="features" className="marketing-section marketing-features" data-analytics-section="features">
          <div className="marketing-section__heading">
            <p className="marketing-eyebrow">How ChiroNote works</p>
            <h2>Secure, quick, and simple. Just like a tool should be.</h2>
          </div>
          <div className="marketing-features__content">
            <div className="marketing-features__image">
              <img src={mockupLaptop} alt="ChiroNote displaying a generated chiropractic SOAP note" width="990" height="733" loading="lazy" decoding="async" />
            </div>
            <ol className="marketing-features__steps">
              <li>
                <span>1</span>
                <div><h3>Start recording and hold the appointment as usual.</h3><p>Focus on the patient while ChiroNote listens through your device microphone.</p></div>
              </li>
              <li>
                <span>2</span>
                <div><h3>Stop recording and review the generated note.</h3><p>Edit the structured note yourself or ask Smart Editor for a targeted revision.</p></div>
              </li>
              <li>
                <span>3</span>
                <div><h3>Transfer the finished note into your EHR.</h3><p>Copy and paste into the system you already use—no complex integration required.</p></div>
              </li>
            </ol>
          </div>
        </section>

        <section id="prices" className="marketing-section marketing-pricing" data-analytics-section="pricing">
          <div className="marketing-section__heading">
            <p className="marketing-eyebrow">Pricing</p>
            <h2>Simple plans for practices of every size</h2>
            <p>Start free, then choose more monthly dictation when you need it.</p>
          </div>
          <div className="marketing-pricing__grid">
            {plans.map((plan) => (
              <article className={`marketing-plan${plan.highlighted ? ' is-highlighted' : ''}`} key={plan.name}>
                {plan.highlighted && <span className="marketing-plan__badge">Most popular</span>}
                <p className="marketing-plan__name">{plan.name}</p>
                <p className="marketing-plan__description">{plan.description}</p>
                <p className="marketing-plan__price">{plan.price}{plan.cadence && <small>{plan.cadence}</small>}</p>
                <ul>
                  {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
                <a className="marketing-button marketing-button--plan" href={SIGN_UP_URL} onClick={() => handleCta('pricing', 'Get started', SIGN_UP_URL, plan.name)}>Get started</a>
              </article>
            ))}
          </div>
          <div className="marketing-pricing__walkthrough">
            <a href={SCHEDULER_URL} target="_blank" rel="noopener noreferrer" onClick={() => handleCta('pricing', 'Schedule personal walkthrough', SCHEDULER_URL)}>Schedule a personal walkthrough</a>
            <p>Have questions about your workflow or EHR? Book a short, no-pressure conversation with us.</p>
          </div>
        </section>

        <section id="faq" className="marketing-section marketing-faq" data-analytics-section="faq">
          <div className="marketing-section__heading">
            <p className="marketing-eyebrow">FAQ</p>
            <h2>Frequently asked questions</h2>
          </div>
          <div className="marketing-faq__list">
            {faqItems.map((item, index) => {
              const isOpen = activeFaq === index;
              return (
                <article className={`marketing-faq__item${isOpen ? ' is-open' : ''}`} key={item.question}>
                  <h3>
                    <button type="button" onClick={() => toggleFaq(index)} aria-expanded={isOpen} aria-controls={`faq-answer-${index}`}>
                      <span>{item.question}</span>
                      <span className="marketing-faq__icon" aria-hidden="true"></span>
                    </button>
                  </h3>
                  <div id={`faq-answer-${index}`} className="marketing-faq__answer" aria-hidden={!isOpen}>
                    <div><p>{item.answer}</p></div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="marketing-final-cta" data-analytics-section="final_cta">
          <div>
            <p className="marketing-eyebrow">Chart less. Treat more.</p>
            <h2>Try your first ChiroNote today.</h2>
            <p>Start with the Free plan. No credit card and no software installation required.</p>
          </div>
          <a className="marketing-button marketing-button--light" href={SIGN_UP_URL} onClick={() => handleCta('final', 'Create free account')}>Create free account</a>
        </section>
      </main>

      <footer className="marketing-footer">
        <a className="marketing-footer__logo" href="/" aria-label="ChiroNote home"><img src={textLogo} alt="ChiroNote" width="150" height="27" loading="lazy" /></a>
        <nav aria-label="Footer navigation">
          <a href="/blog">Blog</a>
          <a href={TERMS_URL} target="_blank" rel="noopener noreferrer">Terms &amp; privacy</a>
          <a href={SIGN_IN_URL}>Log in</a>
        </nav>
        <p>&copy; 2026 ChiroNote. All rights reserved.</p>
      </footer>
    </div>
  );
}
