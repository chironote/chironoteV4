import React, { useState } from 'react';

const Clipboard = ({
  clipboardTextareaRef,
  clipboardContent,
  handleCopyPaste,
  setClipboardContent,
  showCopyMessage,
  streamContent,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const droppedText = e.dataTransfer.getData('text/plain');
    setClipboardContent((prevContent) => prevContent + droppedText);
  };

  return (
    <div className="clipboard">
      <div className="clipboard-textarea-container">
        <textarea
          ref={clipboardTextareaRef}
          className={`clipboard-textarea ${isDraggingOver ? 'dragging-over' : ''}`}
          placeholder="Enter your note here..."
          value={clipboardContent}
          onChange={(e) => setClipboardContent(e.target.value)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />

        {streamContent && (
          <div className="stream-content">
            <p>{streamContent}</p>
          </div>
        )}

        <div className="textarea-icons">
          <div className="icon-wrapper">
            <span
              onClick={handleCopyPaste}
              className="material-symbols-rounded textarea-icon"
            >
              {showCopyMessage ? 'check' : 'content_copy'}
            </span>

            {showCopyMessage && (
              <span className="copy-message">Content copied to clipboard</span>
            )}
          </div>
        </div>
      </div>

      <a
        href="#"
        className="clear-clipboard-link"
        onClick={(e) => {
          e.preventDefault();
          setClipboardContent("");
        }}
      >
        Clear text
      </a>
    </div>
  );
};

export default Clipboard;