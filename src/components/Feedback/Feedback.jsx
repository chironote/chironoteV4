import React, { useState } from 'react';
import "./Feedback.css";

function Feedback() {
  const [subject, setSubject] = useState('Feedback');
  const [message, setMessage] = useState('');

  const handleSubjectChange = (event) => {
    setSubject(event.target.value);
  };

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    try {
      const response = await fetch('https://xmryti2hkkvg5tosvv3p6lehsa0lysic.lambda-url.us-east-2.on.aws/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: message, subject }),
      });

      if (response.ok) {
        console.log('Successfully sent feedback');
        setSubject('Feedback');
        setMessage('');
      } else {
        alert('Failed to send feedback.');
      }
    } catch (error) {
      alert('An error occurred while sending the feedback.');
    }
  };

  return (
    <div className="feedback-container" >
      <h1>Leave Feedback</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="subject">Subject:</label>
          <select
            id="subject"
            value={subject}
            onChange={handleSubjectChange}
            required
            className="feedback-select"
          >
            <option value="Feedback">Feedback</option>
            <option value="Report Problem">Report Problem</option>
            <option value="Question">Question</option>
          </select>
        </div>

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

        <button type="submit" className="submit-feedback-btn">
          Submit Feedback
        </button>
      </form>
    </div>
  );
}

export default Feedback;