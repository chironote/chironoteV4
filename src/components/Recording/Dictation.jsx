import React, { useState, useEffect, useRef } from 'react';
import { RealtimeTranscriber } from 'assemblyai';
import './Recording.css';

function Dictation({ toggleDictationPopup, onTextStreamUpdate }) {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const rtRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  useEffect(() => {
    return () => {
      if (isActive) {
        stopRecording();
      }
    };
  }, []);

  const fetchAssemblyAIToken = async () => {
    try {
      const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
        method: 'POST',
        headers: {
          "Access-Control-Allow-Origin": "*",
          'Authorization': 'process.env.REACT_APP_ASSEMBLYAI_API_KEY'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received AssemblyAI token:', data.token);
      return data.token;
    } catch (error) {
      console.error('Error fetching AssemblyAI token:', error);
      return null;
    }
  };

  const setupTranscription = (token) => {
    rtRef.current = new RealtimeTranscriber({ token });
    
    const texts = {};
    rtRef.current.on("transcript", (message) => {
      let msg = "";
      texts[message.audio_start] = message.text;
      const keys = Object.keys(texts);
      keys.sort((a, b) => a - b);
      for (const key of keys) {
        if (texts[key]) {
          msg += ` ${texts[key]}`;
        }
      }
      setTranscription(msg);
      onTextStreamUpdate(msg);
    });
  };

  const startRecording = async () => {
    try {
      const token = await fetchAssemblyAIToken();
      if (!token) {
        throw new Error('Failed to obtain AssemblyAI token');
      }

      setupTranscription(token);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
        if (rtRef.current) {
          rtRef.current.sendAudio(event.data);
        }
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        audioChunks.current = [];
        sendAudioToAssemblyAI(audioBlob);
      };

      mediaRecorder.current.start(1000); // Collect data every second
      setIsActive(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      if (rtRef.current) {
        rtRef.current.close();
      }
      setIsActive(false);
    }
  };

  const sendAudioToAssemblyAI = async (audioBlob) => {
    // This function is kept for compatibility, but it's not used in real-time transcription
    console.log('Audio recording completed. Blob size:', audioBlob.size);
  };

  return (
    <div className="create-note-popup">
      <div className="popup-content">
        <div className="recording-content">
          <div className="recording-container">
            {[...Array(5)].map((_, index) => (
              <div key={index}
                style={{ 'animationDelay': `${index * 0.2}s` }}
                className={`sound-bar ${isActive ? 'active' : ''}`}
              ></div>
            ))}
          </div>
          <div className="recording-controls">
            <button onClick={isActive ? stopRecording : startRecording}>
              {isActive ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>
        </div>
        <div className="dictation-textarea">
          <textarea
            value={transcription}
            readOnly
            placeholder="Transcription will appear here..."
          />
        </div>
      </div>
      <button className="close-button" onClick={toggleDictationPopup}>×</button>
    </div>
  );
}

export default Dictation;