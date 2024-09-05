import React, { useState, useRef } from 'react';
import arrowLeftIcon from '../assets/arrow-left.svg';

const LAMBDA_URL = "https://yulmp44ybg3ig5ph4nh2hfbibm0ztfin.lambda-url.us-east-2.on.aws"; // Replace with your actual Lambda URL

const EditPanel = ({ showEditPanel, editContent, setEditContent, clipboardContent, userId, onTextStreamUpdate }) => {
  const [textStream, setTextStream] = useState('');

  const editStream = async (editInput) => {
    try {
      const response = await fetch(LAMBDA_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          noteInput: clipboardContent,
          editInput: editInput
        }),
      });

      if (!response.ok) {
        console.error(`HTTP error! status: ${response.status}`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let chunk;
      while (true) {
        chunk = await reader.read();
        const text = decoder.decode(chunk.value, { stream: !chunk.done });
        const formattedText = text.replace(/\n/g, '<br>');
        setTextStream((prev) => {
          const newText = prev + formattedText;
          onTextStreamUpdate(newText);
          return newText;
        });

        if (chunk.done) {
          break;
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
    }
  };

  return (
    <section className={`edit-panel ${showEditPanel ? 'visible' : ''}`}>
      <h4>Note Updater</h4>
      <textarea
        className="edit-textarea"
        placeholder="Enter any changes you wish applied to the note on the left"
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
      />

      {/* Link to clear the text area */}
      <a
        href="javascript(void)"
        className="clear-edit-link"
        onClick={(e) => { e.preventDefault(); setEditContent(''); }}
      >
        Clear text
      </a>

      {/* Button to apply changes from the textarea to clipboard content */}
      <button
        className="apply-changes-button"
        onClick={() => editStream(editContent)}
      >
        <img src={arrowLeftIcon} alt="Arrow Left" className="button-icon left-arrow" />
        <span>Apply Changes</span>
      </button>
    </section>
  )
}

export default EditPanel;