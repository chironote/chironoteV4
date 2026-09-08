import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import './LandingPage.css';
import {
  GOOGLE_ADS_ATTRIBUTION_EVENT,
  getGoogleAdsClickId,
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
import davidAvatar from '../../assets/david-ager-avatar.webp';
import videoThumbnail from '../../assets/demo-thumbnail.webp';
import whiteboardVideo from '../../assets/WhiteboardAnimation.mp4';
import mockupLaptop from '../../assets/mockup-laptop-final.png';
import hipaaIcon from '../../assets/hipaa.svg';

const SIGN_UP_URL = '/app?initialState=signUp';
const SIGN_IN_URL = '/app';
const SCHEDULER_URL = 'https://scheduler.zoom.us/nikita-predtechensky/chironote-demo';
const SCHEDULER_ORIGIN = 'https://chironote.ai';
const TERMS_URL = 'https://public-docs-and-agreements.s3.us-east-2.amazonaws.com/TermsAndConditions.html';
const VIDEO_TITLE = 'ChiroNote clinical AI scribe overview';
const VIDEO_MILESTONES = [10, 25, 50, 75, 90];
const GOOGLE_ADS_CLICK_ID_PREFIXES = {
  gclid: 'g:',
  gbraid: 'b:',
  wbraid: 'w:',
};

const createSchedulerUrl = () => {
  const schedulerUrl = new URL(SCHEDULER_URL);
  schedulerUrl.searchParams.set('embed', 'true');
  schedulerUrl.searchParams.set('origin', SCHEDULER_ORIGIN);

  const clickId = getGoogleAdsClickId();
  const prefix = clickId && GOOGLE_ADS_CLICK_ID_PREFIXES[clickId.type];
  if (prefix) {
    schedulerUrl.searchParams.set('utm_source', 'google_ads');
    schedulerUrl.searchParams.set('utm_medium', 'cpc');
    schedulerUrl.searchParams.set('utm_campaign', 'demo_landing_page');
    schedulerUrl.searchParams.set('utm_content', `${prefix}${clickId.value}`);
  }

  return schedulerUrl.toString();
};

const testimonials = [
  {
    name: 'Dr. David Ager',
    avatar: davidAvatar,
    quote: 'Chironote is a real help and saves me hours per week.',
  },
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
    answer: 'ChiroNote is designed for HIPAA-compliant clinical use, with encryption and access controls for protected health information. All service providers with access to protected health information are covered by Business Associate Agreements with ChiroNote. Providers remain responsible for using the product according to their privacy and security policies.',
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

const createStructuredData = (items) => ({
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
      mainEntity: items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    },
  ],
});

export default function LandingPage({ variant = 'standard' }) {
  const isDemo = variant === 'demo';
  const pageFaqItems = faqItems;
  const structuredData = createStructuredData(pageFaqItems);
  const pageRef = useRef(null);
  const videoRef = useRef(null);
  const carouselRef = useRef(null);
  const navRef = useRef(null);
  const schedulerRef = useRef(null);
  const trackedVideoMilestones = useRef(new Set());
  const trackedSchedulerBookings = useRef(new Set());
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [schedulerUrl, setSchedulerUrl] = useState(createSchedulerUrl);

  useEffect(() => {
    if (!isDemo || typeof window === 'undefined') return undefined;

    const refreshSchedulerUrl = () => setSchedulerUrl(createSchedulerUrl());
    window.addEventListener(GOOGLE_ADS_ATTRIBUTION_EVENT, refreshSchedulerUrl);
    refreshSchedulerUrl();

    return () => window.removeEventListener(GOOGLE_ADS_ATTRIBUTION_EVENT, refreshSchedulerUrl);
  }, [isDemo]);

  useEffect(() => {
    if (!isDemo || typeof window === 'undefined') return undefined;

    const handleSchedulerBooking = (event) => {
      if (event.origin !== 'https://scheduler.zoom.us') return;
      if (event.source !== schedulerRef.current?.contentWindow) return;

      const { type, payload } = event.data || {};
      const scheduledEventId = payload?.scheduledEventId;
      if (type !== 'bookingForm' || typeof scheduledEventId !== 'string' || !scheduledEventId) return;
      if (trackedSchedulerBookings.current.has(scheduledEventId)) return;

      trackedSchedulerBookings.current.add(scheduledEventId);
      trackAnalyticsEvent('booked_demo', {
        booking_channel: 'zoom_scheduler',
        zoom_scheduled_event_id: scheduledEventId,
      });
    };

    window.addEventListener('message', handleSchedulerBooking);
    return () => window.removeEventListener('message', handleSchedulerBooking);
  }, [isDemo]);

  useEffect(() => {
    const page = pageRef.current;
    const revealElements = page?.querySelectorAll('[data-marketing-reveal]');
    if (!page || !revealElements?.length) return undefined;

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add('is-visible'));
      return undefined;
    }

    page.classList.add('is-motion-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16 });

    revealElements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const page = pageRef.current;
    const trustItems = page?.querySelectorAll('[data-marketing-scroll-reveal]');
    const trustFollowup = page?.querySelector('[data-marketing-trust-followup]');
    if (!page || !trustItems?.length || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    let animationFrame;
    const updateTrustReveal = () => {
      const viewportHeight = window.innerHeight;
      trustItems.forEach((item) => {
        const startPoint = viewportHeight * Number(item.dataset.marketingScrollRevealStart);
        const endPoint = viewportHeight * Number(item.dataset.marketingScrollRevealEnd);
        const progress = Math.max(0, Math.min(1, (startPoint - item.getBoundingClientRect().top) / (startPoint - endPoint)));
        item.style.setProperty('--marketing-scroll-reveal-progress', progress);
      });
      if (trustFollowup) {
        const finalTrustItem = trustItems[trustItems.length - 1];
        const handoffPoint = viewportHeight * Number(finalTrustItem.dataset.marketingScrollRevealEnd);
        const revealStart = handoffPoint - (viewportHeight * 0.18);
        const progress = Math.max(0, Math.min(1, (revealStart - finalTrustItem.getBoundingClientRect().top) / (viewportHeight * 0.12)));
        trustFollowup.style.setProperty('--marketing-trust-followup-progress', progress);
      }
      animationFrame = undefined;
    };
    const requestUpdate = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(updateTrustReveal);
    };

    page.classList.add('is-scroll-motion-ready');
    updateTrustReveal();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    return () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      page.classList.remove('is-scroll-motion-ready');
    };
  }, []);

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
    if (opening) trackFaqOpen(pageFaqItems[index].question, index);
  };

  return (
    <div className={`marketing-page${isDemo ? ' marketing-page--demo' : ''}`} ref={pageRef}>
      <Helmet>
        <title>{isDemo ? 'ChiroNote Demo | Schedule a Workflow Walkthrough' : 'ChiroNote | AI Chiropractic SOAP Notes'}</title>
        <meta name="description" content={isDemo ? 'Schedule a practical ChiroNote walkthrough and learn how to record a treatment visit, review the SOAP note, and move it into your EHR.' : 'Finish chiropractic SOAP notes faster with a browser-based AI scribe. HIPAA-compliant workflow, no complex EHR integration, and a free plan.'} />
        <link rel="canonical" href={isDemo ? 'https://www.chironote.ai/demo' : 'https://www.chironote.ai/'} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={isDemo ? 'https://www.chironote.ai/demo' : 'https://www.chironote.ai/'} />
        <meta property="og:title" content={isDemo ? 'ChiroNote Demo | Schedule a Workflow Walkthrough' : 'ChiroNote | AI Chiropractic SOAP Notes'} />
        <meta property="og:description" content={isDemo ? 'Learn how ChiroNote fits into your treatment and documentation workflow.' : 'Turn patient visits into structured chiropractic SOAP notes in the browser.'} />
        <meta property="og:image" content="https://www.chironote.ai/logo512.png" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={isDemo ? 'ChiroNote Demo | Schedule a Workflow Walkthrough' : 'ChiroNote | AI Chiropractic SOAP Notes'} />
        <meta name="twitter:description" content={isDemo ? 'Learn how ChiroNote fits into your treatment and documentation workflow.' : 'Turn patient visits into structured chiropractic SOAP notes in the browser.'} />
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
          {isDemo ? (
            <a href="#scheduler" onClick={() => handleNavigation('scheduler')}>Walkthrough</a>
          ) : (
            <a href="#prices" onClick={() => handleNavigation('pricing')}>Pricing</a>
          )}
          <a href="#faq" onClick={() => handleNavigation('faq')}>FAQ</a>
          <a href="/blog" onClick={() => handleNavigation('blog')}>Blog</a>
          <a className="marketing-nav__login" href={SIGN_IN_URL} onClick={() => handleCta('header', 'Log in', SIGN_IN_URL)}>Log in</a>
        </nav>
      </header>

      <main>
        <section className="marketing-hero" data-analytics-section="hero">
          <div className="marketing-hero__copy">
            <p className="marketing-eyebrow">{isDemo ? 'Built for busy chiropractors' : 'AI documentation built for chiropractors'}</p>
            <h1>
              SOAP notes, <span>written while you treat.</span>
            </h1>
            <p className="marketing-hero__summary">{isDemo ? 'ChiroNote listens during the patient visit and turns the conversation into a structured chiropractic SOAP note—ready to review and copy into your EHR.' : 'ChiroNote listens to the visit and turns the conversation into a structured note—automatically.'}</p>
            <div className="marketing-hero__actions">
              <a className="marketing-button marketing-button--primary" href={isDemo ? '#scheduler' : SIGN_UP_URL} onClick={() => isDemo ? handleNavigation('scheduler') : handleCta('hero', 'Try now for free')}>
                <span>{isDemo ? 'Schedule a walkthrough' : 'Try now for free'}</span>
                {!isDemo && <small>No credit card required</small>}
              </a>
              <a
                className="marketing-button marketing-button--secondary"
                href={isDemo ? SIGN_UP_URL : '#how-it-works'}
                onClick={() => isDemo ? handleCta('hero', 'Sign up') : handleNavigation('how_it_works')}
              >
                {isDemo ? 'Sign up' : 'See how it works'}
              </a>
            </div>
          </div>
          <div className="marketing-hero__visual">
            <picture>
              <source srcSet={`${heroImageSmall} 720w, ${heroImageLarge} 1200w`} sizes="(max-width: 880px) calc(100vw - 32px), 52vw" type="image/webp" />
              <img
                src={heroImageLarge}
                alt="Chiropractor speaking with a patient during an appointment"
                width="1200"
                height="1150"
                fetchpriority="high"
                decoding="async"
              />
            </picture>
            <ul className="marketing-hero__mobile-assurances" aria-label="Product assurances" data-analytics-section="trust">
              <li>HIPAA-compliant</li>
              <li>Quick setup</li>
              <li>Keep your workflow</li>
            </ul>
          </div>
        </section>

        {isDemo ? (
          <section className="marketing-hipaa-trust marketing-reveal" aria-labelledby="hipaa-trust-heading" data-analytics-section="trust" data-marketing-reveal>
            <img className="marketing-hipaa-trust__icon" src={hipaaIcon} alt="" aria-hidden="true" />
            <div>
              <p className="marketing-eyebrow">HIPAA-ready clinical workflow</p>
              <h2 id="hipaa-trust-heading">Patient privacy, built into the conversation.</h2>
              <p>Encryption and access controls help safeguard protected health information throughout your workflow.</p>
            </div>
          </section>
        ) : (
          <section className="marketing-trust" aria-label="Product assurances" data-analytics-section="trust">
            <div className="marketing-trust__item" data-marketing-scroll-reveal data-marketing-scroll-reveal-start="0.98" data-marketing-scroll-reveal-end="0.90"><span aria-hidden="true">✓</span> HIPAA-compliant workflow</div>
            <div className="marketing-trust__item" data-marketing-scroll-reveal data-marketing-scroll-reveal-start="0.92" data-marketing-scroll-reveal-end="0.80"><span aria-hidden="true">✓</span> Works alongside most EHRs</div>
            <div className="marketing-trust__item" data-marketing-scroll-reveal data-marketing-scroll-reveal-start="0.84" data-marketing-scroll-reveal-end="0.70"><span aria-hidden="true">✓</span> No setup required</div>
          </section>
        )}

        <section className="marketing-section marketing-testimonials" data-analytics-section="testimonials">
          <div className="marketing-section__heading marketing-trust-followup" data-marketing-trust-followup>
            <p className="marketing-eyebrow">Testimonials</p>
            <h2>Trusted by chiropractors in busy practices</h2>
          </div>
          <div className="marketing-testimonials__grid marketing-reveal marketing-reveal--delay-1" ref={carouselRef} onScroll={handleCarouselScroll} data-marketing-reveal>
            {testimonials.map((testimonial) => (
              <figure className="marketing-testimonial" key={testimonial.name}>
                <div className="marketing-testimonial__portrait" aria-hidden="true">
                  <img src={testimonial.avatar} alt="" width="96" height="96" loading="lazy" decoding="async" />
                </div>
                <div className="marketing-testimonial__content">
                  <div className="marketing-testimonial__stars" aria-label="Five out of five stars">★★★★★</div>
                  <blockquote>“{testimonial.quote}”</blockquote>
                  <figcaption>
                    <strong>{testimonial.name}</strong>
                  </figcaption>
                </div>
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
          <div className="marketing-section__heading marketing-reveal" data-marketing-reveal>
            <p className="marketing-eyebrow">How it works</p>
            <h2>See a clinical AI scribe in action</h2>
            <p>Watch how a conversation becomes a reviewable chiropractic SOAP note.</p>
          </div>
          <div className="marketing-video__frame marketing-reveal marketing-reveal--delay-1" data-marketing-reveal>
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
          <a className="marketing-button marketing-button--primary" href={isDemo ? '#scheduler' : SIGN_UP_URL} onClick={() => isDemo ? handleNavigation('scheduler') : handleCta('video', 'Try now for free')}>{isDemo ? 'Schedule a walkthrough' : 'Try now for free'}</a>
        </section>

        <section id="features" className="marketing-section marketing-features" data-analytics-section="features">
          <div className="marketing-section__heading marketing-reveal" data-marketing-reveal>
            <p className="marketing-eyebrow">How ChiroNote works</p>
            <h2>Secure, quick, and simple. Just like a tool should be.</h2>
          </div>
          <div className="marketing-features__content">
            <div className="marketing-features__image marketing-reveal marketing-reveal--delay-1" data-marketing-reveal>
              <img src={mockupLaptop} alt="ChiroNote displaying a generated chiropractic SOAP note" width="990" height="733" loading="lazy" decoding="async" />
            </div>
            <ol className="marketing-features__steps">
              <li className="marketing-reveal marketing-reveal--delay-1" data-marketing-reveal>
                <span>1</span>
                <div><h3>Start recording and hold the appointment as usual.</h3><p>Focus on the patient while ChiroNote listens through your device microphone.</p></div>
              </li>
              <li className="marketing-reveal marketing-reveal--delay-2" data-marketing-reveal>
                <span>2</span>
                <div><h3>Stop recording and review the generated note.</h3><p>Edit the structured note yourself or ask Smart Editor for a targeted revision.</p></div>
              </li>
              <li className="marketing-reveal marketing-reveal--delay-3" data-marketing-reveal>
                <span>3</span>
                <div><h3>Transfer the finished note into your EHR.</h3><p>Copy and paste into the system you already use—no complex integration required.</p></div>
              </li>
            </ol>
          </div>
        </section>

        {!isDemo && <section id="prices" className="marketing-section marketing-pricing" data-analytics-section="pricing">
          <div className="marketing-section__heading marketing-reveal" data-marketing-reveal>
            <p className="marketing-eyebrow">Pricing</p>
            <h2>Simple plans for practices of every size</h2>
            <p>Start free, then choose more monthly dictation when you need it.</p>
          </div>
          <div className="marketing-pricing__grid">
            {plans.map((plan, index) => (
              <article className={`marketing-plan marketing-reveal marketing-reveal--delay-${index + 1}${plan.highlighted ? ' is-highlighted' : ''}`} key={plan.name} data-marketing-reveal>
                <div className="marketing-plan__heading">
                  {plan.highlighted && <span className="marketing-plan__badge">Most popular</span>}
                  <p className="marketing-plan__name">{plan.name}</p>
                  <p className="marketing-plan__description">{plan.description}</p>
                </div>
                <p className="marketing-plan__price">{plan.price}{plan.cadence && <small>{plan.cadence}</small>}</p>
                <ul>
                  {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
                <a className="marketing-button marketing-button--plan" href={SIGN_UP_URL} aria-label={`Get started with ${plan.name}`} onClick={() => handleCta('pricing', 'Get started', SIGN_UP_URL, plan.name)}>Get started</a>
              </article>
            ))}
            <p className="marketing-pricing__shared-feature">All plans include unlimited devices.</p>
          </div>
        </section>}

        {isDemo && (
          <section id="scheduler" className="marketing-section marketing-scheduler" data-analytics-section="scheduler">
            <div className="marketing-section__heading marketing-reveal" data-marketing-reveal>
              <p className="marketing-eyebrow">Schedule a walkthrough</p>
              <h2>Pick a timeslot below</h2>
              <p>We’ll show you how to record a treatment visit, review the generated SOAP note, and move it into your EHR. Bring questions about your current process.</p>
            </div>
            <ul className="marketing-scheduler__details marketing-reveal marketing-reveal--delay-1" aria-label="Walkthrough details" data-marketing-reveal>
              <li>15 minutes</li>
              <li>Clinic-friendly hours</li>
              <li>Practical Q&amp;A</li>
            </ul>
            <div className="marketing-scheduler__embed marketing-reveal marketing-reveal--delay-2" data-marketing-reveal>
              <iframe
                ref={schedulerRef}
                src={schedulerUrl}
                title="Schedule a ChiroNote workflow walkthrough"
                loading="lazy"
              />
            </div>
          </section>
        )}

        <section id="faq" className="marketing-section marketing-faq" data-analytics-section="faq">
          <div className="marketing-section__heading marketing-reveal" data-marketing-reveal>
            <p className="marketing-eyebrow">FAQ</p>
            <h2>Frequently asked questions</h2>
          </div>
          <div className="marketing-faq__list marketing-reveal marketing-reveal--delay-1" data-marketing-reveal>
            {pageFaqItems.map((item, index) => {
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

        <section className="marketing-final-cta marketing-reveal" data-analytics-section="final_cta" data-marketing-reveal>
          <div>
            <p className="marketing-eyebrow">{isDemo ? 'Learn it with your workflow' : 'Chart less. Treat more.'}</p>
            <h2>{isDemo ? 'Ready for a practical walkthrough?' : 'Try your first ChiroNote today.'}</h2>
            <p>{isDemo ? 'Pick a time and we’ll teach you how ChiroNote can support the treatments you already provide.' : 'Start with the Free plan. No credit card and no software installation required.'}</p>
          </div>
          <a className="marketing-button marketing-button--light" href={isDemo ? '#scheduler' : SIGN_UP_URL} onClick={() => isDemo ? handleNavigation('scheduler') : handleCta('final', 'Create free account')}>{isDemo ? 'Schedule a walkthrough' : 'Create free account'}</a>
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
