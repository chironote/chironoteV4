import React, { useState, useRef, useEffect } from 'react';
import arrowLeftIcon from '../../assets/arrow-left.svg';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import * as queries from '../../graphql/queries';
import * as mutations from '../../graphql/mutations';
import CreditPopup from '../Recording/CreditLimit';
import '../Recording/CreditLimit.css';
import { trackApplyChanges } from '../../utils/analytics';

const LAMBDA_URL = "https://yulmp44ybg3ig5ph4nh2hfbibm0ztfin.lambda-url.us-east-2.on.aws";
const client = generateClient();

const EditPanel = ({ 
  showEditPanel, 
  editContent, 
  textareaRef,
  setEditContent, 
  clipboardContent, 
  setClipboardContent, 
  userId, 
  onTextStreamUpdate,
  // Dictation for Edit Panel
  editDictationToggle,
  isEditDictationLoading,
  isEditTranscribing,
  isEditWebSocketConnecting,
  editCreditPopupElement
}) => {
  const [textStream, setTextStream] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [userSubscription, setUserSubscription] = useState(null);
  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const localTextareaRef = useRef(null);
  const editorTextareaRef = textareaRef || localTextareaRef;

  useEffect(() => {
    if (!isEditTranscribing || !editorTextareaRef.current) return;

    editorTextareaRef.current.focus({ preventScroll: true });
  }, [editorTextareaRef, isEditTranscribing]);

  const fetchUserSubscription = async () => {
    try {
      const user = await getCurrentUser();
      const subscriptionData = await client.graphql({
        query: queries.getUserSubscription,
        variables: { owner: user.username }
      });
      setUserSubscription(subscriptionData.data.getUserSubscription);
      return subscriptionData.data.getUserSubscription;
    } catch (error) {
      console.error("Error fetching user subscription:", error);
      return null;
    }
  };

  const updateUserSubscriptionNotes = async (subscription) => {
    try {
      const newNotesLeft = subscription.notesleft === 1 ? -40000 : subscription.notesleft - 1;
      const updatedSubscription = await client.graphql({
        query: mutations.updateUserSubscription,
        variables: {
          input: {
            owner: subscription.owner,
            notesleft: newNotesLeft
          }
        }
      });
      setUserSubscription(updatedSubscription.data.updateUserSubscription);
    } catch (error) {
      console.error("Error updating user subscription:", error);
    }
  };

  const editStream = async (editInput) => {
    try {
      // Track the apply changes action
      trackApplyChanges();
      
      const subscription = await fetchUserSubscription();
      if (!subscription || subscription.notesleft <= 0) {
        console.error('User has no remaining notes');
        setShowCreditPopup(true);
        return;
      }

      setClipboardContent("Loading Updated Note...");
      setTextStream('');

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
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value, { stream: true });
        
        setTextStream((prevText) => {
          const newText = prevText + text;
          onTextStreamUpdate(newText);
          return newText;
        });
      }

      await updateUserSubscriptionNotes(subscription);
      setEditContent('');
      
    } catch (error) {
      console.error("Streaming error:", error);
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
    const textarea = editorTextareaRef.current;
    if (textarea) {
      textarea.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      if (textarea) {
        textarea.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [editContent]);

  const handleCloseCreditPopup = () => {
    setShowCreditPopup(false);
  };

  return (
    <section className={`edit-panel ${showEditPanel ? 'visible' : ''}`} aria-label="Smart Editor">
      <h2 className="panel-header">Smart Editor</h2>
      <div className="edit-panel-content">
        <div className="editor-toolbar">
          <div className="toolbar-group">
            <button 
              className="toolbar-button primary-button"
              onClick={() => editStream(editContent)}
              aria-label="Apply editing instructions"
            >
              <span className="material-symbols-rounded toolbar-icon">edit</span>
              <span className="button-text">Apply Changes</span>
            </button>
          </div>

          <div className="toolbar-group" style={{ marginLeft: 'auto' }}>
            {/* Dictation mic for Edit Panel - placed left of trash icon */}
            <button
              className={`toolbar-button ${
                (isEditDictationLoading || isEditWebSocketConnecting) ? 'button-loading' : ''
              } ${isEditTranscribing ? 'button-recording' : ''}`}
              onClick={editDictationToggle}
              title="Dictate into editor"
              aria-label="Dictate editing instructions"
            >
              <span className="material-symbols-rounded toolbar-icon">mic</span>
              {isEditTranscribing && <span className="recording-indicator"></span>}
            </button>

            <div className="toolbar-divider"></div>

            <button 
              className="toolbar-button delete-button"
              onClick={() => setEditContent('')}
              title="Clear text"
              aria-label="Clear editing instructions"
            >
              <span className="material-symbols-rounded toolbar-icon">delete</span>
            </button>
          </div>
        </div>
        <style jsx>{`
          /* Fix iOS/Safari blue tap highlight and force icon color */
          .toolbar-button {
            -webkit-tap-highlight-color: transparent;
          }
          .toolbar-icon, .material-symbols-rounded.toolbar-icon {
            color: var(--dark-green) !important;
          }
          .toolbar-button.active {
            background-color: var(--dark-green) !important;
          }
          .toolbar-button.active .toolbar-icon,
          .toolbar-button.button-recording .toolbar-icon {
            color: white !important;
          }
          /* Ensure the icon on the green primary button stays white */
          .primary-button .toolbar-icon {
            color: white !important;
          }
          @media only screen and (max-width: 768px) {
            .hide-on-mobile {
              display: none;
            }
          }

          /* Pulsating animation for dictation button - darker */
          .button-loading {
            animation: pulse 1.5s infinite;
            background-color: #dcdcdc !important;
            pointer-events: none;
          }

          /* Recording state - green highlight */
          .button-recording {
            background-color: #2e6930 !important;
            color: white !important;
            position: relative;
          }

          /* Recording indicator - red dot */
          .recording-indicator {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 8px;
            height: 8px;
            background-color: #ff3b30;
            border-radius: 50%;
            animation: blink 1s infinite;
          }

          @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0.4; }
            100% { opacity: 1; }
          }

          @keyframes pulse {
            0% { opacity: 0.7; }
            50% { opacity: 1; }
            100% { opacity: 0.7; }
          }
        `}</style>
        <textarea
          ref={editorTextareaRef}
          className={`edit-textarea ${isEditTranscribing ? 'dictation-caret' : ''}`}
          placeholder="Enter any changes you wish applied to the note on the left here..."
          value={editContent}
          onChange={(e) => {
            if (!isEditTranscribing) {
              setEditContent(e.target.value);
            }
          }}
          aria-readonly={isEditTranscribing}
          aria-label="Editing instructions"
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
        />
      </div>
      {showCreditPopup && (
        <CreditPopup
          onClose={() => setShowCreditPopup(false)}
          subscription={userSubscription}
        />
      )}
      {/* Dictation credit popup (Edit Panel dictation) */}
      {editCreditPopupElement}
    </section>
  )
}

export default EditPanel;
