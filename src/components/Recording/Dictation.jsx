import React, { useState, useRef } from 'react';
import { RealtimeTranscriber } from 'assemblyai';
import './Recording.css';

function Dictation({ toggleDictationPopup, onTextStreamUpdate }) {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const rtRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  

  const fetchAssemblyAIToken = async () => {
    try {
      console.log('Fetching AssemblyAI token');
      const response = await fetch('https://llck5m4mzd6sa6do3joadjzzs40jtoef.lambda-url.us-east-2.on.aws', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { token } = await response.json();
      console.log('Received AssemblyAI token:', token);
      return token;
    } catch (error) {
      console.error('Error fetching AssemblyAI token:', error);
      return null;
    }
  };

  const setupTranscription = (token) => {
    return new Promise((resolve, reject) => {
      console.log('Setting up transcription with token:', token);
      rtRef.current = new RealtimeTranscriber({
        token: token,
        sampleRate: 16_000,
      });
      rtRef.current.connect();
      
      rtRef.current.on('open', () => {
        console.log('WebSocket connection opened successfully');
        resolve();
      });
  
      rtRef.current.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
  
      rtRef.current.on('close', () => {
        console.log('WebSocket connection closed');
      });
      
      const texts = {};
      rtRef.current.on("transcript", (message) => {
        texts[message.audio_start] = message.text;
        const sortedTexts = Object.entries(texts)
          .sort(([a], [b]) => a - b)
          .map(([, text]) => text)
          .join(' ');
          setTranscription(sortedTexts);
      });
    });
  };

  const startRecording = async () => {
    try {
      console.log('Starting recording process');
      const token = await fetchAssemblyAIToken();
      if (!token) {
        throw new Error('Failed to obtain AssemblyAI token');
      }

      console.log('Token obtained, setting up transcription');
      try {
        await setupTranscription(token);
        console.log('Transcription setup completed successfully');
      } catch (error) {
        console.error('Error during transcription setup:', error);
        return;
      }

      console.log('Requesting user media');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('User media obtained');
      
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
        if (rtRef.current) {
          console.log('Sending audio chunk, size:', event.data.size);
          rtRef.current.sendAudio(event.data);
        } else {
          console.warn('rtRef.current is null, cannot send audio');
        }
      };

      mediaRecorder.current.onstop = () => {
        audioChunks.current = [];
      };

      console.log('Starting media recorder');
      mediaRecorder.current.start(1000); // Collect data every second
      setIsActive(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      console.log('Stopping media recorder');
      mediaRecorder.current.stop();
      if (rtRef.current) {
        console.log('Closing RealtimeTranscriber');
        rtRef.current.close();
      }
      setIsActive(false);
    }
    toggleDictationPopup(); // Close the window after stopping the recording
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
            {!isActive ? (
              <button onClick={startRecording}>
                Start Recording
              </button>
            ) : (
              <button onClick={stopRecording}>
                Stop Recording
              </button>
            )}
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
    </div>
  );
}

export default Dictation;