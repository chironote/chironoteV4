import React, { useEffect, useRef, useState } from 'react';
import recordScreen from '../../assets/workflow-record.webp';
import reviewScreen from '../../assets/workflow-review.webp';
import editorScreen from '../../assets/workflow-editor.webp';
import './WorkflowDemo.css';

const AUTOPLAY_DELAY = 7000;
const SWIPE_DISTANCE = 44;

const steps = [
  {
    title: 'Record the visit',
    description: 'Click New Note, then Start Recording. Speak naturally through the visit while ChiroNote listens.',
    image: recordScreen,
    alt: 'ChiroNote Recording Settings with language and visit options above the Start Recording button.',
  },
  {
    title: 'Review the SOAP note',
    description: 'Stop recording and review the structured SOAP note.',
    image: editorScreen,
    alt: 'A generated SOAP note in ChiroNote beside the Smart Editor.',
  },
  {
    title: 'Move it into your EHR',
    description: 'Copy the full SOAP note—or one section at a time—and paste it into the patient chart you already use.',
    image: reviewScreen,
    alt: 'A generated SOAP note in ChiroNote with controls for copying individual sections.',
  },
];

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.7 12.8c0-2.2 1.8-3.3 1.9-3.4a4.1 4.1 0 0 0-3.2-1.7c-1.3-.1-2.6.8-3.3.8-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.8 2.3-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 3 2.3 1.2 0 1.7-.7 3.2-.7s1.9.7 3.2.7c1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.4-.9-2.4-4Z" />
      <path d="M17.5 6.3c.7-.9 1.2-2.1 1.1-3.3-1.1 0-2.4.7-3.2 1.6-.7.8-1.3 2-1.1 3.2 1.2.1 2.4-.6 3.2-1.5Z" />
    </svg>
  );
}

function GooglePlayMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#00d7fe" d="M3.2 2.6c-.3.4-.5.9-.5 1.6v15.6c0 .6.2 1.2.5 1.6l9.5-9.4-9.5-9.4Z" />
      <path fill="#ffce00" d="m15.8 8.9-3.1 3.1 3.2 3.1 3.8-2.2c1.1-.6 1.1-1.7 0-2.3l-3.9-1.7Z" />
      <path fill="#00f076" d="m3.2 2.6 12.6 6.3-3.1 3.1-9.5-9.4Z" />
      <path fill="#f63448" d="m3.2 21.4 12.7-6.3-3.2-3.1-9.5 9.4Z" />
    </svg>
  );
}

export default function WorkflowDemo() {
  const [step, setStep] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const touchStart = useRef(null);

  const selectStep = (nextStep) => {
    setStep((nextStep + steps.length) % steps.length);
  };

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (userPaused || interactionPaused || reducedMotion) return undefined;

    const timer = window.setTimeout(() => {
      setStep((current) => (current + 1) % steps.length);
    }, AUTOPLAY_DELAY);

    return () => window.clearTimeout(timer);
  }, [interactionPaused, step, userPaused]);

  const handleTouchStart = (event) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event) => {
    if (!touchStart.current) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(deltaX) < SWIPE_DISTANCE || Math.abs(deltaX) <= Math.abs(deltaY)) return;
    selectStep(step + (deltaX < 0 ? 1 : -1));
  };

  return (
    <div
      className="workflow-demo"
      onMouseEnter={() => setInteractionPaused(true)}
      onMouseLeave={() => setInteractionPaused(false)}
      onFocusCapture={() => setInteractionPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPaused(false);
      }}
    >
      <nav className="workflow-demo__desktop-nav" aria-label="ChiroNote workflow steps">
        <ol>
          {steps.map((item, index) => (
            <li key={item.title}>
              <button type="button" aria-current={index === step ? 'step' : undefined} onClick={() => selectStep(index)}>
                <span>{index + 1}</span>
                <strong>{item.title}</strong>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="workflow-demo__stage-wrap">
        {step !== 0 && (
          <button type="button" className="workflow-demo__arrow workflow-demo__arrow--previous" onClick={() => selectStep(step - 1)} aria-label="Show previous step">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
        )}
        <section
          className="workflow-demo__stage"
          aria-roledescription="carousel"
          aria-label="How ChiroNote works"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="workflow-demo__bar">
            <span><i aria-hidden="true" /> ChiroNote in practice</span>
            <span className="workflow-demo__bar-actions">
              <span>{String(step + 1).padStart(2, '0')} / 03</span>
              <button type="button" className="workflow-demo__pause" onClick={() => setUserPaused((current) => !current)} aria-label={userPaused ? 'Resume automatic steps' : 'Pause automatic steps'} aria-pressed={userPaused}>
                {userPaused ? (
                  <svg className="workflow-demo__play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6v12M16 6v12" /></svg>
                )}
              </button>
            </span>
          </div>

          <div className="workflow-demo__viewport">
            <div className="workflow-demo__track" style={{ '--workflow-step': step }}>
              {steps.map((item, index) => (
                <div
                  className="workflow-demo__slide"
                  key={item.title}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Step ${index + 1} of ${steps.length}`}
                  aria-hidden={index === step ? undefined : 'true'}
                >
                  <div className="workflow-demo__screen">
                    <img src={item.image} alt={item.alt} width="1200" height="800" loading="lazy" decoding="async" />
                  </div>
                  <div className="workflow-demo__lesson">
                    <div className="workflow-demo__dots" aria-hidden="true">
                      {steps.map((dot, dotIndex) => <i key={dot.title} className={dotIndex === index ? 'is-active' : ''} />)}
                    </div>
                    <h3>{item.title}</h3>
                    <p className="workflow-demo__explanation">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="workflow-demo__stores">
            <a href="https://apps.apple.com/us/app/chironote/id6756679857" target="_blank" rel="noreferrer" aria-label="Download ChiroNote on the App Store">
              <AppleMark />
              <span><small>Download on the</small>App Store</span>
            </a>
            <a href="https://play.google.com/store/apps/details?id=com.chironote.app" target="_blank" rel="noreferrer" aria-label="Get ChiroNote on Google Play">
              <GooglePlayMark />
              <span><small>GET IT ON</small>Google Play</span>
            </a>
          </div>
        </section>
        <button type="button" className="workflow-demo__arrow workflow-demo__arrow--next" onClick={() => selectStep(step + 1)} aria-label="Show next step">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </button>
      </div>
      <p className="workflow-demo__swipe-hint">Swipe to see the next step</p>
    </div>
  );
}
