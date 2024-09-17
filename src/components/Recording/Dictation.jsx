import React, { useState, useRef } from 'react';
import { RealtimeTranscriber } from 'assemblyai';
import RecordRTC from 'recordrtc';
import './Recording.css';

function Dictation({ toggleDictationPopup, onTextStreamUpdate }) {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const rtRef = useRef(null);
  const recorder = useRef(null);

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
        sampleRate: 16000,
        endUtteranceSilenceThreshold: 1500,
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
      
      recorder.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm;codecs=pcm',
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 250,
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
        bufferSize: 4096,
        audioBitsPerSecond: 128000,
        ondataavailable: async (blob) => {
          if(!rtRef.current) return;
          const buffer = await blob.arrayBuffer();
          rtRef.current.sendAudio(buffer);
        },
      });

      console.log('Starting RecordRTC');
      recorder.current.startRecording();
      setIsActive(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (recorder.current && recorder.current.state !== 'stopped') {
      console.log('Stopping RecordRTC');
      recorder.current.stopRecording(() => {
        if (rtRef.current) {
          console.log('Closing RealtimeTranscriber');
          rtRef.current.close();
        }
        setIsActive(false);
      });
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
        <textarea
          className="dictation-textarea"
          value={transcription}
          readOnly
          placeholder="Transcription will appear here..."
        />
      </div>
    </div>
  );
}

export default Dictation;