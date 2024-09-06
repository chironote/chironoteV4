import React, { useState, useEffect, useRef } from 'react';
import './Recording.css';

function Dictation({ toggleDictationPopup, onTextStreamUpdate }) {
  const [isActive, setIsActive] = useState(false);
  const [transcription, setTranscription] = useState('');
  const client = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  useEffect(() => {
    // Initialize AssemblyAI client
    client.current = new AssemblyAI(process.env.REACT_APP_ASSEMBLYAI_API_KEY);

    return () => {
      if (isActive) {
        stopRecording();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
        await sendAudioToAssemblyAI(audioBlob);
      };

      mediaRecorder.current.start(1000); // Collect data every second
      setIsActive(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      setIsActive(false);
    }
  };

  const sendAudioToAssemblyAI = async (audioBlob) => {
    try {
      const response = await client.current.transcripts.create({
        audio: audioBlob,
        language_code: 'en_US',
      });

      const transcriptId = response.id;
      const transcriptResult = await client.current.transcripts.get(transcriptId);

      if (transcriptResult.status === 'completed') {
        const newTranscription = transcriptResult.text;
        setTranscription(prevTranscription => prevTranscription + ' ' + newTranscription);
        onTextStreamUpdate(prevTranscription => prevTranscription + ' ' + newTranscription);
      } else {
        console.log('Transcription not yet completed. Status:', transcriptResult.status);
      }
    } catch (error) {
      console.error('Error sending audio to AssemblyAI:', error);
    }
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
      <button className="close-button" onClick={stopRecording}>×</button>
    </div>
  );
}

export default Dictation;