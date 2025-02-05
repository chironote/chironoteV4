import React, { useState, useRef, useEffect } from 'react';
import arrowLeftIcon from '../assets/arrow-left.svg';
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth';
import * as queries from '../graphql/queries';
import * as mutations from '../graphql/mutations';
import CreditPopup from './Recording/CreditLimit';
import './Recording/CreditLimit.css';

const LAMBDA_URL = "https://yulmp44ybg3ig5ph4nh2hfbibm0ztfin.lambda-url.us-east-2.on.aws";
const client = generateClient();

const EditPanel = ({ showEditPanel, editContent, setEditContent, clipboardContent, setClipboardContent, userId, onTextStreamUpdate }) => {
  const [textStream, setTextStream] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [userSubscription, setUserSubscription] = useState(null);
  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const textareaRef = useRef(null);

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

  const handleCloseCreditPopup = () => {
    setShowCreditPopup(false);
  };

  return (
    <div className={`edit-panel ${showEditPanel ? 'visible' : ''}`}>
      <h2 className="panel-header" style={{width: '90%'}}>Note Updater</h2>
      <div className="edit-panel-content">
        <textarea
          ref={textareaRef}
          className="edit-textarea"
          placeholder="Enter any changes you wish applied to the note on the left here..."
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
        />
        <div className="edit-panel-buttons">
          <button 
            className="edit-panel-button primary" 
            onClick={() => editStream(editContent)}
          >
            <span className="material-symbols-rounded">edit</span>
            Generate
          </button>
          <button 
            className="edit-panel-button secondary" 
            onClick={() => setEditContent('')}
          >
            <span className="material-symbols-rounded">delete</span>
          </button>
        </div>
      </div>
      {showCreditPopup && (
        <CreditPopup
          onClose={() => setShowCreditPopup(false)}
          subscription={userSubscription}
        />
      )}
    </div>
  )
}

export default EditPanel;
