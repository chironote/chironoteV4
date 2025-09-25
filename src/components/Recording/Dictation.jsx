import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StreamingTranscriber } from 'assemblyai';
import NoSleep from 'nosleep.js';
import './Recording.css';
import { generateClient } from 'aws-amplify/api';
import * as queries from '../../graphql/queries';
import * as mutations from '../../graphql/mutations';
import { getCurrentUser } from 'aws-amplify/auth';
import CreditPopup from './CreditLimit';

const client = generateClient();

// Token and connection constants
const TOKEN_REFRESH_BUFFER_MINUTES = 10;
const TOKEN_EXPIRY_HOURS = 2.9;

// Audio processing constants - AssemblyAI streaming requirements
const SAMPLE_RATE = 16000;    // AssemblyAI requires EXACTLY 16kHz - no flexibility
const CHANNELS = 1;           // AssemblyAI requires mono audio only
const BUFFER_SIZE = 4096;     // Web Audio API buffer size

// AudioWorklet processor code (embedded in component)
const audioProcessorCode = `
const MAX_16BIT_INT = 32767;

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.audioBufferQueue = new Int16Array(0);
  }

  process(inputs) {
    try {
      const input = inputs[0];
      if (!input || !input[0]) return true;

      const channelData = input[0];
      const float32Array = Float32Array.from(channelData);
      
      // Convert Float32 to Int16 with proper clamping
      const int16Array = Int16Array.from(
        float32Array.map((sample) => {
          const clamped = Math.max(-1, Math.min(1, sample));
          return clamped < 0 ? clamped * 32768 : clamped * MAX_16BIT_INT;
        })
      );
      
      // Merge with existing buffer queue
      this.audioBufferQueue = this.mergeBuffers(this.audioBufferQueue, int16Array);
      
      // Send chunks of 100ms duration (1600 samples at 16kHz)
      const samplesFor100ms = 1600;
      while (this.audioBufferQueue.length >= samplesFor100ms) {
        const chunk = this.audioBufferQueue.subarray(0, samplesFor100ms);
        this.audioBufferQueue = this.audioBufferQueue.subarray(samplesFor100ms);
        
        // Send as Uint8Array buffer to match AssemblyAI expectations
        const buffer = new Uint8Array(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength));
        this.port.postMessage({ audio_data: buffer });
      }

      return true;
    } catch (error) {
      console.error('[AudioProcessor] Error:', error);
      return false;
    }
  }
  
  mergeBuffers(lhs, rhs) {
    const merged = new Int16Array(lhs.length + rhs.length);
    merged.set(lhs, 0);
    merged.set(rhs, lhs.length);
    return merged;
  }
}

registerProcessor('audio-processor', AudioProcessor);
`;

const Dictation = ({ onTextStreamUpdate, setClipboardContent, username, instanceName = 'Main' }) => {
  // Status state object
  const [status, setStatus] = useState({
    isLoading: false,
    isTranscribing: false,
    isInitialized: false,
    isTranscriberReady: false,
    isQueued: false,
    isStopping: false
  });

  // Data state variables
  const [transcription, setTranscription] = useState('');
  const [token, setToken] = useState({
    value: null,
    expiry: null
  });
  const [subscription, setSubscription] = useState({
    data: null,
    hasHours: false
  });
  const [timer, setTimer] = useState(0);
  const [showCreditPopup, setShowCreditPopup] = useState(false);

  // Core refs
  const transcriberRef = useRef(null);

  // Web Audio API refs (AudioWorklet implementation)
  const audioContextRef = useRef(null);
  const audioWorkletNodeRef = useRef(null);
  const streamRef = useRef(null);
  const readableStreamRef = useRef(null);

  // Utility refs
  const noSleepRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const tokenRefreshTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  // Data refs
  const turnsRef = useRef({});
  const currentTurnOrderRef = useRef(-1);

  // Control flow refs
  const isInitializingRef = useRef(false);
  const isConnectingRef = useRef(false);
  const isReconnectingRef = useRef(false);

  // Timer functions
  const startTimer = () => {
    setTimer(0);
    timerIntervalRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Token management functions
  const isTokenValid = () => {
    if (!token.value || !token.expiry) return false;
    const now = new Date();
    return now < token.expiry;
  };

  const fetchAssemblyAIToken = async () => {
    try {
      console.log('[Dictation] Fetching AssemblyAI token from lambda');
      
      const response = await fetch(
        'https://tks3r2tlj2kq4rejfvusvqucye0btywr.lambda-url.us-east-2.on.aws',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const tokenData = await response.json();
      
      // Extract the token field from the JSON response
      const actualToken = tokenData.token;
      console.log('[Dictation] Extracted token:', typeof actualToken, actualToken ? 'present' : 'missing');
      
      // Calculate expiry time
      const now = new Date();
      const expiry = new Date(now.getTime() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
      
      // Update token state
      setToken({
        value: actualToken,
        expiry: expiry
      });
      
      // Schedule next refresh
      scheduleTokenRefresh(expiry);
      
      console.log('[Dictation] Token fetched successfully, expires at:', expiry);
      return actualToken;
    } catch (error) {
      console.error('[Dictation] Error fetching AssemblyAI token:', error);
      return null;
    }
  };

  const scheduleTokenRefresh = (expiry) => {
    clearTimeout(tokenRefreshTimeoutRef.current);
    
    const now = new Date();
    const timeUntilRefresh = expiry.getTime() - now.getTime() - (TOKEN_REFRESH_BUFFER_MINUTES * 60 * 1000);
    
    if (timeUntilRefresh > 0) {
      tokenRefreshTimeoutRef.current = setTimeout(() => {
        fetchAssemblyAIToken();
      }, timeUntilRefresh);
    } else {
      // Token already expired or expiring soon, refresh immediately
      fetchAssemblyAIToken();
    }
  };

  // Subscription management functions
  const fetchUserSubscription = async () => {
    try {
      console.log('[Dictation] Fetching user subscription');
      
      const user = await getCurrentUser();
      const owner = user.username;
      const subscriptionData = await client.graphql({
        query: queries.getUserSubscription,
        variables: { owner }
      });
      
      const userData = subscriptionData.data.getUserSubscription;
      setSubscription({
        data: userData,
        hasHours: userData ? userData.hoursleft > 0 : false
      });
      
      console.log('[Dictation] Subscription fetched successfully');
      return userData;
    } catch (error) {
      console.error('[Dictation] Error fetching user subscription:', error);
      return null;
    }
  };

  const updateUserSubscriptionHours = async (hoursUsed) => {
    if (!subscription.data) return;
    
    try {
      const newHoursLeft = Math.max(0, subscription.data.hoursleft - hoursUsed);
      
      await client.graphql({
        query: mutations.updateUserSubscription,
        variables: {
          input: {
            owner: subscription.data.owner, // Use 'owner' as the primary key
            hoursleft: newHoursLeft
          }
        }
      });
      
      setSubscription(prev => ({
        ...prev,
        data: { ...prev.data, hoursleft: newHoursLeft },
        hasHours: newHoursLeft > 0
      }));
      
      console.log(`[Dictation] Updated hours left: ${newHoursLeft}`);
    } catch (error) {
      console.error('[Dictation] Error updating subscription hours:', error);
    }
  };

  // Audio setup functions
  const setupAudioContext = async () => {
    // Create AudioContext at exactly 16kHz for AssemblyAI compatibility
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: SAMPLE_RATE,  // Must be exactly 16000
      latencyHint: 'balanced'   // Optimize for real-time processing
    });
    
    // Resume context if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    // Create blob URL for AudioWorklet processor
    const blob = new Blob([audioProcessorCode], { type: 'application/javascript' });
    const processorUrl = URL.createObjectURL(blob);
    
    // Add AudioWorklet module
    await audioContextRef.current.audioWorklet.addModule(processorUrl);
    
    // Clean up blob URL
    URL.revokeObjectURL(processorUrl);
  };

  const getMediaStream = async () => {
    // Request microphone with optimal settings for AssemblyAI
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: { ideal: 16000 },     // Prefer 16kHz but allow browser flexibility
        channelCount: { ideal: 1 },       // Prefer mono but allow browser flexibility  
        echoCancellation: true,           // Enable for better quality
        noiseSuppression: true,           // Enable for better quality
        autoGainControl: true            // Enable for consistent levels
      }
    });
  };

  const setupAudioWorklet = (mediaStream) => {
    // Create media stream source
    const source = audioContextRef.current.createMediaStreamSource(mediaStream);
    
    // Create AudioWorklet node
    audioWorkletNodeRef.current = new AudioWorkletNode(
      audioContextRef.current, 
      'audio-processor'
    );
    
    // Connect audio pipeline
    source.connect(audioWorkletNodeRef.current);
    audioWorkletNodeRef.current.connect(audioContextRef.current.destination);
    
    // Handle processed audio data
    audioWorkletNodeRef.current.port.onmessage = (event) => {
      if (!readableStreamRef.current?.controller) return;
      
      try {
        const audioData = event.data.audio_data;
        if (audioData && audioData.length > 0) {
          readableStreamRef.current.controller.enqueue(audioData);
        }
      } catch (error) {
        console.error('[Dictation] Error enqueuing audio data:', error);
      }
    };
  };

  const createAudioStream = () => {
    let controller;
    
    const stream = new ReadableStream({
      start(ctrl) {
        controller = ctrl;
        console.log('[Dictation] ReadableStream started');
      },
      cancel(reason) {
        console.log('[Dictation] ReadableStream cancelled:', reason);
      }
    });
    
    // Store controller reference for AudioWorklet message handler
    readableStreamRef.current = {
      stream,
      controller
    };
    
    return stream;
  };

  const setupAudioPipeline = async () => {
    // 1. Setup AudioContext and load AudioWorklet
    await setupAudioContext();
    
    // 2. Get microphone stream
    const mediaStream = await getMediaStream();
    streamRef.current = mediaStream;
    
    // 3. Setup AudioWorklet processing
    setupAudioWorklet(mediaStream);
    
    // 4. Create ReadableStream for AssemblyAI
    const audioStream = createAudioStream();
    
    // 5. Connect to AssemblyAI transcriber (don't await - let it stream continuously)
    audioStream.pipeTo(transcriberRef.current.stream()).catch(error => {
      console.error('[Dictation] Audio stream error:', error);
    });
    
    console.log('[Dictation] Audio pipeline setup complete');
  };

  // AssemblyAI connection setup - ONLY called when starting recording
  const setupTranscriptionConnection = async (tokenValue) => {
    console.log('[Dictation] Setting up transcription connection with token:', tokenValue ? 'present' : 'missing');
    return new Promise((resolve, reject) => {
      // Add timeout to prevent hanging
      const connectionTimeout = setTimeout(() => {
        console.error('[Dictation] StreamingTranscriber connection timeout after 10 seconds');
        reject(new Error('Connection timeout - StreamingTranscriber failed to connect'));
      }, 10000);

      try {
        console.log('[Dictation] Creating StreamingTranscriber instance');
        transcriberRef.current = new StreamingTranscriber({
          token: tokenValue,
          sampleRate: SAMPLE_RATE,
          formatTurns: true
        });
        
        transcriberRef.current.on('open', () => {
          console.log(`[Dictation-${instanceName}] 🟢 WEBSOCKET CONNECTION OPENED - Billing starts now`);
          console.log(`[Dictation-${instanceName}] StreamingTranscriber connected successfully`);
          clearTimeout(connectionTimeout);
          setStatus(prev => ({ ...prev, isTranscriberReady: true }));
          resolve();
        });
        
        transcriberRef.current.on('error', (error) => {
          console.error('[Dictation] StreamingTranscriber error:', error);
          clearTimeout(connectionTimeout);
          setStatus(prev => ({ ...prev, isTranscriberReady: false }));
          reject(error);
        });
        
        transcriberRef.current.on('turn', (turn) => {
          if (!turn.transcript) {
            return;
          }
          
          console.log('[Dictation] Turn received:', turn);
          
          const { transcript, turn_order, turn_is_formatted, end_of_turn } = turn;
          
          // Store turn by order
          turnsRef.current[turn_order] = {
            transcript,
            is_formatted: turn_is_formatted,
            end_of_turn
          };
          
          // Build text from all turns in order
          const sortedTurns = Object.entries(turnsRef.current)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([, turnData]) => turnData.transcript);
          
          const newText = sortedTurns.join(' ');
          
          setTranscription(newText);
          setClipboardContent(newText);
        });
        
        console.log('[Dictation] Attempting to connect StreamingTranscriber');
        transcriberRef.current.connect();
        
      } catch (error) {
        console.error('[Dictation] Error in setupTranscriptionConnection:', error);
        clearTimeout(connectionTimeout);
        reject(error);
      }
    });
  };

  // Resource cleanup
  const cleanupResources = useCallback(() => {
    console.log('[Dictation] Starting resource cleanup');
    
    // Stop ReadableStream
    if (readableStreamRef.current?.controller) {
      try {
        readableStreamRef.current.controller.close();
      } catch (error) {
        console.error('[Dictation] Error closing stream controller:', error);
      }
    }
    
    // Cleanup AudioWorklet Node
    if (audioWorkletNodeRef.current) {
      try {
        audioWorkletNodeRef.current.disconnect();
        audioWorkletNodeRef.current.port.close();
      } catch (error) {
        console.error('[Dictation] Error disconnecting AudioWorklet:', error);
      }
      audioWorkletNodeRef.current = null;
    }
    
    // Cleanup AudioContext
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(error => {
        console.error('[Dictation] Error closing AudioContext:', error);
      });
      audioContextRef.current = null;
    }
    
    // Stop media stream tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[Dictation] Stopped media track:', track.kind);
      });
      streamRef.current = null;
    }
    
    // Close AssemblyAI connection
    if (transcriberRef.current) {
      try {
        console.log(`[Dictation-${instanceName}] 🔴 CLOSING WEBSOCKET CONNECTION - Billing should stop now`);
        transcriberRef.current.close();
        console.log(`[Dictation-${instanceName}] ✅ WEBSOCKET CONNECTION CLOSED - No more billing charges`);
      } catch (error) {
        console.error(`[Dictation-${instanceName}] Error closing transcriber:`, error);
      }
      transcriberRef.current = null;
    }
    
    // Disable NoSleep
    if (noSleepRef.current) {
      noSleepRef.current.disable();
    }
    
    // Clear timers
    stopTimer();
    clearTimeout(tokenRefreshTimeoutRef.current);
    clearInterval(heartbeatIntervalRef.current);
    
    // Reset refs
    readableStreamRef.current = null;
    heartbeatIntervalRef.current = null;
    
    console.log('[Dictation] Resource cleanup complete');
  }, []);

  // Simple reinitialization on page visibility change - NO WebSocket connection
  const reinitializeDictation = useCallback(async () => {
    if (isReconnectingRef.current) return;
    
    isReconnectingRef.current = true;
    console.log('[Dictation] Reinitializing dictation after page visibility change - NO WebSocket connection');
    
    try {
      // Clean up all existing resources
      cleanupResources();
      
      // Reset all states to initial values
      setStatus({
        isLoading: false,
        isTranscribing: false,
        isInitialized: false,
        isTranscriberReady: false,
        isQueued: false,
        isStopping: false
      });
      
      // Clear transcription data
      setTranscription('');
      turnsRef.current = {};
      currentTurnOrderRef.current = -1;
      
      // Fetch fresh token (but don't connect WebSocket yet)
      const newToken = await fetchAssemblyAIToken();
      if (!newToken) {
        throw new Error('Failed to fetch token during reinitialization');
      }
      
      // Fetch user subscription
      await fetchUserSubscription();
      
      // DO NOT setup transcription connection here - wait for user to start recording
      
      setStatus(prev => ({ ...prev, isInitialized: true }));
      console.log('[Dictation] Reinitialization completed successfully - WebSocket will connect when recording starts');
      
    } catch (error) {
      console.error('[Dictation] Reinitialization failed:', error);
      setStatus({
        isLoading: false,
        isTranscribing: false,
        isInitialized: false,
        isTranscriberReady: false,
        isQueued: false,
        isStopping: false
      });
    } finally {
      isReconnectingRef.current = false;
    }
  }, [cleanupResources, fetchAssemblyAIToken, fetchUserSubscription]);

  const handleVisibilityChange = useCallback(() => {
    if (!document.hidden) {
      // Page became visible - reinitialize after short delay
      console.log('[Dictation] Page became visible, scheduling reinitialization');
      setTimeout(() => {
        reinitializeDictation();
      }, 1000);
    }
  }, [reinitializeDictation]);

  // Main dictation functions
  const startDictation = async () => {
    if (status.isLoading || status.isStopping || !status.isInitialized) {
      setStatus(prev => ({ ...prev, isQueued: true }));
      return;
    }
    
    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      setTranscription('');
      setClipboardContent('');
      turnsRef.current = {};
      currentTurnOrderRef.current = -1;
      
      // Validate subscription hours
      if (!subscription.hasHours) {
        const updatedSub = await fetchUserSubscription();
        if (!updatedSub || updatedSub.hoursleft <= 0) {
          setShowCreditPopup(true);
          setStatus(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }
      
      // ALWAYS establish fresh connection for each recording session
      console.log(`[Dictation-${instanceName}] Establishing fresh WebSocket connection for recording session`);
      let currentToken = token.value;
      if (!isTokenValid()) {
        console.log('[Dictation] Token invalid, fetching new token');
        currentToken = await fetchAssemblyAIToken();
        if (!currentToken) {
          throw new Error('Failed to fetch AssemblyAI token');
        }
      }
      
      // Always setup fresh transcription connection for each recording
      console.log('[Dictation] Setting up fresh transcription connection');
      await setupTranscriptionConnection(currentToken);
      console.log('[Dictation] Fresh connection setup completed');
      
      // Setup complete audio pipeline with AudioWorklet
      await setupAudioPipeline();
      
      // Enable NoSleep and start timer
      if (noSleepRef.current) {
        noSleepRef.current.enable();
      }
      startTimer();
      
      setStatus(prev => ({ 
        ...prev, 
        isTranscribing: true,
        isLoading: false,
        isQueued: false
      }));
      
      setClipboardContent(' ');
    } catch (error) {
      console.error('[Dictation] Start error:', error);
      setStatus(prev => ({ ...prev, isLoading: false, isQueued: false }));
      cleanupResources();
      alert('Failed to start dictation. Check microphone permissions.');
    }
  };

  const stopDictation = () => {
    if (!status.isTranscribing && !status.isStopping) return;
    
    console.log('[Dictation] Stopping dictation');
    setStatus(prev => ({ ...prev, isStopping: true }));
    
    const finalTranscription = transcription;
    
    // Capture current timer value before stopping it
    const currentTimerValue = timer;
    
    // Stop streaming and cleanup
    cleanupResources();
    
    // Disable NoSleep and stop timer
    if (noSleepRef.current) {
      noSleepRef.current.disable();
    }
    stopTimer();
    
    // Update subscription hours using captured timer value
    const hoursUsed = currentTimerValue / 3600;
    console.log(`[Dictation] Recording duration: ${currentTimerValue} seconds (${hoursUsed.toFixed(4)} hours)`);
    updateUserSubscriptionHours(hoursUsed);
    
    // Send final transcription to parent
    if (finalTranscription) {
      onTextStreamUpdate(finalTranscription);
    }
    
    setStatus(prev => ({ 
      ...prev, 
      isTranscribing: false,
      isStopping: false,
      isTranscriberReady: false  // Reset transcriber ready state
    }));
    
    // DO NOT re-establish connection - wait for next recording session
    console.log(`[Dictation-${instanceName}] Recording stopped - WebSocket closed to prevent billing`);
  };

  const toggleDictation = () => {
    console.log('[Dictation] toggleDictation called - current status:', {
      isTranscribing: status.isTranscribing,
      isStopping: status.isStopping,
      isLoading: status.isLoading,
      isTranscriberReady: status.isTranscriberReady,
      isInitialized: status.isInitialized
    });
    
    if (status.isTranscribing || status.isStopping) {
      console.log('[Dictation] Calling stopDictation');
      stopDictation();
    } else {
      console.log('[Dictation] Calling startDictation');
      startDictation();
    }
  };

  // Initialize on mount - NO WebSocket connection until recording starts
  useEffect(() => {
    const initialize = async () => {
      if (isInitializingRef.current) return;
      isInitializingRef.current = true;
      
      console.log(`[Dictation-${instanceName}] Initializing component - NO WebSocket connection until recording`);
      
      // Initialize NoSleep
      noSleepRef.current = new NoSleep();
      
      // Fetch initial token (but don't connect WebSocket)
      const initialToken = await fetchAssemblyAIToken();
      
      // Fetch user subscription
      await fetchUserSubscription();
      
      // DO NOT setup initial connection - this was causing continuous billing!
      console.log(`[Dictation-${instanceName}] Initialization complete - WebSocket will connect when recording starts`);
      
      setStatus(prev => ({ ...prev, isInitialized: true }));
      isInitializingRef.current = false;
    };
    
    initialize();
    
    // Cleanup on unmount
    return () => {
      cleanupResources();
      clearTimeout(tokenRefreshTimeoutRef.current);
      clearInterval(heartbeatIntervalRef.current);
    };
  }, []);

  // Handle queued actions
  useEffect(() => {
    if (status.isQueued && !status.isLoading && !status.isStopping) {
      startDictation();
    }
  }, [status.isQueued, status.isLoading, status.isStopping]);

  // Handle page visibility changes
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  // Credit popup element
  const creditPopupElement = showCreditPopup && (
    <CreditPopup
      onClose={() => setShowCreditPopup(false)}
      username={username}
    />
  );

  // Return object for parent component
  return {
    isDictationLoading: status.isLoading,
    isTranscribing: status.isTranscribing,
    isInitialized: status.isInitialized,
    isTranscriberReady: status.isTranscriberReady,
    dictationQueued: status.isQueued,
    isStoppingDictation: status.isStopping,
    isWebSocketConnecting: status.isLoading && !status.isTranscribing,
    creditPopupElement,
    startDictation,
    stopDictation,
    toggleDictation
  };
};

export default Dictation;
