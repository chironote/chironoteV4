import React, { useState, useEffect, useCallback } from 'react';

const Clipboard = ({
  clipboardTextareaRef,
  clipboardContent,
  setClipboardContent,
  streamContent,
}) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [soapPositions, setSoapPositions] = useState({ S: 0, O: 0, A: 0, P: 0 });

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

  const copySection = (section) => {
    const text = clipboardContent;
    const sections = {
      'S': 'Subjective:',
      'O': 'Objective:',
      'A': 'Assessment:',
      'P': 'Plan:'
    };

    const sectionHeaders = Object.values(sections);
    const currentSection = sections[section];
    
    // Find the start of current section
    const startIndex = text.indexOf(currentSection);
    if (startIndex === -1) return;

    // Find the start of next section
    let endIndex = text.length;
    for (const header of sectionHeaders) {
      if (header === currentSection) continue;
      const nextIndex = text.indexOf(header, startIndex + currentSection.length);
      if (nextIndex !== -1 && nextIndex < endIndex) {
        endIndex = nextIndex;
      }
    }

    // Extract and copy the section text
    const sectionText = text.substring(startIndex + currentSection.length, endIndex).trim();
    navigator.clipboard.writeText(sectionText);
  };

  const updatePositions = useCallback(() => {
    if (clipboardTextareaRef.current) {
      const text = clipboardContent;
      const sections = {
        'S': 'Subjective:',
        'O': 'Objective:',
        'A': 'Assessment:',
        'P': 'Plan:'
      };

      const newPositions = {};
      const verticalOffset = -6;
      
      // Create a hidden div to measure text height
      const measureDiv = document.createElement('div');
      measureDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        width: ${clipboardTextareaRef.current.clientWidth}px;
        font-family: ${getComputedStyle(clipboardTextareaRef.current).fontFamily};
        font-size: ${getComputedStyle(clipboardTextareaRef.current).fontSize};
        line-height: ${getComputedStyle(clipboardTextareaRef.current).lineHeight};
        white-space: pre-wrap;
        word-wrap: break-word;
        padding: ${getComputedStyle(clipboardTextareaRef.current).padding};
      `;
      document.body.appendChild(measureDiv);

      Object.entries(sections).forEach(([key, header]) => {
        const index = text.indexOf(header);
        if (index !== -1) {
          const textUpToHeader = text.substring(0, index);
          measureDiv.textContent = textUpToHeader;
          const height = measureDiv.offsetHeight;
          newPositions[key] = height + verticalOffset;
        }
      });

      document.body.removeChild(measureDiv);
      setSoapPositions(newPositions);
    }
  }, [clipboardContent]);

  // Update positions when content changes
  useEffect(() => {
    updatePositions();
  }, [updatePositions]);

  // Update positions when window resizes
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      updatePositions();
    });

    if (clipboardTextareaRef.current) {
      resizeObserver.observe(clipboardTextareaRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [updatePositions]);

  return (
    <div className="clipboard">
      <div className="soap-buttons">
        {Object.entries(soapPositions).map(([section, position]) => (
          position !== undefined && (
            <button
              key={section}
              className="soap-button"
              style={{ top: `${position}px` }}
              onClick={() => copySection(section)}
            >
              {section}
            </button>
          )
        ))}
      </div>
      <div className="clipboard-content">
        <textarea
          ref={clipboardTextareaRef}
          className={`clipboard-textarea ${isDraggingOver ? 'dragging-over' : ''}`}
          placeholder="Click the New Note button to start..."
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