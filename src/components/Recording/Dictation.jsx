import React, { useState, useRef, useEffect } from 'react';
import { RealtimeTranscriber } from 'assemblyai';
import RecordRTC from 'recordrtc';
import NoSleep from 'nosleep.js';
import './Recording.css';

function Dictation({ toggleDictationPopup, onTextStreamUpdate }) {
  const [state, setState] = useState('initial'); // 'initial', 'loading', 'ready', 'recording', 'finalizing'
  const [transcription, setTranscription] = useState('');
  const [finalizationStatus, setFinalizationStatus] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const rtRef = useRef(null);
  const recorder = useRef(null);
  const streamRef = useRef(null);
  const noSleepRef = useRef(null);

  useEffect(() => {
    noSleepRef.current = new NoSleep();
    return () => {
      if (noSleepRef.current) {
        noSleepRef.current.disable();
      }
    };
  }, []);

  const fetchAssemblyAIToken = async () => {
    try {
      const response = await fetch('https://llck5m4mzd6sa6do3joadjzzs40jtoef.lambda-url.us-east-2.on.aws', {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { token } = await response.json();
      return token;
    } catch (error) {
      console.error('Error fetching AssemblyAI token:', error);
      return null;
    }
  };

  const setupTranscription = (token) => {
    return new Promise((resolve, reject) => {
      rtRef.current = new RealtimeTranscriber({
        token: token,
        sampleRate: 16000,
        endUtteranceSilenceThreshold: 1500,
      });
      rtRef.current.connect();
      
      rtRef.current.on('open', resolve);
      rtRef.current.on('error', reject);
      
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
      setState('loading');
      const token = await fetchAssemblyAIToken();
      console.log('Token fetched');
      if (!token) {
        throw new Error('Failed to obtain AssemblyAI token');
      }

      await setupTranscription(token);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      });
      streamRef.current = stream;

      const uaString = navigator.userAgent;
      let mimeType = /iphone|ipad/i.test(uaString) ? 'audio/mp4' : 'audio/webm;codecs=pcm';
      let recorderType = /iphone|ipad/i.test(uaString) ? RecordRTC.MediaStreamRecorder : RecordRTC.StereoAudioRecorder;
      
      recorder.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: mimeType,
        recorderType: recorderType,
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

      setState('ready');
    } catch (error) {
      console.error('Error starting recording:', error);
      setState('initial');
    }
  };

  const beginRecording = () => {
    if (recorder.current && state === 'ready') {
      recorder.current.startRecording();
      setState('recording');
      if (noSleepRef.current) {
        noSleepRef.current.enable();
      }
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
        
        setState('finalizing');
        setFinalizationStatus('Finalizing punctuation');
        
        setTimeout(() => {
          setIsFinalizing(true);
          setFinalizationStatus('');
        }, 2000);
        
        if (noSleepRef.current) {
          noSleepRef.current.disable();
        }
      });
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Transcription copied to clipboard');
    } catch (err) {
      console.error('Failed to copy transcription: ', err);
    }
  };

  useEffect(() => {
    if (isFinalizing && transcription) {
      console.log('Finalizing transcription');
      onTextStreamUpdate(transcription);
      copyToClipboard(transcription);
      setIsFinalizing(false);
      streamRef.current.getTracks().forEach(track => track.stop());
      toggleDictationPopup();
    }
  }, [isFinalizing, transcription, onTextStreamUpdate, toggleDictationPopup]);

  useEffect(() => {
    if (state === 'initial') {
      startRecording();
    }
  }, [state]);

  const handleClose = () => {
    if (recorder.current && recorder.current.state !== 'stopped') {
      stopRecording();
    } else {
      toggleDictationPopup();
    }
  };

  return (
    <div className="create-note-popup">
      <div className="popup-content">
        <div className="close-button-container">
          {state !== 'finalizing' && (
            <button className="close-btn" onClick={handleClose}>×</button>
          )}
        </div>
        <div className="recording-controls">
          {state === 'loading' && <div>Loading Voice to Text...</div>}
          {state === 'ready' && (
            <button className="start-recording-btn" onClick={beginRecording}>
              Start Recording
            </button>
          )}
          {state === 'recording' && (
            <div className="recording-column">
              <div className="recording-status">Recording</div>
              <div className="recording-container">
                {[...Array(5)].map((_, index) => (
                  <div key={index}
                    style={{ 'animationDelay': `${index * 0.2}s` }}
                    className="sound-bar active"
                  ></div>
                ))}
              </div>
              <button className="stop-recording-btn" onClick={stopRecording}>
                Stop Recording
              </button>
            </div>
          )}
        </div>
        {finalizationStatus && (
          <div className="finalization-status">{finalizationStatus}</div>
        )}
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