import React, { useState } from 'react';

const Clipboard = ({
  clipboardTextareaRef,
  clipboardContent,
  setClipboardContent,
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
      <div className="clipboard-content">
        <textarea
          ref={clipboardTextareaRef}
          className={`clipboard-textarea ${isDraggingOver ? 'dragging-over' : ''}`}
          placeholder="Note will appear here..."
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
      </div>
    </div>
  );
};

export default Clipboard;