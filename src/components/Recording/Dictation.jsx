import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StreamingTranscriber } from 'assemblyai';
import NoSleep from 'nosleep.js';
import './Recording.css';
import { generateClient } from 'aws-amplify/api';
import * as queries from '../../graphql/queries';
import * as mutations from '../../graphql/mutations';
import { getCurrentUser } from 'aws-amplify/auth';
import CreditPopup from './CreditLimit';
import { CapacitorHttp } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

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

const Dictation = ({ onTextStreamUpdate, setClipboardContent, username }) => {
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
  const isComponentMountedRef = useRef(false);

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
      const actualToken = tokenData?.token;
      console.log('[Dictation] Token extracted:', { hasToken: !!actualToken });
      
      // Calculate expiry time
      const now = new Date();
      const expiry = new Date(now.getTime() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

      if (!isComponentMountedRef.current) {
        console.warn('[Dictation] Component unmounted before token state update');
        return actualToken;
      }

      // Update token state
      setToken({
        value: actualToken,
        expiry: expiry
      });

      // Schedule next refresh
      scheduleTokenRefresh(expiry);
      
      console.log('[Dictation] Token fetched successfully');
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
    
    if (!isComponentMountedRef.current) {
      return;
    }

    if (timeUntilRefresh > 0) {
      tokenRefreshTimeoutRef.current = setTimeout(() => {
        if (isComponentMountedRef.current) {
          fetchAssemblyAIToken();
        }
      }, timeUntilRefresh);
    } else {
      // Token already expired or expiring soon, refresh immediately
      if (isComponentMountedRef.current) {
        fetchAssemblyAIToken();
      }
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

      if (!isComponentMountedRef.current) {
        console.warn('[Dictation] Skipping subscription state update - component unmounted');
        return userData;
      }

      setSubscription({
        data: userData,
        hasHours: userData ? userData.hoursleft > 0 : false
      });
      
      console.log('[Dictation] Subscription fetched:', { hasHours: userData ? userData.hoursleft > 0 : false });
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
      
      if (isComponentMountedRef.current) {
        setSubscription(prev => ({
          ...prev,
          data: { ...prev.data, hoursleft: newHoursLeft },
          hasHours: newHoursLeft > 0
        }));
      }
      
      console.log('[Dictation] Subscription hours updated');
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

  const requestMicrophonePermission = async () => {
    // Check if user has already seen the permission rationale
    const hasSeenPermissionRationale = localStorage.getItem('chironote_mic_permission_rationale_shown');
    
    if (!hasSeenPermissionRationale) {
      // Show permission rationale dialog only on first time
      const userConsent = window.confirm(
        "ChiroNote needs microphone access to transcribe your clinical notes. Your audio is processed securely and not stored permanently. Do you want to continue?"
      );
      
      if (!userConsent) {
        console.log('[Dictation] User denied microphone permission rationale');
        return false;
      }
      
      // Mark that user has seen the rationale
      localStorage.setItem('chironote_mic_permission_rationale_shown', 'true');
    }
    
    if (Capacitor.isNativePlatform()) {
      try {
        // For Capacitor apps, we need to request permissions through the native layer
        const { Device } = await import('@capacitor/device');
        const info = await Device.getInfo();
        console.log('[Dictation] Running on native platform:', info.platform);
        
        // Request microphone permission through getUserMedia which will trigger native permission
        // This is the standard way for Capacitor apps
        return true;
      } catch (error) {
        console.error('[Dictation] Error checking device info:', error);
        return true; // Continue anyway
      }
    }
    return true;
  };

  const getMediaStream = async () => {
    // First request permission if on native platform
    await requestMicrophonePermission();
    
    // Request microphone with optimal settings for AssemblyAI
    try {
      console.log('[Dictation] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: 16000 },     // Prefer 16kHz but allow browser flexibility
          channelCount: { ideal: 1 },       // Prefer mono but allow browser flexibility  
          echoCancellation: true,           // Enable for better quality
          noiseSuppression: true,           // Enable for better quality
          autoGainControl: true            // Enable for consistent levels
        }
      });
      console.log('[Dictation] Microphone access granted successfully');
      return stream;
    } catch (error) {
      console.error('[Dictation] Error accessing microphone:', error);
      throw error;
    }
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

  // AssemblyAI connection setup
  const setupTranscriptionConnection = async (tokenValue) => {
    if (!tokenValue) {
      throw new Error('Cannot set up transcription connection without a token');
    }

    console.log('[Dictation] Setting up transcription connection:', { hasToken: !!tokenValue });
    return new Promise((resolve, reject) => {
      const connectionTimeout = setTimeout(() => {
        console.error('[Dictation] StreamingTranscriber connection timeout after 10 seconds');
        reject(new Error('Connection timeout - StreamingTranscriber failed to connect'));
      }, 10000);

      try {
        console.log('[Dictation] Creating StreamingTranscriber instance');

        if (transcriberRef.current) {
          try {
            transcriberRef.current.close();
          } catch (closeError) {
            console.error('[Dictation] Error closing existing transcriber before reinitializing:', closeError);
          }
          transcriberRef.current = null;
        }

        transcriberRef.current = new StreamingTranscriber({
          token: tokenValue,
          sampleRate: SAMPLE_RATE,
          formatTurns: true
        });

        transcriberRef.current.on('open', () => {
          console.log('[Dictation] StreamingTranscriber connected successfully');
          clearTimeout(connectionTimeout);
          if (isComponentMountedRef.current) {
            setStatus(prev => ({ ...prev, isTranscriberReady: true }));
          }
          resolve();
        });

        transcriberRef.current.on('error', (error) => {
          console.error('[Dictation] StreamingTranscriber error:', error);
          clearTimeout(connectionTimeout);
          if (isComponentMountedRef.current) {
            setStatus(prev => ({ ...prev, isTranscriberReady: false }));
          }
          reject(error);
        });

        transcriberRef.current.on('turn', (turn) => {
          if (!isComponentMountedRef.current) {
            return;
          }
          if (!turn.transcript) {
            return;
          }

          console.log('[Dictation] Turn received:', { hasTurn: !!turn, hasTranscript: !!turn.transcript });

          const { transcript, turn_order, turn_is_formatted, end_of_turn } = turn;

          turnsRef.current[turn_order] = {
            transcript,
            is_formatted: turn_is_formatted,
            end_of_turn
          };

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
        transcriberRef.current.close();
        console.log('[Dictation] StreamingTranscriber closed successfully');
      } catch (error) {
        console.error('[Dictation] Error closing transcriber:', error);
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
    turnsRef.current = {};
    currentTurnOrderRef.current = -1;

    if (isComponentMountedRef.current) {
      setStatus(prev => ({ ...prev, isTranscriberReady: false }));
    }

    console.log('[Dictation] Resource cleanup complete');
  }, []);

  // Main dictation functions
  const startDictation = async () => {
    if (status.isLoading || status.isStopping) {
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
      
      console.log('[Dictation] Preparing transcription connection');

      let currentToken = token.value;
      if (!isTokenValid()) {
        console.log('[Dictation] Token invalid or expired, fetching new token');
        currentToken = await fetchAssemblyAIToken();
      }

      if (!currentToken) {
        throw new Error('Failed to acquire AssemblyAI token');
      }

      await setupTranscriptionConnection(currentToken);
      console.log('[Dictation] Transcription connection ready');
      
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
      
      // Provide more specific error messages for mobile
      let errorMessage = 'Failed to start dictation.';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone permission denied. Please enable microphone access in your device settings and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found. Please ensure your device has a microphone and try again.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Microphone not supported on this device.';
      } else if (Capacitor.isNativePlatform()) {
        errorMessage = 'Failed to access microphone. Please check app permissions in device settings.';
      } else {
        errorMessage = 'Failed to start dictation. Check microphone permissions.';
      }
      
      alert(errorMessage);
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
    console.log('[Dictation] Recording duration:', { seconds: currentTimerValue, hours: hoursUsed.toFixed(4) });
    updateUserSubscriptionHours(hoursUsed);
    
    // Send final transcription to parent
    if (finalTranscription) {
      onTextStreamUpdate(finalTranscription);
    }
    
    setStatus(prev => ({ 
      ...prev, 
      isTranscribing: false,
      isStopping: false,
      isTranscriberReady: false
    }));
  };

  const toggleDictation = () => {
    console.log('[Dictation] toggleDictation called:', {
      isTranscribing: status.isTranscribing,
      isStopping: status.isStopping,
      isLoading: status.isLoading
    });
    
    if (status.isTranscribing || status.isStopping) {
      console.log('[Dictation] Calling stopDictation');
      stopDictation();
    } else {
      console.log('[Dictation] Calling startDictation');
      startDictation();
    }
  };

  // Initialize on mount
  useEffect(() => {
    isComponentMountedRef.current = true;

    const initialize = async () => {
      if (isInitializingRef.current) return;
      isInitializingRef.current = true;
      
      console.log('[Dictation] Initializing component');
      
      try {
        // Initialize NoSleep
        noSleepRef.current = new NoSleep();

        // Fetch initial token to warm credentials
        const initialToken = await fetchAssemblyAIToken();
        if (!initialToken) {
          console.warn('[Dictation] Unable to acquire initial AssemblyAI token');
        }

        // Fetch user subscription
        await fetchUserSubscription();

        if (isComponentMountedRef.current) {
          setStatus(prev => ({ ...prev, isInitialized: true }));
        }
      } catch (error) {
        console.error('[Dictation] Initialization error:', error);
        if (isComponentMountedRef.current) {
          alert('Failed to initialize dictation service. Please refresh the page and try again.');
        }
      } finally {
        isInitializingRef.current = false;
      }
    };
    
    initialize();
    
    // Cleanup on unmount
    return () => {
      isComponentMountedRef.current = false;
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
