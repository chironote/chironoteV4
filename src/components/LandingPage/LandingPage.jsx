import React from 'react';
import './LandingPage.css';
import logo from '../../assets/FullLogo2.svg';
import footermockup from '../../assets/Footermockup.svg';
import stars from '../../assets/stars.svg';
import feature1 from '../../assets/Feature1.svg';
import feature2 from '../../assets/Feature2.svg';
import feature3 from '../../assets/Feature3.svg';
import avatar from '../../assets/conversation.svg';

export default function LandingPage(props) {
  return (
    <div className="landing-page">
      {/* Header Section */}
      <div className="landing-page__header">
        <div className="landing-page__header-content">
          <img
            src={logo}
            alt="Full Logo"
            className="landing-page__logo"
          />
          <div className="landing-page__nav">
          </div>
          <a href="/app" className="landing-page__get-started-button">
            Launch App
          </a>
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
            <a href="/app" className="landing-page__action-button">
              Start charting now for free
            </a>
          </div>
        </div>
        <div className="landing-page__hero-reflection"></div>
      </div>

      {/* Testimonials Section */}
      <div id="testimonials" className="landing-page__testimonials">
        <div className="landing-page__testimonials-header">
          <div className="landing-page__testimonials-title">What people are saying</div>
        </div>
        <div className="landing-page__testimonial-cards">
          {/* Testimonial Card 1 */}
          <div className="landing-page__testimonial-card">
            <div className="landing-page__testimonial-header">
              <img
                src={avatar}
                alt="Emily Johnson"
                className="landing-page__testimonial-avatar"
              />
              <div className="landing-page__testimonial-user">
                <div className="landing-page__testimonial-name">Emily Johnson</div>
                <div className="landing-page__testimonial-location">New York, NY</div>
              </div>
              <div className="landing-page__testimonial-stars">
                <img
                  src={stars}
                  alt="Stars"
                  className="landing-page__stars-icon"
                />
              </div>
            </div>
            <div className="landing-page__testimonial-text">
              I couldn't be happier with my kitchen remodel! The team was professional and attentive to every detail. They turned my vision into reality!
            </div>
          </div>
          {/* Testimonial Card 2 */}
          <div className="landing-page__testimonial-card">
            <div className="landing-page__testimonial-header">
              <img
                src={avatar}
                alt="Michael Smith"
                className="landing-page__testimonial-avatar"
              />
              <div className="landing-page__testimonial-user">
                <div className="landing-page__testimonial-name">Michael Smith</div>
                <div className="landing-page__testimonial-location">Los Angeles, CA</div>
              </div>
              <div className="landing-page__testimonial-stars">
                <img
                  src={stars}
                  alt="Stars"
                  className="landing-page__stars-icon"
                />
              </div>
            </div>
            <div className="landing-page__testimonial-text">
              The bathroom renovation exceeded my expectations. The craftsmanship is top-notch, and the entire process was smooth and stress-free. Highly recommend!
            </div>
          </div>
          {/* Testimonial Card 3 */}
          <div className="landing-page__testimonial-card">
            <div className="landing-page__testimonial-header">
              <img
                src={avatar}
                alt="Sarah Brown"
                className="landing-page__testimonial-avatar"
              />
              <div className="landing-page__testimonial-user">
                <div className="landing-page__testimonial-name">Sarah Brown</div>
                <div className="landing-page__testimonial-location">Chicago, IL</div>
              </div>
              <div className="landing-page__testimonial-stars">
                <img
                  src={stars}
                  alt="Stars"
                  className="landing-page__stars-icon"
                />
              </div>
            </div>
            <div className="landing-page__testimonial-text">
              I couldn't be happier with my kitchen remodel! The team was professional and attentive to every detail. They turned my vision into reality!
            </div>
          </div>
        </div>
      </div>

      {/* Feature Sections */}
      <div id="features" className="landing-page__features">
        {/* Feature 1 */}
        <div className="landing-page__feature">
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
        <div className="landing-page__feature">
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

        {/* Feature 3 */}
        <div className="landing-page__feature">
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
          <a href="/app" className="landing-page__cta-button">
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
