import React, { useEffect, useRef, useState } from 'react';
import { fetchUserAttributes } from 'aws-amplify/auth';
import ProductDialog from '../Dialog/ProductDialog';
import './Feedback.css';

const FEEDBACK_URL = 'https://xmryti2hkkvg5tosvv3p6lehsa0lysic.lambda-url.us-east-2.on.aws/';

function Feedback({ isOpen, onClose, returnFocusRef }) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const textareaRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setSubmitSuccess(false);
    setError('');
    if (userEmail) return;
    fetchUserAttributes()
      .then((attributes) => { if (mountedRef.current) setUserEmail(attributes.email || ''); })
      .catch(() => { if (mountedRef.current) setError('Your account email could not be loaded. Please try reopening Feedback.'); });
  }, [isOpen, userEmail]);

  const closeAndReset = () => {
    if (isSubmitting) return;
    setMessage('');
    setError('');
    setSubmitSuccess(false);
    onClose();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || !message.trim()) return;
    if (!userEmail) {
      setError('Your account email is unavailable. Close and reopen Feedback to try again.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch(FEEDBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: message, subject: 'Feedback', userEmail })
      });
      if (!response.ok) throw new Error('Submission failed');
      if (!mountedRef.current) return;
      setMessage('');
      setSubmitSuccess(true);
    } catch (requestError) {
      if (mountedRef.current) setError('ChiroNote could not send your feedback. Your message is still here—please try again.');
    } finally {
      if (mountedRef.current) setIsSubmitting(false);
    }
  };

  return (
    <ProductDialog
      isOpen={isOpen}
      title="Feedback"
      description="Tell us what is working well or what ChiroNote could improve."
      onRequestClose={closeAndReset}
      initialFocusRef={textareaRef}
      returnFocusRef={returnFocusRef}
      dismissalDisabled={isSubmitting}
      size="compact"
    >
      {submitSuccess ? (
        <div className="feedback-success" role="status">
          <span className="material-symbols-rounded" aria-hidden="true">check_circle</span>
          <strong>Thank you for your feedback.</strong>
          <p>Your message was submitted successfully.</p>
          <button type="button" className="feedback-button feedback-button--primary" onClick={closeAndReset}>Close</button>
        </div>
      ) : (
        <form className="feedback-form" onSubmit={handleSubmit}>
          <label htmlFor="feedback-message">Feedback</label>
          <textarea
            ref={textareaRef}
            id="feedback-message"
            value={message}
            onChange={(event) => { setMessage(event.target.value); setError(''); }}
            required
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'feedback-error' : undefined}
            placeholder="Share your feedback…"
          />
          {error && <div id="feedback-error" className="feedback-error" role="alert">{error}</div>}
          <div className="feedback-actions">
            <button type="button" className="feedback-button feedback-button--secondary" onClick={closeAndReset} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="feedback-button feedback-button--primary" disabled={isSubmitting || !message.trim()}>
              {isSubmitting ? 'Submitting feedback…' : 'Submit feedback'}
            </button>
          </div>
        </form>
      )}
    </ProductDialog>
  );
}

export default Feedback;
