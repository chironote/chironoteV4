import React, { useState, useEffect } from 'react';

function TextStream({ streamingText, updateClipboardContent }) {
  const [processedText, setProcessedText] = useState('');

  // Process the incoming text
  const processText = (text) => {
    // Add any text processing logic here
    // For now, we'll just return the text as is
    return text;
  };

  useEffect(() => {
    // Process the incoming streaming text
    const newProcessedText = processText(streamingText);
    setProcessedText(newProcessedText);

    // Update the clipboard content in the parent component
    updateClipboardContent(newProcessedText);
  }, [streamingText, updateClipboardContent]);

  // This component doesn't render anything visible
  return null;
}

export default TextStream;