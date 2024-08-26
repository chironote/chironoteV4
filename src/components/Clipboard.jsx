const Clipboard = ({
  clipboardTextareaRef,
  clipboardContent,
  handleCopyPaste,
  setClipboardContent,
  showCopyMessage,
  streamContent, // New prop for the stream from Recording.jsx
}) => {
  return (
    <div className="clipboard">
      {/* Textarea and icons container */}
      <div className="clipboard-textarea-container">
        <textarea
          ref={clipboardTextareaRef}
          className="clipboard-textarea"
          placeholder="Enter your note here..."
          value={clipboardContent}
          onChange={(e) => setClipboardContent(e.target.value)}
        />

        {/* Stream content display */}
        {streamContent && (
          <div className="stream-content">
            <p>{streamContent}</p>
          </div>
        )}

        <div className="textarea-icons">
          <div className="icon-wrapper">
            {/* Copy/Paste icon */}
            <span
              onClick={handleCopyPaste}
              className="material-symbols-rounded textarea-icon"
            >
              {showCopyMessage ? 'check' : 'content_copy'}
            </span>

            {/* Copy confirmation message */}
            {showCopyMessage && (
              <span className="copy-message">Content copied to clipboard</span>
            )}
          </div>
        </div>
      </div>

      {/* Clear clipboard link */}
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