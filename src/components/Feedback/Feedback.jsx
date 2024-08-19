import React, { useState } from 'react';
import "./Feedback.css";

// Component for feedback form
function Feedback() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Handle changes to the subject input
  const handleSubjectChange = (event) => {
    setSubject(event.target.value);
  };

  // Handle changes to the message input
  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  // Handle form submission
  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Feedback submitted:', { subject, message });
    // In a real application, send feedback to the backend here
    // Reset form fields after submission
    setSubject('');
    setMessage('');
  };

  return (
    <div className="feedback-container" >
      <h1>Leave Feedback</h1>
      <form onSubmit={handleSubmit}>
        {/* Subject selection dropdown */}
        <div className="form-group">
          <label htmlFor="subject">Subject:</label>
          <select
            id="subject"
            value={subject}
            onChange={handleSubjectChange}
            required
            className="feedback-select"
          >
            <option value="">Select a subject</option>
            <option value="Report Problem">Report Problem</option>
            <option value="Question">Question</option>
            <option value="Feedback">Feedback</option>
          </select>
        </div>

        {/* Message input field */}
        <div className="form-group">
          <label htmlFor="message">Your Message:</label>
          <textarea
            id="message"
            value={message}
            onChange={handleMessageChange}
            required
            className="feedback-textarea"
            placeholder="Enter your feedback here..."
            style={{ fontFamily: 'Roboto, sans-serif' }}
          />
        </div>

        {/* Submit button */}
        <button type="submit" className="submit-feedback-btn">
          Submit Feedback
        </button>
      </form>
    </div>
  );
}

export default Feedback;