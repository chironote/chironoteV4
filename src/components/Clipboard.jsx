import React, { useState, useEffect, useCallback } from 'react';

const Clipboard = ({
  clipboardTextareaRef,
  clipboardContent,
  setClipboardContent,
  streamContent,
  setShowCopyMessage,
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
    setClipboardContent(droppedText);
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
    navigator.clipboard.writeText(sectionText)
      .then(() => {
        setShowCopyMessage(true);
        setTimeout(() => setShowCopyMessage(false), 1000);
      })
      .catch(err => console.error('Failed to copy:', err));
  };

  const updatePositions = useCallback(() => {
    if (!clipboardTextareaRef.current) return;

    const text = clipboardContent;
    const sections = {
      'S': 'Subjective:',
      'O': 'Objective:',
      'A': 'Assessment:',
      'P': 'Plan:'
    };

    const newPositions = {};
    const verticalOffset = -6;
    
    // Create a hidden div to measure text height if it doesn't exist
    let measureDiv = document.getElementById('soap-measure-div');
    if (!measureDiv) {
      measureDiv = document.createElement('div');
      measureDiv.id = 'soap-measure-div';
      measureDiv.style.cssText = `
        position: absolute;
        visibility: hidden;
        height: auto;
        width: ${clipboardTextareaRef.current.clientWidth}px;
        font-family: ${getComputedStyle(clipboardTextareaRef.current).fontFamily};
        font-size: ${getComputedStyle(clipboardTextareaRef.current).fontSize};
        line-height: ${getComputedStyle(clipboardTextareaRef.current).lineHeight};
        white-space: pre-wrap;
        word-wrap: break-word;
        padding: ${getComputedStyle(clipboardTextareaRef.current).padding};
      `;
      clipboardTextareaRef.current.parentElement.appendChild(measureDiv);
    }

    // Update width in case textarea size changed
    measureDiv.style.width = `${clipboardTextareaRef.current.clientWidth}px`;

    Object.entries(sections).forEach(([key, header]) => {
      const index = text.indexOf(header);
      if (index !== -1) {
        const textUpToHeader = text.substring(0, index);
        measureDiv.textContent = textUpToHeader;
        const height = measureDiv.offsetHeight;
        const scrollTop = clipboardTextareaRef.current.scrollTop;
        const position = height - scrollTop + verticalOffset;
        
        // Only show buttons if they're within the visible area of the textarea
        const textareaHeight = clipboardTextareaRef.current.clientHeight;
        if (position > 0 && position < textareaHeight) {
          newPositions[key] = position;
        } else {
          newPositions[key] = undefined;
        }
      }
    });

    setSoapPositions(newPositions);
  }, [clipboardContent]);

  // Debounced update positions when content changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updatePositions();
    }, 100); // Debounce for 100ms

    return () => clearTimeout(timeoutId);
  }, [updatePositions]);

  // Clean up measurement div on unmount
  useEffect(() => {
    return () => {
      const measureDiv = document.getElementById('soap-measure-div');
      if (measureDiv) {
        measureDiv.remove();
      }
    };
  }, []);

  // Update positions when window resizes or on scroll
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      updatePositions();
    });

    const handleScroll = () => {
      requestAnimationFrame(updatePositions);
    };

    if (clipboardTextareaRef.current) {
      resizeObserver.observe(clipboardTextareaRef.current);
      clipboardTextareaRef.current.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (clipboardTextareaRef.current) {
        clipboardTextareaRef.current.removeEventListener('scroll', handleScroll);
      }
      resizeObserver.disconnect();
    };
  }, [updatePositions]);

  return (
    <div className="clipboard">
      <div className="soap-buttons">
        {Object.entries(soapPositions).map(([section, position]) => (
          position !== undefined && position > 0 && (
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
      </div>
    </div>
  );
};

export default Clipboard;