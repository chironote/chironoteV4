import React, { useState, useRef, useEffect } from 'react';
import arrowLeftIcon from '../assets/arrow-left.svg';

const LAMBDA_URL = "https://yulmp44ybg3ig5ph4nh2hfbibm0ztfin.lambda-url.us-east-2.on.aws";

const EditPanel = ({ showEditPanel, editContent, setEditContent, clipboardContent, setClipboardContent, userId, onTextStreamUpdate }) => {
  const [textStream, setTextStream] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef(null);

  const editStream = async (editInput) => {
    // Clear the clipboard content immediately when the button is clicked
    setClipboardContent("");
    // Reset the textStream state at the beginning of each editStream call
    setTextStream('');
    // Set loading state to true
    setIsLoading(true);
    // Update TextStream with loading state
    onTextStreamUpdate('', true);

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
        setIsLoading(false);
        onTextStreamUpdate('', false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value, { stream: true });
        
        setTextStream((prevText) => {
          const newText = prevText + text;
          // Update the clipboard content directly with the streamed text
          onTextStreamUpdate(newText, false);
          return newText;
        });
      }

      // Clear the edit content after streaming is complete
      setEditContent('');
      
    } catch (error) {
      console.error("Streaming error:", error);
    } finally {
      // Set loading state to false when streaming is complete
      setIsLoading(false);
      onTextStreamUpdate(textStream, false);
    }
  };

  const handleDragStart = (e) => {
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    if (selectedText) {
      e.dataTransfer.setData('text/plain', selectedText);
      setIsDragging(true);
    } else {
      e.preventDefault();
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      editStream(editContent);
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      if (textarea) {
        textarea.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [editContent]);

  return (
    <section className={`edit-panel ${showEditPanel ? 'visible' : ''}`}>
      <h4>Note Updater</h4>
      
      <textarea
        ref={textareaRef}
        className="edit-textarea"
        placeholder="Enter any changes you wish applied to the note on the left here..."
        value={editContent}
        onChange={(e) => setEditContent(e.target.value)}
        draggable="true"
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />
      

      {/* Link to clear the text area */}
      <a
        href="javascript:void(0)"
        className="clear-edit-link"
        onClick={(e) => { e.preventDefault(); setEditContent(''); }}
      >
        Clear text
      </a>

      {/* Button to apply changes from the textarea to clipboard content */}
      <button
        className="apply-changes-button"
        onClick={() => editStream(editContent)}
        disabled={isLoading}
      >
        <img src={arrowLeftIcon} alt="Arrow Left" className="button-icon left-arrow" />
        <span>{isLoading ? 'Loading...' : 'Apply Changes'}</span>
      </button>
    </section>
  )
}

export default EditPanel;